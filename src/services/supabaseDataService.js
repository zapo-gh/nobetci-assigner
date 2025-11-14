import { supabase } from './supabaseClient.js'

const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const now = () => new Date().toISOString()

export async function loadInitialData() {
  try {
    // Load all data in parallel
    const [teachersRes, classesRes, absentsRes, classFreeRes, teacherFreeRes, classAbsenceRes, lockedRes, pdfScheduleRes, teacherSchedulesRes, commonLessonsRes, importHistoryRes, snapshotsRes] = await Promise.all([
      supabase.from('teachers').select('*').order('createdAt', { ascending: false }),
      supabase.from('classes').select('*').order('createdAt', { ascending: false }),
      supabase.from('absents').select('*').order('createdAt', { ascending: false }),
      supabase.from('class_free').select('*'),
      supabase.from('teacher_free').select('*'),
      supabase.from('class_absence').select('*'),
      supabase.from('locks').select('*'),
      supabase.from('pdf_schedule').select('*').order('createdAt', { ascending: false }).limit(1),
      supabase.from('teacher_schedules').select('*'),
      supabase.from('common_lessons').select('*'),
      supabase.from('import_history').select('*').order('createdAt', { ascending: false }),
      supabase.from('snapshots').select('*').order('ts', { ascending: false })
    ])

    if (teachersRes.error) throw teachersRes.error
    if (classesRes.error) throw classesRes.error
    if (absentsRes.error) throw absentsRes.error
    if (classFreeRes.error) throw classFreeRes.error
    if (teacherFreeRes.error) throw teacherFreeRes.error
    if (classAbsenceRes.error) throw classAbsenceRes.error
    if (lockedRes.error) throw lockedRes.error
    if (pdfScheduleRes.error) throw pdfScheduleRes.error
    if (teacherSchedulesRes.error) throw teacherSchedulesRes.error
    if (commonLessonsRes.error) throw commonLessonsRes.error
    if (importHistoryRes.error) throw importHistoryRes.error
    if (snapshotsRes.error) throw snapshotsRes.error

    // Transform data to expected format
    const classFree = {}
    classFreeRes.data.forEach(item => {
      if (!classFree[item.day]) classFree[item.day] = {}
      classFree[item.day][item.period] = item.classIds || []
    })

    const teacherFree = {}
    teacherFreeRes.data.forEach(item => {
      teacherFree[item.period] = item.teacherIds || []
    })

    const classAbsence = {}
    classAbsenceRes.data.forEach(item => {
      if (!classAbsence[item.day]) classAbsence[item.day] = {}
      if (!classAbsence[item.day][item.period]) classAbsence[item.day][item.period] = {}
      classAbsence[item.day][item.period][item.classId] = item.absentId
    })

    const locked = {}
    lockedRes.data.forEach(item => {
      locked[`${item.day}|${item.period}|${item.classId}`] = item.teacherId
    })

    const pdfSchedule = pdfScheduleRes.data.length > 0 ? pdfScheduleRes.data[0].schedule : {}

    // Transform teacher schedules
    const teacherSchedules = {}
    teacherSchedulesRes.data.forEach(item => {
      teacherSchedules[item.teacher_name] = item.schedule
    })

    // Transform common lessons
    const commonLessons = {}
    commonLessonsRes.data.forEach(item => {
      if (!commonLessons[item.day]) commonLessons[item.day] = {}
      if (!commonLessons[item.day][item.period]) commonLessons[item.day][item.period] = {}
      commonLessons[item.day][item.period][item.class_id] = item.teacher_name
    })

    return {
      teachers: teachersRes.data,
      classes: classesRes.data,
      absents: absentsRes.data,
      classFree,
      teacherFree,
      classAbsence,
      locked,
      pdfSchedule,
      teacherSchedules,
      commonLessons,
      importHistory: importHistoryRes.data,
      snapshots: snapshotsRes.data
    }
  } catch (error) {
    console.error('loadInitialData error:', error)
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

export async function insertClass({ className }) {
  try {
    const classData = {
      classId: createId(),
      className,
    }

    const { data, error } = await supabase
      .from('classes')
      .insert(classData)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('insertClass full error:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function deleteClassById(classId) {
  try {
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
      .single()

    if (error) throw error
    return data
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

export async function deleteClassAbsenceByAbsent(absentId) {
  try {
    const { error } = await supabase
      .from('class_absence')
      .delete()
      .eq('absentId', absentId)

    if (error) throw error
  } catch (error) {
    console.error('deleteClassAbsenceByAbsent error:', error)
    throw error
  }
}

export async function upsertClassFree({ day, period, classId, isSelected }) {
  try {
    // First, get current class_free for this day/period
    const { data: existing, error: fetchError } = await supabase
      .from('class_free')
      .select('classIds')
      .eq('day', day)
      .eq('period', period)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError // PGRST116 = not found

    let classIds = existing ? (existing.classIds || []) : []

    if (isSelected) {
      if (!classIds.includes(classId)) {
        classIds.push(classId)
      }
    } else {
      classIds = classIds.filter(id => id !== classId)
    }

    const { error } = await supabase
      .from('class_free')
      .upsert({
        day,
        period,
        classIds
      }, {
        onConflict: 'day,period'
      })

    if (error) throw error
  } catch (error) {
    console.error('upsertClassFree full error:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function upsertTeacherFree({ period, teacherId, isSelected }) {
  try {
    // First, get current teacher_free for this period
    const { data: existing, error: fetchError } = await supabase
      .from('teacher_free')
      .select('teacherIds')
      .eq('period', period)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError // PGRST116 = not found

    let teacherIds = existing ? (existing.teacherIds || []) : []

    if (isSelected) {
      if (!teacherIds.includes(teacherId)) {
        teacherIds.push(teacherId)
      }
    } else {
      teacherIds = teacherIds.filter(id => id !== teacherId)
    }

    const { error } = await supabase
      .from('teacher_free')
      .upsert({
        period,
        teacherIds
      }, {
        onConflict: 'period'
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
      .neq('day', 'dummy') // Delete all

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
      .neq('day', 'dummy') // Delete all

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
      .neq('period', -1) // Delete all

    if (error) throw error
  } catch (error) {
    console.error('resetTeacherFreeData error:', error)
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
      // Clear all teacher schedules
      const { error } = await supabase
        .from('teacher_schedules')
        .delete()
        .neq('id', -1)

      if (error) throw error
      return
    }

    // Prepare data for upsert
    const schedulesData = Object.entries(teacherSchedules).map(([teacherName, schedule]) => ({
      teacher_name: teacherName,
      schedule: schedule
    }))

    const { error } = await supabase
      .from('teacher_schedules')
      .upsert(schedulesData, {
        onConflict: 'teacher_name'
      })

    if (error) throw error
  } catch (error) {
    console.error('saveTeacherSchedules full error:', JSON.stringify(error, null, 2))
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

export async function saveImportHistory(importHistory) {
  try {
    if (!importHistory || importHistory.length === 0) return

    const { error } = await supabase
      .from('import_history')
      .insert(importHistory)

    if (error) throw error
  } catch (error) {
    console.error('saveImportHistory full error:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function saveSnapshots(snapshots) {
  try {
    if (!snapshots || snapshots.length === 0) return

    const { error } = await supabase
      .from('snapshots')
      .upsert(snapshots, {
        onConflict: 'id'
      })

    if (error) throw error
  } catch (error) {
    console.error('saveSnapshots full error:', JSON.stringify(error, null, 2))
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
        id: 1, // Single row for all data
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
        id: 1, // Single row for all data
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
