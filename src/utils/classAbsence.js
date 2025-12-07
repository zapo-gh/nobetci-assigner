export const CLASS_ABSENCE_NO_DUTY_SUFFIX = '__NO_DUTY__';
export const COMMON_LESSON_LABEL = 'COMMON_LESSON';
const COMMON_LESSON_PREFIX = `${COMMON_LESSON_LABEL}::`;

export const encodeClassAbsenceValue = (absentId, allowDuty = true, options = {}) => {
  if (!absentId) return absentId;
  if (absentId === COMMON_LESSON_LABEL) {
    const ownerId = options.commonLessonOwnerId;
    return ownerId ? `${COMMON_LESSON_PREFIX}${ownerId}` : COMMON_LESSON_LABEL;
  }
  return allowDuty ? absentId : `${absentId}${CLASS_ABSENCE_NO_DUTY_SUFFIX}`;
};

export const decodeClassAbsenceValue = (value) => {
  if (!value) return { absentId: value, allowDuty: true };
  if (typeof value === 'string' && value.startsWith(COMMON_LESSON_PREFIX)) {
    return {
      absentId: COMMON_LESSON_LABEL,
      allowDuty: true,
      commonLessonOwnerId: value.slice(COMMON_LESSON_PREFIX.length) || null,
    };
  }
  if (value === COMMON_LESSON_LABEL) {
    return { absentId: COMMON_LESSON_LABEL, allowDuty: true, commonLessonOwnerId: null };
  }
  if (typeof value === 'string' && value.endsWith(CLASS_ABSENCE_NO_DUTY_SUFFIX)) {
    return {
      absentId: value.slice(0, -CLASS_ABSENCE_NO_DUTY_SUFFIX.length),
      allowDuty: false,
    };
  }
  return { absentId: value, allowDuty: true };
};

const normalizeGradeCheckKey = (value = '') =>
  String(value || '')
    .trim()
    .toUpperCase();

export const isTwelfthGradeClassName = (value = '') => {
  const normalized = normalizeGradeCheckKey(value);
  if (!normalized) return false;
  const compact = normalized.replace(/[^0-9A-ZÇĞİÖŞÜ]/g, '');
  if (!compact.startsWith('12')) return false;
  return compact.length > 2;
};

