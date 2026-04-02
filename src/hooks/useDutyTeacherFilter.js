import { useMemo } from 'react';
import { normalizeForComparison } from '../utils/nameNormalization.js';
import { APP_ENV } from '../config/index.js';
import { logger } from '../utils/logger.js';

const IS_DEV_ENV = (APP_ENV.mode || 'development') !== 'production' && !APP_ENV.isTest;

export function useDutyTeacherFilter(teachers = [], pdfSchedule = {}, day = 'Mon') {
  return useMemo(() => {
    const dayMapping = {
      Mon: 'monday',
      Tue: 'tuesday',
      Wed: 'wednesday',
      Thu: 'thursday',
      Fri: 'friday',
    };

    const pdfDayKey = dayMapping[day];

    if (!pdfSchedule || typeof pdfSchedule !== 'object' || Object.keys(pdfSchedule).length === 0) {
      if (IS_DEV_ENV) {
        logger.warn('teachersForCurrentDay: pdfSchedule is empty or invalid');
      }
      return teachers;
    }

    if (!pdfSchedule[pdfDayKey] || typeof pdfSchedule[pdfDayKey] !== 'object' || Object.keys(pdfSchedule[pdfDayKey]).length === 0) {
      if (IS_DEV_ENV) {
        logger.warn('teachersForCurrentDay: pdfSchedule[pdfDayKey] is empty for:', pdfDayKey);
      }
      return teachers;
    }

    const dutyTeacherIds = new Set();
    const dutyTeacherNames = new Set();

    const daySchedule = pdfSchedule[pdfDayKey];
    if (IS_DEV_ENV) {
      logger.log('teachersForCurrentDay: daySchedule for', pdfDayKey, ':', daySchedule);
    }

    Object.values(daySchedule).forEach((periodTeachers, periodIndex) => {
      let teacherNames = [];
      if (Array.isArray(periodTeachers)) {
        teacherNames = periodTeachers;
      } else if (typeof periodTeachers === 'string' && periodTeachers.trim()) {
        teacherNames = [periodTeachers];
      } else {
        if (IS_DEV_ENV) {
          logger.warn('teachersForCurrentDay: periodTeachers is not an array or string at period index:', periodIndex, 'value:', periodTeachers);
        }
        return;
      }

      teacherNames.forEach((teacherName) => {
        if (!teacherName || typeof teacherName !== 'string') return;

        const normalizedScheduleName = normalizeForComparison(teacherName.trim());

        const matchingTeacher = teachers.find((t) => {
          if (!t?.teacherName) return false;
          const normalizedTeacherName = normalizeForComparison(t.teacherName);
          return normalizedTeacherName === normalizedScheduleName;
        });

        if (matchingTeacher) {
          dutyTeacherIds.add(matchingTeacher.teacherId);
          dutyTeacherNames.add(normalizedScheduleName);
        } else {
          dutyTeacherNames.add(normalizedScheduleName);
        }
      });
    });

    if (IS_DEV_ENV) {
      logger.log('teachersForCurrentDay: dutyTeacherIds:', Array.from(dutyTeacherIds));
      logger.log('teachersForCurrentDay: dutyTeacherNames:', Array.from(dutyTeacherNames));
    }

    if (dutyTeacherIds.size === 0 && dutyTeacherNames.size === 0) {
      return teachers;
    }

    const filteredTeachers = teachers.filter((t) => {
      if (!t?.teacherId) return false;
      if (dutyTeacherIds.has(t.teacherId)) return true;
      const normalizedTeacherName = normalizeForComparison(t.teacherName);
      return dutyTeacherNames.has(normalizedTeacherName);
    });

    if (filteredTeachers.length === 0) {
      return teachers;
    }

    if (IS_DEV_ENV) {
      logger.log('Filtered teachers count:', filteredTeachers.length);
      logger.log('Filtered teachers:', filteredTeachers.map((t) => t.teacherName));
    }

    return filteredTeachers;
  }, [teachers, pdfSchedule, day]);
}

