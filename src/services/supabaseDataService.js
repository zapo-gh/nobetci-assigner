const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const now = () => new Date().toISOString()

export async function loadInitialData() {
  return {
    teachers: [],
    classes: [],
    absents: [],
    classFree: {},
    teacherFree: {},
    classAbsence: {},
    locked: {},
    pdfSchedule: {},
  }
}

export async function insertTeacher({ teacherName, maxDutyPerDay = 6, source = 'manual' }) {
  return {
    teacherId: createId(),
    teacherName,
    maxDutyPerDay,
    source,
    createdAt: now(),
  }
}

export async function deleteTeacherById() {
  return
}

export async function insertClass({ className }) {
  return {
    classId: createId(),
    className,
    createdAt: now(),
  }
}

export async function deleteClassById() {
  return
}

export async function insertAbsent({ name, teacherId, reason, days }) {
  return {
    absentId: createId(),
    teacherId: teacherId || null,
    name,
    reason: reason || null,
    days: Array.isArray(days) ? days : [],
    createdAt: now(),
  }
}

export async function deleteAbsentById() {
  return
}

export async function deleteClassAbsenceByAbsent() {
  return
}

export async function upsertClassFree() {
  return
}

export async function upsertTeacherFree() {
  return
}

export async function upsertClassAbsence() {
  return
}

export async function upsertLock() {
  return
}

export async function resetAllForClasses() {
  return
}

export async function resetClassFreeData() {
  return
}

export async function resetTeacherFreeData() {
  return
}

export async function replacePdfSchedule() {
  return
}