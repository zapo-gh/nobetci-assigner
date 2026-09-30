import { useCallback } from 'react';
import { useTeachers } from '../contexts/useTeachers';
import { useAssignments } from '../contexts/useAssignments';
import { insertTeacher, deleteTeacherById, deleteLocksByTeacher } from '../services/supabaseDataService';
import { sanitizeInputAdvanced } from '../utils/security';
import { validateTeacherData } from '../utils/helpers';
import { logger } from '../utils/logger';

export function useTeacherManager({ addNotification, setActiveSection, setExcelReplaceModal, periods, replacePdfSchedule }) {
  const { teachers, setTeachers, setTeacherFree } = useTeachers();
  const { setPdfSchedule, setLocked } = useAssignments();

  const addTeacher = async (data) => {
    data.teacherName = sanitizeInputAdvanced(data.teacherName);
    const errs = validateTeacherData({ teacherId: 'temp', teacherName: data.teacherName, maxDutyPerDay: data.maxDutyPerDay });
    if (errs.length) {
      addNotification(errs.join(", "), "error");
      return;
    }
    try {
      const created = await insertTeacher({ teacherName: data.teacherName, maxDutyPerDay: data.maxDutyPerDay });
      setTeachers((prev) => [...prev, created]);
      addNotification(`${data.teacherName} eklendi`, "success");
    } catch (error) {
      logger.error('Teacher insert error:', error);
      addNotification("Öğretmen eklenemedi", "error");
    }
  };

  const deleteTeacher = async (teacherIdToDelete) => {
    try {
      // Delete related locks first
      await deleteLocksByTeacher(teacherIdToDelete);
      // Then delete the teacher
      await deleteTeacherById(teacherIdToDelete);
      setTeachers(prev => prev.filter(t => t.teacherId !== teacherIdToDelete));
      setTeacherFree(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(period => {
          const set = new Set(next[period] || []);
          if (set.delete(teacherIdToDelete)) {
            next[period] = set;
          }
        });
        return next;
      });
      // Clean up locks from local state
      setLocked(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          if (next[key] === teacherIdToDelete) {
            delete next[key];
          }
        });
        return next;
      });
      addNotification("Öğretmen silindi", "info");
    } catch (error) {
      logger.error('Teacher delete error:', error);
      addNotification('Öğretmen silinemedi', 'error');
    }
  };

  const deleteAllPdfTeachers = async () => {
    const pdfTeachers = teachers.filter(t => t.source === 'duty_schedule');
    if (pdfTeachers.length === 0) {
      addNotification("Silinecek PDF öğretmeni bulunamadı", "warning");
      return;
    }

    try {
      await Promise.all(pdfTeachers.map(t => deleteTeacherById(t.teacherId)));
      setTeachers(prev => prev.filter(t => t.source !== 'duty_schedule'));
      setTeacherFree(prev => {
        const next = { ...prev };
        const removeIds = new Set(pdfTeachers.map(t => t.teacherId));
        Object.keys(next).forEach(period => {
          const set = new Set(next[period] || []);
          let changed = false;
          removeIds.forEach(id => {
            if (set.delete(id)) changed = true;
          });
          if (changed) next[period] = set;
        });
        return next;
      });
      addNotification(`${pdfTeachers.length} PDF öğretmeni silindi`, "success");
    } catch (error) {
      logger.error('PDF teachers bulk delete error:', error);
      addNotification('PDF öğretmenler silinemedi', 'error');
    }
  };

  const importDutyTeachersData = useCallback(async ({ dutyTeachers, dayTeachers }) => {
    const validTeachers = dutyTeachers.filter(teacher => teacher.teacherName && teacher.teacherName.trim().length > 0);
    if (validTeachers.length === 0) {
      throw new Error('Geçerli öğretmen verisi bulunamadı');
    }

    const existingDutyTeachers = teachers.filter(t => t.source === 'duty_schedule');

    if (existingDutyTeachers.length > 0) {
      await Promise.all(existingDutyTeachers.map(t => deleteTeacherById(t.teacherId)));
      setTeachers(prev => prev.filter(t => t.source !== 'duty_schedule'));
      const removeIds = new Set(existingDutyTeachers.map(t => t.teacherId));
      setTeacherFree(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(period => {
          const set = new Set(next[period] || []);
          let changed = false;
          removeIds.forEach(id => {
            if (set.delete(id)) changed = true;
          });
          if (changed) next[period] = set;
        });
        return next;
      });
    }

    const insertedTeachers = await Promise.all(validTeachers.map(teacher =>
      insertTeacher({
        teacherName: teacher.teacherName,
        maxDutyPerDay: teacher.maxDutyPerDay ?? 6,
        source: 'duty_schedule'
      })
    ));

    setTeachers(prev => [...prev, ...insertedTeachers]);
    setTeacherFree((prev) => {
      const next = { ...prev };
      for (const p of periods) {
        if (!next[p]) next[p] = new Set();
      }
      return next;
    });

    let newPdfSchedule = {};
    if (dayTeachers && dayTeachers.size > 0) {
      const dayMapping = {
        'PAZARTESİ': 'monday',
        'SALI': 'tuesday',
        'ÇARŞAMBA': 'wednesday',
        'PERŞEMBE': 'thursday',
        'CUMA': 'friday'
      };
      dayTeachers.forEach((list, day) => {
        const systemDay = dayMapping[day.toUpperCase()];
        if (systemDay) {
          newPdfSchedule[systemDay] = {};
          for (const period of periods) {
            newPdfSchedule[systemDay][period] = [...list];
          }
        }
      });
      await replacePdfSchedule(newPdfSchedule);
      setPdfSchedule(newPdfSchedule);
    } else {
      await replacePdfSchedule({});
      setPdfSchedule({});
    }

    return { insertedCount: insertedTeachers.length, removedCount: existingDutyTeachers.length };
  }, [teachers, periods, setPdfSchedule, setTeachers, setTeacherFree, replacePdfSchedule]);

  const loadDutyTeachersFromExcel = useCallback(
    async (data) => {
      if (!data || !data.dutyTeachers || data.dutyTeachers.length === 0) {
        addNotification("Yüklenecek öğretmen verisi bulunamadı", "warning");
        return;
      }

      const existingTeachers = teachers.filter(t => t.source === 'duty_schedule');
      if (existingTeachers.length > 0) {
        setExcelReplaceModal({ isOpen: true, data, existingCount: existingTeachers.length });
        return;
      }

      try {
        const result = await importDutyTeachersData(data);
        addNotification(`${result.insertedCount} nöbetçi öğretmen Excel'den yüklendi`, "success");
        setActiveSection("classes");
      } catch (e) {
        logger.error(e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        addNotification(`Excel yükleme hatası: ${errorMessage}`, "error");
      }
    },
    [addNotification, teachers, importDutyTeachersData, setActiveSection, setExcelReplaceModal]
  );

  return {
    addTeacher,
    deleteTeacher,
    deleteAllPdfTeachers,
    importDutyTeachersData,
    loadDutyTeachersFromExcel
  };
}
