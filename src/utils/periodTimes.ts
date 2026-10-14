import { DEFAULT_PERIOD_TIMES } from '../constants/index';

const STORAGE_KEY_PERIOD_TIMES = 'nobetci_period_times';

/**
 * Get period times from localStorage or fallback to defaults
 */
export function getPeriodTimes(): Record<number | string, string> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PERIOD_TIMES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return { ...DEFAULT_PERIOD_TIMES, ...parsed };
      }
    }
  } catch (e) {
    // Ignore parse errors and use default
  }
  return { ...DEFAULT_PERIOD_TIMES };
}

/**
 * Save period times to localStorage
 */
export function savePeriodTimes(periodTimes: Record<number | string, string>): void {
  try {
    if (periodTimes && typeof periodTimes === 'object') {
      localStorage.setItem(STORAGE_KEY_PERIOD_TIMES, JSON.stringify(periodTimes));
    }
  } catch (e) {
    // Ignore storage errors
  }
}

/**
 * Extract period times from sheet jsonData (from teacher or class schedule excel)
 */
export function extractPeriodTimesFromSheetData(jsonData: any[]): Record<string, string> {
  const periodTimes: Record<string, string> = {};
  const timeRegex = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/;

  if (!Array.isArray(jsonData)) return periodTimes;

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || !Array.isArray(row)) continue;
    const first = String(row[0] || '').trim();
    if (
      first.includes('Dersler') ||
      first.includes('Günler') ||
      first.includes('DERSLER') ||
      first.includes('GÜNLER')
    ) {
      const pCols: Record<string, number> = {};
      for (let c = 0; c < row.length; c++) {
        const m = String(row[c] || '').match(/(?:^|\()(\d{1,2})(?:\)|\.Ders)/i);
        if (m && m[1]) pCols[m[1]] = c;
      }
      for (let d = 1; d <= 7 && i + d < jsonData.length; d++) {
        const dayRow = jsonData[i + d];
        if (!dayRow || !Array.isArray(dayRow)) continue;
        for (const [p, col] of Object.entries(pCols)) {
          const val = String(dayRow[col] || '');
          const tm = val.match(timeRegex);
          if (tm && !periodTimes[p]) {
            periodTimes[p] = `${tm[1]} - ${tm[2]}`;
          }
        }
      }
    }
  }

  return periodTimes;
}

export interface CurrentPeriodInfo {
  dayKey: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | null;
  dayLabel: string | null;
  isWeekday: boolean;
  currentPeriod: number | null;
  isExact: boolean;
  timeRange: string | null;
  statusLabel: string | null;
}

/**
 * Returns current period info based on current time (or optional test Date)
 */
export function getCurrentPeriodInfo(
  periodTimes: Record<number | string, string> = getPeriodTimes(),
  now: Date = new Date()
): CurrentPeriodInfo {
  const dayIndex = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const dayMap: Record<number, { key: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'; label: string }> = {
    1: { key: 'monday', label: 'Pazartesi' },
    2: { key: 'tuesday', label: 'Salı' },
    3: { key: 'wednesday', label: 'Çarşamba' },
    4: { key: 'thursday', label: 'Perşembe' },
    5: { key: 'friday', label: 'Cuma' },
  };

  const dayInfo = dayMap[dayIndex] || null;
  if (!dayInfo) {
    return {
      dayKey: null,
      dayLabel: null,
      isWeekday: false,
      currentPeriod: null,
      isExact: false,
      timeRange: null,
      statusLabel: null,
    };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const timeRegex = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/;

  // Parse periods and their minute intervals
  const parsedPeriods: Array<{ period: number; start: number; end: number; raw: string }> = [];

  Object.entries(periodTimes).forEach(([pStr, timeStr]) => {
    const p = parseInt(pStr, 10);
    if (isNaN(p)) return;
    const m = String(timeStr).match(timeRegex);
    if (m && m[1] && m[2] && m[3] && m[4]) {
      const start = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      const end = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);
      parsedPeriods.push({ period: p, start, end, raw: timeStr });
    }
  });

  parsedPeriods.sort((a, b) => a.start - b.start);

  let currentPeriod: number | null = null;
  let isExact = false;
  let timeRange: string | null = null;
  let statusLabel: string | null = null;

  for (let i = 0; i < parsedPeriods.length; i++) {
    const item = parsedPeriods[i];
    if (!item) continue;
    // Exactly within the lesson period
    if (currentMinutes >= item.start && currentMinutes <= item.end) {
      currentPeriod = item.period;
      isExact = true;
      timeRange = item.raw;
      statusLabel = `${item.period}. Ders`;
      break;
    }

    // In break before next lesson (if next exists and currentMinutes < next.start)
    if (i < parsedPeriods.length - 1) {
      const nextItem = parsedPeriods[i + 1];
      if (nextItem && currentMinutes > item.end && currentMinutes < nextItem.start) {
        currentPeriod = nextItem.period;
        isExact = false;
        timeRange = nextItem.raw;
        statusLabel = `Teneffüs (${nextItem.period}. Ders Başlayacak)`;
        break;
      }
    }
  }

  return {
    dayKey: dayInfo.key,
    dayLabel: dayInfo.label,
    isWeekday: true,
    currentPeriod,
    isExact,
    timeRange,
    statusLabel,
  };
}
