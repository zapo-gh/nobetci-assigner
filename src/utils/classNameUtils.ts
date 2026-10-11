/**
 * Utility functions for normalizing, formatting, and sorting class names.
 */

/**
 * Normalizes class names from various messy formats into a standard structure:
 * - Prepends 'ATP ' if it belongs to ATP.
 * - Prepends 'AMP ' if it doesn't have ATP (unless it's a special unit like 'ÖZEL EĞİTİM' or 'MESEM').
 * - Preserves existing 'AMP ' / 'ATP ' without duplication.
 * - Standardizes branch formats like '11/G' -> '11-G', '9A' -> '9-A', '10 - A' -> '10-A'.
 * - Truncates trailing lesson codes or room noise containing digits.
 */
export const normalizeClassName = (raw: string): string => {
  if (!raw || typeof raw !== 'string') return '';

  let s = raw
    .replace(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/g, '') // remove time intervals
    .replace(/\([^)]*\)/g, '')                     // remove room or parenthetical notes
    .replace(/\s+/g, ' ')
    .trim();

  if (!s) return '';

  // Special cases: ÖZEL EĞİTİM, REHBERLİK, KULÜP, etc.
  const upper = s.toLocaleUpperCase('tr-TR');
  if (upper.includes('ÖZEL') && (upper.includes('EĞİT') || upper.includes('EGIT'))) {
    return 'ÖZEL EĞİTİM';
  }
  if (['REHBERLİK', 'KULÜP', 'EGZERSİZ', 'GÖREVLİ'].includes(upper)) {
    return upper;
  }

  // Determine prefix:
  // Rule: If it contains ATP anywhere -> ATP
  // If it contains MESEM anywhere -> MESEM
  // Otherwise -> AMP
  let prefix = 'AMP';
  if (/\bATP\b/i.test(s) || /^ATP/i.test(s) || upper.includes('ATP')) {
    prefix = 'ATP';
  } else if (/\bMESEM\b/i.test(s) || /^MESEM/i.test(s) || upper.includes('MESEM')) {
    prefix = 'MESEM';
  }

  // Strip any existing prefixes (AMP, ATP, MESEM) from start
  s = s.replace(/^(AMP|ATP|MESEM)\s*/i, '').trim();
  s = s.replace(/^(AMP|ATP|MESEM)/i, '').trim();

  // Strip subject codes that contain numbers after the grade identifier
  // e.g. "10 MOT E.A ELKARAÇTE911" -> split and keep parts until a part with numbers (excluding the initial grade)
  const parts = s.split(' ');
  let gradeIndex = -1;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p && /\d/.test(p)) {
      gradeIndex = i;
      break;
    }
  }

  if (gradeIndex !== -1) {
    const keptParts = parts.slice(0, gradeIndex + 1);
    for (let i = gradeIndex + 1; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      // Stop if a subsequent part looks like a subject code with digits (e.g., 'ELKARAÇTE911' or '911')
      // but allow hyphen-separated combined branches (like 'G-I' or 'A-E')
      if (part !== '-' && /\d/.test(part) && !/^\d{1,2}[-\/]/.test(part)) {
        break;
      }
      keptParts.push(part);
    }
    s = keptParts.join(' ');
  }

  // Fix slashes e.g. 11/G -> 11-G, 11/I -> 11-I, 11/G-I -> 11-G-I
  s = s.replace(/(\d{1,2})\s*\/\s*([A-ZÇĞİÖŞÜ]+)/gi, '$1-$2');

  // If grade number and single branch letter are stuck together: 9A -> 9-A, 10A -> 10-A, 11B -> 11-B
  s = s.replace(/^(\d{1,2})([A-ZÇĞİÖŞÜ])\b/gi, '$1-$2');

  // If grade number and multi-letter branch/field are stuck together: 11MOT -> 11 MOT, 12MUHASEBE -> 12 MUHASEBE
  s = s.replace(/^(\d{1,2})([A-ZÇĞİÖŞÜ]{2,})/gi, '$1 $2');

  // Fix hyphen spacing: e.g. '10 - A' -> '10-A', '11 - G' -> '11-G'
  s = s.replace(/(\d{1,2})\s*-\s*([A-ZÇĞİÖŞÜ])/gi, '$1-$2');

  // Clean trailing punctuation or noise
  s = s.replace(/[-\s]+$/, '').trim();

  return `${prefix} ${s}`.trim();
};

/**
 * Natural compare function for school class names:
 * 1. Groups by grade level in numeric order (9 < 10 < 11 < 12 < others).
 * 2. Within the same grade, sorts by program type (AMP < ATP < MESEM < others).
 * 3. Within the same program type, sorts using Turkish locale alphanumeric ordering.
 */
export const compareClassNames = (a: string, b: string): number => {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  // Extract grade numbers (9, 10, 11, 12)
  const matchA = a.match(/\b(\d{1,2})\b/);
  const matchB = b.match(/\b(\d{1,2})\b/);
  const gradeA = (matchA && matchA[1]) ? parseInt(matchA[1], 10) : 999;
  const gradeB = (matchB && matchB[1]) ? parseInt(matchB[1], 10) : 999;

  if (gradeA !== gradeB) {
    return gradeA - gradeB;
  }

  // Same grade: compare prefix (AMP before ATP)
  const getPrefixWeight = (str: string) => {
    if (str.startsWith('AMP')) return 1;
    if (str.startsWith('ATP')) return 2;
    if (str.startsWith('MESEM')) return 3;
    return 4;
  };

  const weightA = getPrefixWeight(a);
  const weightB = getPrefixWeight(b);
  if (weightA !== weightB) {
    return weightA - weightB;
  }

  // Then compare full string with Turkish collation and natural number sorting
  return a.localeCompare(b, 'tr-TR', { numeric: true, sensitivity: 'base' });
};

/**
 * Sorts an array of class name strings according to school grade and branch hierarchy.
 */
export const sortClassNames = (classes: string[]): string[] => {
  return [...classes].sort(compareClassNames);
};

/**
 * Returns duty location of teacher for the given day key.
 */
export const getTeacherDutyLocation = (teacher: any, day: string): string => {
  if (!teacher?.dutyLocations || typeof teacher.dutyLocations !== 'object') return '';
  const dayKey = String(day || '').trim();
  if (!dayKey) return '';

  const systemDayMap: Record<string, string> = {
    Sun: 'sunday', Mon: 'monday', Tue: 'tuesday', Wed: 'wednesday', Thu: 'thursday', Fri: 'friday', Sat: 'saturday',
    Pzt: 'monday', Sal: 'tuesday', Çar: 'wednesday', Per: 'thursday', Cum: 'friday', Cmt: 'saturday', Paz: 'sunday',
    Pazartesi: 'monday', Salı: 'tuesday', Çarşamba: 'wednesday', Perşembe: 'thursday', Cuma: 'friday', Cumartesi: 'saturday', Pazar: 'sunday'
  };
  const sysDay = systemDayMap[dayKey] || dayKey.toLowerCase();

  if (teacher.dutyLocations[sysDay]) return String(teacher.dutyLocations[sysDay]).trim();
  if (teacher.dutyLocations[dayKey]) return String(teacher.dutyLocations[dayKey]).trim();

  for (const [k, v] of Object.entries(teacher.dutyLocations)) {
    if (k.toLowerCase() === sysDay.toLowerCase() || k.toLowerCase() === dayKey.toLowerCase()) {
      return String(v || '').trim();
    }
  }
  return '';
};

/**
 * Abbreviates long duty location names so they fit nicely in small table cells.
 */
export const abbreviateDutyLocation = (location: string): string => {
  if (!location || typeof location !== 'string') return '';
  let s = location.trim();
  if (s.length <= 10) return s;

  // Standard Turkish school duty place abbreviations
  s = s.replace(/Laboratuvar[a-zçğıöşü]*/gi, 'Lab.');
  s = s.replace(/Atölye[a-zçğıöşü]*/gi, 'Atöl.');
  s = s.replace(/Salon[a-zçğıöşü]*/gi, 'Sal.');
  s = s.replace(/Kütüphane[a-zçğıöşü]*/gi, 'Ktp.');
  s = s.replace(/Konferans[a-zçğıöşü]*/gi, 'Konf.');
  s = s.replace(/Bina(sı)?[a-zçğıöşü]*/gi, 'Bin.');
  s = s.replace(/Pansiyon[a-zçğıöşü]*/gi, 'Pans.');
  s = s.replace(/Yemekhane[a-zçğıöşü]*/gi, 'Yemek.');
  s = s.replace(/Zemin/gi, 'Zem.');
  s = s.replace(/(Blok|Bloğu)[a-zçğıöşü]*/gi, 'Blk.');
  s = s.replace(/Bölüm[a-zçğıöşü]*/gi, 'Böl.');
  s = s.replace(/Beden Eğitimi/gi, 'Bed. Eğt.');
  s = s.replace(/\s+/g, ' ').trim();

  if (s.length > 13) {
    s = s.replace(/\bKat\b/gi, 'K.');
    s = s.replace(/\s+/g, ' ').trim();
  }

  if (s.length > 15) {
    return s.slice(0, 14).trim() + '...';
  }

  return s;
};

/**
 * Resolves the primary classroom (derslik) name for a class from classLocations.
 */
export const getClassroomName = (
  classLocations: Record<string, any> | undefined,
  className: string,
  day?: string
): string => {
  if (!classLocations || !className) return '';

  const normTarget = normalizeClassName(className);
  let matchingSchedule: any = null;

  for (const [key, sched] of Object.entries(classLocations)) {
    if (
      normalizeClassName(key) === normTarget ||
      key.trim().toUpperCase() === className.trim().toUpperCase() ||
      key.replace(/\s+/g, '').toUpperCase() === className.replace(/\s+/g, '').toUpperCase()
    ) {
      matchingSchedule = sched;
      break;
    }
  }

  // Fallback: branch/field match (e.g., 'AMP 12-A BİL' matching 'AMP 12-A')
  if (!matchingSchedule) {
    for (const [key, sched] of Object.entries(classLocations)) {
      const normKey = normalizeClassName(key);
      if (
        normKey.startsWith(`${normTarget} `) ||
        normKey.startsWith(`${normTarget}-`) ||
        normTarget.startsWith(`${normKey} `) ||
        normTarget.startsWith(`${normKey}-`)
      ) {
        matchingSchedule = sched;
        break;
      }
    }
  }

  if (!matchingSchedule || typeof matchingSchedule !== 'object') return '';

  const systemDayMap: Record<string, string> = {
    Sun: 'sunday', Mon: 'monday', Tue: 'tuesday', Wed: 'wednesday', Thu: 'thursday', Fri: 'friday', Sat: 'saturday',
    Pzt: 'monday', Sal: 'tuesday', Çar: 'wednesday', Per: 'thursday', Cum: 'friday', Cmt: 'saturday', Paz: 'sunday',
    Pazartesi: 'monday', Salı: 'tuesday', Çarşamba: 'wednesday', Perşembe: 'thursday', Cuma: 'friday', Cumartesi: 'saturday', Pazar: 'sunday'
  };
  const sysDay = day ? (systemDayMap[day] || day.toLowerCase()) : '';

  const extractLocations = (periodsObj: any): string[] => {
    if (!periodsObj || typeof periodsObj !== 'object') return [];
    const locs: string[] = [];
    Object.values(periodsObj).forEach((item: any) => {
      let loc = '';
      if (typeof item === 'string') {
        loc = item;
      } else if (item && typeof item === 'object') {
        loc = item.location || '';
      }
      loc = loc.trim();
      if (loc && loc !== '-' && loc !== '---') {
        locs.push(loc);
      }
    });
    return locs;
  };

  let dayLocs: string[] = [];
  if (sysDay && matchingSchedule[sysDay]) {
    dayLocs = extractLocations(matchingSchedule[sysDay]);
  } else if (day && matchingSchedule[day]) {
    dayLocs = extractLocations(matchingSchedule[day]);
  }

  // If no location found for the specific day, fallback to all days of that class
  if (dayLocs.length === 0) {
    Object.values(matchingSchedule).forEach((dayData: any) => {
      dayLocs.push(...extractLocations(dayData));
    });
  }

  if (dayLocs.length === 0) return '';

  // Calculate frequency
  const counts = new Map<string, number>();
  dayLocs.forEach((loc) => {
    counts.set(loc, (counts.get(loc) || 0) + 1);
  });

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return '';
  const first = sorted[0];
  if (!first) return '';
  const primary = first[0];

  const second = sorted[1];
  if (second && second[1] >= 2 && second[0] !== primary) {
    return `${primary} / ${second[0]}`;
  }

  return primary;
};

/**
 * Checks whether a class or lesson name represents an İMES (İşletmede Mesleki Eğitim / Koordinatörlük) lesson.
 * İMES lessons are individual enterprise coordinator duties and must be excluded from class merging (ders birleştirme).
 */
export const isImesLesson = (name?: string | null): boolean => {
  if (!name || typeof name !== 'string') return false;
  const upperTr = name.toLocaleUpperCase('tr-TR');
  const upperEn = name.toUpperCase();
  return (
    upperTr.includes('İMES') ||
    upperEn.includes('IMES') ||
    upperTr.includes('KOORDİNATÖR') ||
    upperEn.includes('KOORDINATOR')
  );
};

/**
 * Shortens a class name if it exceeds maxLen characters to prevent UI overflow in compact table cells.
 * e.g. "AMP 10 PAZARLAMA" -> "AMP 10 PA…" (at maxLen = 10)
 * Uses single-character ellipsis '…' for compact display and clean presentation.
 */
export const truncateClassName = (name?: string | null, maxLen = 10): string => {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (trimmed.length <= maxLen) return trimmed;
  const sub = trimmed.slice(0, maxLen - 1).trimEnd();
  return `${sub}…`;
};


