import { useCallback } from 'react';
import {
  clearTeachersData,
  resetTeacherFreeData,
  clearClassesData,
  clearClassAbsenceData,
  clearCommonLessonsData,
  resetClassFreeData,
  clearAbsentsData,
  clearTeacherSchedules,
  clearLocksData,
  replacePdfSchedule,
} from '../services/supabaseDataService.js';
import { PERIODS } from '../constants/index.js';

export function useBulkDeleteActions({
  showConfirmation,
  addNotification,
  logger,
  setTeachers,
  setTeacherFree,
  setClasses,
  setClassFree,
  setClassAbsence,
  setCommonLessons,
  setAbsentPeople,
  setTeacherSchedules,
  setTeacherSchedulesHydrated,
  setDay,
  setPeriods,
  setOptions,
  setLocked,
  DAYS,
  STORAGE_KEY,
  LAST_ABSENT_CLEANUP_KEY,
}) {
  const deleteAllTeachers = useCallback(() => {
    if (!showConfirmation) return;
    showConfirmation(
      'Tüm Öğretmenleri Sil',
      'Listedeki tüm öğretmenler silinsin mi?',
      'warning',
      () => {
        (async () => {
          try {
            await clearTeachersData();
            await resetTeacherFreeData();
            setTeachers([]);
            setTeacherFree({});
            addNotification('Tüm öğretmen kayıtları silindi', 'info');
          } catch (error) {
            logger.error('Teacher bulk delete error:', error);
            addNotification('Öğretmenler silinemedi', 'error');
          }
        })();
      },
    );
  }, [showConfirmation, setTeachers, setTeacherFree, addNotification, logger]);

  const deleteAllClasses = useCallback(() => {
    if (!showConfirmation) return;
    showConfirmation(
      'Tüm Sınıfları Sil',
      'Tüm sınıf kayıtları silinecek. Emin misiniz?',
      'warning',
      () => {
        (async () => {
          try {
            await Promise.all([
              clearClassesData(),
              clearClassAbsenceData(),
              clearCommonLessonsData(),
              resetClassFreeData(),
            ]);
            setClasses([]);
            setClassAbsence({});
            setClassFree({});
            setCommonLessons({});
            addNotification('Tüm sınıf kayıtları silindi', 'info');
          } catch (error) {
            logger.error('Class bulk delete error:', error);
            addNotification('Sınıflar silinemedi', 'error');
          }
        })();
      },
    );
  }, [showConfirmation, setClasses, setClassAbsence, setClassFree, setCommonLessons, addNotification, logger]);

  const deleteAllAbsents = useCallback(() => {
    if (!showConfirmation) return;
    showConfirmation(
      'Tüm Mazeretleri Sil',
      'Bu işlem tüm mazeret kayıtlarını ve mevcut sınıf atamalarını temizleyecek. Devam edilsin mi?',
      'warning',
      () => {
        (async () => {
          try {
            await Promise.all([
              clearAbsentsData(),
              clearClassAbsenceData(),
              resetClassFreeData(),
              clearCommonLessonsData(),
            ]);
            setAbsentPeople([]);
            setClassAbsence({});
            setClassFree({});
            setCommonLessons({});
            addNotification('Tüm mazeret kayıtları silindi', 'info');
          } catch (error) {
            logger.error('Absent bulk delete error:', error);
            addNotification('Mazeret kayıtları silinemedi', 'error');
          }
        })();
      },
    );
  }, [showConfirmation, setAbsentPeople, setClassAbsence, setClassFree, setCommonLessons, addNotification, logger]);

  const deleteAllTeacherSchedules = useCallback(() => {
    if (!showConfirmation) return;
    showConfirmation(
      'Tüm Ders Programlarını Sil',
      'Tüm ders programları silinecek. Emin misiniz?',
      'warning',
      () => {
        (async () => {
          try {
            await clearTeacherSchedules();
            setTeacherSchedules({});
            setTeacherSchedulesHydrated(false);
            addNotification('Tüm ders programları silindi', 'info');
          } catch (error) {
            logger.error('Teacher schedule clear error:', error);
            addNotification('Ders programları silinemedi', 'error');
          }
        })();
      },
    );
  }, [showConfirmation, setTeacherSchedules, setTeacherSchedulesHydrated, addNotification, logger]);

  const clearAllData = useCallback(() => {
    if (!showConfirmation) return;
    showConfirmation(
      'Tüm Verileri Sil',
      'Tüm veriler (öğretmenler, sınıflar, boş saatler, mazeretler, kilitler) silinsin mi?',
      'danger',
      () => {
        (async () => {
          try {
            await Promise.all([
              clearTeachersData(),
              clearClassesData(),
              clearAbsentsData(),
              clearClassAbsenceData(),
              clearCommonLessonsData(),
              resetTeacherFreeData(),
              resetClassFreeData(),
              clearLocksData(),
              clearTeacherSchedules(),
              replacePdfSchedule({}),
            ]);
          } catch (err) {
            logger.error('clearAllData remote error:', err);
            addNotification('Veriler silinirken bir hata oluştu', 'error');
            return;
          }

          try {
            const keysToRemove = new Set([STORAGE_KEY, LAST_ABSENT_CLEANUP_KEY, 'theme']);
            if (typeof localStorage !== 'undefined') {
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('nobetci') || key.includes('teacher') || key.includes('class'))) {
                  keysToRemove.add(key);
                }
              }
              keysToRemove.forEach((key) => {
                try {
                  localStorage.removeItem(key);
                } catch (err) {
                  logger.warn('LocalStorage key remove failed:', key, err);
                }
              });
            }
          } catch (err) {
            logger.warn('Veri silme hatası:', err);
          }

          setDay(DAYS[Math.max(0, Math.min(4, new Date().getDay() - 1))]?.key || 'Mon');
          setPeriods(PERIODS);
          setTeachers([]);
          setClasses([]);
          setTeacherFree({});
          setClassFree({});
          setAbsentPeople([]);
          setClassAbsence({});
          setCommonLessons({});
          setOptions({ preventConsecutive: true, maxClassesPerSlot: 1, ignoreConsecutiveLimit: false });
          setLocked({});
          setTeacherSchedules({});
          setTeacherSchedulesHydrated(false);
          addNotification({ message: 'Tüm veriler temizlendi', type: 'warning', duration: 2500 });

          setTimeout(() => {
            if (typeof window !== 'undefined' && window.location) {
              window.location.reload();
            }
          }, 1000);
        })();
      },
    );
  }, [
    showConfirmation,
    addNotification,
    logger,
    setDay,
    setPeriods,
    setTeachers,
    setClasses,
    setTeacherFree,
    setClassFree,
    setAbsentPeople,
    setClassAbsence,
    setCommonLessons,
    setOptions,
    setLocked,
    setTeacherSchedules,
    setTeacherSchedulesHydrated,
    DAYS,
    STORAGE_KEY,
    LAST_ABSENT_CLEANUP_KEY,
  ]);

  return {
    deleteAllTeachers,
    deleteAllClasses,
    deleteAllAbsents,
    deleteAllTeacherSchedules,
    clearAllData,
  };
}

