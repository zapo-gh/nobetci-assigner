import { describe, it, expect } from 'vitest';
import { encodeClassAbsenceValue, decodeClassAbsenceValue, CLASS_ABSENCE_NO_DUTY_SUFFIX, COMMON_LESSON_LABEL } from '../utils/classAbsence';

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
  });

  describe('decodeClassAbsenceValue', () => {
    it('should decode a regular absentId with duty allowed', () => {
      const decoded = decodeClassAbsenceValue('absent-1');
      expect(decoded.absentId).toBe('absent-1');
      expect(decoded.allowDuty).toBe(true);
    });

    it('should decode a NO_DUTY absentId', () => {
      const decoded = decodeClassAbsenceValue(`absent-1${CLASS_ABSENCE_NO_DUTY_SUFFIX}`);
      expect(decoded.absentId).toBe('absent-1');
      expect(decoded.allowDuty).toBe(false);
    });

    it('should extract commonLessonOwnerId', () => {
      const decoded = decodeClassAbsenceValue(`${COMMON_LESSON_LABEL}::t1`);
      expect(decoded.absentId).toBe(COMMON_LESSON_LABEL);
      expect(decoded.commonLessonOwnerId).toBe('t1');
    });
  });
});
