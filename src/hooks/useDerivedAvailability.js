import { useMemo } from 'react';
import { COMMON_LESSON_LABEL, decodeClassAbsenceValue } from '../utils/classAbsence.js';
import { normalizeForComparison } from '../utils/nameNormalization.js';

export function useFreeTeachersByDay({ teacherFree, day, periods, teacherMap, absentPeople = [] }) {
  return useMemo(() => {
    const absentNames = new Set(
      absentPeople
        .map((person) => normalizeForComparison(person?.name || person?.teacherName || person?.displayName || ''))
        .filter(Boolean),
    );

    const dayMap = Object.fromEntries(
      periods.map((p) => {
        const freeIds = Array.from(teacherFree?.[p] || []);
        const filtered = freeIds.filter((tid) => {
          const teacher = teacherMap.get(tid);
          if (!teacher?.teacherName) return false;
          const normalized = normalizeForComparison(teacher.teacherName);
          return normalized && !absentNames.has(normalized);
        });
        return [p, new Set(filtered)];
      }),
    );

    return { [day]: dayMap };
  }, [teacherFree, day, periods, teacherMap, absentPeople]);
}

export function useClassFreeForDay({ classFree, day, periods }) {
  return useMemo(() => {
    const dayData = classFree?.[day];
    const normalized = {};
    periods.forEach((p) => {
      const set = dayData?.[p];
      normalized[p] = new Set(set instanceof Set ? Array.from(set) : Array.isArray(set) ? set : []);
    });
    return { [day]: normalized };
  }, [classFree, day, periods]);
}

export function useFilteredClassAbsence({ classAbsence, day, absentIdsForCurrentDay }) {
  return useMemo(() => {
    const result = { [day]: {} };
    const dayAbsences = classAbsence?.[day] || {};
    Object.entries(dayAbsences).forEach(([periodKey, classesForPeriod]) => {
      const filtered = Object.entries(classesForPeriod || {}).reduce((acc, [classId, rawValue]) => {
        const { absentId, allowDuty } = decodeClassAbsenceValue(rawValue);
        const isCommonLesson = absentId === COMMON_LESSON_LABEL;
        if (isCommonLesson || (allowDuty && absentIdsForCurrentDay.has(absentId))) {
          acc[classId] = isCommonLesson ? COMMON_LESSON_LABEL : absentId;
        }
        return acc;
      }, {});
      if (Object.keys(filtered).length > 0) {
        result[day][periodKey] = filtered;
      }
    });
    return result;
  }, [classAbsence, day, absentIdsForCurrentDay]);
}

