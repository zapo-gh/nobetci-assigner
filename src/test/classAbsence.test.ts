import {
  encodeClassAbsenceValue,
  decodeClassAbsenceValue,
  CLASS_ABSENCE_NO_DUTY_SUFFIX,
  COMMON_LESSON_LABEL,
  mergeAbsentIdValues,
  removeAbsentIdFromValue,
} from '../utils/classAbsence';

describe('classAbsence codec', () => {
  describe('encodeClassAbsenceValue', () => {
    it('should return the original absentId if allowDuty is true', () => {
      expect(encodeClassAbsenceValue('absent-1', true)).toBe('absent-1');
    });

    it('should append NO_DUTY suffix if allowDuty is false', () => {
      expect(encodeClassAbsenceValue('absent-1', false)).toBe(`absent-1${CLASS_ABSENCE_NO_DUTY_SUFFIX}`);
    });

    it('should handle common lessons properly', () => {
      expect(encodeClassAbsenceValue(COMMON_LESSON_LABEL, true, { commonLessonOwnerId: 't1' }))
        .toBe(`${COMMON_LESSON_LABEL}::t1`);
    });
    it('should encode multiple absent IDs as comma-separated string', () => {
      expect(encodeClassAbsenceValue(['absent-1', 'absent-2'], true)).toBe('absent-1,absent-2');
      expect(encodeClassAbsenceValue(['absent-1', 'absent-2'], false)).toBe(`absent-1,absent-2${CLASS_ABSENCE_NO_DUTY_SUFFIX}`);
    });
  });

  describe('decodeClassAbsenceValue', () => {
    it('should decode a regular absentId with duty allowed', () => {
      const decoded = decodeClassAbsenceValue('absent-1');
      expect(decoded.absentId).toBe('absent-1');
      expect(decoded.absentIds).toEqual(['absent-1']);
      expect(decoded.allowDuty).toBe(true);
    });

    it('should decode multiple absent IDs', () => {
      const decoded = decodeClassAbsenceValue('absent-1,absent-2');
      expect(decoded.absentId).toBe('absent-1,absent-2');
      expect(decoded.absentIds).toEqual(['absent-1', 'absent-2']);
      expect(decoded.allowDuty).toBe(true);
    });

    it('should decode a NO_DUTY absentId with multiple IDs', () => {
      const decoded = decodeClassAbsenceValue(`absent-1,absent-2${CLASS_ABSENCE_NO_DUTY_SUFFIX}`);
      expect(decoded.absentId).toBe('absent-1,absent-2');
      expect(decoded.absentIds).toEqual(['absent-1', 'absent-2']);
      expect(decoded.allowDuty).toBe(false);
    });

    it('should extract commonLessonOwnerId', () => {
      const decoded = decodeClassAbsenceValue(`${COMMON_LESSON_LABEL}::t1`);
      expect(decoded.absentId).toBe(COMMON_LESSON_LABEL);
      expect(decoded.commonLessonOwnerId).toBe('t1');
      expect(decoded.absentIds).toEqual(['t1']);
    });
  });

  describe('mergeAbsentIdValues and removeAbsentIdFromValue', () => {
    it('should merge new absentId into existing single absentId', () => {
      const merged = mergeAbsentIdValues('absent-1', 'absent-2');
      expect(merged).toBe('absent-1,absent-2');
    });

    it('should not duplicate absentId when merging', () => {
      const merged = mergeAbsentIdValues('absent-1,absent-2', 'absent-1');
      expect(merged).toBe('absent-1,absent-2');
    });

    it('should cancel common lesson and combine owner with new absentId', () => {
      const merged = mergeAbsentIdValues(`${COMMON_LESSON_LABEL}::t1`, 't2');
      expect(merged).toBe('t1,t2');
    });

    it('should remove one absentId and keep remaining', () => {
      const { nextValue, remainingIds } = removeAbsentIdFromValue('absent-1,absent-2', 'absent-1');
      expect(nextValue).toBe('absent-2');
      expect(remainingIds).toEqual(['absent-2']);
    });

    it('should return null when last absentId is removed', () => {
      const { nextValue, remainingIds } = removeAbsentIdFromValue('absent-1', 'absent-1');
      expect(nextValue).toBeNull();
      expect(remainingIds).toEqual([]);
    });
  });
});
