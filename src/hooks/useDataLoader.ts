// @ts-nocheck
/**
 * useDataLoader — İlk veri yükleme hook'u
 *
 * Faz 3 Refactor: App.jsx'teki ilk yükleme useEffect bu hook'a taşındı.
 * Öncelik: localStorage önbelleği (TTL: 1 saat) → Firebase → localStorage fallback
 */
import { useEffect } from 'react';
import { logger } from '../utils/logger.js';
import { arrayToSetMap } from '../utils/helpers.js';
import { normalizeAbsentPeople } from '../utils/migrations.js';
import { loadInitialData, clearAdminLocks } from '../services/firebaseDataService.js';
import { MANUAL_ADMIN_TEACHER_ID } from '../utils/assignDuty.js';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 saat
const ADMIN_LOCK_DATE_KEY = 'nobetci_admin_lock_date';

/**
 * @param {object} params
 * @param {React.MutableRefObject<boolean>} params.hydratedRef        - Hydration tamamlandı flag'i
 * @param {React.MutableRefObject<Function>} params.applyFirebaseSnapshotRef - Snapshot uygulama fonksiyonu
 * @param {string}   params.storageKey   - localStorage anahtarı
 * @param {Function} params.migrateClassFree    - classFree migration fonksiyonu
 * @param {Function} params.migrateClassAbsence - classAbsence migration fonksiyonu
 * @param {Function} params.setDay
 * @param {Function} params.setPeriods
 * @param {Function} params.setTeachers
 * @param {Function} params.setClasses
 * @param {Function} params.setTeacherFree
 * @param {Function} params.setClassFree
 * @param {Function} params.setClassAbsence
 * @param {Function} params.setAbsentPeople
 * @param {Function} params.setOptions
 * @param {Function} params.setLocked
 * @param {Function} params.setPdfSchedule
 * @param {Function} params.setTeacherSchedules
 * @param {Function} params.setTeacherSchedulesHydrated
 * @param {Function} params.setCommonLessons
 */
export function useDataLoader({
  hydratedRef,
  applyFirebaseSnapshotRef,
  storageKey,
  migrateClassFree,
  migrateClassAbsence,
  setDay,
  setPeriods,
  setTeachers,
  setClasses,
  setTeacherFree,
  setClassFree,
  setClassAbsence,
  setAbsentPeople,
  setOptions,
  setLocked,
  setPdfSchedule,
  setTeacherSchedules,
  setTeacherSchedulesHydrated,
  setCommonLessons,
}) {
  useEffect(() => {
    if (hydratedRef.current) return;

    let isMounted = true;

    const hydrateFromParsed = (parsed) => {
      if (!isMounted) return;
      if (parsed.day) setDay(parsed.day);
      if (Array.isArray(parsed.periods) && parsed.periods.length) setPeriods(parsed.periods);
      if (Array.isArray(parsed.teachers)) setTeachers(parsed.teachers);
      if (Array.isArray(parsed.classes)) setClasses(parsed.classes);
      setTeacherFree(arrayToSetMap(parsed.teacherFree || {}));
      setClassFree(migrateClassFree(parsed.classFree || {}));
      const migratedAbsence = migrateClassAbsence(parsed.classAbsence || {});
      setClassAbsence(migratedAbsence);
      setAbsentPeople(normalizeAbsentPeople(parsed.absentPeople || [], parsed.classAbsence || {}));
      if (parsed.options && typeof parsed.options === 'object') {
        setOptions(prev => ({ ...prev, ...parsed.options }));
      }
      if (parsed.locked && typeof parsed.locked === 'object') setLocked(parsed.locked);
      if (parsed.pdfSchedule && typeof parsed.pdfSchedule === 'object') setPdfSchedule(parsed.pdfSchedule);
      if (parsed.teacherSchedules && typeof parsed.teacherSchedules === 'object') {
        setTeacherSchedules(parsed.teacherSchedules);
        setTeacherSchedulesHydrated(true);
      }
      if (parsed.commonLessons && typeof parsed.commonLessons === 'object') setCommonLessons(parsed.commonLessons);
    };

    const loadData = async () => {
      try {
        // ADIM 1: localStorage önbelleğini kontrol et (TTL: 1 saat)
        try {
          const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null;
          if (raw) {
            const parsed = JSON.parse(raw || '{}') || {};
            const cacheAge = Date.now() - (parsed.lastSaved || 0);
            if (cacheAge < CACHE_TTL_MS && parsed.teachers) {
              logger.info('[useDataLoader] localStorage önbelleğinden yüklendi (Optimistic UI), yaş:', Math.round(cacheAge / 1000) + 's');
              hydrateFromParsed(parsed);
              // Artık "return" yapmıyoruz. Firebase'den güncel veriyi her zaman çekeceğiz.
            }
          }
        } catch (cacheError) {
          logger.warn('[useDataLoader] localStorage önbellek okuma hatası, Firebase\'e geçiliyor:', cacheError);
        }

        // ADIM 2: Firebase'den yükle
        try {
          const firebaseData = await loadInitialData();
          if (!isMounted) return;

          logger.info('[useDataLoader] Firebase verisi yüklendi:', {
            teachers: firebaseData.teachers?.length || 0,
            classes: firebaseData.classes?.length || 0,
            teacherSchedules: Object.keys(firebaseData.teacherSchedules || {}).length,
          });

          applyFirebaseSnapshotRef.current?.(firebaseData);

          // Yeni günde "İdare kontrolünde" kilitleri otomatik temizle
          const todayISO = new Date().toISOString().slice(0, 10);
          const lastClearedDate = localStorage.getItem(ADMIN_LOCK_DATE_KEY);
          if (lastClearedDate !== todayISO) {
            const adminLockKeys = Object.keys(firebaseData.locked || {}).filter(
              k => firebaseData.locked[k] === MANUAL_ADMIN_TEACHER_ID
            );
            if (adminLockKeys.length > 0) {
              clearAdminLocks().catch(err => logger.warn('[useDataLoader] clearAdminLocks error:', err));
              setLocked(prev => {
                const next = { ...prev };
                adminLockKeys.forEach(k => delete next[k]);
                return next;
              });
              logger.info(`[useDataLoader] ${adminLockKeys.length} adet "İdare kontrolünde" kilidi temizlendi`);
            }
            localStorage.setItem(ADMIN_LOCK_DATE_KEY, todayISO);
          }

          if (isMounted) hydratedRef.current = true;
          return;
        } catch (firebaseError) {
          logger.warn('[useDataLoader] Firebase başarısız, localStorage fallback:', firebaseError.message);
        }

        // ADIM 3: Firebase başarısız — localStorage fallback
        try {
          const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null;
          if (raw) {
            const parsed = JSON.parse(raw || '{}') || {};
            hydrateFromParsed(parsed);
          }
        } catch (error) {
          logger.error('[useDataLoader] localStorage fallback hatası:', error);
        }
      } catch (error) {
        logger.error('[useDataLoader] Veri yükleme hatası:', error);
      } finally {
        if (isMounted) hydratedRef.current = true;
      }
    };

    loadData();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
