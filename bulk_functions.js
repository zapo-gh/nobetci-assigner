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
