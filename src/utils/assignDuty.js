import { toInt } from './helpers.js';

export const MANUAL_EMPTY_TEACHER_ID = '__MANUAL_EMPTY__'

function cloneSetMap(setMap = {}) {
  const out = {}
  Object.keys(setMap).forEach((key) => {
    const value = setMap[key]
    if (value instanceof Set) {
      out[key] = new Set(value)
    } else if (Array.isArray(value)) {
      out[key] = new Set(value)
    } else if (value && typeof value === 'object') {
      out[key] = cloneSetMap(value)
    } else {
      out[key] = value
    }
  })
  return out
}

function simulateAssignment({
  day,
  startPeriod,
  teacherId,
  classId,
  freeTeachersByDay,
  freeClassesByDay,
  byDay,
  dutyCount,
  maxPerDay,
  options,
  maxPerSlot,
  ignoreConsecutiveLimit,
  slotUsage,
  commonLessons,
  validTeacherIds,
}) {
  const simByDay = JSON.parse(JSON.stringify(byDay))
  const simDutyCount = JSON.parse(JSON.stringify(dutyCount))
  const simSlotUsage = JSON.parse(JSON.stringify(slotUsage))
  const simFreeTeachers = cloneSetMap(freeTeachersByDay[day] || {})
  const simFreeClasses = cloneSetMap(freeClassesByDay[day] || {})

  if (!simFreeTeachers[startPeriod]) simFreeTeachers[startPeriod] = new Set()
  if (!simFreeClasses[startPeriod]) simFreeClasses[startPeriod] = new Set()

  // Apply initial assignment
  if (!simByDay[day]) simByDay[day] = {}
  if (!simByDay[day][startPeriod]) simByDay[day][startPeriod] = []
  simByDay[day][startPeriod].push({ classId, teacherId })
  simDutyCount[day] = simDutyCount[day] || {}
  simDutyCount[day][teacherId] = (simDutyCount[day][teacherId] || 0) + 1
  simSlotUsage[startPeriod] = simSlotUsage[startPeriod] || {}
  simSlotUsage[startPeriod][teacherId] = (simSlotUsage[startPeriod][teacherId] || 0) + 1
  simFreeClasses[startPeriod].delete(classId)

  const periods = Object.keys(simFreeClasses)
    .map((p) => Number(p))
    .filter((num) => Number.isFinite(num))
    .sort((a, b) => a - b)

  for (const period of periods) {
    const freeClassSet = simFreeClasses[period] || new Set()
    if (freeClassSet.size === 0) continue

    const freeTeachers = new Set(simFreeTeachers[period] || [])

    // Remove teachers already assigned or absent because of simulation
    if (simByDay[day]?.[period]) {
      simByDay[day][period].forEach(({ teacherId: tid, classId: cid }) => {
        freeClassSet.delete(cid)
        freeTeachers.delete(tid)
      })
    }

    // Remove common lesson classes
    if (commonLessons?.[day]?.[period]) {
      Object.keys(commonLessons[day][period]).forEach((cid) => freeClassSet.delete(cid))
    }

    if (freeClassSet.size === 0) continue

    const classList = Array.from(freeClassSet)
    const teacherList = Array.from(freeTeachers).filter((tid) => validTeacherIds.has(tid))

    for (const cid of classList) {
      const candidate = teacherList
        .filter((tid) => canAssign({
          day,
          period,
          teacherId: tid,
          byDay: simByDay,
          dutyCount: simDutyCount,
          maxPerDay,
          options,
          slotUsage: simSlotUsage,
          maxPerSlot,
          ignoreConsecutiveLimit,
        }))
        .sort((a, b) => {
          const dutyA = simDutyCount[day]?.[a] || 0
          const dutyB = simDutyCount[day]?.[b] || 0
          return dutyA - dutyB || a.localeCompare(b)
        })[0]

      if (!candidate) continue

      if (!simByDay[day][period]) simByDay[day][period] = []
      simByDay[day][period].push({ classId: cid, teacherId: candidate })
      simDutyCount[day][candidate] = (simDutyCount[day][candidate] || 0) + 1
      simSlotUsage[period] = simSlotUsage[period] || {}
      simSlotUsage[period][candidate] = (simSlotUsage[period][candidate] || 0) + 1
      freeClassSet.delete(cid)
    }
  }

  const remainingClasses = periods.reduce((total, p) => {
    const set = simFreeClasses[p]
    if (!set) return total
    const remaining = Array.from(set).filter((cid) => {
      const alreadyAssigned = (simByDay[day]?.[p] || []).some(({ classId: classAssigned }) => classAssigned === cid)
      return !alreadyAssigned
    })
    return total + remaining.length
  }, 0)

  const duties = Object.values(simDutyCount[day] || {})
  const maxDuty = Math.max(...duties, 0)
  const minDuty = Math.min(...duties, maxDuty)
  const dutyDifference = maxDuty - minDuty

  return { remainingClasses, dutyDifference }
}

// Çoklu sınıf/saat ve kurallar: preventConsecutive, maxClassesPerSlot, ignoreConsecutiveLimit
export function assignDuties({ teachers, freeTeachers, freeClasses, locked, options, commonLessons }) {
  if (!Array.isArray(teachers) || !teachers.length) {
    return { schedule: {}, unassigned: {} }
  }

  const byDay = {}
  const unassignedByDay = {}
  const dutyCount = {}
  const lastAssignedPeriod = {}
  const maxPerDay = Object.fromEntries(teachers.map(t => [t.teacherId, toInt(t.maxDutyPerDay, 6)]))
  const parsed = parseInt(options?.maxClassesPerSlot, 10)
  const maxPerSlot = Number.isFinite(parsed) && parsed > 0 ? parsed : 1
  // ignoreConsecutiveLimit: true ise ardışık saat kontrolü yapılmaz
  const ignoreConsecutiveLimit = !!options?.ignoreConsecutiveLimit

  // Geçerli teacherId'leri bir Set'te tut (O(1) lookup için)
  const validTeacherIds = new Set()
  const duplicateTeacherIds = new Set()
  teachers.forEach((teacher) => {
    if (!teacher?.teacherId) return
    if (validTeacherIds.has(teacher.teacherId)) {
      duplicateTeacherIds.add(teacher.teacherId)
    }
    validTeacherIds.add(teacher.teacherId)
  })

  if (duplicateTeacherIds.size > 0) {
    console.warn(
      '[assignDuties] Yinelenen teacherId tespit edildi:',
      Array.from(duplicateTeacherIds.values())
    )
  }

  for (const day of Object.keys(freeTeachers || {})) {
    byDay[day] = {}
    dutyCount[day] = {}
    lastAssignedPeriod[day] = {}
    const slotUsage = {} // slotUsage[period][teacherId] = count (aynı saatte kaç sınıf)

    for (const p of Object.keys(freeTeachers[day] || {})) {
      const period = +p
      const freeT = new Set(freeTeachers[day][p] || [])
      const freeC = new Set(freeClasses[day]?.[p] || [])

      // Filter out common lesson classes from assignment
      if (commonLessons?.[day]?.[p]) {
        Object.keys(commonLessons[day][p]).forEach(classId => {
          freeC.delete(classId)
        })
      }

      byDay[day][p] = []
      if (!slotUsage[period]) slotUsage[period] = {}

      // 1) Kilitli atamalar - sadece geçerli teacherId'leri işle
      const locksForSlot = Object.entries(locked || {}).filter(([k]) => k.startsWith(`${day}|${period}|`))
      for (const [key, tId] of locksForSlot) {
        const classId = key.split('|')[2]
        if (tId === MANUAL_EMPTY_TEACHER_ID) {
          freeC.delete(classId)
          continue
        }
        // Geçersiz teacherId'yi atla
        if (!validTeacherIds.has(tId)) {
          continue
        }
        if (freeC.has(classId)) {
          pushAssign(day, p, classId, tId, byDay, dutyCount, slotUsage, lastAssignedPeriod)
          freeC.delete(classId) // sınıfı havuzdan çıkar (görevlendirildi)
        }
      }

      // Adalet: o gün daha az ataması olan önce
      const baseSorted = Array.from(freeT).sort(
        (a, b) => (dutyCount[day][a] || 0) - (dutyCount[day][b] || 0)
      )

      // 2) İlk tur: her öğretmene en fazla 1 sınıf (slotUsage==0)
      const remaining1 = []
      for (const classId of Array.from(freeC)) {
        const candidates = baseSorted.filter(
          tid =>
            (slotUsage[period]?.[tid] || 0) === 0 &&
            canAssign({ day, period, teacherId: tid, byDay, dutyCount, maxPerDay, options, slotUsage, maxPerSlot, ignoreConsecutiveLimit })
        )
        let pick = null
        if (candidates.length === 1) {
          pick = candidates[0]
        } else if (candidates.length > 1) {
          const scores = candidates.map((tid) => {
            const currentDuty = dutyCount[day]?.[tid] || 0
            const lastPeriod = lastAssignedPeriod[day]?.[tid]
            const consecutivePenalty =
              Number.isFinite(lastPeriod) && Number.isFinite(period) && period - lastPeriod === 1
                ? 50
                : 0
            const { remainingClasses, dutyDifference } = simulateAssignment({
              day,
              startPeriod: period,
              teacherId: tid,
              classId,
              freeTeachersByDay: freeTeachers,
              freeClassesByDay: freeClasses,
              byDay,
              dutyCount,
              maxPerDay,
              options,
              maxPerSlot,
              ignoreConsecutiveLimit,
              slotUsage,
              commonLessons,
              validTeacherIds,
            })
            const scoreValue = (remainingClasses * 200) + (dutyDifference * 50) + consecutivePenalty + (currentDuty * 5)
            return { tid, scoreValue, remainingClasses, dutyDifference, currentDuty, consecutivePenalty }
          })
          pick = scores
            .sort((a, b) =>
              a.scoreValue - b.scoreValue ||
              a.remainingClasses - b.remainingClasses ||
              a.dutyDifference - b.dutyDifference ||
              a.currentDuty - b.currentDuty ||
              a.consecutivePenalty - b.consecutivePenalty ||
              a.tid.localeCompare(b.tid)
            )[0]
            ?.tid || null
        }
        if (pick) {
          pushAssign(day, p, classId, pick, byDay, dutyCount, slotUsage, lastAssignedPeriod)
          freeC.delete(classId) // Sınıfı havuzdan çıkar (görevlendirildi)
        } else {
          remaining1.push(classId)
        }
      }

      // 3) İkinci tur: kapasitesi yeten öğretmene aynı saatte 2., 3. sınıf da
      let remaining = remaining1
      let progress = true
      while (remaining.length && progress) {
        progress = false
        const nextRemaining = []

        // Her turda güncel dutyCount'a göre yeniden sırala (daha adil dağılım)
        const freshSorted = Array.from(freeT).sort(
          (a, b) => (dutyCount[day][a] || 0) - (dutyCount[day][b] || 0)
        )

        for (const classId of remaining) {
          // Sınıf hala freeC'de mi kontrol et (başka bir yerde atanmış olabilir)
          if (!freeC.has(classId)) {
            continue // Bu sınıf zaten atanmış, atla
          }

          const pick = freshSorted.find(
            tid =>
              (slotUsage[period]?.[tid] || 0) < maxPerSlot &&
              canAssign({ day, period, teacherId: tid, byDay, dutyCount, maxPerDay, options, slotUsage, maxPerSlot, ignoreConsecutiveLimit })
          )
          if (pick) {
            pushAssign(day, p, classId, pick, byDay, dutyCount, slotUsage, lastAssignedPeriod)
            freeC.delete(classId) // Sınıfı havuzdan çıkar (görevlendirildi)
            progress = true
          } else {
            nextRemaining.push(classId)
          }
        }
        remaining = nextRemaining
      }

      if (freeC.size > 0) {
        if (!unassignedByDay[day]) unassignedByDay[day] = {}
        unassignedByDay[day][period] = Array.from(freeC)
      }
    }
  }
  return { schedule: byDay, unassigned: unassignedByDay }
}

function pushAssign(day, p, classId, teacherId, byDay, dutyCount, slotUsage, lastAssignedPeriod) {
  byDay[day][p].push({ classId, teacherId })
  dutyCount[day][teacherId] = (dutyCount[day][teacherId] || 0) + 1
  const period = +p
  if (!slotUsage[period]) slotUsage[period] = {}
  slotUsage[period][teacherId] = (slotUsage[period][teacherId] || 0) + 1
  if (!lastAssignedPeriod[day]) lastAssignedPeriod[day] = {}
  lastAssignedPeriod[day][teacherId] = Math.max(
    lastAssignedPeriod[day][teacherId] ?? -Infinity,
    Number.isFinite(period) ? period : parseInt(p, 10)
  )
}

function canAssign({ day, period, teacherId, byDay, dutyCount, maxPerDay, options, slotUsage, maxPerSlot, ignoreConsecutiveLimit }) {
  // 1. Günlük görev limiti kontrolü
  if ((dutyCount[day]?.[teacherId] || 0) >= (maxPerDay[teacherId] || 6)) return false

  // 2. Aynı saatte kapasite kontrolü (bir öğretmen bu saatte kaç sınıf alabileceği)
  const used = slotUsage[period]?.[teacherId] || 0
  if (used >= maxPerSlot) return false

  // 3. Ardışık saat engeli (ignoreConsecutiveLimit=true ise bu kontrol atlanır)
  // Not: Aynı periyotta birden fazla sınıf atanırken ardışık saat kuralı engel olmamalı
  // Ardışık görev kontrolü sadece öğretmene bu saatte yeni bir sınıf verilecekse uygulanır (used === 0).
  // Aynı saatte birden fazla sınıf veriliyorsa ardışık kavramı geçerli değildir.
  if (options?.preventConsecutive && !ignoreConsecutiveLimit && used === 0) {
    const prev = byDay[day]?.[period - 1] || []
    const next = byDay[day]?.[period + 1] || []
    const prevHit = prev.some(x => x.teacherId === teacherId)
    const nextHit = next.some(x => x.teacherId === teacherId)
    if (prevHit || nextHit) return false
  }

  return true
}


export function applyFairnessAdjustments({
  baseSchedule,
  day,
  periods,
  teachersForCurrentDay,
  freeTeachersByDay,
  freeClassesByDay,
  commonLessons,
  locked,
  options,
  teacherMap
}) {
  if (!baseSchedule || !baseSchedule[day]) return baseSchedule;
  const daySchedule = baseSchedule[day] || {};
  const freeMap = freeTeachersByDay[day] || {};
  const dayFreeClasses = freeClassesByDay?.[day] || {};
  const dayCommonLessons = commonLessons?.[day] || {};

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
    dayNeedsByPeriod.set(period, needed);
  });

  const zeroDutyTeachers = teachersForCurrentDay
    .map(t => t.teacherId)
    .filter(id => id && (assignmentCounts[id] || 0) === 0);

  if (zeroDutyTeachers.length === 0) {
    return baseSchedule;
  }

  const parsedMaxPerSlot = Number.parseInt(options?.maxClassesPerSlot, 10);
  const maxPerSlot = Number.isFinite(parsedMaxPerSlot) && parsedMaxPerSlot > 0 ? parsedMaxPerSlot : 1;

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
    const record = teacherMap.get(teacherId);
    const parsed = Number.parseInt(record?.maxDutyPerDay, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 6;
  };

  const canTakePeriod = (teacherId, period) => {
    if (!isTeacherFree(period, teacherId)) return false;
    if ((assignmentCounts[teacherId] || 0) >= getMaxDuty(teacherId)) return false;
    if ((slotUsage[period]?.[teacherId] || 0) >= maxPerSlot) return false;
    if (hasConsecutiveConflict(teacherId, period)) return false;
    return true;
  };

  const tryFillFromNeeds = (teacherId, availablePeriods) => {
    for (const period of availablePeriods) {
      const needSet = dayNeedsByPeriod.get(period);
      if (!needSet || needSet.size === 0) continue;

      for (const classId of Array.from(needSet)) {
        const lockKey = `${day}|${period}|${classId}`;
        const lockOwner = locked?.[lockKey];
        if (lockOwner && lockOwner !== MANUAL_EMPTY_TEACHER_ID) continue;
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
        .map((assignment, idx) => ({
          idx,
          classId: assignment.classId,
          teacherId: assignment.teacherId,
          donorCount: assignmentCounts[assignment.teacherId] || 0,
        }))
        .filter(candidate =>
          candidate.teacherId &&
          candidate.teacherId !== teacherId &&
          candidate.donorCount > (assignmentCounts[teacherId] || 0) &&
          candidate.donorCount > 1
        )
        .sort((a, b) => b.donorCount - a.donorCount || a.idx - b.idx);

      for (const candidate of candidates) {
        const lockKey = `${day}|${period}|${candidate.classId}`;
        const lockOwner = locked?.[lockKey];
        if (lockOwner && lockOwner !== MANUAL_EMPTY_TEACHER_ID) continue;
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

  return changed ? adjustedSchedule : baseSchedule;
}
