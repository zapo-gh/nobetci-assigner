import { supabase } from './supabaseClient.js'

function getTableData(response, { fallback = [], tableName = 'unknown' } = {}) {
  if (!response) {
    return fallback
  }

  const { data, error } = response

  if (error) {
    const code = error.code
    const message = error.message || ''
    const isMissingTable =
      code === '42P01' ||
      code === '58P01' ||
      code === 'PGRST201' ||
      message.toLowerCase().includes('does not exist')

    if (isMissingTable) {
      console.warn(`[Supabase] Table "${tableName}" missing, returning fallback.`)
      return fallback
    }

    throw error
  }

  return typeof data === 'undefined' || data === null ? fallback : data
}

const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export const TEACHER_SCHEDULES_SNAPSHOT_KEY = '__snapshot__'
const CLASS_ABSENCE_NO_DUTY_SUFFIX = '__NO_DUTY__'

const CLASS_FREE_SINGLE_ROW_ID = 1
const TEACHER_FREE_SINGLE_ROW_ID = 1

const parseClassFreeRows = (classFreeRaw = []) => {
  let classFree = {}
  const classFreeJsonRow = classFreeRaw.find(item => typeof item?.data === 'object')
  if (classFreeJsonRow) {
    classFree = classFreeJsonRow.data || {}
  } else {
    classFreeRaw.forEach(item => {
      if (!item?.day) return
      if (!classFree[item.day]) classFree[item.day] = {}
      classFree[item.day][item.period] = item.classIds || []
    })
  }
  return classFree
}

const parseTeacherFreeRows = (teacherFreeRaw = []) => {
  let teacherFree = {}
  const teacherFreeJsonRow = teacherFreeRaw.find(item => typeof item?.data === 'object')
  if (teacherFreeJsonRow) {
    teacherFree = teacherFreeJsonRow.data || {}
  } else {
    teacherFreeRaw.forEach(item => {
      teacherFree[item.period] = item.teacherIds || []
    })
  }
  return teacherFree
}

const parseClassAbsenceRows = (classAbsenceRaw = []) => {
  const classAbsence = {}
  classAbsenceRaw.forEach(item => {
    if (!classAbsence[item.day]) classAbsence[item.day] = {}
    if (!classAbsence[item.day][item.period]) classAbsence[item.day][item.period] = {}
    classAbsence[item.day][item.period][item.classId] = item.absentId
  })
  return classAbsence
}

const buildAbsentIdVariants = (absentId) => {
  const base = typeof absentId === 'string' ? absentId.trim() : absentId
  if (!base) return []

  const variants = new Set([base])

  if (typeof base === 'string') {
    if (base.endsWith(CLASS_ABSENCE_NO_DUTY_SUFFIX)) {
      variants.add(base.slice(0, -CLASS_ABSENCE_NO_DUTY_SUFFIX.length))
    } else {
      variants.add(`${base}${CLASS_ABSENCE_NO_DUTY_SUFFIX}`)
    }
  }

  return Array.from(variants).filter(Boolean)
}

export async function loadInitialData() {
  try {
    // Load all data in parallel
    const [teachersRes, classesRes, absentsRes, classFreeRes, teacherFreeRes, classAbsenceRes, lockedRes, pdfScheduleRes, teacherSchedulesRes, commonLessonsRes] = await Promise.all([
      supabase.from('teachers').select('*').order('createdAt', { ascending: false }),
      supabase.from('classes').select('*').order('createdAt', { ascending: false }),
      supabase.from('absents').select('*').order('createdAt', { ascending: false }),
      supabase.from('class_free').select('*'),
      supabase.from('teacher_free').select('*'),
      supabase.from('class_absence').select('*'),
      supabase.from('locks').select('*'),
      supabase.from('pdf_schedule').select('*').order('createdAt', { ascending: false }).limit(1),
      supabase.from('teacher_schedules').select('*'),
      supabase.from('common_lessons').select('*')
    ])

    const teachers = getTableData(teachersRes, { fallback: [], tableName: 'teachers' })
    const classes = getTableData(classesRes, { fallback: [], tableName: 'classes' })
    const absents = getTableData(absentsRes, { fallback: [], tableName: 'absents' })
    const classFreeRaw = getTableData(classFreeRes, { fallback: [], tableName: 'class_free' })
    const teacherFreeRaw = getTableData(teacherFreeRes, { fallback: [], tableName: 'teacher_free' })
    const classAbsenceRaw = getTableData(classAbsenceRes, { fallback: [], tableName: 'class_absence' })
    const lockedRaw = getTableData(lockedRes, { fallback: [], tableName: 'locks' })
    const pdfScheduleRows = getTableData(pdfScheduleRes, { fallback: [], tableName: 'pdf_schedule' })
    const teacherSchedulesRows = getTableData(teacherSchedulesRes, { fallback: [], tableName: 'teacher_schedules' })
    const commonLessonsRaw = getTableData(commonLessonsRes, { fallback: [], tableName: 'common_lessons' })

    // Transform data to expected format
    const classFree = parseClassFreeRows(classFreeRaw)
    const teacherFree = parseTeacherFreeRows(teacherFreeRaw)
    const classAbsence = parseClassAbsenceRows(classAbsenceRaw)

    const locked = {}
    lockedRaw.forEach(item => {
      locked[`${item.day}|${item.period}|${item.classId}`] = item.teacherId
    })

    const pdfSchedule = pdfScheduleRows.length > 0 ? pdfScheduleRows[0].schedule : {}

    // Transform teacher schedules
    let teacherSchedules = {}
    const snapshotRow = teacherSchedulesRows.find(item => item.teacher_name === TEACHER_SCHEDULES_SNAPSHOT_KEY)

    if (snapshotRow && snapshotRow.schedule && typeof snapshotRow.schedule === 'object') {
      teacherSchedules = snapshotRow.schedule
      console.log('[loadInitialData] Teacher schedules loaded from snapshot:', Object.keys(teacherSchedules).length, 'teachers')
    } else {
      teacherSchedulesRows.forEach(item => {
        if (!item?.teacher_name) return
        teacherSchedules[item.teacher_name] = item.schedule
      })
      if (teacherSchedulesRows.length > 0) {
        console.log('[loadInitialData] Teacher schedules loaded from individual rows:', Object.keys(teacherSchedules).length, 'teachers')
      } else {
        console.log('[loadInitialData] No teacher schedules found in database')
      }
    }

    // Transform common lessons
    const commonLessons = {}
    commonLessonsRaw.forEach(item => {
      if (!commonLessons[item.day]) commonLessons[item.day] = {}
      if (!commonLessons[item.day][item.period]) commonLessons[item.day][item.period] = {}
      commonLessons[item.day][item.period][item.class_id] = item.teacher_name
    })

    return {
      teachers,
      classes,
      absents,
      classFree,
      teacherFree,
      classAbsence,
      locked,
      pdfSchedule,
      teacherSchedules,
      commonLessons
    }
  } catch (error) {
    console.error('loadInitialData error:', error)
    throw error
  }
}

export async function loadAbsenceRelatedData() {
  const [absentsRes, classFreeRes, classAbsenceRes, commonLessonsRes] = await Promise.all([
    supabase.from('absents').select('*').order('createdAt', { ascending: false }),
    supabase.from('class_free').select('*'),
    supabase.from('class_absence').select('*'),
    supabase.from('common_lessons').select('*'),
  ])

  const absents = getTableData(absentsRes, { fallback: [], tableName: 'absents' })
  const classFreeRaw = getTableData(classFreeRes, { fallback: [], tableName: 'class_free' })
  const classAbsenceRaw = getTableData(classAbsenceRes, { fallback: [], tableName: 'class_absence' })
  const commonLessons = getTableData(commonLessonsRes, { fallback: [], tableName: 'common_lessons' })

  return {
    absents,
    classFree: parseClassFreeRows(classFreeRaw),
    classAbsence: parseClassAbsenceRows(classAbsenceRaw),
    commonLessons,
  }
}

export async function loadClassAbsence() {
  try {
    const classAbsenceRes = await supabase.from('class_absence').select('*')
    const classAbsenceRaw = getTableData(classAbsenceRes, { fallback: [], tableName: 'class_absence' })
    
    const classAbsence = {}
    classAbsenceRaw.forEach(item => {
      if (!classAbsence[item.day]) classAbsence[item.day] = {}
      if (!classAbsence[item.day][item.period]) classAbsence[item.day][item.period] = {}
      classAbsence[item.day][item.period][item.classId] = item.absentId
    })
    
    return classAbsence
  } catch (error) {
    console.error('loadClassAbsence error:', error)
    throw error
  }
}

export async function loadClassFree() {
  try {
    const classFreeRes = await supabase.from('class_free').select('*')
    const classFreeRaw = getTableData(classFreeRes, { fallback: [], tableName: 'class_free' })
    
    let classFree = {}
    const classFreeJsonRow = classFreeRaw.find(item => typeof item?.data === 'object')
    if (classFreeJsonRow) {
      classFree = classFreeJsonRow.data || {}
    } else {
      classFreeRaw.forEach(item => {
        if (!item?.day) return
        if (!classFree[item.day]) classFree[item.day] = {}
        classFree[item.day][item.period] = item.classIds || []
      })
    }
    
    return classFree
  } catch (error) {
    console.error('loadClassFree error:', error)
    throw error
  }
}

export async function insertTeacher({ teacherName, maxDutyPerDay = 6, source = 'manual' }) {
  try {
    const teacherData = {
      teacherId: createId(),
      teacherName,
      maxDutyPerDay,
      source,
    }

    const { data, error } = await supabase
      .from('teachers')
      .insert(teacherData)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('insertTeacher full error:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function deleteTeacherById(teacherId) {
  try {
    const { error } = await supabase
      .from('teachers')
      .delete()
      .eq('teacherId', teacherId)

    if (error) throw error
  } catch (error) {
    console.error('deleteTeacherById error:', error)
    throw error
  }
}

export async function clearTeachersData() {
  try {
    const { error } = await supabase
      .from('teachers')
      .delete()
      .not('teacherId', 'is', null)

    if (error) throw error
  } catch (error) {
    console.error('clearTeachersData error:', error)
    throw error
  }
}

export async function insertClass({ className }) {
  try {
    const cleanName = String(className || '').trim()
    if (!cleanName) {
      throw new Error('className is required')
    }

    const classData = {
      classId: createId(),
      className: cleanName
    }

    const { data, error } = await supabase
      .from('classes')
      .insert(classData)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    if (error?.code === '23505' || /duplicate/i.test(error?.message || '')) {
      const existing = await getClassByName(className)
      if (existing) return existing
    }
    console.error('insertClass full error:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function getClassByName(className) {
  try {
    const cleanName = String(className || '').trim()
    if (!cleanName) {
      return null
    }

    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .ilike('className', cleanName)
      .limit(1)

    if (error) throw error
    return Array.isArray(data) && data.length > 0 ? data[0] : null
  } catch (error) {
    console.error('getClassByName error:', error)
    throw error
  }
}

export async function deleteClassById(classId) {
  try {
    // First delete related class_absence and common_lessons records
    await Promise.all([
      supabase.from('class_absence').delete().eq('classId', classId),
      supabase.from('common_lessons').delete().eq('class_id', classId)
    ])

    // Then delete the class itself
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('classId', classId)

    if (error) throw error
  } catch (error) {
    console.error('deleteClassById error:', error)
    throw error
  }
}

export async function clearClassesData() {
  try {
    const { error } = await supabase
      .from('classes')
      .delete()
      .not('classId', 'is', null)

    if (error) throw error
  } catch (error) {
    console.error('clearClassesData error:', error)
    throw error
  }
}

export async function insertAbsent({ name, teacherId, reason, days }) {
  try {
    const absentData = {
      absentId: createId(),
      teacherId: teacherId || null,
      name,
      reason: reason || null,
      days: Array.isArray(days) ? days : [],
    }

    const { data, error } = await supabase
      .from('absents')
      .insert(absentData)
      .select()
      .maybeSingle()

    if (error) throw error
    return data || absentData
  } catch (error) {
    console.error('insertAbsent full error:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function deleteAbsentById(absentId) {
  try {
    const { error } = await supabase
      .from('absents')
      .delete()
      .eq('absentId', absentId)

    if (error) throw error
  } catch (error) {
    console.error('deleteAbsentById error:', error)
    throw error
  }
}

export async function clearAbsentsData() {
  try {
    const { error } = await supabase
      .from('absents')
      .delete()
      .not('absentId', 'is', null)

    if (error) throw error
  } catch (error) {
    console.error('clearAbsentsData error:', error)
    throw error
  }
}

export async function deleteClassAbsenceByAbsent(absentId) {
  try {
    const variants = buildAbsentIdVariants(absentId)
    if (!variants.length) {
      return
    }
    const query = supabase
      .from('class_absence')
      .delete()
      .in('absentId', variants)

    const { error } = await query

    if (error) throw error
  } catch (error) {
    console.error('deleteClassAbsenceByAbsent error:', error)
    throw error
  }
}

export async function deleteClassAbsenceByClass(classId) {
  try {
    const { error } = await supabase
      .from('class_absence')
      .delete()
      .eq('classId', classId)

    if (error) throw error
  } catch (error) {
    console.error('deleteClassAbsenceByClass error:', error)
    throw error
  }
}

export async function deleteCommonLessonsByClass(classId) {
  try {
    const { error } = await supabase
      .from('common_lessons')
      .delete()
      .eq('class_id', classId)

    if (error) throw error
  } catch (error) {
    console.error('deleteCommonLessonsByClass error:', error)
    throw error
  }
}

export async function deleteCommonLessonsByTeacher(teacherName) {
  try {
    if (!teacherName) return
    
    const { error } = await supabase
      .from('common_lessons')
      .delete()
      .eq('teacher_name', teacherName)

    if (error) throw error
  } catch (error) {
    console.error('deleteCommonLessonsByTeacher error:', error)
    throw error
  }
}

export async function deleteCommonLessonsBySlot(day, period, classId) {
  try {
    const { error } = await supabase
      .from('common_lessons')
      .delete()
      .eq('day', day)
      .eq('period', period)
      .eq('class_id', classId)

    if (error) throw error
  } catch (error) {
    console.error('deleteCommonLessonsBySlot error:', error)
    throw error
  }
}

export async function clearClassAbsenceData() {
  try {
    const { error } = await supabase
      .from('class_absence')
      .delete()
      .not('absentId', 'is', null)

    if (error) throw error
  } catch (error) {
    console.error('clearClassAbsenceData error:', error)
    throw error
  }
}

export async function clearCommonLessonsData() {
  try {
    const { error } = await supabase
      .from('common_lessons')
      .delete()
      .not('day', 'is', null)

    if (error) throw error
  } catch (error) {
    console.error('clearCommonLessonsData error:', error)
    throw error
  }
}

export async function upsertClassFree({ day, period, classId, isSelected }) {
  try {
    const { data: existingRow, error: fetchError } = await supabase
      .from('class_free')
      .select('id,data')
      .eq('id', CLASS_FREE_SINGLE_ROW_ID)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError // PGRST116 = not found

    const nextData = existingRow?.data && typeof existingRow.data === 'object'
      ? JSON.parse(JSON.stringify(existingRow.data))
      : {}

    if (!nextData[day]) nextData[day] = {}
    const periodKey = Number.isFinite(Number(period)) ? Number(period) : period
    const existingSet = new Set(Array.isArray(nextData[day][periodKey]) ? nextData[day][periodKey] : [])

    if (isSelected) {
      existingSet.add(classId)
    } else {
      existingSet.delete(classId)
    }

    nextData[day][periodKey] = Array.from(existingSet)

    const payload = {
      id: existingRow?.id || CLASS_FREE_SINGLE_ROW_ID,
      data: nextData
    }

    const { error } = await supabase
      .from('class_free')
      .upsert(payload, {
        onConflict: 'id'
      })

    if (error) throw error
  } catch (error) {
    console.error('upsertClassFree full error:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function upsertTeacherFree({ period, teacherId, isSelected }) {
  try {
    const { data: existingRow, error: fetchError } = await supabase
      .from('teacher_free')
      .select('id,data')
      .eq('id', TEACHER_FREE_SINGLE_ROW_ID)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

    const nextData = existingRow?.data && typeof existingRow.data === 'object'
      ? { ...existingRow.data }
      : {}

    const periodKey = Number.isFinite(Number(period)) ? Number(period) : period
    const currentSet = new Set(Array.isArray(nextData[periodKey]) ? nextData[periodKey] : [])

    if (isSelected) {
      currentSet.add(teacherId)
    } else {
      currentSet.delete(teacherId)
    }

    nextData[periodKey] = Array.from(currentSet)

    const payload = {
      id: existingRow?.id || TEACHER_FREE_SINGLE_ROW_ID,
      data: nextData
    }

    const { error } = await supabase
      .from('teacher_free')
      .upsert(payload, {
        onConflict: 'id'
      })

    if (error) throw error
  } catch (error) {
    console.error('upsertTeacherFree full error:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function upsertClassAbsence({ day, period, classId, absentId }) {
  try {
    if (absentId) {
      const { error } = await supabase
        .from('class_absence')
        .upsert({
          day,
          period,
          classId,
          absentId
        }, {
          onConflict: 'day,period,classId'
        })

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('class_absence')
        .delete()
        .eq('day', day)
        .eq('period', period)
        .eq('classId', classId)

      if (error) throw error
    }
  } catch (error) {
    console.error('upsertClassAbsence full error:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function upsertLock({ day, period, classId, teacherId }) {
  try {
    if (teacherId) {
      const { error } = await supabase
        .from('locks')
        .upsert({
          day,
          period,
          classId,
          teacherId
        }, {
          onConflict: 'day,period,classId'
        })

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('locks')
        .delete()
        .eq('day', day)
        .eq('period', period)
        .eq('classId', classId)

      if (error) throw error
    }
  } catch (error) {
    console.error('upsertLock full error:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function resetAllForClasses() {
  try {
    const { error } = await supabase
      .from('class_free')
      .delete()
      .neq('id', -1) // Delete all

    if (error) throw error
  } catch (error) {
    console.error('resetAllForClasses error:', error)
    throw error
  }
}

export async function resetClassFreeData() {
  try {
    const { error } = await supabase
      .from('class_free')
      .delete()
      .neq('id', -1) // Delete all

    if (error) throw error
  } catch (error) {
    console.error('resetClassFreeData error:', error)
    throw error
  }
}

export async function resetTeacherFreeData() {
  try {
    const { error } = await supabase
      .from('teacher_free')
      .delete()
      .neq('id', -1) // Delete all

    if (error) throw error
  } catch (error) {
    console.error('resetTeacherFreeData error:', error)
    throw error
  }
}

export async function deleteLocksByTeacher(teacherId) {
  try {
    const { error } = await supabase
      .from('locks')
      .delete()
      .eq('teacherId', teacherId)

    if (error) throw error
  } catch (error) {
    console.error('deleteLocksByTeacher error:', error)
    throw error
  }
}

export async function deleteLocksByClass(classId) {
  try {
    const { error } = await supabase
      .from('locks')
      .delete()
      .eq('classId', classId)

    if (error) throw error
  } catch (error) {
    console.error('deleteLocksByClass error:', error)
    throw error
  }
}

export async function clearLocksData() {
  try {
    const { error } = await supabase
      .from('locks')
      .delete()
      .not('day', 'is', null)

    if (error) throw error
  } catch (error) {
    console.error('clearLocksData error:', error)
    throw error
  }
}

export async function replacePdfSchedule(schedule) {
  try {
    // Delete existing
    await supabase.from('pdf_schedule').delete().neq('id', -1)

    // Insert new
    if (schedule && Object.keys(schedule).length > 0) {
      const { error } = await supabase
        .from('pdf_schedule')
        .insert({
          schedule
        })

      if (error) throw error
    }
  } catch (error) {
    console.error('replacePdfSchedule full error:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function saveTeacherSchedules(teacherSchedules) {
  try {
    if (!teacherSchedules || Object.keys(teacherSchedules).length === 0) {
      // Skip clearing automatically; use clearTeacherSchedules explicitly
      return
    }

    // Önce tüm eski kayıtları temizle (hem snapshot hem de eski format kayıtları)
    await clearTeacherSchedules()

    // Yeni snapshot kaydını oluştur
    const { error } = await supabase
      .from('teacher_schedules')
      .insert({
        teacher_name: TEACHER_SCHEDULES_SNAPSHOT_KEY,
        schedule: teacherSchedules
      })

    if (error) throw error
  } catch (error) {
    console.error('saveTeacherSchedules full error:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function clearTeacherSchedules() {
  try {
    const { error } = await supabase
      .from('teacher_schedules')
      .delete()
      .neq('teacher_name', '__never__')

    if (error) throw error
  } catch (error) {
    console.error('clearTeacherSchedules error:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function saveCommonLessons(commonLessons) {
  try {
    if (!commonLessons || Object.keys(commonLessons).length === 0) {
      // Clear all common lessons
      const { error } = await supabase
        .from('common_lessons')
        .delete()
        .neq('id', -1)

      if (error) throw error
      return
    }

    // Prepare data for upsert
    const lessonsData = []
    Object.entries(commonLessons).forEach(([day, dayData]) => {
      Object.entries(dayData).forEach(([period, periodData]) => {
        Object.entries(periodData).forEach(([classId, teacherName]) => {
          lessonsData.push({
            day,
            period: parseInt(period),
            class_id: classId,
            teacher_name: teacherName
          })
        })
      })
    })

    const { error } = await supabase
      .from('common_lessons')
      .upsert(lessonsData, {
        onConflict: 'day,period,class_id'
      })

    if (error) throw error
  } catch (error) {
    console.error('saveCommonLessons full error:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function bulkSaveTeachers(teachers) {
  try {
    if (!teachers || teachers.length === 0) {
      // Clear all teachers
      const { error } = await supabase
        .from('teachers')
        .delete()
        .neq('teacherId', 'dummy')

      if (error) throw error
      return
    }

    const { error } = await supabase
      .from('teachers')
      .upsert(teachers, {
        onConflict: 'teacherId'
      })

    if (error) throw error
  } catch (error) {
    console.error('bulkSaveTeachers full error:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function bulkSaveClasses(classes) {
  try {
    if (!classes || classes.length === 0) {
      // Clear all classes
      const { error } = await supabase
        .from('classes')
        .delete()
        .neq('classId', 'dummy')

      if (error) throw error
      return
    }

    const { error } = await supabase
      .from('classes')
      .upsert(classes, {
        onConflict: 'classId'
      })

    if (error) throw error
  } catch (error) {
    console.error('bulkSaveClasses full error:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function bulkSaveAbsents(absents) {
  try {
    if (!absents || absents.length === 0) {
      // Clear all absents
      const { error } = await supabase
        .from('absents')
        .delete()
        .neq('absentId', 'dummy')

      if (error) throw error
      return
    }

    const { error } = await supabase
      .from('absents')
      .upsert(absents, {
        onConflict: 'absentId'
      })

    if (error) throw error
  } catch (error) {
    console.error('bulkSaveAbsents full error:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function bulkSaveClassFree(classFree) {
  try {
    if (!classFree || Object.keys(classFree).length === 0) {
      // Clear all class_free
      const { error } = await supabase
        .from('class_free')
        .delete()
        .neq('id', -1)

      if (error) throw error
      return
    }

    // Upsert single row with JSONB data
    const { error } = await supabase
      .from('class_free')
      .upsert({
        id: CLASS_FREE_SINGLE_ROW_ID, // Single row for all data
        data: classFree
      }, {
        onConflict: 'id'
      })

    if (error) throw error
  } catch (error) {
    console.error('bulkSaveClassFree full error:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function bulkSaveClassAbsence(classAbsence) {
  try {
    // Normalize input to array of rows
    const rows = []
    if (classAbsence && typeof classAbsence === 'object') {
      Object.entries(classAbsence).forEach(([dayKey, periods]) => {
        if (!periods || typeof periods !== 'object') return

        Object.entries(periods).forEach(([periodKey, classes]) => {
          if (!classes || typeof classes !== 'object') return
          const period = Number(periodKey)

          Object.entries(classes).forEach(([classId, absentId]) => {
            if (!absentId) return
            rows.push({
              day: dayKey,
              period: Number.isFinite(period) ? period : parseInt(periodKey, 10) || periodKey,
              classId,
              absentId
            })
          })
        })
      })
    }

    const { data: existingRows = [], error: selectError } = await supabase
      .from('class_absence')
      .select('day,period,classId,absentId')

    if (selectError) throw selectError

    const existingMap = new Map()
    existingRows.forEach((row) => {
      const key = `${row.day}|${row.period}|${row.classId}`
      existingMap.set(key, row.absentId)
    })

    const targetMap = new Map()
    rows.forEach((row) => {
      const key = `${row.day}|${row.period}|${row.classId}`
      targetMap.set(key, row.absentId)
    })

    const rowsToUpsert = rows.filter((row) => {
      const key = `${row.day}|${row.period}|${row.classId}`
      return existingMap.get(key) !== row.absentId
    })

    if (rowsToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from('class_absence')
        .upsert(rowsToUpsert, {
          onConflict: 'day,period,classId'
        })
      if (upsertError) throw upsertError
    }

    const rowsToDelete = existingRows.filter((row) => {
      const key = `${row.day}|${row.period}|${row.classId}`
      return !targetMap.has(key)
    })

    for (const row of rowsToDelete) {
      const { error: deleteError } = await supabase
        .from('class_absence')
        .delete()
        .match({ day: row.day, period: row.period, classId: row.classId })
      if (deleteError) throw deleteError
    }
  } catch (error) {
    console.error('bulkSaveClassAbsence full error:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function bulkSaveTeacherFree(teacherFree) {
  try {
    if (!teacherFree || Object.keys(teacherFree).length === 0) {
      // Clear all teacher_free
      const { error } = await supabase
        .from('teacher_free')
        .delete()
        .neq('id', -1)

      if (error) throw error
      return
    }

    // Upsert single row with JSONB data
    const { error } = await supabase
      .from('teacher_free')
      .upsert({
        id: TEACHER_FREE_SINGLE_ROW_ID, // Single row for all data
        data: teacherFree
      }, {
        onConflict: 'id'
      })

    if (error) throw error
  } catch (error) {
    console.error('bulkSaveTeacherFree full error:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function bulkSaveLocks(locks) {
  try {
    if (!locks || Object.keys(locks).length === 0) {
      // Clear all locks
      const { error } = await supabase
        .from('locks')
        .delete()
        .neq('id', -1)

      if (error) throw error
      return
    }

    // Convert flat map to array of rows
    const lockRows = Object.entries(locks).map(([key, teacherId]) => {
      const [day, period, classId] = key.split('|')
      return {
        day,
        period: parseInt(period),
        classId,
        teacherId
      }
    })

    const { error } = await supabase
      .from('locks')
      .upsert(lockRows, {
        onConflict: 'day,period,classId'
      })

    if (error) throw error
  } catch (error) {
    console.error('bulkSaveLocks full error:', JSON.stringify(error, null, 2))
    throw error
  }
}
