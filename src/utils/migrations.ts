import { DAYS, PERIODS } from '../constants/index.js';

export function migrateClassFree(oldClassFree: any): any {
    // Case A: Already has day level (newer structure) → normalize inner values to Set
    if (oldClassFree && typeof oldClassFree === 'object' && Object.keys(oldClassFree).some(dayKey => typeof oldClassFree[dayKey] === 'object')) {
        const out: any = {};
        for (const d of Object.keys(oldClassFree)) {
            out[d] = {};
            const perObj = oldClassFree[d] || {};

            // First, convert all period values to Set, handling both string and number keys
            for (const pKey of Object.keys(perObj)) {
                const periodNum = Number(pKey);
                if (isNaN(periodNum) || !PERIODS.includes(periodNum)) continue;

                const val = perObj[pKey];
                out[d][periodNum] = val instanceof Set ? val : new Set(Array.isArray(val) ? val : []);
            }

            // Ensure all periods exist as Set (use number keys)
            for (const period of PERIODS) {
                if (!(out[d][period] instanceof Set)) {
                    out[d][period] = new Set();
                }
            }
        }
        // Ensure all days exist
        for (const dayObj of DAYS) {
            if (!out[dayObj.key]) {
                out[dayObj.key] = {};
                for (const period of PERIODS) out[dayObj.key][period] = new Set();
            }
        }
        return out;
    }

    // Case B: Very old structure {period: Set|Array} → expand to all days
    const newFormat: any = {};
    DAYS.forEach(dayObj => {
        newFormat[dayObj.key] = {};
        PERIODS.forEach(period => {
            newFormat[dayObj.key][period] = new Set();
        });
    });

    Object.keys(oldClassFree || {}).forEach(periodKey => {
        const periodNum = Number(periodKey);
        if (isNaN(periodNum) || !PERIODS.includes(periodNum)) return;

        if (oldClassFree[periodKey] instanceof Set || Array.isArray(oldClassFree[periodKey])) {
            const classSet = oldClassFree[periodKey] instanceof Set
                ? oldClassFree[periodKey]
                : new Set(oldClassFree[periodKey]);
            DAYS.forEach(dayObj => {
                newFormat[dayObj.key][periodNum] = new Set(classSet);
            });
        }
    });

    return newFormat;
}

export function migrateClassAbsence(oldClassAbsence: any): any {
    // If already in new format (has day level), return as is
    if (oldClassAbsence && typeof oldClassAbsence === 'object' && Object.keys(oldClassAbsence).some(day =>
        typeof oldClassAbsence[day] === 'object' &&
        Object.keys(oldClassAbsence[day]).some(period =>
            typeof oldClassAbsence[day][period] === 'object'
        )
    )) {
        return oldClassAbsence;
    }

    // Migrate from old format {period: {classId: absentId}} to new format {day: {period: {classId: absentId}}}
    const migrated: any = {};
    const currentDay = "Mon"; // Default to Monday for migration

    for (const [period, classData] of Object.entries(oldClassAbsence || {})) {
        if (typeof classData === 'object') {
            if (!migrated[currentDay]) migrated[currentDay] = {};
            migrated[currentDay][period] = classData;
        }
    }

    return migrated;
}

export function stableStringify(value: any): string {
    const seen = new WeakSet();
    return JSON.stringify(value, (key, val) => {
        if (val !== null && typeof val === 'object') {
            if (seen.has(val)) return;
            seen.add(val);
        }
        if (val instanceof Set) {
            return Array.from(val).sort();
        }
        return val;
    });
}

export function normalizeAbsentPeople(list: any[] = [], classAbsence: any = {}): any[] {
    if (!Array.isArray(list)) return [];

    const validDayKeys = new Set(DAYS.map(d => d.key));
    const usageMap: any = {};

    if (classAbsence && typeof classAbsence === 'object') {
        Object.entries(classAbsence).forEach(([dayKey, periodObj]: [string, any]) => {
            Object.values(periodObj || {}).forEach((byClass: any) => {
                Object.values(byClass || {}).forEach((absentId: any) => {
                    if (!usageMap[absentId]) usageMap[absentId] = new Set();
                    usageMap[absentId].add(dayKey);
                });
            });
        });
    }

    return list.map(item => {
        if (!item || typeof item !== 'object') return item;
        const rawDays = Array.isArray(item.days) ? item.days : [];
        let normalizedDays = rawDays.filter((dayKey: string) => validDayKeys.has(dayKey));

        if (normalizedDays.length === 0) {
            const usageDays = usageMap[item.absentId];
            if (usageDays && usageDays.size > 0) {
                normalizedDays = Array.from(usageDays).filter((dayKey: string) => validDayKeys.has(dayKey));
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
