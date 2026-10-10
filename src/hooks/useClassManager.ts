import { useClasses } from '../contexts/useClasses';
import { useAssignments } from '../contexts/useAssignments';
import { insertClass, deleteClassById, deleteClassAbsenceByClass, deleteCommonLessonsByClass, deleteLocksByClass } from '../services/firebaseDataService';
import { sanitizeInputAdvanced } from '../utils/security';
import { validateClassData, normalizeClassLabel } from '../utils/helpers';
import { normalizeClassName } from '../utils/classNameUtils';
import { logger } from '../utils/logger';

export function useClassManager({ addNotification }) {
  const { classes, setClasses, setClassFree, setClassAbsence } = useClasses();
  const { setCommonLessons, setLocked } = useAssignments();

  const addClass = async (data) => {
    data.className = sanitizeInputAdvanced(data.className);
    data.className = normalizeClassName(data.className) || data.className;
    const errs = validateClassData({ classId: 'temp', className: data.className });
    if (errs.length) {
      addNotification(errs.join(", "), "error");
      return;
    }
    
    const normalizedClassNames = new Set(classes.map(c => normalizeClassLabel(c.className)));
    const normalizedInput = normalizeClassLabel(data.className);
    if (normalizedClassNames.has(normalizedInput)) {
      addNotification("Bu sınıf zaten mevcut", "warning");
      return;
    }
    try {
      const created = await insertClass({ className: data.className });
      setClasses((prev) => [...prev, created]);
      addNotification(`${data.className} eklendi`, "success");
    } catch (error) {
      logger.error('Class insert error:', error);
      addNotification("Sınıf eklenemedi", "error");
    }
  };

  const deleteClass = async (classIdToDelete) => {
    try {
      // Delete related records first (class_absence, common_lessons, locks)
      await Promise.all([
        deleteClassAbsenceByClass(classIdToDelete),
        deleteCommonLessonsByClass(classIdToDelete),
        deleteLocksByClass(classIdToDelete)
      ]);
      // Then delete the class itself
      await deleteClassById(classIdToDelete);
      
      setClasses(prev => prev.filter(c => c.classId !== classIdToDelete));
      
      setClassFree(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(dayKey => {
          const perMap = { ...(next[dayKey] || {}) };
          let changed = false;
          Object.keys(perMap).forEach(period => {
            const set = new Set(perMap[period] || []);
            if (set.delete(classIdToDelete)) {
              perMap[period] = set;
              changed = true;
            }
          });
          if (changed) next[dayKey] = perMap;
        });
        return next;
      });
      
      // Clean up class_absence and common_lessons from local state
      setClassAbsence(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(dayKey => {
          const perMap = { ...(next[dayKey] || {}) };
          Object.keys(perMap).forEach(period => {
            const byClass = { ...(perMap[period] || {}) };
            if (byClass[classIdToDelete]) {
              delete byClass[classIdToDelete];
              perMap[period] = byClass;
            }
          });
          next[dayKey] = perMap;
        });
        return next;
      });
      
      setCommonLessons(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(dayKey => {
          const perMap = { ...(next[dayKey] || {}) };
          Object.keys(perMap).forEach(period => {
            const byClass = { ...(perMap[period] || {}) };
            if (byClass[classIdToDelete]) {
              delete byClass[classIdToDelete];
              perMap[period] = byClass;
            }
          });
          next[dayKey] = perMap;
        });
        return next;
      });
      
      // Clean up locks from local state
      setLocked(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          const [, , classId] = key.split('|');
          if (classId === classIdToDelete) {
            delete next[key];
          }
        });
        return next;
      });
      
      addNotification("Sınıf silindi", "info");
    } catch (error) {
      logger.error('Class delete error:', error);
      addNotification('Sınıf silinemedi', 'error');
    }
  };

  return {
    addClass,
    deleteClass
  };
}
