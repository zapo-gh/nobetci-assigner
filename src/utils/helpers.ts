export const toInt = (v: any, d: number = 0): number => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

export const sanitizeInput = (s: any): string =>
  (s ?? '').toString().trim().replace(/[<>]/g, '').slice(0, 160);

export function mondayOfWeek(base: Date = new Date()): Date {
  const d = new Date(base);
  const day = d.getDay();
  const diffToMon = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diffToMon);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function dateForSelectedDay(dayKey: string, base: Date = new Date()): Date {
  const mon = mondayOfWeek(base);
  const idx = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].indexOf(dayKey);
  const dt = new Date(mon);
  dt.setDate(mon.getDate() + (idx >= 0 ? idx : 0));
  return dt;
}

export function formatTRDate(d: Date): string {
  try {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  } catch {
    return '';
  }
}

export function normalizeReason(input: any): string {
  if (!input) return '';

  let v = String(input).trim().toLocaleLowerCase('tr').replace(/\s+/g, ' ');

  const norm = (s: string) => s.replace(/ö/g, 'o');
  const vn = norm(v);

  if (/^g(ö|o)revli(\s*[- ]\s*izinli)?$/.test(v)) return 'Görevli İzinli';

  if (/^rapor/.test(v)) return 'Raporlu';
  if (/^sevk/.test(v)) return 'Sevkli';
  if (/^izin/.test(v)) return 'İzinli';

  if (vn === 'diger' || v === 'diğer') return 'Diğer';

  if (['Raporlu', 'Sevkli', 'İzinli', 'Görevli İzinli', 'Diğer'].includes(v))
    return v;

  return '';
}

export function validateTeacherData(row: Record<string, any>): string[] {
  const errs: string[] = [];
  if (!row.teacherId) errs.push('Öğretmen ID boş');
  if (!row.teacherName) errs.push('Öğretmen adı boş');
  const m = toInt(row.maxDutyPerDay, 6);
  if (m < 1 || m > 9) errs.push('Günlük görev 1–9 olmalı');
  return errs;
}

export function validateClassData(row: Record<string, any>): string[] {
  const errs: string[] = [];
  if (!row.classId) errs.push('Sınıf ID boş');
  if (!row.className) errs.push('Sınıf adı boş');
  return errs;
}

export const normalizeClassLabel = (value: any = ''): string =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();

export function validateAbsentRow(row: Record<string, any>): string[] {
  const errs: string[] = [];
  if (!row.name) errs.push('İsim boş');
  const r = normalizeReason(row.reason);
  if (!r) errs.push('Geçerli bir neden girin');
  return errs;
}

export function mapSetToArray(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v instanceof Set) {
      // Eski yapı: {period: Set(classId)}
      out[k] = Array.from(v || []);
    } else if (Array.isArray(v)) {
      out[k] = [...v];
    } else if (typeof v === 'object' && v !== null) {
      // Derin yapı: her seviyede Set -> Array dönüşümü
      const convertNested = (value: any): any => {
        if (value instanceof Set) {
          return Array.from(value || []);
        }
        if (Array.isArray(value)) {
          return [...value];
        }
        if (value && typeof value === 'object') {
          const nestedOut: Record<string, any> = {};
          for (const [innerKey, innerValue] of Object.entries(value)) {
            nestedOut[innerKey] = convertNested(innerValue);
          }
          return nestedOut;
        }
        return value;
      };

      out[k] = convertNested(v);
    }
  }
  return out;
}

const normalizePeriodKey = (key: string | number): number | string => {
  const num = Number(key);
  return Number.isFinite(num) ? num : key;
}

export function arrayToSetMap(obj: Record<string, any>): Record<string, any> {
  if (!obj || typeof obj !== 'object') return {};

  const hasNestedStructure = Object.values(obj).some(
    (value) => value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Set)
  );

  if (!hasNestedStructure) {
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const periodKey = normalizePeriodKey(key);
      if (value instanceof Set) {
        out[periodKey] = new Set(value);
      } else if (Array.isArray(value)) {
        out[periodKey] = new Set(value);
      } else if (value && typeof value === 'object') {
        out[periodKey] = new Set(Object.values(value));
      } else {
        out[periodKey] = new Set();
      }
    }
    return out;
  }

  const out: Record<string, any> = {};
  for (const [dayKey, dayValue] of Object.entries(obj)) {
    if (!dayValue || typeof dayValue !== 'object') continue;
    out[dayKey] = {};
    for (const [periodKey, periodValue] of Object.entries(dayValue)) {
      const normalizedPeriod = normalizePeriodKey(periodKey);
      if (periodValue instanceof Set) {
        out[dayKey][normalizedPeriod] = new Set(periodValue);
      } else if (Array.isArray(periodValue)) {
        out[dayKey][normalizedPeriod] = new Set(periodValue);
      } else if (typeof periodValue === 'object' && periodValue !== null) {
        out[dayKey][normalizedPeriod] = new Set(Object.values(periodValue));
      } else {
        out[dayKey][normalizedPeriod] = new Set();
      }
    }
  }

  return out;
}

export async function readFileAsTextSmart(file: File): Promise<string> {
  return await file.text();
}
