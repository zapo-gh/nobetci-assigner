import { db } from './firebaseClient';
import { 
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, 
  query, where, writeBatch 
} from 'firebase/firestore';
const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)
}
import { logger } from '../utils/logger';

export const TEACHER_SCHEDULES_SNAPSHOT_KEY = '__snapshot__';
const CLASS_ABSENCE_NO_DUTY_SUFFIX = '__NO_DUTY__';
const MANUAL_ADMIN_TEACHER_ID = 'admin-lock';

const reportServiceError = (msg: string, err: any) => {
  logger.error(msg, err);
};

// Generic config fetcher
async function getConfigDoc(docName: string, fallback: any = {}) {
  const d = await getDoc(doc(db, 'config', docName));
  return d.exists() ? (d.data().data || fallback) : fallback;
}
async function setConfigDoc(docName: string, data: any) {
  await setDoc(doc(db, 'config', docName), { data });
}

export async function loadInitialData() {
  try {
    const [
      teachersSnap, classesSnap, absentsSnap, 
      classFree, teacherFree, classAbsence, 
      locks, pdfSchedule, teacherSchedules, commonLessons
    ] = await Promise.all([
      getDocs(collection(db, 'teachers')),
      getDocs(collection(db, 'classes')),
      getDocs(collection(db, 'absents')),
      getConfigDoc('class_free', {}),
      getConfigDoc('teacher_free', {}),
      getConfigDoc('class_absence', {}),
      getConfigDoc('locks', {}),
      getConfigDoc('pdf_schedule', {}),
      getConfigDoc('teacher_schedules', {}),
      getConfigDoc('common_lessons', {})
    ]);

    const teachers = teachersSnap.docs.map(d => d.data());
    const classes = classesSnap.docs.map(d => d.data());
    const absents = absentsSnap.docs.map(d => d.data());

    return {
      teachers,
      classes,
      absents,
      classFree,
      teacherFree,
      classAbsence,
      locked: locks,
      pdfSchedule,
      teacherSchedules,
      commonLessons
    };
  } catch (error) {
    reportServiceError('loadInitialData error:', error);
    throw error;
  }
}

export async function loadAbsenceRelatedData() {
  const [absentsSnap, classFree, classAbsence, commonLessons] = await Promise.all([
    getDocs(collection(db, 'absents')),
    getConfigDoc('class_free', {}),
    getConfigDoc('class_absence', {}),
    getConfigDoc('common_lessons', {})
  ]);
  return {
    absents: absentsSnap.docs.map(d => d.data()),
    classFree,
    classAbsence,
    commonLessons
  };
}

export async function loadClassAbsence() {
  return getConfigDoc('class_absence', {});
}

export async function loadClassFree() {
  return getConfigDoc('class_free', {});
}

export async function insertTeacher({ teacherName, maxDutyPerDay = 6, source = 'manual' }: any) {
  const teacherId = createId();
  const data = { teacherId, teacherName, maxDutyPerDay, source, createdAt: Date.now() };
  await setDoc(doc(db, 'teachers', teacherId), data);
  return data;
}

export async function deleteTeacherById(teacherId: string) {
  await deleteDoc(doc(db, 'teachers', teacherId));
}

export async function clearTeachersData() {
  const snap = await getDocs(collection(db, 'teachers'));
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

export async function insertClass({ className }: any) {
  const classId = createId();
  const data = { classId, className, createdAt: Date.now() };
  await setDoc(doc(db, 'classes', classId), data);
  return data;
}

export async function getClassByName(className: string) {
  const q = query(collection(db, 'classes'), where('className', '==', className));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function deleteClassById(classId: string) {
  await deleteDoc(doc(db, 'classes', classId));
}

export async function clearClassesData() {
  const snap = await getDocs(collection(db, 'classes'));
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

export async function insertAbsent({ name, teacherId, reason, days }: any) {
  const absentId = createId();
  const data = { absentId, name, teacherId, reason, days, createdAt: Date.now() };
  await setDoc(doc(db, 'absents', absentId), data);
  return data;
}

export async function deleteAbsentById(absentId: string) {
  await deleteDoc(doc(db, 'absents', absentId));
}

export async function clearAbsentsData() {
  const snap = await getDocs(collection(db, 'absents'));
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

export async function deleteClassAbsenceByAbsent(absentId: string) {
  const data = await getConfigDoc('class_absence', {});
  let changed = false;
  
  const buildAbsentIdVariants = (base: string) => {
    if (!base) return [];
    const variants = new Set([base]);
    if (base.endsWith(CLASS_ABSENCE_NO_DUTY_SUFFIX)) {
      variants.add(base.slice(0, -CLASS_ABSENCE_NO_DUTY_SUFFIX.length));
    } else {
      variants.add(base + CLASS_ABSENCE_NO_DUTY_SUFFIX);
    }
    return Array.from(variants).filter(Boolean);
  };
  
  const targets = buildAbsentIdVariants(absentId);
  Object.keys(data).forEach(day => {
    Object.keys(data[day]).forEach(period => {
      Object.keys(data[day][period]).forEach(cid => {
        if (targets.includes(data[day][period][cid])) {
          delete data[day][period][cid];
          changed = true;
        }
      });
      if (Object.keys(data[day][period]).length === 0) delete data[day][period];
    });
    if (Object.keys(data[day]).length === 0) delete data[day];
  });
  if (changed) await setConfigDoc('class_absence', data);
}

export async function deleteClassAbsenceByClass(classId: string) {
  const data = await getConfigDoc('class_absence', {});
  let changed = false;
  Object.keys(data).forEach(day => {
    Object.keys(data[day]).forEach(period => {
      if (data[day][period][classId]) {
        delete data[day][period][classId];
        changed = true;
      }
      if (Object.keys(data[day][period]).length === 0) delete data[day][period];
    });
    if (Object.keys(data[day]).length === 0) delete data[day];
  });
  if (changed) await setConfigDoc('class_absence', data);
}

export async function deleteCommonLessonsByClass(classId: string) {
  const data = await getConfigDoc('common_lessons', {});
  let changed = false;
  Object.keys(data).forEach(day => {
    Object.keys(data[day]).forEach(period => {
      if (data[day][period][classId]) {
        delete data[day][period][classId];
        changed = true;
      }
      if (Object.keys(data[day][period]).length === 0) delete data[day][period];
    });
    if (Object.keys(data[day]).length === 0) delete data[day];
  });
  if (changed) await setConfigDoc('common_lessons', data);
}

export async function deleteCommonLessonsByTeacher(teacherName: string) {
  const data = await getConfigDoc('common_lessons', {});
  let changed = false;
  Object.keys(data).forEach(day => {
    Object.keys(data[day]).forEach(period => {
      Object.keys(data[day][period]).forEach(cid => {
        if (data[day][period][cid] === teacherName) {
          delete data[day][period][cid];
          changed = true;
        }
      });
      if (Object.keys(data[day][period]).length === 0) delete data[day][period];
    });
    if (Object.keys(data[day]).length === 0) delete data[day];
  });
  if (changed) await setConfigDoc('common_lessons', data);
}

export async function deleteCommonLessonsBySlot(day: string, period: number, classId: string) {
  const data = await getConfigDoc('common_lessons', {});
  if (data[day]?.[period]?.[classId]) {
    delete data[day][period][classId];
    if (Object.keys(data[day][period]).length === 0) delete data[day][period];
    if (Object.keys(data[day]).length === 0) delete data[day];
    await setConfigDoc('common_lessons', data);
  }
}

export async function clearClassAbsenceData() {
  await setConfigDoc('class_absence', {});
}

export async function clearCommonLessonsData() {
  await setConfigDoc('common_lessons', {});
}

export async function upsertClassFree({ day, period, classId, isSelected }: any) {
  const data = await getConfigDoc('class_free', {});
  if (!data[day]) data[day] = {};
  if (!data[day][period]) data[day][period] = [];
  
  const set = new Set(data[day][period]);
  if (isSelected) set.add(classId);
  else set.delete(classId);
  
  data[day][period] = Array.from(set);
  await setConfigDoc('class_free', data);
}

export async function upsertTeacherFree({ period, teacherId, isSelected }: any) {
  const data = await getConfigDoc('teacher_free', {});
  if (!data[period]) data[period] = [];
  
  const set = new Set(data[period]);
  if (isSelected) set.add(teacherId);
  else set.delete(teacherId);
  
  data[period] = Array.from(set);
  await setConfigDoc('teacher_free', data);
}

export async function upsertClassAbsence({ day, period, classId, absentId }: any) {
  const data = await getConfigDoc('class_absence', {});
  if (!data[day]) data[day] = {};
  if (!data[day][period]) data[day][period] = {};
  
  if (absentId) {
    data[day][period][classId] = absentId;
  } else {
    delete data[day][period][classId];
    if (Object.keys(data[day][period]).length === 0) delete data[day][period];
    if (Object.keys(data[day]).length === 0) delete data[day];
  }
  await setConfigDoc('class_absence', data);
}

export async function upsertLock({ day, period, classId, teacherId }: any) {
  const data = await getConfigDoc('locks', {});
  const key = `${day}|${period}|${classId}`;
  if (teacherId) {
    data[key] = teacherId;
  } else {
    delete data[key];
  }
  await setConfigDoc('locks', data);
}

export async function resetAllForClasses() {
  await Promise.all([
    clearClassAbsenceData(),
    clearCommonLessonsData(),
    setConfigDoc('class_free', {})
  ]);
}

export async function resetClassFreeData() {
  await setConfigDoc('class_free', {});
}

export async function resetTeacherFreeData() {
  await setConfigDoc('teacher_free', {});
}

export async function deleteLocksByTeacher(teacherId: string) {
  const data = await getConfigDoc('locks', {});
  let changed = false;
  Object.keys(data).forEach(key => {
    if (data[key] === teacherId) {
      delete data[key];
      changed = true;
    }
  });
  if (changed) await setConfigDoc('locks', data);
}

export async function deleteLocksByClass(classId: string) {
  const data = await getConfigDoc('locks', {});
  let changed = false;
  Object.keys(data).forEach(key => {
    if (key.endsWith(`|${classId}`)) {
      delete data[key];
      changed = true;
    }
  });
  if (changed) await setConfigDoc('locks', data);
}

export async function clearLocksData() {
  await setConfigDoc('locks', {});
}

export async function clearAdminLocks() {
  const data = await getConfigDoc('locks', {});
  let changed = false;
  Object.keys(data).forEach(key => {
    if (data[key] === MANUAL_ADMIN_TEACHER_ID) {
      delete data[key];
      changed = true;
    }
  });
  if (changed) await setConfigDoc('locks', data);
}

export async function replacePdfSchedule(schedule: any) {
  await setConfigDoc('pdf_schedule', schedule);
}

export async function saveTeacherSchedules(teacherSchedules: any) {
  await setConfigDoc('teacher_schedules', teacherSchedules);
}

export async function clearTeacherSchedules() {
  await setConfigDoc('teacher_schedules', {});
}

export async function saveCommonLessons(commonLessons: any) {
  await setConfigDoc('common_lessons', commonLessons);
}

export async function bulkSaveTeachers(teachers: any[]) {
  const batch = writeBatch(db);
  teachers.forEach(t => {
    batch.set(doc(db, 'teachers', t.teacherId), t);
  });
  await batch.commit();
}

export async function bulkSaveClasses(classes: any[]) {
  const batch = writeBatch(db);
  classes.forEach(c => {
    batch.set(doc(db, 'classes', c.classId), c);
  });
  await batch.commit();
}

export async function bulkSaveAbsents(absents: any[]) {
  const batch = writeBatch(db);
  absents.forEach(a => {
    batch.set(doc(db, 'absents', a.absentId), a);
  });
  await batch.commit();
}

export async function bulkSaveClassFree(classFree: any) {
  await setConfigDoc('class_free', classFree);
}

export async function bulkSaveClassAbsence(classAbsence: any) {
  await setConfigDoc('class_absence', classAbsence);
}

export async function bulkSaveTeacherFree(teacherFree: any) {
  await setConfigDoc('teacher_free', teacherFree);
}

export async function bulkSaveLocks(locks: any) {
  await setConfigDoc('locks', locks);
}
