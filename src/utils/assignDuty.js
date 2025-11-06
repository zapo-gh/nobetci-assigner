import { toInt } from './helpers.js';

// Çoklu sınıf/saat ve kurallar: preventConsecutive, maxClassesPerSlot, ignoreConsecutiveLimit
export function assignDuties({ teachers, freeTeachers, freeClasses, locked, options, commonLessons }) {
  const byDay = {}
  const dutyCount = {}
  const maxPerDay = Object.fromEntries(teachers.map(t => [t.teacherId, toInt(t.maxDutyPerDay, 6)]))
  const parsed = parseInt(options?.maxClassesPerSlot, 10)
  const maxPerSlot = Number.isFinite(parsed) && parsed > 0 ? parsed : 1
  // ignoreConsecutiveLimit: true ise ardışık saat kontrolü yapılmaz
  const ignoreConsecutiveLimit = !!options?.ignoreConsecutiveLimit

  // Geçerli teacherId'leri bir Set'te tut (O(1) lookup için)
  const validTeacherIds = new Set(teachers.map(t => t.teacherId))

  for (const day of Object.keys(freeTeachers || {})) {
    byDay[day] = {}
    dutyCount[day] = {}
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
        // Geçersiz teacherId'yi atla
        if (!validTeacherIds.has(tId)) {
          continue
        }
        const classId = key.split('|')[2]
        if (
          freeT.has(tId) &&
          freeC.has(classId) &&
          canAssign({ day, period, teacherId: tId, byDay, dutyCount, maxPerDay, options, slotUsage, maxPerSlot, ignoreConsecutiveLimit })
        ) {
          pushAssign(day, p, classId, tId, byDay, dutyCount, slotUsage)
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
        const pick = baseSorted.find(
          tid =>
            (slotUsage[period]?.[tid] || 0) === 0 &&
            canAssign({ day, period, teacherId: tid, byDay, dutyCount, maxPerDay, options, slotUsage, maxPerSlot, ignoreConsecutiveLimit })
        )
        if (pick) {
          pushAssign(day, p, classId, pick, byDay, dutyCount, slotUsage)
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
            pushAssign(day, p, classId, pick, byDay, dutyCount, slotUsage)
            freeC.delete(classId) // Sınıfı havuzdan çıkar (görevlendirildi)
            progress = true
          } else {
            nextRemaining.push(classId)
          }
        }
        remaining = nextRemaining
      }
    }
  }
  return byDay
}

function pushAssign(day, p, classId, teacherId, byDay, dutyCount, slotUsage) {
  byDay[day][p].push({ classId, teacherId })
  dutyCount[day][teacherId] = (dutyCount[day][teacherId] || 0) + 1
  const period = +p
  if (!slotUsage[period]) slotUsage[period] = {}
  slotUsage[period][teacherId] = (slotUsage[period][teacherId] || 0) + 1
}

function canAssign({ day, period, teacherId, byDay, dutyCount, maxPerDay, options, slotUsage, maxPerSlot, ignoreConsecutiveLimit }) {
  // 1. Günlük görev limiti kontrolü
  if ((dutyCount[day]?.[teacherId] || 0) >= (maxPerDay[teacherId] || 6)) return false
  
  // 2. Aynı saatte kapasite kontrolü (bir öğretmen bu saatte kaç sınıf alabileceği)
  const used = slotUsage[period]?.[teacherId] || 0
  if (used >= maxPerSlot) return false
  
  // 3. Ardışık saat engeli (ignoreConsecutiveLimit=true ise bu kontrol atlanır)
  // Not: Aynı periyotta birden fazla sınıf atanırken ardışık saat kuralı engel olmamalı
  if (options?.preventConsecutive && !ignoreConsecutiveLimit && used === 0) {
    const prev = byDay[day]?.[period - 1] || []
    const next = byDay[day]?.[period + 1] || []
    const prevHit = prev.some(x => x.teacherId === teacherId)
    const nextHit = next.some(x => x.teacherId === teacherId)
    if (prevHit || nextHit) return false
  }
  
  return true
}

