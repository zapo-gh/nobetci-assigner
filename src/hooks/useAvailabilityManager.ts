import { useCallback, useRef } from 'react';
import { useTeachers } from '../contexts/useTeachers';
import { useClasses } from '../contexts/useClasses';
import { useAssignments } from '../contexts/useAssignments';
import { upsertTeacherFree, upsertClassFree, bulkUpsertClassFree, upsertClassAbsence, upsertLock } from '../services/firebaseDataService';
import { logger } from '../utils/logger';
import { encodeClassAbsenceValue } from '../utils/classAbsence';
import { isImesLesson, normalizeClassName } from '../utils/classNameUtils';

export function useAvailabilityManager() {
  const { teachers, teacherFree, setTeacherFree, teacherSchedules } = useTeachers();
  const { classes, classFree, setClassFree, classAbsence, setClassAbsence } = useClasses();
  const { setCommonLessons, setLocked, absentPeople, commonLessons } = useAssignments();

  // Son kaldırılan mazeret/birleştirme bilgisini geçici hafızada tutarak kullanıcı butonu tekrar açtığında geri yükler
  const lastClearedAbsenceRef = useRef<Record<string, { absentId?: string; commonTeacher?: string }>>({});

  const ensurePeriod = useCallback((obj: any, p: string | number) => {
    if (!obj[p]) obj[p] = new Set();
  }, []);

  const findAbsentTeacherForSlot = useCallback(
    (day: string, p: string | number, cid: string) => {
      const cls = classes.find((c: any) => c.classId === cid);
      if (!cls) return null;
      const targetClassName = normalizeClassName(cls.className) || cls.className || '';
      const targetNorm = targetClassName.toLocaleLowerCase('tr-TR').replace(/[\s-]/g, '');

      const todaysAbsents = (absentPeople || []).filter((a: any) => {
        const days = Array.isArray(a.days) ? a.days : [];
        return days.some((d: string) => d.toLowerCase() === day.toLowerCase() || day.toLowerCase().startsWith(d.toLowerCase().slice(0, 3)));
      });

      for (const absent of todaysAbsents) {
        const tSched = teacherSchedules?.[absent.name] || teacherSchedules?.[absent.teacherId];
        if (!tSched) continue;
        for (const [dKey, pMap] of Object.entries(tSched)) {
          if (
            typeof pMap === 'object' &&
            pMap !== null &&
            (dKey.toLowerCase() === day.toLowerCase() || dKey.toLowerCase().startsWith(day.toLowerCase().slice(0, 3)))
          ) {
            const lessonVal = String((pMap as any)[p] || '').trim();
            if (lessonVal) {
              const lessonNorm = normalizeClassName(lessonVal).toLocaleLowerCase('tr-TR').replace(/[\s-]/g, '');
              if (lessonNorm === targetNorm || lessonNorm.includes(targetNorm) || targetNorm.includes(lessonNorm)) {
                return absent;
              }
            }
          }
        }
      }
      return null;
    },
    [classes, absentPeople, teacherSchedules]
  );

  const toggleTeacherFree = useCallback(
    (p: string | number, tid: string) => {
      setTeacherFree((prev: any) => {
        const next = { ...prev };
        ensurePeriod(next, p);
        const currentSet = new Set(next[p]);
        const willSelect = !currentSet.has(tid);
        if (willSelect) currentSet.add(tid);
        else currentSet.delete(tid);
        next[p] = currentSet;
        upsertTeacherFree({ period: p as number, teacherId: tid, isSelected: willSelect }).catch((err) => {
          logger.error('Teacher free toggle error:', err);
        });
        return next;
      });
    },
    [ensurePeriod, setTeacherFree]
  );

  const toggleClassFree = useCallback((day: string, p: string | number, cid: string) => {
    let wasSelected = false;

    // Check if it's selected in classFree
    const isFree = classFree?.[day]?.[p] instanceof Set
      ? classFree[day][p].has(cid)
      : Array.isArray(classFree?.[day]?.[p])
        ? classFree[day][p].includes(cid)
        : false;

    // Check if it's selected in classAbsence
    const isAbsent = !!classAbsence?.[day]?.[p]?.[cid];

    // Consider it selected if EITHER is true
    wasSelected = isFree || isAbsent;

    setClassFree((prev: any) => {
      // Mevcut Set'i al veya boş bir Set oluştur
      const prevSet = prev[day]?.[p] || new Set();

      // Değişiklik yapmak için mevcut Set'in bir kopyasını oluştur
      const nextSet = new Set(prevSet);

      // Kopyalanan Set üzerinde değişiklik yap
      if (wasSelected) {
        nextSet.delete(cid);
      } else {
        nextSet.add(cid);
      }

      // Spread operatörleri ile her katmanı kopyalayarak yeni state'i oluştur
      return {
        ...prev, // En dış katmanı kopyala
        [day]: {
          ...(prev[day] || {}), // O güne ait objeyi kopyala (veya boş obje)
          [p]: nextSet, // Güncellenmiş yeni Set'i ata
        },
      };
    });

    const isSelectedNow = !wasSelected;
    upsertClassFree({ day, period: p as number, classId: cid, isSelected: isSelectedNow }).catch((err) => {
      logger.error('Class free toggle error:', err);
    });

    const slotKey = `${day}|${p}|${cid}`;

    // Sadece checkbox kaldırıldığında mazeret bilgilerini temizle
    if (wasSelected) {
      const currentAbs = classAbsence?.[day]?.[p]?.[cid];
      const currentCommon = commonLessons?.[day]?.[p]?.[cid];
      if (currentAbs || currentCommon) {
        lastClearedAbsenceRef.current[slotKey] = {
          absentId: currentAbs,
          commonTeacher: currentCommon,
        };
      }

      setClassAbsence((prevAbs: any) => {
        const out = { ...prevAbs };
        if (out[day]?.[p]?.[cid]) {
          out[day][p] = { ...(out[day][p] || {}) };
          delete out[day][p][cid];
          if (Object.keys(out[day][p]).length === 0) delete out[day][p];
          if (Object.keys(out[day]).length === 0) delete out[day];
        }
        return out;
      });
      upsertClassAbsence({ day, period: p as number, classId: cid, absentId: null }).catch((err) => {
        logger.error('Class absence cleanup error:', err);
      });

      setCommonLessons((prevCommon: any) => {
        const out = { ...prevCommon };
        if (out[day]?.[p]?.[cid]) {
          out[day][p] = { ...(out[day][p] || {}) };
          delete out[day][p][cid];
          if (Object.keys(out[day][p]).length === 0) delete out[day][p];
          if (Object.keys(out[day]).length === 0) delete out[day];
        }
        return out;
      });

      // Bu sınıf saati artık boş/mazeretli olmadığı için ilgili kilidi de temizle
      const lockKey = `${day}|${p}|${cid}`;
      setLocked((prev: any) => {
        if (!prev || !prev[lockKey]) return prev;
        const next = { ...prev };
        delete next[lockKey];
        return next;
      });
      upsertLock({ day, period: p as number, classId: cid, teacherId: null }).catch((err) => {
        logger.error('Lock cleanup error on classFree toggle:', err);
      });
    } else {
      // Checkbox tekrar işaretlendiğinde (veya yeni açıldığında) mazeret bilgisini geri yükle veya eşleştir
      const cached = lastClearedAbsenceRef.current[slotKey];
      let restoredAbsentId = cached?.absentId;
      let restoredCommonTeacher = cached?.commonTeacher;

      if (!restoredAbsentId && !restoredCommonTeacher) {
        const autoAbsent = findAbsentTeacherForSlot(day, p, cid);
        if (autoAbsent) {
          restoredAbsentId = autoAbsent.absentId;
        }
      }

      if (restoredAbsentId) {
        setClassAbsence((prevAbs: any) => {
          const out = { ...prevAbs };
          if (!out[day]) out[day] = {};
          if (!out[day][p]) out[day][p] = {};
          out[day][p] = { ...out[day][p], [cid]: restoredAbsentId };
          return out;
        });
        upsertClassAbsence({ day, period: p as number, classId: cid, absentId: restoredAbsentId }).catch((err) => {
          logger.error('Class absence restore error on re-toggle:', err);
        });
      }

      if (restoredCommonTeacher) {
        setCommonLessons((prevCommon: any) => {
          const out = { ...prevCommon };
          if (!out[day]) out[day] = {};
          if (!out[day][p]) out[day][p] = {};
          out[day][p] = { ...out[day][p], [cid]: restoredCommonTeacher };
          return out;
        });
      }

      delete lastClearedAbsenceRef.current[slotKey];
    }
  },
    [classFree, classAbsence, commonLessons, setClassFree, setClassAbsence, setCommonLessons, setLocked, findAbsentTeacherForSlot]
  );

  const setAllTeachersFree = useCallback(
    (p: string | number, on: boolean) => {
      const allTeacherIds = teachers.map((t: any) => t.teacherId);
      const previous = Array.from((teacherFree[p] as Set<string>) || []);
      setTeacherFree((prev: any) => ({ ...prev, [p]: on ? new Set(allTeacherIds) : new Set() }));
      const operations = on
        ? allTeacherIds.map((tid: string) => upsertTeacherFree({ period: p as number, teacherId: tid, isSelected: true }))
        : previous.map((tid: any) => upsertTeacherFree({ period: p as number, teacherId: tid as string, isSelected: false }));
      Promise.all(operations).catch((err) => logger.error('setAllTeachersFree error:', err));
    },
    [teachers, teacherFree, setTeacherFree]
  );

  const setAllClassesFree = useCallback(
    (day: string, p: string | number, on: boolean) => {
      const nonImesClasses = classes.filter((c: any) => !isImesLesson(c.className));
      setClassFree((prev: any) => {
        const next = { ...prev };
        if (!next[day]) next[day] = {};
        next[day][p] = on ? new Set(nonImesClasses.map((c: any) => c.classId)) : new Set();
        return next;
      });
      const classIds = nonImesClasses.map((c: any) => c.classId);
      const previous = Array.from((classFree[day]?.[p] as Set<string>) || []);
      const ops = on
        ? classIds.map((cid: string) => ({ day, period: p as number, classId: cid, isSelected: true }))
        : previous.map((cid: any) => ({ day, period: p as number, classId: cid as string, isSelected: false }));
      bulkUpsertClassFree(ops).catch((err) => logger.error('setAllClassesFree error:', err));
    },
    [classes, classFree, setClassFree]
  );

  const handleSelectAbsence = useCallback((day: string, period: string | number, classId: string, absentId: string | null) => {
    setClassAbsence((prev: any) => {
      const next = { ...prev };
      if (!next[day]) next[day] = {};
      if (!next[day][period]) next[day][period] = {};
      if (absentId) {
        const targetClass = classes?.find((c: any) => c.classId === classId);
        const isImes = targetClass ? isImesLesson(targetClass.className) : false;
        const storedValue = encodeClassAbsenceValue(absentId, !isImes);
        next[day][period][classId] = storedValue;
        upsertClassAbsence({ day, period: period as number, classId, absentId: storedValue }).catch((err) => {
          logger.error('Class absence upsert error:', err);
        });
      } else {
        delete next[day][period][classId];
        upsertClassAbsence({ day, period: period as number, classId, absentId: null }).catch((err) => {
          logger.error('Class absence cleanup error:', err);
        });

        const isStillFree = classFree?.[day]?.[period] instanceof Set
          ? classFree[day][period].has(classId)
          : Array.isArray(classFree?.[day]?.[period])
            ? classFree[day][period].includes(classId)
            : false;

        if (!isStillFree) {
          const lockKey = `${day}|${period}|${classId}`;
          setLocked((prev: any) => {
            if (!prev || !prev[lockKey]) return prev;
            const next = { ...prev };
            delete next[lockKey];
            return next;
          });
          upsertLock({ day, period: period as number, classId, teacherId: null }).catch((err) => {
            logger.error('Lock cleanup error on absence clear:', err);
          });
        }
      }
      return next;
    });
  }, [classes, classFree, setClassAbsence, setLocked]);

  const setTeacherPeriodsFree = useCallback(
    (tid: string, targetPeriods: (string | number)[], on: boolean) => {
      setTeacherFree((prev: any) => {
        const next = { ...prev };
        targetPeriods.forEach((p) => {
          ensurePeriod(next, p);
          const currentSet = new Set(next[p]);
          if (on) currentSet.add(tid);
          else currentSet.delete(tid);
          next[p] = currentSet;
        });
        return next;
      });
      const operations = targetPeriods.map((p) =>
        upsertTeacherFree({ period: p as number, teacherId: tid, isSelected: on })
      );
      Promise.all(operations).catch((err) => logger.error('setTeacherPeriodsFree error:', err));
    },
    [ensurePeriod, setTeacherFree]
  );

  return {
    toggleTeacherFree,
    toggleClassFree,
    setAllTeachersFree,
    setAllClassesFree,
    setTeacherPeriodsFree,
    handleSelectAbsence
  };
}
