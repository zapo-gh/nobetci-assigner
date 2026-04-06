import { DAYS } from '../constants/index.js';

export function normalizeAbsentPeople(list = [], classAbsence = {}) {
  if (!Array.isArray(list)) return [];

  const validDayKeys = new Set(DAYS.map(d => d.key));
  const usageMap = {};

  if (classAbsence && typeof classAbsence === 'object') {
    Object.entries(classAbsence).forEach(([dayKey, periodObj]) => {
      Object.values(periodObj || {}).forEach(byClass => {
        Object.values(byClass || {}).forEach(absentId => {
          if (!usageMap[absentId]) usageMap[absentId] = new Set();
          usageMap[absentId].add(dayKey);
        });
      });
    });
  }

  return list.map(item => {
    if (!item || typeof item !== 'object') return item;
    const rawDays = Array.isArray(item.days) ? item.days : [];
    let normalizedDays = rawDays.filter(dayKey => validDayKeys.has(dayKey));

    if (normalizedDays.length === 0) {
      const usageDays = usageMap[item.absentId];
      if (usageDays && usageDays.size > 0) {
        normalizedDays = Array.from(usageDays).filter(dayKey => validDayKeys.has(dayKey));
      }
    }

    if (normalizedDays.length === 0) {
      normalizedDays = Array.from(validDayKeys);
    } else {
      normalizedDays = Array.from(new Set(normalizedDays));
    }

    return {
      ...item,
      days: normalizedDays,
    };
  });
}
