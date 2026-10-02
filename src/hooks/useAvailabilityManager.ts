import { useCallback } from 'react';
import { useTeachers } from '../contexts/useTeachers';
import { useClasses } from '../contexts/useClasses';
import { useAssignments } from '../contexts/useAssignments';
import { upsertTeacherFree, upsertClassFree, upsertClassAbsence } from '../services/firebaseDataService';
import { logger } from '../utils/logger';
import { encodeClassAbsenceValue } from '../utils/classAbsence';

export function useAvailabilityManager() {
  const { teachers, teacherFree, setTeacherFree } = useTeachers();
  const { classes, classFree, setClassFree, classAbsence, setClassAbsence } = useClasses();
  const { setCommonLessons } = useAssignments();

  const ensurePeriod = useCallback((obj: any, p: string | number) => {
    if (!obj[p]) obj[p] = new Set();
  }, []);

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

    // Sadece checkbox kaldırıldığında mazeret bilgilerini temizle
    if (wasSelected) {
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
    }
  },
    [classFree, classAbsence, setClassFree, setClassAbsence, setCommonLessons]
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
      setClassFree((prev: any) => {
        const next = { ...prev };
        if (!next[day]) next[day] = {};
        next[day][p] = on ? new Set(classes.map((c: any) => c.classId)) : new Set();
        return next;
      });
      const classIds = classes.map((c: any) => c.classId);
      const previous = Array.from((classFree[day]?.[p] as Set<string>) || []);
      const ops = on
        ? classIds.map((cid: string) => upsertClassFree({ day, period: p as number, classId: cid, isSelected: true }))
        : previous.map((cid: any) => upsertClassFree({ day, period: p as number, classId: cid as string, isSelected: false }));
      Promise.all(ops).catch((err) => logger.error('setAllClassesFree error:', err));
    },
    [classes, classFree, setClassFree]
  );

  const handleSelectAbsence = useCallback((day: string, period: string | number, classId: string, absentId: string | null) => {
    setClassAbsence((prev: any) => {
      const next = { ...prev };
      if (!next[day]) next[day] = {};
      if (!next[day][period]) next[day][period] = {};
      if (absentId) {
        const storedValue = encodeClassAbsenceValue(absentId, true);
        next[day][period][classId] = storedValue;
        upsertClassAbsence({ day, period: period as number, classId, absentId: storedValue }).catch((err) => {
          logger.error('Class absence upsert error:', err);
        });
      } else {
        delete next[day][period][classId];
        upsertClassAbsence({ day, period: period as number, classId, absentId: null }).catch((err) => {
          logger.error('Class absence cleanup error:', err);
        });
      }
      return next;
    });
  }, [setClassAbsence]);

  return {
    toggleTeacherFree,
    toggleClassFree,
    setAllTeachersFree,
    setAllClassesFree,
    handleSelectAbsence
  };
}
