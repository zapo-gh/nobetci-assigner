// @ts-nocheck
import { useMemo } from 'react';
import { normalizeForComparison } from '../utils/nameNormalization.js';
import { APP_ENV } from '../config/index.js';
import { logger } from '../utils/logger.js';

const IS_DEV_ENV = (APP_ENV.mode || 'development') !== 'production' && !APP_ENV.isTest;

export function useDutyTeacherFilter(teachers = [], pdfSchedule = {}, day = 'Mon', dutyZones = []) {
  return useMemo(() => {
    const dayMapping = {
      Mon: 'monday',
      Tue: 'tuesday',
      Wed: 'wednesday',
      Thu: 'thursday',
      Fri: 'friday',
      Sun: 'sunday',
      Sat: 'saturday',
    };
    const pdfDayKey = dayMapping[day] || 'monday';

    const hasAnyDutyLocations = teachers.some((t) => t.dutyLocations && Object.keys(t.dutyLocations).length > 0);
    const hasPdfScheduleForDay = pdfSchedule && typeof pdfSchedule === 'object' && 
                                 pdfSchedule[pdfDayKey] && typeof pdfSchedule[pdfDayKey] === 'object' && 
                                 Object.keys(pdfSchedule[pdfDayKey]).length > 0;

    let filteredTeachers = teachers;
    if (!hasAnyDutyLocations && !hasPdfScheduleForDay) {
      if (IS_DEV_ENV) {
        logger.warn('teachersForCurrentDay: no dutyLocations and no pdfSchedule available');
      }
      filteredTeachers = [...teachers];
    } else {
      const dutyTeacherIds = new Set();
      const dutyTeacherNames = new Set();

      if (hasPdfScheduleForDay) {
        const daySchedule = pdfSchedule[pdfDayKey];
        Object.values(daySchedule).forEach((periodTeachers) => {
          let teacherNames = [];
          if (Array.isArray(periodTeachers)) {
            teacherNames = periodTeachers;
          } else if (typeof periodTeachers === 'string' && periodTeachers.trim()) {
            teacherNames = [periodTeachers];
          }

          teacherNames.forEach((teacherName) => {
            if (!teacherName || typeof teacherName !== 'string') return;

            const normalizedScheduleName = normalizeForComparison(teacherName.trim());
            dutyTeacherNames.add(normalizedScheduleName);

            const matchingTeacher = teachers.find((t) => {
              if (!t?.teacherName) return false;
              return normalizeForComparison(t.teacherName) === normalizedScheduleName;
            });

            if (matchingTeacher) {
              dutyTeacherIds.add(matchingTeacher.teacherId);
            }
          });
        });
      }

      filteredTeachers = teachers.filter((t) => {
        if (!t?.teacherId) return false;

        // Herhangi bir öğretmenin nöbet günleri 'dutyLocations' içinde belirtilmişse
        // O öğretmenin bugünkü görevi olup olmadığına bakarız
        if (t.dutyLocations && Object.keys(t.dutyLocations).length > 0) {
          return !!(t.dutyLocations[pdfDayKey] || t.dutyLocations[day]);
        }

        // Öğretmenin dutyLocations verisi yoksa ama PDF schedule varsa
        if (hasPdfScheduleForDay) {
          if (dutyTeacherIds.has(t.teacherId)) return true;
          const normalizedTeacherName = normalizeForComparison(t.teacherName);
          return dutyTeacherNames.has(normalizedTeacherName);
        }

        // Eğer öğretmenin dutyLocations'u yoksa, ve PDF schedule da yoksa onu gösterelim
        return true;
      });
    }

    // Nöbet Yerleri menüsündeki sıralamaya göre diz
    const zoneOrderMap = new Map((dutyZones || []).map((z, idx) => [z.name?.trim().toLowerCase(), idx]));
    const getZoneRank = (t) => {
      if (!t?.dutyLocations) return 9999;
      const loc = t.dutyLocations[pdfDayKey] || t.dutyLocations[day] || '';
      const normLoc = typeof loc === 'string' ? loc.trim().toLowerCase() : '';
      if (normLoc && zoneOrderMap.has(normLoc)) {
        return zoneOrderMap.get(normLoc);
      }
      return 9999;
    };

    const sortedTeachers = [...filteredTeachers].sort((a, b) => {
      const rankA = getZoneRank(a);
      const rankB = getZoneRank(b);
      if (rankA !== rankB) return rankA - rankB;
      return (a.teacherName || '').localeCompare(b.teacherName || '', 'tr');
    });

    if (IS_DEV_ENV) {
      logger.log('Filtered teachers count:', sortedTeachers.length);
    }

    return sortedTeachers;
  }, [teachers, pdfSchedule, day, dutyZones]);
}

