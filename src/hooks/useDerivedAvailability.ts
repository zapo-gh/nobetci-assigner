// @ts-nocheck
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

export function useFilteredClassAbsence({
  classAbsence,
  day,
  absentIdsForCurrentDay,
  commonLessons,
  absentPeople = []
}) {
  return useMemo(() => {
    const absentTeacherNames = new Set(
      absentPeople
        .filter(p => !Array.isArray(p.days) || p.days.length === 0 || p.days.includes(day))
        .map(p => normalizeForComparison(p?.name || p?.teacherName || p?.displayName || ''))
        .filter(Boolean)
    );

    const isTeacherAbsent = (tNameOrId) => {
      if (!tNameOrId) return false;
      const s = String(tNameOrId);
      if (absentIdsForCurrentDay.has(s)) return true;
      const norm = normalizeForComparison(s);
      return norm && absentTeacherNames.has(norm);
    };

    const result = { [day]: {} };
    const dayAbsences = classAbsence?.[day] || {};
    Object.entries(dayAbsences).forEach(([periodKey, classesForPeriod]) => {
      const filtered = Object.entries(classesForPeriod || {}).reduce((acc, [classId, rawValue]) => {
        const { absentId, absentIds, allowDuty, commonLessonOwnerId } = decodeClassAbsenceValue(rawValue);
        const mergeTeacher = commonLessons?.[day]?.[periodKey]?.[classId];
        const isMergedAndPresent = mergeTeacher && !isTeacherAbsent(mergeTeacher);

        if (isMergedAndPresent) {
          acc[classId] = COMMON_LESSON_LABEL;
          return acc;
        }

        const isCommonLesson = absentId === COMMON_LESSON_LABEL;
        if (isCommonLesson) {
          // Ortak ders belirli bir mazeretliye bağlıysa, o mazeretli bugün izinli değilse filtrele
          const hasActiveOwner = (absentIds || []).length === 0 || (absentIds || []).some((id) => absentIdsForCurrentDay.has(id));
          if (commonLessonOwnerId && !hasActiveOwner) {
            return acc;
          }
          // Derse ortak giren diğer öğretmen de bugün izinliyse, gruplar birleştirilemez!
          if (mergeTeacher && isTeacherAbsent(mergeTeacher)) {
            // İki öğretmen de izinli! Nöbetçi öğretmen görevlendirmesine dahil et
            acc[classId] = commonLessonOwnerId || absentId;
          } else {
            acc[classId] = COMMON_LESSON_LABEL;
          }
        } else if (allowDuty) {
          const activeAbsentIds = (absentIds || []).filter((id) => absentIdsForCurrentDay.has(id));
          if (activeAbsentIds.length > 0) {
            acc[classId] = activeAbsentIds.join(',');
          }
        }
        return acc;
      }, {});
      if (Object.keys(filtered).length > 0) {
        result[day][periodKey] = filtered;
      }
    });
    return result;
  }, [classAbsence, day, absentIdsForCurrentDay, commonLessons, absentPeople]);
}

export function useFilteredClassFree({
  classFree,
  classAbsence,
  day,
  periods,
  absentIdsForCurrentDay,
  commonLessons,
  absentPeople = []
}) {
  return useMemo(() => {
    const absentTeacherNames = new Set(
      absentPeople
        .filter(p => !Array.isArray(p.days) || p.days.length === 0 || p.days.includes(day))
        .map(p => normalizeForComparison(p?.name || p?.teacherName || p?.displayName || ''))
        .filter(Boolean)
    );

    const isTeacherAbsent = (tNameOrId) => {
      if (!tNameOrId) return false;
      const s = String(tNameOrId);
      if (absentIdsForCurrentDay.has(s)) return true;
      const norm = normalizeForComparison(s);
      return norm && absentTeacherNames.has(norm);
    };

    const result = { [day]: {} };
    const dayFree = classFree?.[day] || {};
    const dayAbsences = classAbsence?.[day] || {};

    periods.forEach((p) => {
      const freeSet = dayFree[p];
      const sourceIds = freeSet instanceof Set
        ? Array.from(freeSet)
        : Array.isArray(freeSet)
          ? freeSet
          : [];

      const filteredSet = new Set();
      sourceIds.forEach((classId) => {
        const rawAbs = dayAbsences?.[p]?.[classId];
        const mergeTeacher = commonLessons?.[day]?.[p]?.[classId];

        // Derse ortak giren diğer öğretmen okulda ise, ders birleştirilmiştir;
        // sınıf "boş" değildir ve nöbetçi ataması yapılmamalıdır!
        if (mergeTeacher && !isTeacherAbsent(mergeTeacher)) {
          return;
        }

        if (rawAbs) {
          const { absentId, absentIds, commonLessonOwnerId } = decodeClassAbsenceValue(rawAbs);
          if (absentId === COMMON_LESSON_LABEL) {
            // Başka bir tarihteki mazeretlinin ortak dersi bugün boş sayılmaz
            const hasActiveOwner = (absentIds || []).some((id) => absentIdsForCurrentDay.has(id));
            if (commonLessonOwnerId && !hasActiveOwner) {
              return;
            }
          } else if (absentIds && absentIds.length > 0) {
            // Başka bir tarihteki mazeretlinin boş dersi bugün boş sayılmaz
            const hasActive = absentIds.some((id) => absentIdsForCurrentDay.has(id));
            if (!hasActive) {
              return;
            }
          }
        }
        filteredSet.add(classId);
      });

      // Eğer derse ortak giren diğer öğretmen de mazeretliyse, grup birleştirilemez ve ders nöbetçi görevlendirmesine eklenmelidir!
      Object.entries(dayAbsences[p] || {}).forEach(([classId, rawAbs]) => {
        const { absentId, absentIds, commonLessonOwnerId } = decodeClassAbsenceValue(rawAbs);
        const mergeTeacher = commonLessons?.[day]?.[p]?.[classId];
        if (absentId === COMMON_LESSON_LABEL) {
          const hasActiveOwner = (absentIds || []).some((id) => absentIdsForCurrentDay.has(id));
          if (commonLessonOwnerId && !hasActiveOwner) return;
          if (mergeTeacher && isTeacherAbsent(mergeTeacher)) {
            filteredSet.add(classId);
          }
        } else if (mergeTeacher && isTeacherAbsent(mergeTeacher) && (absentIds || []).some((id) => absentIdsForCurrentDay.has(id))) {
          filteredSet.add(classId);
        }
      });

      result[day][p] = filteredSet;
    });

    return result;
  }, [classFree, classAbsence, day, periods, absentIdsForCurrentDay, commonLessons, absentPeople]);
}

