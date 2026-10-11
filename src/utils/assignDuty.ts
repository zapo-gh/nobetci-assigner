// @ts-nocheck
import { toInt } from './helpers.js';
import { logger } from './logger.js';
import { getClassroomName, isImesLesson } from './classNameUtils.js';
import { normalizeForComparison } from './nameNormalization.js';

export const MANUAL_EMPTY_TEACHER_ID = '__MANUAL_EMPTY__';
export const MANUAL_ADMIN_TEACHER_ID = '__MANUAL_ADMIN__';

export function getZoneFloor(zoneName) {
  if (!zoneName || typeof zoneName !== 'string') return null;
  const upper = zoneName.trim().toLocaleUpperCase('tr-TR');

  // Bodrum
  if (upper.includes('BODRUM') || upper.includes('BOD.') || /(?:^|\s)-1\s*\.?\s*KAT/i.test(upper) || upper === '-1' || upper === '-1. KAT') {
    return -1;
  }
  // Zemin / Giriş / Bahçe
  if (upper.includes('ZEMİN') || upper.includes('ZEMIN') || upper.includes('GİRİŞ') || upper.includes('GIRIS')) return 0;
  if (upper.includes('BAHÇE') || upper.includes('BAHCE')) return 0;

  // Numeric floor: "1. KAT", "2. KAT", "3. KAT", "1.KAT", "4. KAT"
  const m = upper.match(/(\d+)\s*\.?\s*KAT/);
  if (m) {
    return parseInt(m[1], 10);
  }

  // Classroom or Zone prefix letters:
  // A-01, A- ZEMİN KAT, A KAT -> 0 (Zemin)
  // B-02, B - 1. KAT, B KAT -> 1
  // C-03, C - 2. KAT, C KAT -> 2
  // D-04, D - 3. KAT, D KAT -> 3
  if (/^A[\s\-_]/.test(upper) || upper === 'A') return 0;
  if (/^B[\s\-_]/.test(upper) || upper === 'B') return 1;
  if (/^C[\s\-_]/.test(upper) || upper === 'C') return 2;
  if (/^D[\s\-_]/.test(upper) || upper === 'D') return 3;

  return null;
}

export function getZoneDistance(requiredZone, teacherZone) {
  if (!requiredZone || !teacherZone) return 999;

  const normReq = String(requiredZone).trim().toLocaleUpperCase('tr-TR');
  const normTeach = String(teacherZone).trim().toLocaleUpperCase('tr-TR');

  // Exact match -> distance 0
  if (normReq === normTeach) return 0;

  const floorReq = getZoneFloor(requiredZone);
  const floorTeach = getZoneFloor(teacherZone);

  if (floorReq !== null && floorTeach !== null) {
    return Math.abs(floorReq - floorTeach);
  }

  return 999;
}

const systemDayMap = {
  Sun: 'sunday', Mon: 'monday', Tue: 'tuesday', Wed: 'wednesday', Thu: 'thursday', Fri: 'friday', Sat: 'saturday',
  monday: 'monday', tuesday: 'tuesday', wednesday: 'wednesday', thursday: 'thursday', friday: 'friday',
  Pazartesi: 'monday', Salı: 'tuesday', Çarşamba: 'wednesday', Perşembe: 'thursday', Cuma: 'friday',
  Pzt: 'monday', Sal: 'tuesday', Çar: 'wednesday', Per: 'thursday', Cum: 'friday',
};

function cloneSetMap(setMap = {}) {
  const out = {};
  Object.keys(setMap).forEach((key) => {
    const value = setMap[key];
    if (value instanceof Set) {
      out[key] = new Set(value);
    } else if (Array.isArray(value)) {
      out[key] = new Set(value);
    } else if (value && typeof value === 'object') {
      out[key] = cloneSetMap(value);
    } else {
      out[key] = value;
    }
  });
  return out;
}

function normalizeRuleEngine(ruleEngine = {}) {
  const blockedSlots = Array.isArray(ruleEngine?.blockedSlots) ? ruleEngine.blockedSlots : [];
  const blockedSlotSet = new Set();

  blockedSlots.forEach((rule) => {
    if (!rule || typeof rule !== 'object') return;
    const teacherId = String(rule.teacherId || '').trim();
    const day = String(rule.day || '').trim();
    const periodNum = Number.parseInt(rule.period, 10);
    if (!teacherId || !day || !Number.isFinite(periodNum)) return;
    blockedSlotSet.add(`${teacherId}|${day}|${periodNum}`);
  });

  return {
    blockedSlotSet,
    singleDutyPerDay: !!ruleEngine?.singleDutyPerDay,
  };
}

function violatesRuleEngine({ day, period, teacherId, dutyCount, ruleEngine }) {
  if (!teacherId || !ruleEngine) return false;
  const slotKey = `${teacherId}|${day}|${Number(period)}`;
  if (ruleEngine.blockedSlotSet?.has(slotKey)) return true;
  if (ruleEngine.singleDutyPerDay && (dutyCount?.[day]?.[teacherId] || 0) >= 1) return true;
  return false;
}

function compareCandidates(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  // Aşırı görev dengesizliğini engelleme:
  // Eğer her iki aday da boş dersi olan nöbetçilerse (Tier 1 veya Tier 3) ve
  // görev sayısı farkı >= 2 ise (veya birinin 2+ görevi varken diğeri 0 görevliyse),
  // tek bir öğretmene 3-4 görev yığılmasını önlemek için adalet (currentDuty) önceliklendirilir.
  const bothFree = (a.tier === 1 || a.tier === 3) && (b.tier === 1 || b.tier === 3);
  if (bothFree) {
    const dutyDiff = (a.currentDuty ?? 0) - (b.currentDuty ?? 0);
    if (Math.abs(dutyDiff) >= 2 || ((a.currentDuty ?? 0) >= 2 && (b.currentDuty ?? 0) === 0) || ((b.currentDuty ?? 0) >= 2 && (a.currentDuty ?? 0) === 0)) {
      if (a.currentDuty !== b.currentDuty) return (a.currentDuty ?? 0) - (b.currentDuty ?? 0);
    }
  }

  // 1. Tier (1: Same floor free, 2: Same floor busy, 3: Nearest floor free, 4: Nearest floor busy)
  if (a.tier !== b.tier) return (a.tier ?? 999) - (b.tier ?? 999);

  // 2. Floor distance
  if (a.distance !== b.distance) return (a.distance ?? 999) - (b.distance ?? 999);

  // 3. Fairness: fewer duties assigned today first
  if (a.currentDuty !== b.currentDuty) return (a.currentDuty ?? 0) - (b.currentDuty ?? 0);

  // 4. Consecutive penalty
  if (a.consecutivePenalty !== b.consecutivePenalty) return (a.consecutivePenalty ?? 0) - (b.consecutivePenalty ?? 0);

  // 5. Availability count (tie-breaker: prefer saving teachers with fewer available periods)
  if (a.availabilityCount !== b.availabilityCount) return (a.availabilityCount ?? 999) - (b.availabilityCount ?? 999);

  // 6. Deterministic tie-breaker
  return String(a.tid || '').localeCompare(String(b.tid || ''));
}

export function assignDuties({
  teachers,
  freeTeachers,
  classes = [],
  freeClasses,
  locked,
  options,
  commonLessons,
  classLocations,
  locationZoneMapping,
  absentPeople = [],
}) {
  if (!Array.isArray(teachers) || !teachers.length) {
    return { schedule: {}, unassigned: {} };
  }

  const byDay = {};
  const unassignedByDay = {};
  const dutyCount = {};
  const lastAssignedPeriod = {};
  const maxPerDay = Object.fromEntries(teachers.map(t => [t.teacherId, toInt(t.maxDutyPerDay, 6)]));
  const parsed = parseInt(options?.maxClassesPerSlot, 10);
  const maxPerSlot = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  const ignoreConsecutiveLimit = !!options?.ignoreConsecutiveLimit;
  const ruleEngine = normalizeRuleEngine(options?.ruleEngine);

  const classNameById = new Map((classes || []).map(c => [c.classId, c.className]));

  const validTeacherIds = new Set();
  const duplicateTeacherIds = new Set();
  const teacherDutyLocations = {};
  const teacherMapById = new Map();
  teachers.forEach((teacher) => {
    if (!teacher?.teacherId) return;
    if (validTeacherIds.has(teacher.teacherId)) {
      duplicateTeacherIds.add(teacher.teacherId);
    }
    validTeacherIds.add(teacher.teacherId);
    teacherMapById.set(teacher.teacherId, teacher);
    teacherDutyLocations[teacher.teacherId] = teacher.dutyLocations || {};
  });

  if (duplicateTeacherIds.size > 0) {
    logger.warn(
      '[assignDuties] Yinelenen teacherId tespit edildi:',
      Array.from(duplicateTeacherIds.values())
    );
  }

  const absentTeacherIds = new Set();
  const absentTeacherNames = new Set();
  (absentPeople || []).forEach(p => {
    if (!p) return;
    if (p.absentId) absentTeacherIds.add(String(p.absentId));
    if (p.teacherId) absentTeacherIds.add(String(p.teacherId));
    const name = p.name || p.teacherName || p.displayName;
    if (name) absentTeacherNames.add(normalizeForComparison(name));
  });

  const isTeacherAbsentForDay = (tid, day) => {
    if (absentTeacherIds.has(tid)) return true;
    const teacher = teacherMapById.get(tid);
    if (teacher?.teacherName && absentTeacherNames.has(normalizeForComparison(teacher.teacherName))) return true;
    const person = (absentPeople || []).find(p =>
      p.absentId === tid || p.teacherId === tid ||
      (p.name && teacher?.teacherName && normalizeForComparison(p.name) === normalizeForComparison(teacher.teacherName))
    );
    if (person && Array.isArray(person.days) && person.days.length > 0 && !person.days.includes(day)) {
      return false;
    }
    return false;
  };

  const allDays = Array.from(
    new Set([
      ...Object.keys(freeTeachers || {}),
      ...Object.keys(freeClasses || {})
    ])
  );

  for (const day of allDays) {
    byDay[day] = {};
    dutyCount[day] = {};
    lastAssignedPeriod[day] = {};
    const slotUsage = {};
    const teacherAvailabilityCount = {};

    Object.values(freeTeachers?.[day] || {}).forEach((teacherIds) => {
      const periodSet = teacherIds instanceof Set
        ? teacherIds
        : new Set(Array.isArray(teacherIds) ? teacherIds : []);
      periodSet.forEach((teacherId) => {
        teacherAvailabilityCount[teacherId] = (teacherAvailabilityCount[teacherId] || 0) + 1;
      });
    });

    const activeTeacherIdsForDay = Array.from(validTeacherIds).filter(tid => !isTeacherAbsentForDay(tid, day));

    const dayPeriods = Array.from(
      new Set([
        ...Object.keys(freeTeachers?.[day] || {}),
        ...Object.keys(freeClasses?.[day] || {})
      ])
    )
      .map(p => Number(p))
      .filter(p => Number.isFinite(p))
      .sort((a, b) => a - b);

    for (const period of dayPeriods) {
      const p = String(period);
      const freeT = new Set(freeTeachers?.[day]?.[p] || freeTeachers?.[day]?.[period] || []);
      const freeC = new Set(freeClasses?.[day]?.[p] || freeClasses?.[day]?.[period] || []);

      // İMES dersleri okul dışı görev olduğu için nöbetçi öğretmen atanmaz
      Array.from(freeC).forEach(classId => {
        const cName = classNameById.get(classId);
        if (isImesLesson(cName)) {
          freeC.delete(classId);
        }
      });

      if (commonLessons?.[day]?.[period] || commonLessons?.[day]?.[p]) {
        const commObj = commonLessons?.[day]?.[period] || commonLessons?.[day]?.[p] || {};
        Object.keys(commObj).forEach(classId => {
          freeC.delete(classId);
        });
      }

      byDay[day][p] = [];
      if (!slotUsage[period]) slotUsage[period] = {};

      // 1) Kilitli atamalar
      const locksForSlot = Object.entries(locked || {}).filter(([k]) => k.startsWith(`${day}|${period}|`));
      for (const [key, tId] of locksForSlot) {
        const classId = key.split('|')[2];
        if (tId === MANUAL_EMPTY_TEACHER_ID || tId === MANUAL_ADMIN_TEACHER_ID) {
          freeC.delete(classId);
          continue;
        }
        if (!validTeacherIds.has(tId)) {
          continue;
        }
        if (freeC.has(classId)) {
          pushAssign(day, p, classId, tId, byDay, dutyCount, slotUsage, lastAssignedPeriod);
          freeC.delete(classId);
        }
      }

      const resolveClassZone = (classId) => {
        const className = classNameById.get(classId) || classId;
        const sysDay = systemDayMap[day] || day?.toLowerCase?.() || day;

        let cLocObj = classLocations?.[className]?.[day]?.[period] ||
                      classLocations?.[className]?.[sysDay]?.[period] ||
                      classLocations?.[classId]?.[day]?.[period] ||
                      classLocations?.[classId]?.[sysDay]?.[period];
        let cLoc = cLocObj ? (typeof cLocObj === 'string' ? cLocObj : cLocObj.location) : null;
        if (!cLoc) {
          cLoc = getClassroomName(classLocations, className, day);
        }
        if (!cLoc && className !== classId) {
          cLoc = getClassroomName(classLocations, classId, day);
        }

        let requiredZone = null;
        if (cLoc) {
          requiredZone = locationZoneMapping?.[cLoc] || null;
          if (!requiredZone && cLoc.includes('/')) {
            const primary = cLoc.split('/')[0].trim();
            requiredZone = locationZoneMapping?.[primary] || null;
          }
        }
        return { cLoc, requiredZone };
      };

      const getTeacherZone = (tid) => {
        const sysDay = systemDayMap[day] || day?.toLowerCase?.() || day;
        return teacherDutyLocations[tid]?.[sysDay] || teacherDutyLocations[tid]?.[day] || null;
      };

      const evaluateCandidate = (classId, tid, requiredZone, cLoc) => {
        const teacherZone = getTeacherZone(tid);
        let distance = 999;
        if (requiredZone && teacherZone) {
          distance = getZoneDistance(requiredZone, teacherZone);
        } else if (cLoc && teacherZone) {
          distance = getZoneDistance(cLoc, teacherZone);
        }

        const isFree = freeT.has(tid);

        // Dersi olan öğretmen (!isFree), yalnızca nöbet yeri tanımlıysa (aynı katta veya en yakın görev yerinde) atanabilir
        if (!isFree && (distance === 999 || !teacherZone)) {
          return null;
        }

        let tier = 4;
        if (distance === 0) {
          tier = isFree ? 1 : 2;
        } else {
          tier = isFree ? 3 : 4;
        }

        const currentDuty = dutyCount[day]?.[tid] || 0;
        const availabilityCount = teacherAvailabilityCount[tid] || 999;
        const lastPeriod = lastAssignedPeriod[day]?.[tid];
        const consecutivePenalty =
          Number.isFinite(lastPeriod) && Number.isFinite(period) && period - lastPeriod === 1
            ? 50
            : 0;

        return {
          classId,
          tid,
          tier,
          distance,
          currentDuty,
          consecutivePenalty,
          availabilityCount,
        };
      };

      // 2) İlk Tur: Her öğretmene en fazla 1 sınıf (slotUsage == 0)
      while (freeC.size > 0) {
        let bestCandidate = null;
        const remainingClassIds = Array.from(freeC);

        for (const classId of remainingClassIds) {
          const { cLoc, requiredZone } = resolveClassZone(classId);

          const eligible = activeTeacherIdsForDay.filter(tid =>
            (slotUsage[period]?.[tid] || 0) === 0 &&
            canAssign({
              day,
              period,
              teacherId: tid,
              byDay,
              dutyCount,
              maxPerDay,
              options,
              slotUsage,
              maxPerSlot,
              ignoreConsecutiveLimit,
              ruleEngine
            })
          );

          for (const tid of eligible) {
            const cand = evaluateCandidate(classId, tid, requiredZone, cLoc);
            if (!cand) continue;
            if (!bestCandidate || compareCandidates(cand, bestCandidate) < 0) {
              bestCandidate = cand;
            }
          }
        }

        if (!bestCandidate) {
          break;
        }

        pushAssign(day, p, bestCandidate.classId, bestCandidate.tid, byDay, dutyCount, slotUsage, lastAssignedPeriod);
        freeC.delete(bestCandidate.classId);
      }

      // 3) İkinci Tur: maxPerSlot > 1 ise ilave sınıflar
      if (maxPerSlot > 1 && freeC.size > 0) {
        while (freeC.size > 0) {
          let bestCandidate = null;
          const remainingClassIds = Array.from(freeC);

          for (const classId of remainingClassIds) {
            const { cLoc, requiredZone } = resolveClassZone(classId);

            const eligible = activeTeacherIdsForDay.filter(tid =>
              (slotUsage[period]?.[tid] || 0) < maxPerSlot &&
              canAssign({
                day,
                period,
                teacherId: tid,
                byDay,
                dutyCount,
                maxPerDay,
                options,
                slotUsage,
                maxPerSlot,
                ignoreConsecutiveLimit,
                ruleEngine
              })
            );

            for (const tid of eligible) {
              const cand = evaluateCandidate(classId, tid, requiredZone, cLoc);
              if (!cand) continue;
              if (!bestCandidate || compareCandidates(cand, bestCandidate) < 0) {
                bestCandidate = cand;
              }
            }
          }

          if (!bestCandidate) {
            break;
          }

          pushAssign(day, p, bestCandidate.classId, bestCandidate.tid, byDay, dutyCount, slotUsage, lastAssignedPeriod);
          freeC.delete(bestCandidate.classId);
        }
      }

      if (freeC.size > 0) {
        if (!unassignedByDay[day]) unassignedByDay[day] = {};
        unassignedByDay[day][period] = Array.from(freeC);
      }
    }
  }

  return { schedule: byDay, unassigned: unassignedByDay };
}

function pushAssign(day, p, classId, teacherId, byDay, dutyCount, slotUsage, lastAssignedPeriod) {
  byDay[day][p].push({ classId, teacherId });
  dutyCount[day][teacherId] = (dutyCount[day][teacherId] || 0) + 1;
  const period = +p;
  if (!slotUsage[period]) slotUsage[period] = {};
  slotUsage[period][teacherId] = (slotUsage[period][teacherId] || 0) + 1;
  if (!lastAssignedPeriod[day]) lastAssignedPeriod[day] = {};
  lastAssignedPeriod[day][teacherId] = Math.max(
    lastAssignedPeriod[day][teacherId] ?? -Infinity,
    Number.isFinite(period) ? period : parseInt(p, 10)
  );
}

function canAssign({ day, period, teacherId, byDay, dutyCount, maxPerDay, options, slotUsage, maxPerSlot, ignoreConsecutiveLimit, ruleEngine }) {
  if (violatesRuleEngine({ day, period, teacherId, dutyCount, ruleEngine })) return false;

  // 1. Günlük görev limiti kontrolü
  if ((dutyCount[day]?.[teacherId] || 0) >= (maxPerDay[teacherId] || 6)) return false;

  // 2. Aynı saatte kapasite kontrolü
  const used = slotUsage[period]?.[teacherId] || 0;
  if (used >= maxPerSlot) return false;

  // 3. Ardışık saat engeli
  if (options?.preventConsecutive && !ignoreConsecutiveLimit && used === 0) {
    const prev = byDay[day]?.[period - 1] || [];
    const next = byDay[day]?.[period + 1] || [];
    const prevHit = prev.some(x => x.teacherId === teacherId);
    const nextHit = next.some(x => x.teacherId === teacherId);
    if (prevHit || nextHit) return false;
  }

  return true;
}

export function applyFairnessAdjustments({
  baseSchedule,
  day,
  periods,
  classes = [],
  teachersForCurrentDay,
  freeTeachersByDay,
  freeClassesByDay,
  commonLessons,
  locked,
  options,
  teacherMap,
  classLocations,
  locationZoneMapping,
  absentPeople = []
}) {
  if (!baseSchedule || !baseSchedule[day]) return baseSchedule;
  const daySchedule = baseSchedule[day] || {};
  const freeMap = freeTeachersByDay[day] || {};
  const dayFreeClasses = freeClassesByDay?.[day] || {};
  const dayCommonLessons = commonLessons?.[day] || {};

  const classNameById = new Map((classes || []).map(c => [c.classId, c.className]));

  const absentTeacherIds = new Set();
  const absentTeacherNames = new Set();
  (absentPeople || []).forEach(p => {
    if (!p) return;
    if (Array.isArray(p.days) && p.days.length > 0 && !p.days.includes(day)) return;
    if (p.absentId) absentTeacherIds.add(String(p.absentId));
    if (p.teacherId) absentTeacherIds.add(String(p.teacherId));
    const name = p.name || p.teacherName || p.displayName;
    if (name) absentTeacherNames.add(normalizeForComparison(name));
  });

  const isTeacherAbsent = (tid) => {
    if (absentTeacherIds.has(tid)) return true;
    const teacher = teacherMap?.get(tid);
    if (teacher?.teacherName && absentTeacherNames.has(normalizeForComparison(teacher.teacherName))) return true;
    return false;
  };

  const assignmentCounts = {};
  const teacherPeriods = {};
  const slotUsage = {};

  periods.forEach((period) => {
    const rows = daySchedule[period] || [];
    slotUsage[period] = {};
    rows.forEach(({ teacherId }) => {
      if (!teacherId) return;
      assignmentCounts[teacherId] = (assignmentCounts[teacherId] || 0) + 1;
      slotUsage[period][teacherId] = (slotUsage[period][teacherId] || 0) + 1;
      if (!teacherPeriods[teacherId]) teacherPeriods[teacherId] = [];
      teacherPeriods[teacherId].push(period);
    });
  });
  Object.values(teacherPeriods).forEach(list => list.sort((a, b) => a - b));

  const dayNeedsByPeriod = new Map();
  periods.forEach((period) => {
    const baseSet = dayFreeClasses?.[period];
    const needed = baseSet instanceof Set
      ? new Set(baseSet)
      : new Set(Array.isArray(baseSet) ? baseSet : []);
    (daySchedule[period] || []).forEach(({ classId }) => needed.delete(classId));
    Array.from(needed).forEach(classId => {
      const cName = classNameById.get(classId);
      if (isImesLesson(cName)) needed.delete(classId);
    });
    dayNeedsByPeriod.set(period, needed);
  });

  const zeroDutyTeachers = (teachersForCurrentDay || [])
    .map(t => t?.teacherId)
    .filter(id => id && !isTeacherAbsent(id) && (assignmentCounts[id] || 0) === 0);

  if (zeroDutyTeachers.length === 0) {
    return baseSchedule;
  }

  const parsedMaxPerSlot = Number.parseInt(options?.maxClassesPerSlot, 10);
  const maxPerSlot = Number.isFinite(parsedMaxPerSlot) && parsedMaxPerSlot > 0 ? parsedMaxPerSlot : 1;
  const ruleEngine = normalizeRuleEngine(options?.ruleEngine);

  const isTeacherFree = (period, teacherId) => {
    const source = freeMap[period];
    if (!source) return false;
    if (source instanceof Set) return source.has(teacherId);
    if (Array.isArray(source)) return source.includes(teacherId);
    return false;
  };

  const hasConsecutiveConflict = (teacherId, targetPeriod) => {
    if (!options?.preventConsecutive) return false;
    const assigned = teacherPeriods[teacherId] || [];
    return assigned.some(p => Math.abs(p - targetPeriod) === 1);
  };

  let adjustedSchedule = baseSchedule;
  let adjustedDay = daySchedule;
  let changed = false;

  const ensureClone = () => {
    if (changed) return;
    adjustedDay = Object.fromEntries(
      Object.entries(daySchedule).map(([period, assignments]) => [
        period,
        Array.isArray(assignments) ? assignments.map(item => ({ ...item })) : [],
      ])
    );
    adjustedSchedule = { ...baseSchedule, [day]: adjustedDay };
    changed = true;
  };

  const getMaxDuty = (teacherId) => {
    const record = teacherMap?.get(teacherId);
    const parsed = Number.parseInt(record?.maxDutyPerDay, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 6;
  };

  const assignmentCountsByDay = {
    [day]: assignmentCounts,
  };

  const canTakePeriod = (teacherId, period) => {
    if (isTeacherAbsent(teacherId)) return false;
    if (violatesRuleEngine({ day, period, teacherId, dutyCount: assignmentCountsByDay, ruleEngine })) return false;
    if (!isTeacherFree(period, teacherId)) return false;
    if ((assignmentCounts[teacherId] || 0) >= getMaxDuty(teacherId)) return false;
    if ((slotUsage[period]?.[teacherId] || 0) >= maxPerSlot) return false;
    if (hasConsecutiveConflict(teacherId, period)) return false;
    return true;
  };

  const canTakePeriodForBalance = (teacherId, period) => {
    if (isTeacherAbsent(teacherId)) return false;
    if (violatesRuleEngine({ day, period, teacherId, dutyCount: assignmentCountsByDay, ruleEngine })) return false;
    if (!isTeacherFree(period, teacherId)) return false;
    if ((assignmentCounts[teacherId] || 0) >= getMaxDuty(teacherId)) return false;
    if ((slotUsage[period]?.[teacherId] || 0) >= maxPerSlot) return false;
    return true;
  };

  const tryFillFromNeeds = (teacherId, availablePeriods) => {
    for (const period of availablePeriods) {
      const needSet = dayNeedsByPeriod.get(period);
      if (!needSet || needSet.size === 0) continue;

      for (const classId of Array.from(needSet)) {
        const lockKey = `${day}|${period}|${classId}`;
        const lockOwner = locked?.[lockKey];
        if (lockOwner) continue;
        if (dayCommonLessons?.[period]?.[classId]) continue;
        if (!canTakePeriod(teacherId, period)) continue;

        ensureClone();
        if (!adjustedDay[period]) adjustedDay[period] = [];
        adjustedDay[period].push({ classId, teacherId });
        assignmentCounts[teacherId] = (assignmentCounts[teacherId] || 0) + 1;
        teacherPeriods[teacherId] = [...(teacherPeriods[teacherId] || []), period].sort((a, b) => a - b);
        slotUsage[period] = slotUsage[period] || {};
        slotUsage[period][teacherId] = (slotUsage[period][teacherId] || 0) + 1;
        needSet.delete(classId);
        return true;
      }
    }
    return false;
  };

  const trySwapAssignments = (teacherId, availablePeriods) => {
    for (const period of availablePeriods) {
      const assignments = adjustedDay[period] || [];
      if (!assignments.length) continue;

      const candidates = assignments
        .map((assignment, idx) => {
          const className = classNameById.get(assignment.classId) || assignment.classId;
          const sysDay = systemDayMap[day] || day?.toLowerCase?.() || day;
          let cLocObj = classLocations?.[className]?.[day]?.[period] ||
                        classLocations?.[className]?.[sysDay]?.[period] ||
                        classLocations?.[assignment.classId]?.[day]?.[period] ||
                        classLocations?.[assignment.classId]?.[sysDay]?.[period];
          let cLoc = cLocObj ? (typeof cLocObj === 'string' ? cLocObj : cLocObj.location) : null;
          if (!cLoc) {
            cLoc = getClassroomName(classLocations, className, day);
          }
          if (!cLoc && className !== assignment.classId) {
            cLoc = getClassroomName(classLocations, assignment.classId, day);
          }
          let requiredZone = cLoc ? locationZoneMapping?.[cLoc] : null;
          if (!requiredZone && cLoc && cLoc.includes('/')) {
            requiredZone = locationZoneMapping?.[cLoc.split('/')[0].trim()] || null;
          }

          const donorZone = teacherMap?.get(assignment.teacherId)?.dutyLocations?.[sysDay] || teacherMap?.get(assignment.teacherId)?.dutyLocations?.[day];
          const receiverZone = teacherMap?.get(teacherId)?.dutyLocations?.[sysDay] || teacherMap?.get(teacherId)?.dutyLocations?.[day];

          const donorDist = (requiredZone || cLoc) && donorZone ? getZoneDistance(requiredZone || cLoc, donorZone) : 999;
          const receiverDist = (requiredZone || cLoc) && receiverZone ? getZoneDistance(requiredZone || cLoc, receiverZone) : 999;

          // Eğer donor aynı kattaysa (0) ve alıcı aynı katta değilse (>0), veya donor daha yakınsa, bu atamayı çalma!
          // ANCAK: Donora 3 veya daha fazla görev yığılmışsa ya da (donorCount - receiverCount >= 2 ve alıcı makul mesafedeyse receiverDist <= 2),
          // bir öğretmene 3-4 görev yığılmasını önlemek ve okul genelinde adaleti sağlamak için koruma esnetilir.
          const receiverCount = assignmentCounts[teacherId] || 0;
          const donorCount = assignmentCounts[assignment.teacherId] || 0;
          const isHeavyOverload = donorCount >= 3 || (donorCount - receiverCount >= 2 && receiverDist <= 2);
          const isZoneProtected = !isHeavyOverload && ((donorDist === 0 && receiverDist > 0) || (donorDist < receiverDist));

          return {
            idx,
            classId: assignment.classId,
            teacherId: assignment.teacherId,
            donorCount,
            isZoneProtected
          };
        })
        .filter(candidate =>
          candidate.teacherId &&
          candidate.teacherId !== teacherId &&
          candidate.donorCount > (assignmentCounts[teacherId] || 0) &&
          candidate.donorCount > 1 &&
          !candidate.isZoneProtected
        )
        .sort((a, b) => b.donorCount - a.donorCount || a.idx - b.idx);

      for (const candidate of candidates) {
        const lockKey = `${day}|${period}|${candidate.classId}`;
        const lockOwner = locked?.[lockKey];
        if (lockOwner) continue;
        if (!canTakePeriod(teacherId, period)) continue;

        ensureClone();
        assignments[candidate.idx] = { classId: candidate.classId, teacherId };

        assignmentCounts[candidate.teacherId] = Math.max(
          (assignmentCounts[candidate.teacherId] || 0) - 1,
          0
        );
        assignmentCounts[teacherId] = (assignmentCounts[teacherId] || 0) + 1;

        slotUsage[period] = slotUsage[period] || {};
        slotUsage[period][teacherId] = (slotUsage[period][teacherId] || 0) + 1;
        if (slotUsage[period][candidate.teacherId]) {
          slotUsage[period][candidate.teacherId] = Math.max(slotUsage[period][candidate.teacherId] - 1, 0);
        }

        const donorPeriods = [...(teacherPeriods[candidate.teacherId] || [])];
        const index = donorPeriods.indexOf(period);
        if (index >= 0) donorPeriods.splice(index, 1);
        teacherPeriods[candidate.teacherId] = donorPeriods;
        teacherPeriods[teacherId] = [...(teacherPeriods[teacherId] || []), period].sort((a, b) => a - b);
        return true;
      }
    }
    return false;
  };

  zeroDutyTeachers.forEach((teacherId) => {
    const availablePeriods = periods.filter((period) => isTeacherFree(period, teacherId));
    if (!availablePeriods.length) return;

    if (tryFillFromNeeds(teacherId, availablePeriods)) {
      return;
    }

    trySwapAssignments(teacherId, availablePeriods);
  });

  const dutyTeacherIds = (teachersForCurrentDay || [])
    .map((teacher) => teacher?.teacherId)
    .filter(id => id && !isTeacherAbsent(id));

  const tryBalanceBetweenTeachers = (receiverId, donorId) => {
    if (!receiverId || !donorId || receiverId === donorId) return false;
    const donorCount = assignmentCounts[donorId] || 0;
    const receiverCount = assignmentCounts[receiverId] || 0;
    if (donorCount <= receiverCount) return false;

    const donorAssignments = [];
    periods.forEach((period) => {
      const rows = adjustedDay[period] || [];
      rows.forEach((row, idx) => {
        if (row?.teacherId === donorId) {
          donorAssignments.push({ period, classId: row.classId, idx });
        }
      });
    });

    donorAssignments.sort((a, b) => a.period - b.period);

    for (const assignment of donorAssignments) {
      const { period, classId, idx } = assignment;
      const lockKey = `${day}|${period}|${classId}`;
      const lockOwner = locked?.[lockKey];
      if (lockOwner) continue;
      if (dayCommonLessons?.[period]?.[classId]) continue;

      const className = classNameById.get(classId) || classId;
      const sysDay = systemDayMap[day] || day?.toLowerCase?.() || day;
      let cLocObj = classLocations?.[className]?.[day]?.[period] ||
                    classLocations?.[className]?.[sysDay]?.[period] ||
                    classLocations?.[classId]?.[day]?.[period] ||
                    classLocations?.[classId]?.[sysDay]?.[period];
      let cLoc = cLocObj ? (typeof cLocObj === 'string' ? cLocObj : cLocObj.location) : null;
      if (!cLoc) {
        cLoc = getClassroomName(classLocations, className, day);
      }
      if (!cLoc && className !== classId) {
        cLoc = getClassroomName(classLocations, classId, day);
      }
      let requiredZone = cLoc ? locationZoneMapping?.[cLoc] : null;
      if (!requiredZone && cLoc && cLoc.includes('/')) {
        requiredZone = locationZoneMapping?.[cLoc.split('/')[0].trim()] || null;
      }

      const donorZone = teacherMap?.get(donorId)?.dutyLocations?.[sysDay] || teacherMap?.get(donorId)?.dutyLocations?.[day];
      const receiverZone = teacherMap?.get(receiverId)?.dutyLocations?.[sysDay] || teacherMap?.get(receiverId)?.dutyLocations?.[day];

      const donorDist = (requiredZone || cLoc) && donorZone ? getZoneDistance(requiredZone || cLoc, donorZone) : 999;
      const receiverDist = (requiredZone || cLoc) && receiverZone ? getZoneDistance(requiredZone || cLoc, receiverZone) : 999;

      // Don't steal a same-floor assignment if receiver is on another floor
      if (donorDist === 0 && receiverDist > 0) {
        continue;
      }

      const canTakeStrict = canTakePeriod(receiverId, period);
      const canTakeRelaxed = canTakePeriodForBalance(receiverId, period);
      if (!canTakeStrict && !canTakeRelaxed) continue;

      ensureClone();
      const rows = adjustedDay[period] || [];
      rows[idx] = { classId, teacherId: receiverId };

      assignmentCounts[donorId] = Math.max((assignmentCounts[donorId] || 0) - 1, 0);
      assignmentCounts[receiverId] = (assignmentCounts[receiverId] || 0) + 1;

      slotUsage[period] = slotUsage[period] || {};
      slotUsage[period][receiverId] = (slotUsage[period][receiverId] || 0) + 1;
      if (slotUsage[period][donorId]) {
        slotUsage[period][donorId] = Math.max(slotUsage[period][donorId] - 1, 0);
      }

      const donorPeriods = [...(teacherPeriods[donorId] || [])];
      const donorIndex = donorPeriods.indexOf(period);
      if (donorIndex >= 0) donorPeriods.splice(donorIndex, 1);
      teacherPeriods[donorId] = donorPeriods;
      teacherPeriods[receiverId] = [...(teacherPeriods[receiverId] || []), period].sort((x, y) => x - y);
      return true;
    }

    return false;
  };

  let balanceProgress = true;
  let balanceGuard = 0;
  while (balanceProgress && balanceGuard < 50) {
    balanceProgress = false;
    balanceGuard += 1;

    const sortedByDuty = [...dutyTeacherIds].sort((a, b) =>
      (assignmentCounts[a] || 0) - (assignmentCounts[b] || 0) || a.localeCompare(b)
    );

    const receivers = sortedByDuty;
    const donors = [...sortedByDuty].reverse();

    for (const receiverId of receivers) {
      for (const donorId of donors) {
        const donorCount = assignmentCounts[donorId] || 0;
        const receiverCount = assignmentCounts[receiverId] || 0;
        if (donorCount - receiverCount <= 1) continue;

        if (tryBalanceBetweenTeachers(receiverId, donorId)) {
          balanceProgress = true;
          break;
        }
      }
      if (balanceProgress) break;
    }
  }

  return changed ? adjustedSchedule : baseSchedule;
}
