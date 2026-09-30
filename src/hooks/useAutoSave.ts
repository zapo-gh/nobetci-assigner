// @ts-nocheck
/**
 * useAutoSave — Debounced otomatik kaydetme hook'u
 *
 * Faz 3 Refactor: App.jsx'teki otomatik kaydet useEffect'i bu hook'a taşındı.
 * localStorage yazma + Supabase sync işlemleri burada yönetiliyor.
 */
import { useEffect, useRef } from 'react';
import { mapSetToArray } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';
import {
  saveTeacherSchedules,
  bulkSaveTeacherFree,
  bulkSaveClassFree,
  bulkSaveClassAbsence,
  saveCommonLessons,
  bulkSaveLocks,
} from '../services/supabaseDataService.js';

const DEBOUNCE_MS = 1000;

/**
 * @param {object} params
 * @param {React.MutableRefObject<boolean>} params.hydratedRef           - İlk yükleme tamamlandı mı
 * @param {React.MutableRefObject<boolean>} params.isPollingUpdateRef    - Polling kaynaklı güncelleme mi
 * @param {string}   params.storageKey        - localStorage anahtarı
 * @param {string}   params.day               - Seçili gün
 * @param {number[]} params.periods            - Dönem listesi
 * @param {object[]} params.teachers           - Öğretmen listesi
 * @param {object[]} params.classes            - Sınıf listesi
 * @param {object}   params.teacherFree        - {period: Set(teacherId)}
 * @param {object}   params.classFree          - {day:{period:Set(classId)}}
 * @param {object[]} params.absentPeople       - Mazeret listesi
 * @param {object}   params.classAbsence       - {day:{period:{classId:absentId}}}
 * @param {object}   params.commonLessons      - {day:{period:{classId:teacherName}}}
 * @param {object}   params.options            - Uygulama seçenekleri
 * @param {object}   params.locked             - Kilitli slotlar
 * @param {object}   params.pdfSchedule        - PDF çizelge
 * @param {object}   params.teacherSchedules   - Öğretmen ders programları
 * @param {boolean}  params.teacherSchedulesHydrated - Ders programı yüklendi mi
 */
export function useAutoSave({
  hydratedRef,
  storageKey,
  day,
  periods,
  teachers,
  classes,
  teacherFree,
  classFree,
  absentPeople,
  classAbsence,
  commonLessons,
  options,
  locked,
  pdfSchedule,
  teacherSchedules,
  teacherSchedulesHydrated,
}) {
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!hydratedRef.current) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      const shouldSkipSupabase = false;
      const serializedTeacherFree = mapSetToArray(teacherFree);
      const serializedClassFree = mapSetToArray(classFree);

      // localStorage'a kaydet
      try {
        const payload = {
          day,
          periods,
          teachers,
          classes,
          teacherFree: serializedTeacherFree,
          classFree: serializedClassFree,
          absentPeople,
          classAbsence,
          commonLessons,
          options,
          lastSaved: Date.now(),
          locked,
          pdfSchedule,
          teacherSchedules,
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch (e) {
        logger.warn('useAutoSave localStorage hatası:', e);
      }

      // Polling güncellemesiyse Supabase'e yazma (döngüsel tetiklenmeyi önler)
      if (!shouldSkipSupabase) {
        if (teacherSchedules && Object.keys(teacherSchedules).length > 0) {
          saveTeacherSchedules(teacherSchedules).catch(err =>
            logger.error('useAutoSave teacherSchedules error:', err)
          );
        }
        bulkSaveTeacherFree(serializedTeacherFree).catch(err =>
          logger.error('useAutoSave teacherFree error:', err)
        );
        bulkSaveClassFree(serializedClassFree).catch(err =>
          logger.error('useAutoSave classFree error:', err)
        );
        bulkSaveClassAbsence(classAbsence).catch(err =>
          logger.error('useAutoSave classAbsence error:', err)
        );
        saveCommonLessons(commonLessons).catch(err =>
          logger.error('useAutoSave commonLessons error:', err)
        );
        bulkSaveLocks(locked).catch(err =>
          logger.error('useAutoSave locks error:', err)
        );
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherFree, classFree, classAbsence, commonLessons, teacherSchedules, teacherSchedulesHydrated, locked]);
}
