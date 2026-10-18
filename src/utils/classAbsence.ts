export const CLASS_ABSENCE_NO_DUTY_SUFFIX = '__NO_DUTY__';
export const COMMON_LESSON_LABEL = 'COMMON_LESSON';
const COMMON_LESSON_PREFIX = `${COMMON_LESSON_LABEL}::`;

export interface ClassAbsenceDecodeResult {
  absentId: string | null | undefined;
  absentIds: string[];
  allowDuty: boolean;
  commonLessonOwnerId?: string | null;
}

export interface EncodeClassAbsenceOptions {
  commonLessonOwnerId?: string | null;
}

export const encodeClassAbsenceValue = (
  absentId: string | string[] | null | undefined, 
  allowDuty: boolean = true, 
  options: EncodeClassAbsenceOptions = {}
): string | null | undefined => {
  if (!absentId) return absentId as null | undefined;
  const rawId = Array.isArray(absentId)
    ? Array.from(new Set(absentId.map((id) => String(id || '').trim()).filter(Boolean))).join(',')
    : String(absentId).trim();
  if (!rawId) return undefined;
  if (rawId === COMMON_LESSON_LABEL) {
    const ownerId = options.commonLessonOwnerId;
    return ownerId ? `${COMMON_LESSON_PREFIX}${ownerId}` : COMMON_LESSON_LABEL;
  }
  return allowDuty ? rawId : `${rawId}${CLASS_ABSENCE_NO_DUTY_SUFFIX}`;
};

export const decodeClassAbsenceValue = (value: string | null | undefined): ClassAbsenceDecodeResult => {
  if (!value) return { absentId: value, absentIds: [], allowDuty: true };
  if (typeof value === 'string' && value.startsWith(COMMON_LESSON_PREFIX)) {
    const ownerId = value.slice(COMMON_LESSON_PREFIX.length) || null;
    const absentIds = ownerId ? ownerId.split(',').map((s) => s.trim()).filter(Boolean) : [];
    return {
      absentId: COMMON_LESSON_LABEL,
      absentIds,
      allowDuty: true,
      commonLessonOwnerId: ownerId,
    };
  }
  if (value === COMMON_LESSON_LABEL) {
    return { absentId: COMMON_LESSON_LABEL, absentIds: [], allowDuty: true, commonLessonOwnerId: null };
  }
  if (typeof value === 'string' && value.endsWith(CLASS_ABSENCE_NO_DUTY_SUFFIX)) {
    const raw = value.slice(0, -CLASS_ABSENCE_NO_DUTY_SUFFIX.length);
    const absentIds = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
    return {
      absentId: raw,
      absentIds,
      allowDuty: false,
    };
  }
  const strVal = String(value).trim();
  const absentIds = strVal ? strVal.split(',').map((s) => s.trim()).filter(Boolean) : [];
  return { absentId: strVal, absentIds, allowDuty: true };
};

export const mergeAbsentIdValues = (
  existingValue: string | null | undefined,
  newAbsentId: string,
  allowDuty: boolean = true
): string => {
  if (!existingValue) {
    return encodeClassAbsenceValue(newAbsentId, allowDuty) as string;
  }
  const decoded = decodeClassAbsenceValue(existingValue);
  if (decoded.absentId === COMMON_LESSON_LABEL) {
    // Daha önce grup birleştirmesi olarak işaretlenmişse fakat diğer öğretmen de gelmediyse,
    // birleştirme iptal olur ve her iki öğretmen de mazeretli olarak kaydedilir.
    const prevOwners = decoded.commonLessonOwnerId
      ? decoded.commonLessonOwnerId.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const combined = Array.from(new Set([...prevOwners, newAbsentId].filter(Boolean)));
    return encodeClassAbsenceValue(combined, allowDuty) as string;
  }

  const combined = Array.from(new Set([...decoded.absentIds, newAbsentId].filter(Boolean)));
  return encodeClassAbsenceValue(combined, allowDuty && decoded.allowDuty) as string;
};

export const removeAbsentIdFromValue = (
  existingValue: string | null | undefined,
  absentIdToRemove: string
): { nextValue: string | null; remainingIds: string[] } => {
  if (!existingValue) return { nextValue: null, remainingIds: [] };
  const decoded = decodeClassAbsenceValue(existingValue);
  const remainingIds = decoded.absentIds.filter((id) => id !== absentIdToRemove);

  if (remainingIds.length === 0) {
    return { nextValue: null, remainingIds: [] };
  }

  if (decoded.absentId === COMMON_LESSON_LABEL) {
    const nextValue = encodeClassAbsenceValue(COMMON_LESSON_LABEL, decoded.allowDuty, {
      commonLessonOwnerId: remainingIds.join(','),
    }) as string;
    return { nextValue, remainingIds };
  }

  const nextValue = encodeClassAbsenceValue(remainingIds, decoded.allowDuty) as string;
  return { nextValue, remainingIds };
};

const normalizeGradeCheckKey = (value: any = ''): string =>
  String(value || '')
    .trim()
    .toUpperCase();

export const isTwelfthGradeClassName = (value: any = ''): boolean => {
  const normalized = normalizeGradeCheckKey(value);
  if (!normalized) return false;
  return /\b12[-\s\/]*[A-ZÇĞİÖŞÜ]+/i.test(normalized);
};

export const normalizeDayKey = (dayStr: string = ''): string => {
  const d = String(dayStr || '').trim().toLowerCase();
  if (d.startsWith('mon') || d.startsWith('paz')) return 'monday';
  if (d.startsWith('tue') || d.startsWith('sal')) return 'tuesday';
  if (d.startsWith('wed') || d.startsWith('car') || d.startsWith('çar')) return 'wednesday';
  if (d.startsWith('thu') || d.startsWith('per')) return 'thursday';
  if (d.startsWith('fri') || d.startsWith('cum')) return 'friday';
  return d;
};

/**
 * Mazeret kaydı verilen günü kapsıyor mu? `days` boşsa tüm günleri kapsar.
 * Gün biçimleri (Mon / Pazartesi / monday) normalize edilerek karşılaştırılır.
 */
export const isAbsentOnDay = (person: { days?: string[] } | null | undefined, day: string): boolean => {
  if (!person) return false;
  if (!Array.isArray(person.days) || person.days.length === 0) return true;
  const target = normalizeDayKey(day);
  return person.days.some((d) => normalizeDayKey(d) === target);
};

/**
 * Mazeret verilen gün VE ders saatini kapsıyor mu?
 * timeSlot: 'full' (varsayılan) | 'morning' (1-5. ders) | 'afternoon' (6. ders ve sonrası)
 */
export const isAbsentAtPeriod = (
  person: { days?: string[]; timeSlot?: string } | null | undefined,
  day: string,
  period: number | string
): boolean => {
  if (!isAbsentOnDay(person, day)) return false;
  const p = Number(period);
  if (!Number.isFinite(p)) return true;
  const slot = person?.timeSlot || 'full';
  if (slot === 'morning') return p >= 1 && p <= 5;
  if (slot === 'afternoon') return p >= 6;
  return true;
};
export const isClassScheduleMatch = (targetClass: string = '', scheduleString: string = ''): boolean => {
  if (!targetClass || !scheduleString) return false;

  const cleanSched = scheduleString
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\b/g, ' ')
    .trim();

  const stripNoise = (s: string) =>
    s
      .toLocaleLowerCase('tr-TR')
      .replace(/^(?:amp|atp|mesem)\s*/i, '')
      .replace(/[^a-z0-9]/g, '');

  const tBase = stripNoise(targetClass);
  const sBase = stripNoise(cleanSched);

  // Yalnızca tam eşleşme; kısmi eşleşme aşağıdaki sınır duyarlı (\b) regex ile yapılır.
  // 'includes' kullanılmaz: '1-A' ↔ '11-A' ya da '9-A' ↔ '9-AB' yanlış eşleşirdi.
  if (tBase && sBase && tBase === sBase) {
    return true;
  }

  const m = targetClass.match(/\b(\d{1,2})\s*[-/]?\s*([A-ZÇĞİÖŞÜ]+)\b/i);
  if (m) {
    const [, grade, branch] = m;
    const branchRegex = new RegExp(`\\b${grade}\\s*[-/]?\\s*${branch}\\b`, 'i');
    if (branchRegex.test(cleanSched)) {
      return true;
    }
  }

  return false;
};

export interface ResolvedAbsentRecord {
  absentId: string;
  name: string;
  reason: string;
}

export const resolveAllAbsentTeachers = ({
  day,
  period,
  classId,
  className,
  rawAbsValue,
  absentPeople = [],
  teacherSchedules = {},
  absentInfoById = {},
}: {
  day: string;
  period: number | string;
  classId?: string;
  className?: string;
  rawAbsValue?: string | null;
  absentPeople?: any[];
  teacherSchedules?: Record<string, any>;
  absentInfoById?: Record<string, any>;
}): ResolvedAbsentRecord[] => {
  const result: ResolvedAbsentRecord[] = [];
  const addedIds = new Set<string>();
  const addedNames = new Set<string>();

  const addRecord = (rec: any) => {
    if (!rec) return;
    const idKey = String(rec.absentId || rec.id || '').trim();
    const nameKey = String(rec.name || rec.teacherName || '').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');
    if (idKey && addedIds.has(idKey)) return;
    if (nameKey && addedNames.has(nameKey)) return;
    if (idKey) addedIds.add(idKey);
    if (nameKey) addedNames.add(nameKey);
    result.push({
      absentId: idKey,
      name: rec.name || rec.teacherName || '',
      reason: rec.reason || '',
    });
  };

  // 1. From rawAbsValue (decoded absentIds)
  if (rawAbsValue) {
    const { absentId, absentIds } = decodeClassAbsenceValue(rawAbsValue);
    const ids = absentIds.length > 0 ? absentIds : (absentId && absentId !== COMMON_LESSON_LABEL ? [absentId] : []);
    ids.forEach((id) => {
      const rec = absentInfoById[id] || (absentPeople || []).find((a: any) => a?.absentId === id || a?.teacherId === id || a?.name === id);
      if (rec) addRecord(rec);
    });
  }

  // 2. From teacherSchedules: find all absent teachers whose schedule matches this class at this day and period
  if (teacherSchedules && Array.isArray(absentPeople) && absentPeople.length > 0) {
    const cName = className || classId || '';
    const normTargetDay = normalizeDayKey(day);

    absentPeople.forEach((a: any) => {
      if (!a) return;
      if (!isAbsentAtPeriod(a, day, period)) return;
      const aNorm = String(a.name || a.teacherName || '').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');
      const tKey = Object.keys(teacherSchedules).find(
        (k) => String(k || '').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ') === aNorm
      );
      if (!tKey) return;
      const tSched = teacherSchedules[tKey];
      if (!tSched || typeof tSched !== 'object') return;

      for (const [dKey, pMap] of Object.entries(tSched)) {
        if (
          typeof pMap === 'object' &&
          pMap !== null &&
          normalizeDayKey(dKey) === normTargetDay
        ) {
          const sStr = String((pMap as any)[period] || '').trim();
          if (sStr && isClassScheduleMatch(cName, sStr)) {
            addRecord(a);
            break;
          }
        }
      }
    });
  }

  return result;
};

export const cleanSubjectName = (rawSubject: string = '', className: string = ''): string => {
  if (!rawSubject || typeof rawSubject !== 'string') return '';
  let cleaned = rawSubject.trim();

  // Strip room in parentheses: "(B-07)", "(LAB 1)", "(A-ZEMİN)", etc.
  cleaned = cleaned.replace(/\s*\([A-Z0-9\s\-_./]+\)\s*/gi, ' ').trim();

  // Strip time: "15:20-16:00"
  cleaned = cleaned.replace(/\b\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\b/g, ' ').trim();

  const normClass = className.toLocaleLowerCase('tr-TR').replace(/[^a-z0-9]/g, '');
  const normCleaned = cleaned.toLocaleLowerCase('tr-TR').replace(/[^a-z0-9]/g, '');
  const normBaseClass = normClass.replace(/^(?:amp|atp|mesem)/, '');
  const normBaseCleaned = normCleaned.replace(/^(?:amp|atp|mesem)/, '');

  // If the entire text equals the class name, there is no separate subject name
  if (normCleaned === normClass || (normBaseClass && normBaseCleaned === normBaseClass)) {
    return '';
  }

  // Strip leading class name: e.g. "AMP 9-I" from "AMP 9-I Bilişim"
  if (className) {
    const escapedClass = className.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(`^${escapedClass}\\s*[-:]?\\s*`, 'i'), '').trim();
  }

  // Strip generic class prefix if present: "AMP 9-I", "9-I", "ATP 10-A"
  cleaned = cleaned.replace(/^(?:AMP|ATP|A-?\d+|[0-9]{1,2})\s*[-/]?\s*[A-ZÇĞİÖŞÜ0-9]+\s*[-:]?\s*/i, '').trim();

  // If what remains is still the class name or empty
  const remainderNorm = cleaned.toLocaleLowerCase('tr-TR').replace(/[^a-z0-9]/g, '');
  const remainderBase = remainderNorm.replace(/^(?:amp|atp|mesem)/, '');
  if (
    !cleaned ||
    remainderNorm === normClass ||
    (normBaseClass && remainderBase === normBaseClass) ||
    /^(?:\d+[a-z]|\d+)$/i.test(remainderNorm)
  ) {
    return '';
  }

  return cleaned;
};

/**
 * Ortak ders (grup birleştirme) hücresindeki mazeretli sahipleri çözer.
 * commonLessonOwnerId virgülle ayrılmış birden çok kimlik içerebilir.
 */
export const resolveCommonLessonOwners = (
  rawValue: string | null | undefined,
  absentInfoById: Record<string, any> = {}
): { hasOwner: boolean; records: any[] } => {
  const { absentIds, commonLessonOwnerId } = decodeClassAbsenceValue(rawValue || '');
  if (!commonLessonOwnerId) return { hasOwner: false, records: [] };
  const records = absentIds.map((id) => absentInfoById[id]).filter(Boolean);
  return { hasOwner: true, records };
};