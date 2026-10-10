// @ts-nocheck
import React, { memo, useMemo, useCallback, useState, useEffect, useLayoutEffect } from 'react';
import styles from './AssignmentEditor.module.css';
import { MANUAL_EMPTY_TEACHER_ID, MANUAL_ADMIN_TEACHER_ID, getZoneDistance } from '../utils/assignDuty.js';
import {
  normalizeClassName,
  compareClassNames,
  getClassroomName,
  getTeacherDutyLocation,
  abbreviateDutyLocation
} from '../utils/classNameUtils.js';

const AUTO_OPTION = '__AUTO__';
const DEFAULT_EDITOR_HEIGHT = 160;

function getClassBadgeColor(className = '') {
  const match = className.match(/(\d+)/);
  if (match) {
    const grade = match[1];
    if (grade === '9') return 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)';
    if (grade === '10') return 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)';
    if (grade === '11') return 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)';
    if (grade === '12') return 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)';
  }
  return 'linear-gradient(135deg, #334155 0%, #64748b 100%)';
}

function getClassAvatarLabel(className = '') {
  const trimmed = className.trim();
  const match = trimmed.match(/(\d+)\s*[-/]?\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)/i);
  if (match) {
    const grade = match[1];
    const branch = match[2] ? match[2].charAt(0).toUpperCase() : '';
    return `${grade}${branch}`;
  }
  const numOnly = trimmed.match(/(\d+)/);
  if (numOnly) return numOnly[1];
  return trimmed.slice(0, 3).toUpperCase();
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] || '').slice(0, 2).toUpperCase();
  const first = parts[0] || '';
  const last = parts[parts.length - 1] || '';
  return ((first[0] || '') + (last[0] || '')).toUpperCase();
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
  'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
  'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
  'linear-gradient(135deg, #d97706 0%, #ea580c 100%)',
  'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)',
  'linear-gradient(135deg, #0891b2 0%, #0284c7 100%)',
];

function getAvatarGradient(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index] || AVATAR_GRADIENTS[0];
}

function AssignmentEditor({
  day,
  periods = [],
  classes = [],
  teachers = [],
  availableTeachersByPeriod = {},
  freeClassesByDay = {},
  assignment = {},
  locked = {},
  classLocations = {},
  locationZoneMapping = {},
  teacherSchedules = {},
  onDropAssign,
  onManualAssign,
  onManualClear,
  onManualSetAdmin,
  onManualRelease,
  commonLessons = {},
  IconComponent,
  onManualEditorStateChange,
  unassignedForSelectedDay = [],
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'assigned' | 'unassigned' | 'empty'
  const [dragOverClassId, setDragOverClassId] = useState(null);
  const [droppedClassId, setDroppedClassId] = useState(null);
  const [editingContext, setEditingContext] = useState(null);
  const [editSelection, setEditSelection] = useState(AUTO_OPTION);
  const [editorPosition, setEditorPosition] = useState({ top: 0, left: 0, width: 0 });
  const [editorHeight, setEditorHeight] = useState(DEFAULT_EDITOR_HEIGHT);
  const editorRef = React.useRef(null);

  const teacherById = useMemo(() => Object.fromEntries(teachers.map((t) => [t.teacherId, t])), [teachers]);

  const classroomByClassId = useMemo(() => {
    const map = new Map();
    (classes || []).forEach((cls) => {
      const cName = cls?.className || '';
      if (!cName) return;
      const room = getClassroomName(classLocations, cName, day);
      if (room) {
        map.set(cls.classId, room);
      }
    });
    return map;
  }, [classes, classLocations, day]);


  const calculateEditorPosition = useCallback((rect) => {
    if (!rect) return { top: 0, left: 0, width: 0 };

    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 700;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1000;
    const effectiveHeight = 440;

    const editorWidth = Math.min(360, Math.max(300, viewportWidth - 24));
    let top = rect.bottom + 6;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    if (spaceBelow < effectiveHeight + 8 && spaceAbove > effectiveHeight + 8) {
      top = rect.top - effectiveHeight - 6;
    }
    top = Math.max(8, Math.min(top, viewportHeight - effectiveHeight - 8));

    let left = rect.left;
    if (left + editorWidth > viewportWidth - 14) {
      left = viewportWidth - editorWidth - 14;
    }
    if (left < 14) {
      left = 14;
    }

    return { top, left, width: editorWidth };
  }, []);

  const baseTeacherOptions = useMemo(() => {
    return [...teachers].sort((a, b) => (a.teacherName || '').localeCompare(b.teacherName || '', 'tr', { sensitivity: 'base' }));
  }, [teachers]);

  // Toplam görev sayısı (adaletli dağıtım takibi için)
  const dutiesTodayMap = useMemo(() => {
    const map = new Map();
    if (assignment?.[day]) {
      Object.values(assignment[day]).forEach((slotArr) => {
        if (Array.isArray(slotArr)) {
          slotArr.forEach((item) => {
            if (item?.teacherId) {
              map.set(item.teacherId, (map.get(item.teacherId) || 0) + 1);
            }
          });
        }
      });
    }
    return map;
  }, [assignment, day]);

  // Manuel atama penceresi için gruplanmış ve sıralanmış nöbetçi listesi
  const currentEditorData = useMemo(() => {
    if (!editingContext) {
      return { freeTeachers: [], busyTeachers: [], targetClassroom: '', targetZone: null };
    }
    const { period, classId } = editingContext;

    const targetClass = classes.find((c) => c.classId === classId);
    const targetClassName = targetClass?.className || classId;
    const classroom = classroomByClassId.get(classId) || getClassroomName(classLocations, targetClassName, day);

    let targetZone = null;
    if (classroom && locationZoneMapping) {
      targetZone = locationZoneMapping[classroom];
      if (!targetZone && classroom.includes('/')) {
        targetZone = locationZoneMapping[classroom.split('/')[0].trim()];
      }
    }

    const freeSource = availableTeachersByPeriod?.[period];
    const freeSet = freeSource instanceof Set
      ? freeSource
      : new Set(Array.isArray(freeSource) ? freeSource : []);

    const getTeacherLesson = (t) => {
      const tSched = teacherSchedules?.[t.teacherName] || teacherSchedules?.[t.teacherId];
      if (!tSched) return null;
      const dayKeys = [day, day?.toLowerCase?.(), day?.slice?.(0, 3)];
      for (const dk of dayKeys) {
        if (dk && tSched[dk]?.[period]) {
          return String(tSched[dk][period]).trim();
        }
      }
      for (const [k, sched] of Object.entries(tSched)) {
        if (typeof sched === 'object' && sched !== null && (k.toLowerCase() === day?.toLowerCase?.() || k.startsWith(day?.slice?.(0, 3) || ''))) {
          if (sched[period]) return String(sched[period]).trim();
        }
      }
      return null;
    };

    const freeList = [];
    const busyList = [];

    teachers.forEach((teacher) => {
      if (!teacher?.teacherId) return;
      const isFree = freeSet.has(teacher.teacherId);
      const dutyLocation = getTeacherDutyLocation(teacher, day);

      let distance = 999;
      if (targetZone && dutyLocation) {
        distance = getZoneDistance(targetZone, dutyLocation);
      } else if (classroom && dutyLocation) {
        distance = getZoneDistance(classroom, dutyLocation);
      }

      let proximityBadge = '';
      if (distance === 0) {
        proximityBadge = 'Aynı Kat';
      } else if (distance === 1) {
        proximityBadge = '1 Kat Fark';
      } else if (distance === 2) {
        proximityBadge = '2 Kat Fark';
      } else if (distance < 999) {
        proximityBadge = `${distance} Kat Fark`;
      }

      const dutyCountToday = dutiesTodayMap.get(teacher.teacherId) || 0;
      const lessonClass = !isFree ? getTeacherLesson(teacher) : null;
      const lessonInfo = lessonClass ? `Dersi Var (${lessonClass})` : 'Dersi Var';

      const item = {
        teacherId: teacher.teacherId,
        teacherName: teacher.teacherName || 'İsimsiz',
        dutyLocation,
        distance,
        proximityBadge,
        dutyCountToday,
        isFree,
        lessonInfo,
      };

      if (isFree) {
        freeList.push(item);
      } else {
        busyList.push(item);
      }
    });

    const sortFn = (a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if (a.dutyCountToday !== b.dutyCountToday) return a.dutyCountToday - b.dutyCountToday;
      return (a.teacherName || '').localeCompare(b.teacherName || '', 'tr', { sensitivity: 'base' });
    };

    freeList.sort(sortFn);
    busyList.sort(sortFn);

    return {
      freeTeachers: freeList,
      busyTeachers: busyList,
      targetClassroom: classroom,
      targetZone,
    };
  }, [editingContext, classes, classroomByClassId, classLocations, day, locationZoneMapping, availableTeachersByPeriod, teacherSchedules, teachers, dutiesTodayMap]);

  const filteredFreeTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return currentEditorData.freeTeachers;
    const q = teacherSearch.trim().toLocaleLowerCase('tr-TR');
    return currentEditorData.freeTeachers.filter(
      (t) =>
        t.teacherName.toLocaleLowerCase('tr-TR').includes(q) ||
        (t.dutyLocation && t.dutyLocation.toLocaleLowerCase('tr-TR').includes(q))
    );
  }, [currentEditorData.freeTeachers, teacherSearch]);

  const filteredBusyTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return currentEditorData.busyTeachers;
    const q = teacherSearch.trim().toLocaleLowerCase('tr-TR');
    return currentEditorData.busyTeachers.filter(
      (t) =>
        t.teacherName.toLocaleLowerCase('tr-TR').includes(q) ||
        (t.dutyLocation && t.dutyLocation.toLocaleLowerCase('tr-TR').includes(q)) ||
        (t.lessonInfo && t.lessonInfo.toLocaleLowerCase('tr-TR').includes(q))
    );
  }, [currentEditorData.busyTeachers, teacherSearch]);

  // Sınıfları artan sırada sırala
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const nameA = normalizeClassName(a.className || '') || a.className || '';
      const nameB = normalizeClassName(b.className || '') || b.className || '';
      return compareClassNames(nameA, nameB);
    });
  }, [classes]);

  const getKey = useCallback((period, classId) => `${day}|${period}|${classId}`, [day]);

  const normalizeCommonLessonDisplayName = useCallback((value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    const compact = trimmed.replace(/\s+/g, '');
    const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(compact);
    const looksLikeGeneratedId = /^id_\d+_[0-9a-f]+$/i.test(compact);
    const looksLikeHexBlob = /^[0-9a-f-]{24,}$/i.test(compact);
    if (looksLikeUuid || looksLikeGeneratedId || looksLikeHexBlob) {
      return 'Diğer Öğretmen';
    }
    return trimmed;
  }, []);

  const unassignedKeySet = useMemo(() => {
    const set = new Set();
    (unassignedForSelectedDay || []).forEach(({ period, classId }) => {
      if (!classId) return;
      set.add(`${period}|${classId}`);
    });
    return set;
  }, [unassignedForSelectedDay]);

  const closeEditor = useCallback(() => {
    setEditingContext(null);
    setEditSelection(AUTO_OPTION);
    setTeacherSearch('');
    setEditorPosition({ top: 0, left: 0, width: 0 });
    onManualEditorStateChange?.(false);
  }, [onManualEditorStateChange]);

  const openEditor = useCallback((period, classId, currentValue, event) => {
    const key = `${day}|${period}|${classId}`;
    let initialValue = currentValue || AUTO_OPTION;
    if (
      initialValue !== AUTO_OPTION &&
      initialValue !== MANUAL_EMPTY_TEACHER_ID &&
      initialValue !== MANUAL_ADMIN_TEACHER_ID &&
      !teacherById[initialValue]
    ) {
      initialValue = AUTO_OPTION;
    }
    setEditingContext({ key, period, classId });
    setEditSelection(initialValue);
    setTeacherSearch('');
    onManualEditorStateChange?.(true);

    if (event && event.currentTarget) {
      const cell = event.currentTarget.closest('td');
      if (cell) {
        const rect = cell.getBoundingClientRect();
        setEditorPosition(calculateEditorPosition(rect));
      }
    }
  }, [day, teacherById, onManualEditorStateChange, calculateEditorPosition]);

  const handleManualSave = useCallback((overrideSelection) => {
    if (!editingContext) return;
    const { period, classId } = editingContext;
    const target = overrideSelection !== undefined ? overrideSelection : editSelection;

    if (target === AUTO_OPTION) {
      onManualRelease && onManualRelease({ day, period, classId });
    } else if (target === MANUAL_EMPTY_TEACHER_ID) {
      onManualClear && onManualClear({ day, period, classId });
    } else if (target === MANUAL_ADMIN_TEACHER_ID) {
      onManualSetAdmin && onManualSetAdmin({ day, period, classId });
    } else if (target) {
      onManualAssign && onManualAssign({ day, period, classId, teacherId: target });
    }
    closeEditor();
  }, [editingContext, editSelection, onManualAssign, onManualClear, onManualSetAdmin, onManualRelease, closeEditor, day]);

  useEffect(() => {
    return () => {
      onManualEditorStateChange?.(false);
    };
  }, [onManualEditorStateChange]);

  // Close editor when clicking outside
  useEffect(() => {
    if (!editingContext) return;

    const handleClickOutside = (e) => {
      const isEditBtn = e.target.closest('[data-action="edit-cell"]') || e.target.closest('button')?.textContent?.includes('Düzenle');
      if (editorRef.current && !editorRef.current.contains(e.target) && !isEditBtn) {
        closeEditor();
      }
    };

    const updatePosition = () => {
      if (editingContext) {
        const cell = document.querySelector(`[data-editing-key="${editingContext.key}"]`);
        if (cell) {
          const rect = cell.getBoundingClientRect();
          setEditorPosition(calculateEditorPosition(rect));
        }
      }
    };

    updatePosition();

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [editingContext, closeEditor, calculateEditorPosition]);

  useLayoutEffect(() => {
    if (!editingContext || !editorRef.current) return;
    const measuredHeight = editorRef.current.getBoundingClientRect().height || DEFAULT_EDITOR_HEIGHT;
    if (Math.abs(measuredHeight - editorHeight) > 2) {
      setEditorHeight(measuredHeight);
      const cell = document.querySelector(`[data-editing-key="${editingContext.key}"]`);
      if (cell) {
        const rect = cell.getBoundingClientRect();
        setEditorPosition(calculateEditorPosition(rect, measuredHeight));
      }
    }
  }, [editingContext, editSelection, calculateEditorPosition, editorHeight]);

  const handleDragStart = (e, period, classId, teacherId) => {
    const payload = { type: 'assignment', day, period, classId, teacherId };
    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, classId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverClassId(classId);
  };

  const handleDragLeave = () => {
    setDragOverClassId(null);
  };

  const handleDrop = (e, targetPeriod, targetClassId) => {
    e.preventDefault();
    setDragOverClassId(null);
    try {
      const raw = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text') || '{}';
      const payload = JSON.parse(raw);
      if (payload.type === 'teacher-roster') {
        if (!payload.teacherId) return;
        onDropAssign({
          day,
          period: targetPeriod,
          fromClassId: payload.fromClassId || null,
          toClassId: targetClassId,
          teacherId: payload.teacherId,
        });
        setDroppedClassId(targetClassId);
        setTimeout(() => setDroppedClassId(null), 600);
        return;
      }

      const { day: srcDay, period, classId, teacherId } = payload;
      if (!teacherId || srcDay !== day || period !== targetPeriod) return;

      onDropAssign({ day, period, fromClassId: classId, toClassId: targetClassId, teacherId });

      setDroppedClassId(targetClassId);
      setTimeout(() => setDroppedClassId(null), 600);
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  // Helper to check if a class slot needs a duty
  const isSlotFreeOrCommon = (p, cid) => {
    const isFree = Boolean(
      freeClassesByDay?.[day]?.[p] instanceof Set
        ? freeClassesByDay[day][p].has(cid)
        : Array.isArray(freeClassesByDay?.[day]?.[p])
          ? freeClassesByDay[day][p].includes(cid)
          : false
    );
    const isCommon = Boolean(commonLessons?.[day]?.[p]?.[cid]);
    return isFree || isCommon;
  };

  // Get total duties assigned to a class on this day
  const getClassAssignedCount = (classId) => {
    return periods.reduce((count, p) => {
      if (!isSlotFreeOrCommon(p, classId)) return count;
      const cell = (assignment?.[day]?.[p] || []).find((a) => a.classId === classId);
      const k = getKey(p, classId);
      const lockValue = locked?.[k];
      const hasTeacher = cell?.teacherId || (lockValue && lockValue !== MANUAL_EMPTY_TEACHER_ID && teacherById[lockValue]);
      return count + (hasTeacher ? 1 : 0);
    }, 0);
  };

  // Per-period assigned count across all classes
  const getPeriodAssignedCount = (period) => {
    return (assignment?.[day]?.[period] || []).filter((a) => {
      if (!a.teacherId) return false;
      return isSlotFreeOrCommon(period, a.classId);
    }).length;
  };

  // Check if class has unassigned slots
  const classHasUnassigned = (classId) => {
    return periods.some((p) => {
      if (!isSlotFreeOrCommon(p, classId)) return false;
      if (commonLessons?.[day]?.[p]?.[classId]) return false;
      return unassignedKeySet.has(`${p}|${classId}`);
    });
  };

  // Filter classes
  const filteredClasses = useMemo(() => {
    return sortedClasses.filter((cls) => {
      const displayName = normalizeClassName(cls.className) || cls.className || '';
      const room = classroomByClassId.get(cls.classId) || '';

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = displayName.toLowerCase().includes(q);
        const matchRoom = room.toLowerCase().includes(q);

        // Also check if any teacher assigned to this class matches
        const matchTeacher = periods.some((p) => {
          if (!isSlotFreeOrCommon(p, cls.classId)) return false;
          const cell = (assignment?.[day]?.[p] || []).find((a) => a.classId === cls.classId);
          if (cell?.teacherId && teacherById[cell.teacherId]?.teacherName) {
            return teacherById[cell.teacherId].teacherName.toLowerCase().includes(q);
          }
          return false;
        });

        if (!matchName && !matchRoom && !matchTeacher) return false;
      }

      if (filterStatus !== 'all') {
        const assignedCount = getClassAssignedCount(cls.classId);
        if (filterStatus === 'assigned' && assignedCount === 0) return false;
        if (filterStatus === 'empty' && assignedCount > 0) return false;
        if (filterStatus === 'unassigned' && !classHasUnassigned(cls.classId)) return false;
      }

      return true;
    });
  }, [sortedClasses, searchQuery, filterStatus, assignment, day, periods, classroomByClassId, teacherById, unassignedKeySet, freeClassesByDay, commonLessons, locked]);

  // Statistics for top chips
  const stats = useMemo(() => {
    let withDuties = 0;
    let withoutDuties = 0;
    let withUnassigned = 0;
    let totalDuties = 0;

    periods.forEach((p) => {
      totalDuties += getPeriodAssignedCount(p);
    });

    classes.forEach((cls) => {
      const count = getClassAssignedCount(cls.classId);
      if (count > 0) withDuties++;
      else withoutDuties++;
      if (classHasUnassigned(cls.classId)) withUnassigned++;
    });

    return { total: classes.length, withDuties, withoutDuties, withUnassigned, totalDuties };
  }, [classes, assignment, day, periods, locked, unassignedKeySet, commonLessons]);

  return (
    <div className={styles.container}>
      {/* ---------------- Top Toolbar / Filters ---------------- */}
      <div className={styles.toolbar}>
        {/* Search input */}
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>
            {IconComponent ? <IconComponent name="search" size={16} /> : '🔍'}
          </span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Sınıf, derslik veya görevli öğretmen ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => setSearchQuery('')}
              title="Aramayı Temizle"
            >
              {IconComponent ? <IconComponent name="x" size={14} /> : '×'}
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className={styles.filterChips}>
          <button
            type="button"
            className={`${styles.filterChip} ${filterStatus === 'all' ? styles.filterChipActive : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            Tümü ({stats.total})
          </button>
          <button
            type="button"
            className={`${styles.filterChip} ${filterStatus === 'assigned' ? styles.filterChipActive : ''}`}
            onClick={() => setFilterStatus('assigned')}
            title="Görevi olan sınıflar"
          >
            Görevi Olanlar ({stats.withDuties})
          </button>
          <button
            type="button"
            className={`${styles.filterChip} ${filterStatus === 'empty' ? styles.filterChipActive : ''}`}
            onClick={() => setFilterStatus('empty')}
            title="Görevi olmayan sınıflar"
          >
            Boş Sınıflar ({stats.withoutDuties})
          </button>
          {stats.withUnassigned > 0 && (
            <button
              type="button"
              className={`${styles.filterChip} ${styles.filterChipWarning} ${
                filterStatus === 'unassigned' ? styles.filterChipWarningActive : ''
              }`}
              onClick={() => setFilterStatus('unassigned')}
              title="Öğretmen atanamamış boş dersleri olan sınıflar"
            >
              ⚠️ Atanamayanlar ({stats.withUnassigned})
            </button>
          )}
        </div>

        {/* Total stats pill badge & Undo / Redo controls */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {(onUndo || onRedo) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
              <button
                type="button"
                className={styles.historyBtn}
                onClick={onUndo}
                disabled={!canUndo}
                title="Geri Al (Ctrl+Z)"
                aria-label="Geri Al"
              >
                <span>↩</span>
                <span className={styles.historyBtnLabel}>Geri Al</span>
              </button>
              <button
                type="button"
                className={styles.historyBtn}
                onClick={onRedo}
                disabled={!canRedo}
                title="İleri Al (Ctrl+Y)"
                aria-label="İleri Al"
              >
                <span>↪</span>
                <span className={styles.historyBtnLabel}>İleri Al</span>
              </button>
            </div>
          )}

          <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            Toplam {stats.totalDuties} Görev Planlandı
          </span>
        </div>
      </div>

      {/* ---------------- Table Container ---------------- */}
      <div className={styles.tableContainer}>
        <table className={styles.assignmentTable}>
          <thead>
            {/* Table Header: Single clean row */}
            <tr className={styles.headerRow}>
              <th className={`${styles.stickyCol} ${styles.stuckShadow}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Sınıf &amp; Derslik</span>
                  <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                    {filteredClasses.length} {filteredClasses.length !== classes.length ? `/ ${classes.length}` : ''}
                  </span>
                </div>
              </th>

              {periods.map((p) => {
                const assignedCount = getPeriodAssignedCount(p);

                return (
                  <th key={p} className={styles.periodHeaderTh}>
                    <div className={styles.periodHeaderContent}>
                      <span className={styles.periodHeaderNum}>{p}. Saat</span>
                      <span className={styles.periodHeaderCount}>{assignedCount} görev</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {filteredClasses.length === 0 ? (
              <tr>
                <td colSpan={periods.length + 1} style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '2rem' }}>📋</div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text, #0f1535)' }}>
                      Planlama Kaydı Bulunamadı
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
                      Aramanıza veya seçili filtreye uygun sınıf bulunamadı.
                    </div>
                    <button
                      type="button"
                      className={styles.filterChip}
                      onClick={() => {
                        setSearchQuery('');
                        setFilterStatus('all');
                      }}
                    >
                      Filtreleri Temizle
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredClasses.map((cls) => {
                const displayName = normalizeClassName(cls.className) || cls.className || '';
                const classroom = classroomByClassId.get(cls.classId);
                const assignedCount = getClassAssignedCount(cls.classId);
                const commonCount = periods.reduce((acc, p) => {
                  return acc + (commonLessons?.[day]?.[p]?.[cls.classId] ? 1 : 0);
                }, 0);
                const hasAssigned = assignedCount > 0;

                return (
                  <tr key={cls.classId}>
                    {/* Sticky Class Profile Column */}
                    <td className={`${styles.stickyCol} ${styles.stuckShadow}`}>
                      <div className={styles.classCard}>
                        <div className={styles.classMain}>
                          {/* Grade-level colored avatar */}
                          <div
                            className={styles.classAvatar}
                            style={{ background: getClassBadgeColor(displayName) }}
                            title={displayName}
                          >
                            {getClassAvatarLabel(displayName)}
                          </div>

                          <div className={styles.classMeta}>
                            <span className={styles.className} title={displayName}>
                              {displayName}
                            </span>

                            {classroom ? (
                              <span className={styles.classroomChip} title={`Derslik: ${classroom}`}>
                                <span>📍</span>
                                <span>{classroom}</span>
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Assigned count badge */}
                        <div className={styles.classActions}>
                          <span
                            className={`${styles.dutyCountBadge} ${
                              hasAssigned
                                ? styles.dutyCountActive
                                : commonCount > 0
                                ? styles.dutyCountCommon
                                : styles.dutyCountZero
                            }`}
                            title={
                              hasAssigned
                                ? `${assignedCount} görev planlandı`
                                : commonCount > 0
                                ? `${commonCount} ders birleştirildi`
                                : 'Boş'
                            }
                          >
                            {hasAssigned
                              ? `${assignedCount} görev`
                              : commonCount > 0
                              ? `${commonCount} birleştirildi`
                              : 'Boş'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Period Cells */}
                    {periods.map((p) => {
                      const isSlotActive = isSlotFreeOrCommon(p, cls.classId);

                      // Sınıf bu saatte boş değilse ve ortak ders yoksa normal derstedir; nöbet görevi gerekmez
                      if (!isSlotActive) {
                        return (
                          <td key={p} className={styles.periodTd}>
                            <div className={styles.cellContent}>
                              <div className={styles.emptySlot}>
                                <span>—</span>
                              </div>
                            </div>
                          </td>
                        );
                      }

                      const cell = (assignment?.[day]?.[p] || []).find((a) => a.classId === cls.classId);
                      const k = getKey(p, cls.classId);
                      const lockValue = locked?.[k];
                      let teacherId = cell?.teacherId || '';

                      if (!teacherId && lockValue && lockValue !== MANUAL_EMPTY_TEACHER_ID && teacherById[lockValue]) {
                        teacherId = lockValue;
                      }

                      const t = teacherId ? teacherById[teacherId] : null;
                      const isManualEmpty = lockValue === MANUAL_EMPTY_TEACHER_ID;
                      const isManualAdmin = lockValue === MANUAL_ADMIN_TEACHER_ID;
                      const isEditing = editingContext?.key === k;
                      const manualInitialValue = lockValue || teacherId || AUTO_OPTION;
                      const commonLessonTeacherVal = commonLessons?.[day]?.[p]?.[cls.classId];
                      const commonLessonTeacherName = normalizeCommonLessonDisplayName(
                        teacherById[commonLessonTeacherVal]?.teacherName || commonLessonTeacherVal
                      );
                      const isUnassignedCell = !commonLessonTeacherVal && unassignedKeySet.has(`${p}|${cls.classId}`);
                      const hasLock = isManualEmpty;

                      const tdClasses = [
                        styles.periodTd,
                        styles.dndTarget,
                        dragOverClassId === cls.classId ? styles.dragOver : '',
                        droppedClassId === cls.classId ? styles.dropFlash : '',
                      ].filter(Boolean).join(' ');

                      return (
                        <td
                          key={p}
                          className={tdClasses}
                          data-editing-key={isEditing ? k : undefined}
                          onDragOver={(e) => handleDragOver(e, cls.classId)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, p, cls.classId)}
                        >
                          <div className={styles.cellContent}>
                            {hasLock && (
                              <span className={styles.lockBadge} title="Bu hücre manuel olarak kilitli">
                                🔒 Kilitli
                              </span>
                            )}

                            {/* Common lesson card */}
                            {commonLessonTeacherName ? (
                              <div className={styles.commonLessonCard}>
                                <span className={styles.commonLessonTitle}>📚 Birleştirildi</span>
                                <span className={styles.commonLessonTeacher} title={commonLessonTeacherName}>
                                  {commonLessonTeacherName}
                                </span>
                              </div>
                            ) : t ? (
                              /* Duty Assigned Card */
                              <div className={styles.dutyCard}>
                                <div className={styles.teacherHeader}>
                                  <div
                                    className={styles.teacherAvatarMini}
                                    style={{ background: getAvatarGradient(t.teacherName) }}
                                    title={t.teacherName}
                                  >
                                    {getInitials(t.teacherName)}
                                  </div>
                                  <span
                                    className={`${styles.teacherNameText} ${styles.teacherDraggable}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, p, cls.classId, teacherId)}
                                    title="Sürükleyerek başka sınıfa taşıyabilirsiniz"
                                  >
                                    {t.teacherName}
                                  </span>
                                </div>

                                {(() => {
                                  const dutyLoc = getTeacherDutyLocation(t, day);
                                  if (!dutyLoc) return null;
                                  const shortLoc = abbreviateDutyLocation(dutyLoc);
                                  return (
                                    <span
                                      className={styles.dutyLocationBadge}
                                      title={`Nöbet / Görev Yeri: ${dutyLoc}`}
                                    >
                                      📍 {shortLoc}
                                    </span>
                                  );
                                })()}

                                <button
                                  className={styles.editBtn}
                                  type="button"
                                  data-action="edit-cell"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openEditor(p, cls.classId, manualInitialValue, e);
                                  }}
                                  title="Görevi Düzenle"
                                >
                                  <span>✏️</span>
                                  <span>Düzenle</span>
                                </button>
                              </div>
                            ) : isManualEmpty ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                <span className={styles.manualEmptyLabel}>Atama Yapılmadı</span>
                                <button
                                  className={styles.editBtn}
                                  type="button"
                                  data-action="edit-cell"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openEditor(p, cls.classId, manualInitialValue, e);
                                  }}
                                >
                                  ✏️ Düzenle
                                </button>
                              </div>
                            ) : isManualAdmin ? (
                              <label className={styles.adminCheckboxLabel}>
                                <input
                                  type="checkbox"
                                  checked
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    if (!e.target.checked) {
                                      onManualRelease && onManualRelease({ day, period: p, classId: cls.classId });
                                    }
                                  }}
                                />
                                <span className={styles.manualAdminLabel}>İdare kontrolünde</span>
                              </label>
                            ) : teacherId ? (
                              <div className="flex items-center gap-1">
                                <span className="text-error" style={{ fontSize: '0.72rem' }}>⚠️ Geçersiz</span>
                                <button
                                  className="btn-ghost btn-sm text-error"
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onManualRelease && onManualRelease({ day, period: p, classId: cls.classId });
                                  }}
                                >
                                  {IconComponent && <IconComponent name="trash" size={13} />}
                                </button>
                              </div>
                            ) : isUnassignedCell ? (
                              /* Unassigned slot */
                              <div className={styles.unassignedSlot}>
                                <span className={styles.unassignedBadge}>⚠️ Atanmadı</span>
                                <button
                                  className={styles.assignManualBtn}
                                  type="button"
                                  data-action="edit-cell"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openEditor(p, cls.classId, manualInitialValue, e);
                                  }}
                                >
                                  + Manuel Ata
                                </button>
                              </div>
                            ) : (
                              /* Empty normal slot */
                              <div className={styles.emptySlot}>
                                <span>—</span>
                              </div>
                            )}
                          </div>

                          {/* Popup Manual Editor */}
                          {!commonLessonTeacherName && isEditing && (
                            <div
                              ref={editorRef}
                              className={styles.manualEditor}
                              style={{
                                position: 'fixed',
                                top: `${editorPosition.top}px`,
                                left: `${editorPosition.left}px`,
                                width: `${editorPosition.width}px`,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              {/* Header */}
                              <div className={styles.manualEditorHeader}>
                                <div className={styles.headerTitleGroup}>
                                  <span className={styles.headerIcon}>✏️</span>
                                  <div>
                                    <div className={styles.headerClassTitle}>
                                      <span>{displayName}</span>
                                      {currentEditorData.targetClassroom && (
                                        <span className={styles.headerClassroomBadge}>
                                          📍 {currentEditorData.targetClassroom}
                                        </span>
                                      )}
                                    </div>
                                    <div className={styles.headerSubtitle}>
                                      {p}. Saat Nöbet Görevi Atama
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className={styles.closeBtn}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    closeEditor();
                                  }}
                                  title="Kapat"
                                  aria-label="Kapat"
                                >
                                  ✕
                                </button>
                              </div>

                              {/* Quick Actions (Otomatik / Boş Bırak / İdare) */}
                              <div className={styles.quickActionsBar}>
                                <button
                                  type="button"
                                  className={`${styles.quickActionBtn} ${
                                    editSelection === AUTO_OPTION ? styles.quickActionActive : ''
                                  }`}
                                  onClick={() => setEditSelection(AUTO_OPTION)}
                                  title="Otomatik algoritmaya bırak"
                                >
                                  <span>🔄</span>
                                  <span>Otomatik</span>
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.quickActionBtn} ${
                                    editSelection === MANUAL_EMPTY_TEACHER_ID ? styles.quickActionActive : ''
                                  }`}
                                  onClick={() => setEditSelection(MANUAL_EMPTY_TEACHER_ID)}
                                  title="Bu ders için nöbetçi görevlendirmesi yapılmaz"
                                >
                                  <span>🚫</span>
                                  <span>Atama Yapma</span>
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.quickActionBtn} ${
                                    editSelection === MANUAL_ADMIN_TEACHER_ID ? styles.quickActionActive : ''
                                  }`}
                                  onClick={() => setEditSelection(MANUAL_ADMIN_TEACHER_ID)}
                                  title="İdare kontrolünde nöbet"
                                >
                                  <span>🛡️</span>
                                  <span>İdare</span>
                                </button>
                              </div>

                              {/* Search bar */}
                              {teachers.length > 5 && (
                                <div className={styles.searchWrapper}>
                                  <span className={styles.searchIcon}>🔍</span>
                                  <input
                                    type="text"
                                    className={styles.searchInput}
                                    placeholder="Nöbetçi öğretmen ara..."
                                    value={teacherSearch}
                                    onChange={(e) => setTeacherSearch(e.target.value)}
                                    autoFocus
                                  />
                                  {teacherSearch && (
                                    <button
                                      type="button"
                                      className={styles.searchClearBtn}
                                      onClick={() => setTeacherSearch('')}
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Scrollable Teacher List Container */}
                              <div className={styles.teacherListContainer}>
                                {/* Grup 1: Dersi Boş Olan Nöbetçiler */}
                                <div className={styles.groupSection}>
                                  <div className={styles.groupHeader}>
                                    <span className={styles.groupDot}>🟢</span>
                                    <span className={styles.groupTitle}>Dersi Boş Olan Nöbetçiler</span>
                                    <span className={styles.groupCountBadge}>
                                      {filteredFreeTeachers.length}
                                    </span>
                                  </div>

                                  {filteredFreeTeachers.length === 0 ? (
                                    <div className={styles.emptyGroupNotice}>
                                      {teacherSearch ? 'Aramaya uygun boş nöbetçi bulunamadı.' : 'Bu saatte boş dersi olan nöbetçi yok.'}
                                    </div>
                                  ) : (
                                    <div className={styles.groupItems}>
                                      {filteredFreeTeachers.map((teacher) => {
                                        const isSelected = editSelection === teacher.teacherId;
                                        return (
                                          <div
                                            key={teacher.teacherId}
                                            className={`${styles.teacherCard} ${
                                              isSelected ? styles.teacherCardSelected : ''
                                            }`}
                                            onClick={() => setEditSelection(teacher.teacherId)}
                                            onDoubleClick={() => handleManualSave(teacher.teacherId)}
                                            title="Seçmek için tıklayın (Kaydetmek için çift tıklayın)"
                                          >
                                            <div
                                              className={styles.teacherAvatar}
                                              style={{ background: getAvatarGradient(teacher.teacherName) }}
                                            >
                                              {getInitials(teacher.teacherName)}
                                            </div>

                                            <div className={styles.teacherInfoCol}>
                                              <div className={styles.teacherNameRow}>
                                                <span className={styles.teacherName}>
                                                  {teacher.teacherName}
                                                </span>
                                                {isSelected && (
                                                  <span className={styles.selectedCheckBadge}>✓</span>
                                                )}
                                              </div>
                                              <div className={styles.teacherDutySub}>
                                                {teacher.dutyLocation ? (
                                                  <span>📍 {teacher.dutyLocation}</span>
                                                ) : (
                                                  <span className={styles.noLocationText}>
                                                    Görev yeri belirtilmemiş
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            <div className={styles.teacherBadgeCol}>
                                              {teacher.proximityBadge && (
                                                <span
                                                  className={`${styles.proximityBadge} ${
                                                    teacher.distance === 0
                                                      ? styles.proximitySameFloor
                                                      : styles.proximityOtherFloor
                                                  }`}
                                                >
                                                  {teacher.proximityBadge}
                                                </span>
                                              )}
                                              {teacher.dutyCountToday > 0 && (
                                                <span className={styles.dutyCountBadge} title={`Bugün ${teacher.dutyCountToday} görevi var`}>
                                                  {teacher.dutyCountToday} görev
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* Grup 2: Dersi Olan Nöbetçiler */}
                                <div className={styles.groupSection}>
                                  <div className={styles.groupHeader}>
                                    <span className={styles.groupDot}>🟡</span>
                                    <span className={styles.groupTitle}>Dersi Olan Nöbetçiler</span>
                                    <span className={styles.groupCountBadge}>
                                      {filteredBusyTeachers.length}
                                    </span>
                                  </div>

                                  {filteredBusyTeachers.length === 0 ? (
                                    <div className={styles.emptyGroupNotice}>
                                      {teacherSearch ? 'Aramaya uygun nöbetçi bulunamadı.' : 'Dersi olan nöbetçi öğretmen yok.'}
                                    </div>
                                  ) : (
                                    <div className={styles.groupItems}>
                                      {filteredBusyTeachers.map((teacher) => {
                                        const isSelected = editSelection === teacher.teacherId;
                                        return (
                                          <div
                                            key={teacher.teacherId}
                                            className={`${styles.teacherCard} ${styles.teacherCardBusy} ${
                                              isSelected ? styles.teacherCardSelected : ''
                                            }`}
                                            onClick={() => setEditSelection(teacher.teacherId)}
                                            onDoubleClick={() => handleManualSave(teacher.teacherId)}
                                            title="Seçmek için tıklayın (Kaydetmek için çift tıklayın)"
                                          >
                                            <div
                                              className={styles.teacherAvatar}
                                              style={{ background: getAvatarGradient(teacher.teacherName) }}
                                            >
                                              {getInitials(teacher.teacherName)}
                                            </div>

                                            <div className={styles.teacherInfoCol}>
                                              <div className={styles.teacherNameRow}>
                                                <span className={styles.teacherName}>
                                                  {teacher.teacherName}
                                                </span>
                                                {isSelected && (
                                                  <span className={styles.selectedCheckBadge}>✓</span>
                                                )}
                                              </div>
                                              <div className={styles.teacherDutySub}>
                                                {teacher.dutyLocation ? (
                                                  <span>📍 {teacher.dutyLocation}</span>
                                                ) : (
                                                  <span className={styles.noLocationText}>
                                                    Görev yeri belirtilmemiş
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            <div className={styles.teacherBadgeCol}>
                                              <span
                                                className={styles.busyLessonBadge}
                                                title={teacher.lessonInfo}
                                              >
                                                ⚠️ {teacher.lessonInfo}
                                              </span>
                                              {teacher.proximityBadge && (
                                                <span
                                                  className={`${styles.proximityBadge} ${
                                                    teacher.distance === 0
                                                      ? styles.proximitySameFloor
                                                      : styles.proximityOtherFloor
                                                  }`}
                                                >
                                                  {teacher.proximityBadge}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Footer Actions */}
                              <div className={styles.manualEditorFooter}>
                                <button
                                  className={styles.cancelBtn}
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    closeEditor();
                                  }}
                                >
                                  İptal
                                </button>
                                <button
                                  className={styles.saveBtn}
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleManualSave();
                                  }}
                                >
                                  Kaydet
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default memo(AssignmentEditor);
