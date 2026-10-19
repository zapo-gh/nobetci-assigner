import { db } from './firebaseClient.js';
import { collection as fbCollection, doc as fbDoc, getDoc as fbGetDoc, getDocs as fbGetDocs, setDoc as fbSetDoc, deleteDoc as fbDeleteDoc, query as fbQuery, where as fbWhere, writeBatch as fbWriteBatch, runTransaction as fbRunTransaction } from 'firebase/firestore';
import { normalizeClassName } from '../utils/classNameUtils.js';

const IS_FB_CONFIGURED = !!import.meta.env.VITE_FIREBASE_PROJECT_ID && import.meta.env.MODE !== 'test';

const collection = (...args: any[]) => { try { return IS_FB_CONFIGURED ? fbCollection(...args as [any, string, ...string[]]) : {} as any; } catch (e) { return {} as any; } };
const doc = (...args: any[]) => { try { return IS_FB_CONFIGURED ? fbDoc(...args as [any, string, ...string[]]) : {} as any; } catch (e) { return {} as any; } };
const query = (...args: any[]) => { try { return IS_FB_CONFIGURED ? fbQuery(...args as [any, ...any[]]) : {} as any; } catch (e) { return {} as any; } };
const where = (...args: any[]) => { try { return IS_FB_CONFIGURED ? fbWhere(...args as [string, any, any]) : {} as any; } catch (e) { return {} as any; } };

const getDoc = async (ref: any) => {
  if (!IS_FB_CONFIGURED || !ref) return { exists: () => false, data: () => null };
  return await fbGetDoc(ref);
};
const getDocs = async (ref: any) => {
  if (!IS_FB_CONFIGURED || !ref) return { docs: [] };
  return await fbGetDocs(ref);
};
const setDoc = async (ref: any, data: any, options?: any) => {
  if (!IS_FB_CONFIGURED || !ref) return Promise.resolve();
  return options !== undefined ? await fbSetDoc(ref, data, options) : await fbSetDoc(ref, data);
};
const deleteDoc = async (ref: any) => {
  if (!IS_FB_CONFIGURED || !ref) return Promise.resolve();
  return await fbDeleteDoc(ref);
};
const writeBatch = (dbRef: any) => {
  if (!IS_FB_CONFIGURED) return { set: () => { }, delete: () => { }, commit: async () => Promise.resolve() };
  return fbWriteBatch(dbRef);
};
const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)
}
import { logger } from '../utils/logger';
import { removeAbsentIdFromValue } from '../utils/classAbsence.js';

if (!IS_FB_CONFIGURED && import.meta.env.MODE !== 'test') {
  // Yapılandırma eksikse kayıtlar sessizce atlanır; bunu geliştiriciye görünür kıl
  logger.error('[Firebase] VITE_FIREBASE_PROJECT_ID tanımlı değil: veriler Firestore\'a KAYDEDİLMEYECEK.');
}

export const TEACHER_SCHEDULES_SNAPSHOT_KEY = '__snapshot__';
const MANUAL_ADMIN_TEACHER_ID = 'admin-lock';

const reportServiceError = (msg: string, err: any) => {
  logger.error(msg, err);
};

// Firestore doküman sınırı 1 MiB; 950 KB üstü yazımlar veri kaybı/sessiz hata yerine açık hata verir
const CONFIG_WARN_BYTES = 850 * 1024;
const CONFIG_MAX_BYTES = 950 * 1024;

function assertConfigSize(docName: string, data: any) {
  if (!data || typeof data !== 'object') return;
  let approxBytes = 0;
  try {
    approxBytes = JSON.stringify(data).length;
  } catch {
    return;
  }
  if (approxBytes > CONFIG_MAX_BYTES) {
    throw new Error(`[Firestore] ${docName} dokümanı çok büyük (~${Math.round(approxBytes / 1024)} KB); 1 MiB sınırı aşılmak üzere.`);
  }
  if (approxBytes > CONFIG_WARN_BYTES) {
    logger.warn(`[Firestore Boyut Uyarısı] ${docName} dokümanı Firestore 1 MiB sınırına yaklaşıyor (~${Math.round(approxBytes / 1024)} KB)`);
  }
}

// Generic config fetcher
async function getConfigDoc(docName: string, fallback: any = {}) {
  const d = await getDoc(doc(db, 'config', docName));
  return d.exists() ? ((d.data() as any)?.data ?? fallback) : fallback;
}

async function getConfigDocWithMeta(docName: string, fallback: any = {}) {
  const d = await getDoc(doc(db, 'config', docName));
  if (!d.exists()) return { data: fallback, updatedAt: 0 };
  const val = d.data() as any;
  return { data: val?.data ?? fallback, updatedAt: Number(val?.updatedAt) || 0 };
}

async function setConfigDoc(docName: string, data: any) {
  assertConfigSize(docName, data);
  await setDoc(doc(db, 'config', docName), { data, updatedAt: Date.now() });
}

export async function getAdminAuthConfig(): Promise<{ passwordHash: string; updatedAt: number } | null> {
  return await getConfigDoc('admin_auth', null);
}

export async function setAdminAuthConfig(config: { passwordHash: string; updatedAt?: number }): Promise<void> {
  await setConfigDoc('admin_auth', { ...config, updatedAt: config.updatedAt || Date.now() });
}

export async function loadInitialData() {
  try {
    const [
      teachersSnap, classesSnap, absentsSnap,
      classFree, teacherFree, classAbsence,
      locksMeta, pdfSchedule, teacherSchedules, commonLessons, locationZoneMapping, dutyZones
    ] = await Promise.all([
      getDocs(collection(db, 'teachers')),
      getDocs(collection(db, 'classes')),
      getDocs(collection(db, 'absents')),
      getConfigDoc('class_free', {}),
      getConfigDoc('teacher_free', {}),
      getConfigDoc('class_absence', {}),
      getConfigDocWithMeta('locks', {}),
      getConfigDoc('pdf_schedule', {}),
      getConfigDoc('teacher_schedules', {}),
      getConfigDoc('common_lessons', {}),
      getConfigDoc('location_zone_mapping', {}),
      getConfigDoc('duty_zones', null)
    ]);

    const teachers = teachersSnap.docs.map(d => d.data());
    const classes = classesSnap.docs.map(d => {
      const data = d.data();
      if (data?.className) {
        const norm = normalizeClassName(data.className);
        if (norm && norm !== data.className) {
          data.className = norm;
          setDoc(d.ref, { ...data, className: norm }).catch((e) => logger.warn('Sınıf adı normalizasyonu kaydedilemedi:', e));
        }
      }
      return data;
    });
    const absents = absentsSnap.docs.map(d => d.data());

    return {
      teachers,
      classes,
      absents,
      classFree,
      teacherFree,
      classAbsence,
      locked: locksMeta.data,
      locksUpdatedAt: locksMeta.updatedAt,
      pdfSchedule,
      teacherSchedules,
      commonLessons,
      locationZoneMapping,
      dutyZones
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

export async function loadLocationZoneMapping() {
  return getConfigDoc('location_zone_mapping', {});
}

export async function saveLocationZoneMapping(mapping: any) {
  await setConfigDoc('location_zone_mapping', mapping);
}

export async function loadDutyZones() {
  return getConfigDoc('duty_zones', null);
}

export async function saveDutyZones(zones: any[]) {
  await setConfigDoc('duty_zones', zones);
}

export async function insertTeacher({ teacherName, maxDutyPerDay = 6, source = 'manual', dutyLocations = {} }: any) {
  const teacherId = createId();
  const data = { teacherId, teacherName, maxDutyPerDay, source, dutyLocations, createdAt: Date.now() };
  await setDoc(doc(db, 'teachers', teacherId), data);
  return data;
}

export async function updateTeacher(teacherId: string, updates: any) {
  await setDoc(doc(db, 'teachers', teacherId), { ...updates, updatedAt: Date.now() }, { merge: true });
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
  const normalized = normalizeClassName(className);
  const finalName = normalized || className;
  const classId = createId();
  const data = { classId, className: finalName, createdAt: Date.now() };
  await setDoc(doc(db, 'classes', classId), data);
  return data;
}

export async function getClassByName(className: string) {
  const normalized = normalizeClassName(className) || className;
  const q = query(collection(db, 'classes'), where('className', '==', normalized));
  const snap = await getDocs(q);
  if (snap.docs.length > 0) {
    return snap.docs.map(d => d.data());
  }
  if (normalized !== className) {
    const rawQ = query(collection(db, 'classes'), where('className', '==', className));
    const rawSnap = await getDocs(rawQ);
    return rawSnap.docs.map(d => d.data());
  }
  return [];
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

export async function insertAbsent({ name, teacherId, reason, days, timeSlot, date, weekKey }: any) {
  const absentId = createId();
  const data = {
    absentId,
    name,
    teacherId,
    reason,
    days,
    timeSlot: timeSlot || 'full',
    date: date || null,
    weekKey: weekKey || null,
    createdAt: Date.now()
  };
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

/**
 * Config dokümanını Firestore transaction içinde oku-değiştir-yaz yapar.
 * Eşzamanlı güncellemelerde (çoklu sekme/kullanıcı) son yazanın öncekini silmesini engeller.
 * mutator, değişiklik yapılmadıysa `false` döndürmeli (yazma atlanır).
 */
async function updateConfigDoc(docName: string, fallback: any, mutator: (data: any) => boolean | void) {
  if (!IS_FB_CONFIGURED) {
    const data = await getConfigDoc(docName, fallback);
    if (mutator(data) !== false) await setConfigDoc(docName, data);
    return;
  }
  const ref = fbDoc(db, 'config', docName);
  await fbRunTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists() ? ((snap.data() as any)?.data ?? fallback) : fallback;
    if (mutator(data) === false) return;
    assertConfigSize(docName, data);
    tx.set(ref, { data });
  });
}

function pruneEmpty(data: any, day: string, period?: string | number) {
  if (period !== undefined && data[day]?.[period] && Object.keys(data[day][period]).length === 0) delete data[day][period];
  if (data[day] && Object.keys(data[day]).length === 0) delete data[day];
}

export async function deleteClassAbsenceByAbsent(absentId: string) {
  await updateConfigDoc('class_absence', {}, (data) => {
    let changed = false;
    Object.keys(data).forEach(day => {
      Object.keys(data[day]).forEach(period => {
        Object.keys(data[day][period]).forEach(cid => {
          const val = data[day][period][cid];
          const { nextValue } = removeAbsentIdFromValue(val, absentId);
          if (nextValue !== val) {
            changed = true;
            if (nextValue) data[day][period][cid] = nextValue;
            else delete data[day][period][cid];
          }
        });
        if (Object.keys(data[day][period]).length === 0) delete data[day][period];
      });
      if (Object.keys(data[day]).length === 0) delete data[day];
    });
    return changed;
  });
}

export async function deleteClassAbsenceByClass(classId: string) {
  await updateConfigDoc('class_absence', {}, (data) => {
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
    return changed;
  });
}

export async function deleteCommonLessonsByClass(classId: string) {
  await updateConfigDoc('common_lessons', {}, (data) => {
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
    return changed;
  });
}

export async function deleteCommonLessonsByTeacher(teacherName: string) {
  await updateConfigDoc('common_lessons', {}, (data) => {
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
    return changed;
  });
}

export async function deleteCommonLessonsBySlot(day: string, period: number, classId: string) {
  await updateConfigDoc('common_lessons', {}, (data) => {
    if (!data[day]?.[period]?.[classId]) return false;
    delete data[day][period][classId];
    pruneEmpty(data, day, period);
    return true;
  });
}

export async function clearClassAbsenceData() {
  await setConfigDoc('class_absence', {});
}

export async function clearCommonLessonsData() {
  await setConfigDoc('common_lessons', {});
}

export async function upsertClassFree({ day, period, classId, isSelected }: any) {
  await updateConfigDoc('class_free', {}, (data) => {
    if (!data[day]) data[day] = {};
    if (!data[day][period]) data[day][period] = [];
    const set = new Set(data[day][period]);
    if (isSelected) set.add(classId);
    else set.delete(classId);
    data[day][period] = Array.from(set);
  });
}

export async function bulkUpsertClassFree(ops: Array<{ day: string; period: number | string; classId: string; isSelected?: boolean }>) {
  if (!Array.isArray(ops) || ops.length === 0) return;
  await updateConfigDoc('class_free', {}, (data) => {
    for (const { day, period, classId, isSelected } of ops) {
      if (!day || period === undefined || !classId) continue;
      if (!data[day]) data[day] = {};
      if (!data[day][period]) data[day][period] = [];
      const set = new Set(data[day][period]);
      if (isSelected !== false) set.add(classId);
      else set.delete(classId);
      data[day][period] = Array.from(set);
    }
  });
}

export async function upsertTeacherFree({ period, teacherId, isSelected }: any) {
  await updateConfigDoc('teacher_free', {}, (data) => {
    if (!data[period]) data[period] = [];
    const set = new Set(data[period]);
    if (isSelected) set.add(teacherId);
    else set.delete(teacherId);
    data[period] = Array.from(set);
  });
}

export async function upsertClassAbsence({ day, period, classId, absentId }: any) {
  await updateConfigDoc('class_absence', {}, (data) => {
    if (!data[day]) data[day] = {};
    if (!data[day][period]) data[day][period] = {};
    if (absentId) {
      data[day][period][classId] = absentId;
    } else {
      delete data[day][period][classId];
      pruneEmpty(data, day, period);
    }
  });
}

export async function bulkUpsertClassAbsence(ops: Array<{ day: string; period: number | string; classId: string; absentId?: string | null }>) {
  if (!Array.isArray(ops) || ops.length === 0) return;
  await updateConfigDoc('class_absence', {}, (data) => {
    for (const { day, period, classId, absentId } of ops) {
      if (!day || period === undefined || !classId) continue;
      if (!data[day]) data[day] = {};
      if (!data[day][period]) data[day][period] = {};
      if (absentId) {
        data[day][period][classId] = absentId;
      } else {
        delete data[day][period][classId];
        pruneEmpty(data, day, period);
      }
    }
  });
}

export async function upsertLock({ day, period, classId, teacherId }: any) {
  await updateConfigDoc('locks', {}, (data) => {
    const key = `${day}|${period}|${classId}`;
    if (teacherId) data[key] = teacherId;
    else delete data[key];
  });
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
  await updateConfigDoc('locks', {}, (data) => {
    let changed = false;
    Object.keys(data).forEach(key => {
      if (data[key] === teacherId) {
        delete data[key];
        changed = true;
      }
    });
    return changed;
  });
}

export async function deleteLocksByClass(classId: string) {
  await updateConfigDoc('locks', {}, (data) => {
    let changed = false;
    Object.keys(data).forEach(key => {
      if (key.endsWith(`|${classId}`)) {
        delete data[key];
        changed = true;
      }
    });
    return changed;
  });
}

export async function clearLocksData() {
  await setConfigDoc('locks', {});
}

export async function clearAdminLocks() {
  await updateConfigDoc('locks', {}, (data) => {
    let changed = false;
    Object.keys(data).forEach(key => {
      if (data[key] === MANUAL_ADMIN_TEACHER_ID) {
        delete data[key];
        changed = true;
      }
    });
    return changed;
  });
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

export async function saveClassLocations(classLocations: any) {
  await setConfigDoc('class_locations', classLocations || {});
}

export async function loadClassLocations() {
  return getConfigDoc('class_locations', {});
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

