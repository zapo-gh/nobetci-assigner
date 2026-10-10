// @ts-nocheck
/* global process */
import { useTeachers } from './contexts/useTeachers';
import { useClasses } from './contexts/useClasses';
import { useAssignments } from './contexts/useAssignments';
import { useTeacherManager } from './hooks/useTeacherManager';
import { useClassManager } from './hooks/useClassManager';
import { useAvailabilityManager } from './hooks/useAvailabilityManager';
import { normalizeClassName, isImesLesson } from './utils/classNameUtils';
import React, { Suspense, lazy, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { DutyZone } from "./types.js";
import Header from './components/Header.js';
import Icon from './components/Icon';
import { PERIODS, DAYS, REAL_DAY_KEYS } from './constants/index.js';
import TeachersSection from './components/TeachersSection.jsx';
import { assignDuties, MANUAL_EMPTY_TEACHER_ID, MANUAL_ADMIN_TEACHER_ID, applyFairnessAdjustments } from "./utils/assignDuty.js";
import { logger } from "./utils/logger.js";
import { sanitizeInputAdvanced } from "./utils/security.js";
import { normalizeForComparison } from "./utils/nameNormalization.js";
import {
  dateForSelectedDay,
  formatTRDate,
  getWeekMonday,
  formatDateKey,
  validateTeacherData,
  validateClassData,
  mapSetToArray,
  arrayToSetMap,
  normalizeClassLabel,
} from "./utils/helpers.js";
import "./styles/theme.css";

import { APP_ENV } from './config/index.js';
import {
  loadInitialData,
  insertTeacher,
  deleteTeacherById,
  insertClass,
  deleteClassById,
  deleteAbsentById,
  deleteClassAbsenceByAbsent,
  deleteClassAbsenceByClass,
  deleteCommonLessonsByClass,
  deleteCommonLessonsByTeacher,
  deleteCommonLessonsBySlot,
  deleteLocksByTeacher,
  deleteLocksByClass,
  upsertClassFree,
  bulkUpsertClassFree,
  upsertTeacherFree,
  upsertClassAbsence,
  upsertLock,
  replacePdfSchedule,
  saveTeacherSchedules,
  saveCommonLessons,
  bulkSaveClassFree,
  bulkSaveClassAbsence,
  bulkSaveTeacherFree,
  clearAdminLocks,
  TEACHER_SCHEDULES_SNAPSHOT_KEY,
  saveLocationZoneMapping,
  saveDutyZones,
  saveClassLocations,
  loadClassLocations,
} from './services/firebaseDataService.js';

import { useUI } from './hooks/useUI.js';
import { useDutyTeacherFilter } from './hooks/useDutyTeacherFilter.js';
import {
  useFreeTeachersByDay,
  useClassFreeForDay,
  useFilteredClassAbsence,
  useFilteredClassFree,
} from './hooks/useDerivedAvailability.js';
import { useAbsentManager } from './hooks/useAbsentManager.js';
import { useBulkDeleteActions } from './hooks/useBulkDeleteActions.js';
import { useVersionWatcher } from './hooks/useVersionWatcher.js';
import {
  COMMON_LESSON_LABEL,
  encodeClassAbsenceValue,
  decodeClassAbsenceValue,
} from './utils/classAbsence.js';
import { normalizeAbsentPeople } from './utils/migrations.js';
import { useAutoSave } from './hooks/useAutoSave.js';
import { useDataLoader } from './hooks/useDataLoader.js';
import { usePdfExport } from './hooks/usePdfExport.js';
import { useAssignmentHistory } from './hooks/useAssignmentHistory.js';

import Tabs from "./components/Tabs.jsx";
import ModernNotificationSystem from "./components/ModernNotificationSystem.jsx";
import AddTeacherModal from "./components/AddTeacherModal.jsx";
import AddClassModal from "./components/AddClassModal.jsx";
import AddAbsentModal from "./components/AddAbsentModal.jsx";
import CommonLessonModal from "./components/CommonLessonModal.jsx";

import ConfirmationModal from "./components/ConfirmationModal.jsx";
import PdfScheduleImportModal from "./components/PdfScheduleImportModal.jsx";
import EditTeacherModal from "./components/EditTeacherModal";
const CourseScheduleSection = lazy(() => import('./components/CourseScheduleSection.jsx'));
const ClassesSection = lazy(() => import('./components/ClassesSection.jsx'));
const DutyZonesSection = lazy(() => import('./components/DutyZonesSection.jsx'));
const AbsentsSection = lazy(() => import('./components/AbsentsSection.jsx'));
const ScheduleSection = lazy(() => import('./components/ScheduleSection.jsx'));
const OutputsSection = lazy(() => import('./components/OutputsSection.jsx'));
const GlobalModals = lazy(() => import('./components/GlobalModals.jsx'));
const ClassSchedulesSection = lazy(() => import('./components/ClassSchedulesSection.jsx'));



function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";
  const label = isDark ? "Açık temaya geç" : "Koyu temaya geç";
  return (
    <button
      className="iconBtn theme-toggle"
      onClick={onToggle}
      aria-label={label}
      title={label}
      type="button"
    >
      <span className="ico" aria-hidden="true" style={{ pointerEvents: 'none' }}>
        {isDark ? <Icon name="sun" /> : <Icon name="moon" />}
      </span>
    </button>
  );
}





/* ====================== Sabitler & Yardımcılar ====================== */

// localStorage her zaman aktif — DISABLE_LOCAL_STORAGE sabit false olduğundan kaldırıldı
const STORAGE_KEY = `${APP_ENV.mode || 'development'}_nobetci_persist_v4`;
const LAST_ABSENT_CLEANUP_KEY = `${APP_ENV.mode || 'development'}_last_absent_cleanup`;
const STORAGE_VERSION_KEY = `${APP_ENV.mode || 'development'}_storage_version`;
const LOCAL_STORAGE_STATIC_KEYS = [
  STORAGE_KEY,
  LAST_ABSENT_CLEANUP_KEY,
  'theme',
  'nobetci_persist_v4',
  'nobetci_persist_v3',
  'nobetci_assigner_state',
];
const LOCAL_STORAGE_PREFIXES = [
  'nobetci_',
  'teacherSchedules',
  'classFree',
  'absent_',
  'duty_',
];

// Polling guard: state setter sonrası auto-save'in beklemesi gereken süre
const POLLING_GUARD_MS = 150;
const SHOULD_CHECK_VERSION = APP_ENV.isProduction;
let cachedAppStateVersion = null;

const stripQueryParams = (value = '') => {
  if (!value) return '';
  const index = value.indexOf('?');
  return index >= 0 ? value.slice(0, index) : value;
};

const detectBundleScriptSignature = () => {
  if (typeof document === 'undefined') return '';
  try {
    const current = document.currentScript;
    if (current?.src) {
      return stripQueryParams(current.src);
    }
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    for (const script of scripts) {
      const src = script.getAttribute('src');
      if (!src) continue;
      if (src.includes('/assets/') && src.endsWith('.js')) {
        return stripQueryParams(src);
      }
    }
  } catch (err) {
    const isDevEnv =
      typeof process !== 'undefined' &&
      process &&
      process.env &&
      process.env.NODE_ENV !== 'production';

    if (isDevEnv) {
      logger.warn('Bundle signature detection failed:', err);
    }
  }
  return '';
};

const resolveAppStateVersion = ({ refresh = false } = {}) => {
  if (!refresh && cachedAppStateVersion) {
    return cachedAppStateVersion;
  }

  const candidates = [
    APP_ENV.buildVersion,
    typeof window !== 'undefined' ? window.__APP_BUILD_SIGNATURE__ : '',
    detectBundleScriptSignature(),
    typeof import.meta !== 'undefined' && typeof import.meta.url === 'string'
      ? stripQueryParams(import.meta.url)
      : '',
    APP_ENV.mode,
    'development',
  ];

  const resolved = candidates.find(
    (value) => typeof value === 'string' && value.trim().length > 0
  );

  if (resolved) {
    cachedAppStateVersion = resolved;
    return resolved;
  }

  if (!cachedAppStateVersion) {
    cachedAppStateVersion = 'development';
  }

  return cachedAppStateVersion;
};

const cleanupLocalStorageForVersion = () => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  try {
    const storage = window.localStorage;
    const version = resolveAppStateVersion({ refresh: true });
    if (!version) return;

    const storedVersion = storage.getItem(STORAGE_VERSION_KEY);
    if (storedVersion === version) {
      return;
    }

    const keysToRemove = new Set(LOCAL_STORAGE_STATIC_KEYS);
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key) continue;
      if (LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        keysToRemove.add(key);
      }
    }

    keysToRemove.forEach((key) => {
      if (!key) return;
      try {
        storage.removeItem(key);
      } catch (err) {
        logger.warn?.('LocalStorage key cleanup failed:', key, err);
      }
    });

    try {
      storage.setItem(STORAGE_VERSION_KEY, version);
      logger.info?.('Yerel önbellek sürümü güncellendi:', version);
    } catch (err) {
      logger.warn?.('Yerel önbellek sürüm yazılamadı:', err);
    }
  } catch (err) {
    logger.warn?.('Yerel önbellek sürüm kontrolü başarısız:', err);
  }
};

if (typeof window !== 'undefined') {
  cleanupLocalStorageForVersion();
}



const readStoredCleanupDate = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(LAST_ABSENT_CLEANUP_KEY) || null;
  } catch {
    return null;
  }
};

const persistCleanupDate = (value) => {
  if (typeof window === 'undefined') return;
  try {
    if (value) {
      window.localStorage.setItem(LAST_ABSENT_CLEANUP_KEY, value);
    } else {
      window.localStorage.removeItem(LAST_ABSENT_CLEANUP_KEY);
    }
  } catch {
    // no-op if storage is unavailable
  }
};




function migrateClassFree(oldClassFree) {
  // Case A: Already has day level (newer structure) → normalize inner values to Set
  if (oldClassFree && typeof oldClassFree === 'object' && Object.keys(oldClassFree).some(dayKey => typeof oldClassFree[dayKey] === 'object')) {
    const out = {};
    for (const d of Object.keys(oldClassFree)) {
      out[d] = {};
      const perObj = oldClassFree[d] || {};

      // First, convert all period values to Set, handling both string and number keys
      for (const pKey of Object.keys(perObj)) {
        const periodNum = Number(pKey);
        if (isNaN(periodNum) || !PERIODS.includes(periodNum)) continue;

        const val = perObj[pKey];
        out[d][periodNum] = val instanceof Set ? val : new Set(Array.isArray(val) ? val : []);
      }

      // Ensure all periods exist as Set (use number keys)
      for (const period of PERIODS) {
        if (!(out[d][period] instanceof Set)) {
          out[d][period] = new Set();
        }
      }
    }
    // Ensure all days exist
    for (const dayObj of DAYS) {
      if (!out[dayObj.key]) {
        out[dayObj.key] = {};
        for (const period of PERIODS) out[dayObj.key][period] = new Set();
      }
    }
    return out;
  }

  // Case B: Very old structure {period: Set|Array} → expand to all days
  const newFormat = {};
  DAYS.forEach(dayObj => {
    newFormat[dayObj.key] = {};
    PERIODS.forEach(period => {
      newFormat[dayObj.key][period] = new Set();
    });
  });

  Object.keys(oldClassFree || {}).forEach(periodKey => {
    const periodNum = Number(periodKey);
    if (isNaN(periodNum) || !PERIODS.includes(periodNum)) return;

    if (oldClassFree[periodKey] instanceof Set || Array.isArray(oldClassFree[periodKey])) {
      const classSet = oldClassFree[periodKey] instanceof Set
        ? oldClassFree[periodKey]
        : new Set(oldClassFree[periodKey]);
      DAYS.forEach(dayObj => {
        newFormat[dayObj.key][periodNum] = new Set(classSet);
      });
    }
  });

  return newFormat;
}

function migrateClassAbsence(oldClassAbsence) {
  // If already in new format (has day level), return as is
  if (Object.keys(oldClassAbsence).some(day =>
    typeof oldClassAbsence[day] === 'object' &&
    Object.keys(oldClassAbsence[day]).some(period =>
      typeof oldClassAbsence[day][period] === 'object'
    )
  )) {
    return oldClassAbsence;
  }

  // Migrate from old format {period: {classId: absentId}} to new format {day: {period: {classId: absentId}}}
  const migrated = {};
  // Eski format verisi tüm günlere yayıl — DAYS sabitinden türetiliyor
  const allDays = DAYS.map(d => d.key);
  for (const [period, classData] of Object.entries(oldClassAbsence)) {
    if (typeof classData === 'object') {
      allDays.forEach(d => {
        if (!migrated[d]) migrated[d] = {};
        migrated[d][period] = classData;
      });
    }
  }

  return migrated;
}

function stableStringify(value) {
  const seen = new WeakSet();
  return JSON.stringify(value, function (key, val) {
    if (val instanceof Set) {
      return Array.from(val);
    }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (seen.has(val)) return val;
      seen.add(val);
      const sorted = {};
      Object.keys(val).sort().forEach((innerKey) => {
        sorted[innerKey] = val[innerKey];
      });
      return sorted;
    }
    return val;
  });
}

/* =========================== App Bileşeni =========================== */

export default function App() {
  const hydratedRef = useRef(false);
  const {
    day, setDay,
    weekOffset, setWeekOffset,
    goToNextWeek, goToPrevWeek, goToCurrentWeek,
    theme, toggleTheme,
    activeSection, setActiveSection,
    toolbarExpanded, setToolbarExpanded,
    modals, setModals,
    pdfImportModal, setPdfImportModal,
    excelReplaceModal, setExcelReplaceModal,
    teacherScheduleReplaceModal, setTeacherScheduleReplaceModal,
    currentCommonLesson, setCurrentCommonLesson,
    selectedTeacher, setSelectedTeacher,
    openTeacherSchedule,
    confirmationModal, setConfirmationModal,
    showConfirmation,
    requestConfirmation, // added from useUI
  } = useUI();

  const [classLocations, setClassLocations] = useState(() => {
    try {
      const saved = localStorage.getItem('nobetci_classLocations');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  const [locationZoneMapping, setLocationZoneMapping] = useState(() => {
    try {
      const saved = localStorage.getItem('nobetci_locationZoneMapping');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('nobetci_classLocations', JSON.stringify(classLocations));
  }, [classLocations]);

  // Load persisted class schedules from the database (localStorage acts only as a cache)
  useEffect(() => {
    loadClassLocations()
      .then((data: any) => {
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          setClassLocations(data);
        }
      })
      .catch((err: any) => logger.error('classLocations load error:', err));
  }, []);

  useEffect(() => {
    localStorage.setItem('nobetci_locationZoneMapping', JSON.stringify(locationZoneMapping));
  }, [locationZoneMapping]);

  const [dutyZones, setDutyZones] = useState<DutyZone[]>(() => {
    try {
      const saved = localStorage.getItem('nobetci_dutyZones');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  // Firestore'dan ilk yükleme bitmeden boş listeyle üzerine yazmayı önler
  const dutyZonesLoadedRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem('nobetci_dutyZones', JSON.stringify(dutyZones));
    } catch { /* ignore */ }
    if (!dutyZonesLoadedRef.current) return;
    saveDutyZones(dutyZones).catch(err => logger.error('saveDutyZones error:', err));
  }, [dutyZones]);

  const addZone = (zone: DutyZone) => {
    setDutyZones(prev => [...prev, zone]);
  };

  const updateZone = (updatedZone: DutyZone, oldZoneName?: string) => {
    setDutyZones(prev => prev.map(z => z.zoneId === updatedZone.zoneId ? updatedZone : z));
    if (oldZoneName && oldZoneName !== updatedZone.name) {
      setLocationZoneMapping(prev => {
        const next = { ...prev };
        let changed = false;
        Object.entries(next).forEach(([loc, zName]) => {
          if (zName === oldZoneName) {
            next[loc] = updatedZone.name;
            changed = true;
          }
        });
        return changed ? next : prev;
      });

      setTeachers(prev => {
        let changed = false;
        const next = prev.map(t => {
          if (!t.dutyLocations) return t;
          const updatedLocs = { ...t.dutyLocations };
          let tChanged = false;
          Object.entries(updatedLocs).forEach(([dKey, zName]) => {
            if (zName === oldZoneName) {
              updatedLocs[dKey] = updatedZone.name;
              tChanged = true;
            }
          });
          if (tChanged) {
            changed = true;
            return { ...t, dutyLocations: updatedLocs };
          }
          return t;
        });
        return changed ? next : prev;
      });
    }
  };

  const deleteZone = (zoneId: string) => {
    setDutyZones(prev => prev.filter(z => z.zoneId !== zoneId));
  };

  const [periods, setPeriods] = useState(PERIODS);
  const [notifications, setNotifications] = useState([]);
  const toggleToolbar = useCallback(() => setToolbarExpanded(prev => !prev), [setToolbarExpanded]);
  const handleDayChange = useCallback((newDay) => setDay(newDay), [setDay]);


  const { teachers, setTeachers, teacherFree, setTeacherFree, teacherSchedules, setTeacherSchedules, teacherSchedulesHydrated, setTeacherSchedulesHydrated } = useTeachers();
  const { classes, setClasses, classFree, setClassFree, classAbsence, setClassAbsence } = useClasses();
  const { locked, setLocked, absentPeople, setAbsentPeople, commonLessons, setCommonLessons, pdfSchedule, setPdfSchedule, options, setOptions, lastCleanupDate, setLastCleanupDate, absenceRefreshState, setAbsenceRefreshState } = useAssignments();
  const classFreeSnapshotRef = useRef('')
  const classAbsenceSnapshotRef = useRef('')
  const classAbsenceStateRef = useRef({})
  const autoSaveTimeoutRef = useRef(null)
  
  const alertedAbsentIdsRef = useRef(new Set())
  const applyFirebaseSnapshotRef = useRef(null)





  // Toplu: Tüm öğretmenlerin günlük max görev değerini güncelle
  const setAllTeachersMaxDuty = useCallback((value) => {
    const parsed = parseInt(value, 10);
    const safe = Number.isFinite(parsed) ? Math.max(1, Math.min(9, parsed)) : 6;
    setTeachers(prev => prev.map(t => ({ ...t, maxDutyPerDay: safe })));
  }, []);

  // Performance: Öğretmen Map (O(1) lookup)
  const teacherMap = useMemo(() =>
    new Map(teachers.map(t => [t.teacherId, t])),
    [teachers]
  );

  const teacherNameLookup = useMemo(() => {
    const map = new Map();
    teachers.forEach((t) => {
      if (!t?.teacherName) return;
      map.set(normalizeForComparison(t.teacherName), t.teacherName);
    });
    return map;
  }, [teachers]);

  const absentIdToNameMap = useMemo(() => {
    const map = new Map();
    (absentPeople || []).forEach(person => {
      if (!person?.absentId) return;
      const label = person.name || person.displayName || person.teacherName || person.originalName;
      if (label) {
        map.set(person.absentId, label);
      }
    });
    return map;
  }, [absentPeople]);

  const validClassIdSet = useMemo(() => {
    return new Set((classes || []).map((cls) => cls.classId).filter(Boolean));
  }, [classes]);

  const normalizeCommonLessonTeacherName = useCallback((rawValue) => {
    if (!rawValue) return '';
    const trimmed = String(rawValue).trim();
    if (!trimmed) return '';

    const teacherById = teacherMap.get(trimmed);
    if (teacherById?.teacherName) return teacherById.teacherName;

    const normalizedName = normalizeForComparison(trimmed);
    const teacherByName = teacherNameLookup.get(normalizedName);
    if (teacherByName) return teacherByName;

    const absentName = absentIdToNameMap.get(trimmed);
    if (absentName) return absentName;

    const compact = trimmed.replace(/\s+/g, '');
    const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(compact);
    const looksLikeGeneratedId = /^id_\d+_[0-9a-f]+$/i.test(compact);
    const looksLikeHexBlob = /^[0-9a-f-]{24,}$/i.test(compact);
    const hasNoReadableSeparators = !/[\s._]/.test(compact);
    const tooLongOpaqueToken = compact.length >= 24 && hasNoReadableSeparators;

    if (looksLikeUuid || looksLikeGeneratedId || looksLikeHexBlob || tooLongOpaqueToken) {
      return 'Diğer Öğretmen';
    }

    return trimmed;
  }, [teacherMap, teacherNameLookup, absentIdToNameMap]);

  const sanitizeCommonLessonsMap = useCallback((lessons = {}) => {
    let changed = false;
    const next = {};

    Object.entries(lessons || {}).forEach(([dayKey, perMap]) => {
      if (!perMap) return;
      Object.entries(perMap).forEach(([periodKey, byClass]) => {
        if (!byClass) return;
        Object.entries(byClass).forEach(([classId, rawValue]) => {
          if (!validClassIdSet.has(classId)) {
            changed = true;
            return;
          }
          const normalizedName = normalizeCommonLessonTeacherName(rawValue);
          if (!next[dayKey]) next[dayKey] = {};
          if (!next[dayKey][periodKey]) next[dayKey][periodKey] = {};
          next[dayKey][periodKey][classId] = normalizedName;
          if (normalizedName !== rawValue) {
            changed = true;
          }
        });
      });
    });

    return { map: next, changed };
  }, [normalizeCommonLessonTeacherName, validClassIdSet]);


  const applyFirebaseSnapshot = useCallback(
    (supabaseData, { persistLocal = true } = {}) => {
      if (!supabaseData || typeof supabaseData !== 'object') return;

      
      

      try {
        const teacherFreeSets = arrayToSetMap(supabaseData.teacherFree || {});
        const classFreeSets = migrateClassFree(supabaseData.classFree || {});
        const classAbsenceMap = migrateClassAbsence(supabaseData.classAbsence || {});
        const normalizedAbsents = normalizeAbsentPeople(
          supabaseData.absents || [],
          classAbsenceMap || {},
        );
        const { map: sanitizedCommonLessons } = sanitizeCommonLessonsMap(
          supabaseData.commonLessons || {},
        );

        setTeachers(supabaseData.teachers || []);
        const normalizedClasses = (supabaseData.classes || []).map((c: any) => ({
          ...c,
          className: normalizeClassName(c?.className || '') || c?.className || '',
        }));
        setClasses(normalizedClasses);
        setTeacherFree(teacherFreeSets);
        setClassFree(classFreeSets);
        setClassAbsence(classAbsenceMap);
        setAbsentPeople(normalizedAbsents);
        setCommonLessons(sanitizedCommonLessons);
        setLocked(supabaseData.locked || {});
        setPdfSchedule(supabaseData.pdfSchedule || {});
        if (supabaseData.locationZoneMapping) {
          setLocationZoneMapping(supabaseData.locationZoneMapping);
        }
        if (Array.isArray(supabaseData.dutyZones)) {
          setDutyZones(supabaseData.dutyZones);
        }
        dutyZonesLoadedRef.current = true;

        // Teacher schedules'i yükle - boş olsa bile Supabase'den geldiğini işaretle
        const loadedTeacherSchedules = supabaseData.teacherSchedules || {}
        logger.log('[applyFirebaseSnapshot] Setting teacher schedules:', {
          count: Object.keys(loadedTeacherSchedules).length,
          keys: Object.keys(loadedTeacherSchedules).slice(0, 5)
        })
        setTeacherSchedules(loadedTeacherSchedules);
        setTeacherSchedulesHydrated(true);

        if (persistLocal && typeof localStorage !== 'undefined') {
          try {
            const payload = {
              day,
              periods,
              teachers: supabaseData.teachers || [],
              classes: supabaseData.classes || [],
              teacherFree: mapSetToArray(teacherFreeSets),
              classFree: mapSetToArray(classFreeSets),
              absentPeople: normalizedAbsents,
              classAbsence: classAbsenceMap,
              commonLessons: sanitizedCommonLessons,
              options,
              locked: supabaseData.locked || {},
              pdfSchedule: supabaseData.pdfSchedule || {},
              teacherSchedules: supabaseData.teacherSchedules || {},
              lastSaved: Date.now(),
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
          } catch (storageError) {
            logger.warn('LocalStorage update failed:', storageError);
          }
        }
      } finally {
        
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      sanitizeCommonLessonsMap,
      setTeachers,
      setClasses,
      setTeacherFree,
      setClassFree,
      setClassAbsence,
      setAbsentPeople,
      setCommonLessons,
      setLocked,
      setPdfSchedule,
      setTeacherSchedules,
      setTeacherSchedulesHydrated,
    ],
  );

  // applyFirebaseSnapshot ref'ini her render'da güncelle (loadData effect'i stable dep ile kullanabilsin)
  useEffect(() => { applyFirebaseSnapshotRef.current = applyFirebaseSnapshot; });

  

  // İlk veri yükleme — useDataLoader hook'una taşındı
  useDataLoader({
    hydratedRef,
    applyFirebaseSnapshotRef,
    storageKey: STORAGE_KEY,
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
  });

  // Otomatik kaydet — useAutoSave hook'una taşındı
  useAutoSave({
    hydratedRef,
    
    storageKey: STORAGE_KEY,
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
  });

  const recentNotificationsRef = useRef(new Map());

  // Bildirim sistemi (diğer fonksiyonlardan önce tanımlanmalı)
  const addNotification = useCallback((messageOrOpts, maybeType) => {
    // Supports: addNotification("msg", "success") OR addNotification({ message, type, duration, actionLabel, onAction })
    const opts = typeof messageOrOpts === 'string'
      ? { message: messageOrOpts, type: maybeType || 'info' }
      : (messageOrOpts || {});

    const message = opts.message || '';
    const type = opts.type || 'info';
    if (!message) return;

    // Deduplication: Aynı mesaj ve tür 1.5 saniye içinde tekrar tetiklenirse yoksay
    const key = `${type}:${message}`;
    const now = Date.now();
    const lastTime = recentNotificationsRef.current?.get(key) || 0;
    if (now - lastTime < 1500) {
      return;
    }
    if (recentNotificationsRef.current) {
      recentNotificationsRef.current.set(key, now);
      if (recentNotificationsRef.current.size > 20) {
        for (const [k, t] of recentNotificationsRef.current.entries()) {
          if (now - t > 10000) recentNotificationsRef.current.delete(k);
        }
      }
    }

    const id = Date.now() + Math.random();
    const n = {
      id,
      message,
      type,
      timestamp: now,
      actionLabel: opts.actionLabel || '',
      onAction: typeof opts.onAction === 'function' ? opts.onAction : null,
      duration: Number.isFinite(opts.duration) ? opts.duration : (opts.actionLabel ? 6000 : 3500)
    };
    setNotifications(prev => {
      // Ekranda en fazla 3 bildirim tut, aşırı yığılmayı önle
      const trimmed = prev.length >= 3 ? prev.slice(prev.length - 2) : prev;
      return [...trimmed, n];
    });
    // Auto dismiss
    if (n.duration > 0) {
      setTimeout(() => setNotifications(prev => prev.filter(x => x.id !== id)), n.duration);
    }
  }, []);

  // History stack for planning undo/redo
  const { canUndo, canRedo, undo, redo, recordHistory } = useAssignmentHistory(locked, setLocked, addNotification);

  /* ===================== Manuel ekleme/silme işlemleri ===================== */

  // Aktif hafta ve gün tarihleri
  const activeWeekMonday = useMemo(() => getWeekMonday(weekOffset), [weekOffset]);
  const activeDate = useMemo(() => dateForSelectedDay(day, activeWeekMonday), [day, activeWeekMonday]);
  const displayDate = useMemo(() => formatTRDate(activeDate), [activeDate]);
  const activeDateKey = useMemo(() => formatDateKey(activeDate), [activeDate]);
  const activeWeekKey = useMemo(() => formatDateKey(activeWeekMonday), [activeWeekMonday]);
  const activeDateFormatted = useMemo(() => activeDate.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long'
  }), [activeDate]);

  const absentPeopleForCurrentDay = useMemo(() => {
    if (!Array.isArray(absentPeople)) return [];
    return absentPeople.filter(person => {
      if (!person || typeof person !== 'object') return false;
      if (!Array.isArray(person.days) || person.days.length === 0) return true;
      if (!person.days.includes(day)) return false;

      // Tarih veya Hafta filtresi
      if (person.date) {
        return person.date === activeDateKey;
      }
      if (person.weekKey) {
        return person.weekKey === activeWeekKey;
      }
      // Tarih belirtilmemiş eski kayıtlar: varsayılan olarak mevcut haftada göster
      return weekOffset === 0;
    });
  }, [absentPeople, day, activeDateKey, activeWeekKey, weekOffset]);
  const { addAbsent } = useAbsentManager({
    day,
    DAYS,
    teachers,
    classes,
    periods,
    teacherSchedules,
    teacherNameLookup,
    teacherMap,
    normalizeCommonLessonTeacherName,
    absentPeople,
    filteredAbsentPeople: absentPeopleForCurrentDay,
    setAbsentPeople,
    setClasses,
    setClassFree,
    setClassAbsence,
    setCommonLessons,
    classAbsenceStateRef,
    requestConfirmation,
    addNotification,
    logger,
  });

  
  
  const {
    toggleTeacherFree,
    toggleClassFree,
    setAllTeachersFree,
    setAllClassesFree,
    setTeacherPeriodsFree,
    handleSelectAbsence
  } = useAvailabilityManager();

  const {
    addClass,
    deleteClass
  } = useClassManager({
    addNotification
  });

  const {
    addTeacher,
    editTeacher,
    deleteTeacher,
    deleteAllPdfTeachers,
    importDutyTeachersData,
    loadDutyTeachersFromExcel
  } = useTeacherManager({
    addNotification,
    setActiveSection,
    setExcelReplaceModal,
    setDutyZones,
    periods,
    replacePdfSchedule
  });

  const [editingTeacher, setEditingTeacher] = useState<any>(null);


  const {
    deleteAllTeachers,
    deleteAllClasses,
    deleteAllAbsents,
    deleteAllTeacherSchedules,
    clearAllData,
  } = useBulkDeleteActions({
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
  });

  useVersionWatcher({ enabled: SHOULD_CHECK_VERSION });

  const refreshAbsenceData = useCallback(async () => {
    setAbsenceRefreshState((prev) => ({ ...prev, isRefreshing: true, error: null }));
    try {
      // 1. Service Worker cache'ini temizle
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames
              .filter(name => name.startsWith('nobetci-assigner'))
              .map(name => caches.delete(name))
          );
          logger.info('Service Worker cache temizlendi');
        } catch (cacheError) {
          logger.warn('Cache temizleme hatası:', cacheError);
        }
      }

      // 2. Supabase'den en güncel verileri çek
      const snapshot = await loadInitialData();
      applyFirebaseSnapshot(snapshot);

      setAbsenceRefreshState({
        isRefreshing: false,
        lastRefreshedAt: new Date(),
        error: null,
      });
      addNotification('Veriler güncellendi', 'success');
    } catch (error) {
      logger.error('Manual absence refresh failed:', error);
      setAbsenceRefreshState((prev) => ({
        ...prev,
        isRefreshing: false,
        error: error?.message || 'Bilinmeyen hata',
      }));
      addNotification(`Veriler yenilenemedi: ${error?.message || error}`, 'error');
    }
  }, [addNotification, applyFirebaseSnapshot]);

  const handleManualRefreshClick = useCallback(() => {
    if (absenceRefreshState.isRefreshing) return;
    setToolbarExpanded(false);
    refreshAbsenceData();
  }, [absenceRefreshState.isRefreshing, refreshAbsenceData, setToolbarExpanded]);

  const teachersForCurrentDay = useDutyTeacherFilter(teachers, pdfSchedule, day, dutyZones);

  // Nöbetçi öğretmenlerin boş saatlerini otomatik işaretle (referanslardan önce tanımlandı)
  const autoMarkDutyTeachersFree = useCallback(() => {
    if (!teacherSchedules || Object.keys(teacherSchedules).length === 0) return;
    if (!teachersForCurrentDay || teachersForCurrentDay.length === 0) return;

    const dayMapping = { 'Mon': 'monday', 'Tue': 'tuesday', 'Wed': 'wednesday', 'Thu': 'thursday', 'Fri': 'friday' };
    const pdfDayKey = dayMapping[day] || 'monday';

    const dutyTeachers = new Set(teachersForCurrentDay.map(t => t.teacherId));
    if (dutyTeachers.size === 0) return;

    setTeacherFree((prev) => {
      const next = { ...prev };

      dutyTeachers.forEach((teacherId) => {
        // O(n) teachers.find yerine O(1) teacherMap.get
        const teacher = teacherMap.get(teacherId);
        if (!teacher) return;

        // TeacherSchedules anahtarları normalize edilerek eşleştir
        const normalizedTeacherName = normalizeForComparison(teacher.teacherName);
        const scheduleKey = Object.keys(teacherSchedules).find(k => normalizeForComparison(k) === normalizedTeacherName);
        if (!scheduleKey) {
          // Program bulunamadıysa hiçbir şeyi değiştirme
          return;
        }
        const teacherSchedule = teacherSchedules[scheduleKey] || {};
        const daySchedule = teacherSchedule[pdfDayKey] || {};

        periods.forEach((period) => {
          if (!next[period]) next[period] = new Set(Array.isArray(next[period]) ? next[period] : Array.from(next[period] || []));
          const cell = daySchedule[period];
          const hasClass = typeof cell === 'string' ? cell.trim() !== '' : Boolean(cell);
          if (!hasClass) {
            next[period].add(teacherId);
          } else {
            next[period].delete(teacherId);
          }
        });
      });

      return next;
    });
  }, [day, teacherSchedules, teachersForCurrentDay, teacherMap, periods]);

  // Sistem yüklendiğinde ve gün değiştiğinde nöbetçi öğretmenlerin boş saatlerini otomatik işaretle
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!teacherSchedulesHydrated) return;
    if (!teacherSchedules || Object.keys(teacherSchedules).length === 0) return;

    // requestAnimationFrame kullanarak hemen çalıştır (gecikme yok)
    const rafId = requestAnimationFrame(() => {
      autoMarkDutyTeachersFree();
    });
    return () => cancelAnimationFrame(rafId);
  }, [day, teacherSchedules, teacherSchedulesHydrated, teachers, periods, autoMarkDutyTeachersFree]);

  const handleTeacherScheduleUpload = useCallback(
    async (event) => {
      const file = event?.target?.files?.[0];
      if (!file) return;

      // Mevcut ders programı varsa onay modalı göster
      const existingCount = teacherSchedules ? Object.keys(teacherSchedules).length : 0;
      if (existingCount > 0) {
        // Önce dosyayı parse et (hata kontrolü için)
        try {
          const { parseTeacherSchedulesFromExcel } = await import('./utils/teacherScheduleExcelParser.js');
          const schedules = await parseTeacherSchedulesFromExcel(file);
          setTeacherScheduleReplaceModal({
            isOpen: true,
            data: { file, schedules },
            existingCount
          });
          if (event?.target) {
            event.target.value = '';
          }
        } catch (error) {
          logger.error('Excel parsing error:', error);
          addNotification(`Dosya okuma hatası: ${error.message}`, 'error');
          if (event?.target) {
            event.target.value = '';
          }
        }
        return;
      }

      // Mevcut veri yoksa direkt yükle
      try {
        logger.log('Starting teacher schedule upload from Excel...');
        const { parseTeacherSchedulesFromExcel } = await import('./utils/teacherScheduleExcelParser.js');
        const schedules = await parseTeacherSchedulesFromExcel(file);
        setTeacherSchedules(schedules);
        setTeacherSchedulesHydrated(true);
        await saveTeacherSchedules(schedules).catch((err) => {
          logger.error('Teacher schedule Supabase save error:', err);
          throw err;
        });
        addNotification(`${Object.keys(schedules).length} öğretmenin ders programı yüklendi`, 'success');
      } catch (error) {
        logger.error('Excel parsing error:', error);
        addNotification(`Ders programı yükleme hatası: ${error.message}`, 'error');
      } finally {
        if (event?.target) {
          event.target.value = '';
        }
      }
    },
    [teacherSchedules, setTeacherSchedules, setTeacherSchedulesHydrated, addNotification, setTeacherScheduleReplaceModal],
  );

  const handleSinifProgramiUpload = useCallback(
    async (event) => {
      const file = event?.target?.files?.[0];
      if (!file) return;

      if (!teacherSchedules || Object.keys(teacherSchedules).length === 0) {
        addNotification('Lütfen önce Öğretmen El Programını (Ders Programı) yükleyin.', 'warning');
        return;
      }

      try {
        const { parseClassLocationsFromExcel } = await import('./utils/classScheduleExcelParser.js');
        const locations = await parseClassLocationsFromExcel(file, teacherSchedules, teachers);
        setClassLocations(locations);
        await saveClassLocations(locations).catch((err: any) => {
          logger.error('classLocations save error:', err);
          addNotification('Sınıf programı veritabanına kaydedilemedi.', 'error');
        });
        addNotification('Sınıf yerleri sisteme başarıyla kaydedildi.', 'success');
        // İsteğe bağlı olarak bu veriyi Supabase'e kaydedebilirsiniz
      } catch (error) {
        logger.error('Class schedule parsing error:', error);
        addNotification(`Sınıf programı okuma hatası: ${error.message}`, 'error');
      } finally {
        if (event?.target) {
          event.target.value = '';
        }
      }
    },
    [teacherSchedules, teachers, addNotification]
  );

  const handleDeleteAllClassLocations = useCallback(() => {
    if (window.confirm('Tüm sınıf programı verilerini silmek istediğinize emin misiniz?')) {
      setClassLocations({});
      saveClassLocations({}).catch((err: any) => logger.error('classLocations clear error:', err));
      addNotification('Sınıf programları başarıyla silindi.', 'success');
    }
  }, [addNotification]);

  // Manually derive class schedules from teacher schedules (never automatic).
  // Existing (uploaded) entries are preserved; only empty slots are filled.
  const handleDeriveClassSchedulesFromTeachers = useCallback(() => {
    if (!teacherSchedules || Object.keys(teacherSchedules).length === 0) {
      addNotification('Önce öğretmen ders programını yükleyin.', 'warning');
      return;
    }
    const next: any = JSON.parse(JSON.stringify(classLocations || {}));
    let added = 0;
    Object.entries(teacherSchedules).forEach(([tName, tDays]: [string, any]) => {
      if (tName === TEACHER_SCHEDULES_SNAPSHOT_KEY || !tDays || typeof tDays !== 'object') return;
      Object.entries(tDays).forEach(([day, tPeriods]: [string, any]) => {
        Object.entries(tPeriods || {}).forEach(([period, cId]: [string, any]) => {
          if (!cId || typeof cId !== 'string' || !cId.trim()) return;
          cId.split(',').map((s) => s.trim()).filter(Boolean).forEach((raw) => {
            const cName = normalizeClassName(raw);
            if (!cName) return;
            if (!next[cName]) next[cName] = {};
            if (!next[cName][day]) next[cName][day] = {};
            const existing = next[cName][day][period];
            if (existing && !Array.isArray(existing.teachers)) return; // uploaded entry, keep as is
            if (!existing) {
              next[cName][day][period] = { subject: '', location: '', teacherNamesStr: '', teachers: [] };
              added++;
            }
            if (!next[cName][day][period].teachers.includes(tName)) {
              next[cName][day][period].teachers.push(tName);
            }
          });
        });
      });
    });
    setClassLocations(next);
    saveClassLocations(next).catch((err: any) => {
      logger.error('classLocations save error:', err);
      addNotification('Sınıf programı veritabanına kaydedilemedi.', 'error');
    });
    addNotification(`Öğretmen programından ${added} ders hücresi türetildi.`, 'success');
  }, [teacherSchedules, classLocations, addNotification]);

  // Sekme açıldığında (sayfa görünür olduğunda) nöbetçi öğretmen işaretlemelerini güncelle
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!teacherSchedulesHydrated) return;
    if (!teacherSchedules || Object.keys(teacherSchedules).length === 0) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Sekme açıldığında hemen işaretle
        requestAnimationFrame(() => {
          autoMarkDutyTeachersFree();
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [day, teacherSchedules, teacherSchedulesHydrated, teachers, periods, autoMarkDutyTeachersFree]);

  // period değişince Set'leri garantiye al
  useEffect(() => {
    const ensureSets = (obj) => {
      const out = {};
      for (const p of periods) {
        const v = obj?.[p];
        out[p] = v instanceof Set ? v : new Set(Array.isArray(v) ? v : []);
      }
      return out;
    };

    setTeacherFree((prev) => ensureSets(prev));
    // classFree için ensureClassFreeSets kaldırıldı - toggleClassFree zaten gerekli yapıları oluşturuyor
  }, [periods]);

  const onNotificationAction = useCallback((id) => {
    setNotifications(prev => {
      const notif = prev.find(x => x.id === id)
      if (notif?.onAction) {
        try {
          notif.onAction()
        } catch (err) {
          logger.error('Bildirim aksiyon hatası:', err);
        }
      }
      return prev.filter(x => x.id !== id)
    })
  }, [])
  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((x) => x.id !== id));
  }, []);

  // Tarih metni (displayDate yukarıda activeDate ile hesaplanıyor)

  // Toggle yardımcıları

  const updateClassAbsenceForCommonLesson = useCallback((day, period, classId, hasCommonLesson) => {
    setClassAbsence(prev => {
      const next = { ...prev };
      if (!next[day]) next[day] = {};
      if (!next[day][period]) next[day][period] = {};

      if (hasCommonLesson) {
        const encodedValue = encodeClassAbsenceValue(COMMON_LESSON_LABEL, false);
        next[day][period][classId] = encodedValue;
      } else {
        if (next[day][period][classId]) {
          const decoded = decodeClassAbsenceValue(next[day][period][classId]);
          if (decoded.absentId === COMMON_LESSON_LABEL) {
            delete next[day][period][classId];
          }
        }
        if (Object.keys(next[day][period]).length === 0) {
          delete next[day][period];
        }
        if (Object.keys(next[day]).length === 0) {
          delete next[day];
        }
      }

      return next;
    });

    // Directly persist to Supabase (auto-save will handle it, but we want immediate sync for common lessons)
    // Use a small delay to batch multiple updates
    setTimeout(() => {
      const persistedValue = hasCommonLesson
        ? encodeClassAbsenceValue(COMMON_LESSON_LABEL, false)
        : null;

      upsertClassAbsence({
        day,
        period,
        classId,
        absentId: persistedValue
      }).catch(err => logger.error('Common lesson absence sync error:', err));
    }, 100);
  }, []);

  const handleSetCommonLesson = useCallback((day, period, classId, teacherName) => {
    setCommonLessons((prev) => {
      const next = { ...prev };
      if (!next[day]) next[day] = {};
      if (!next[day][period]) next[day][period] = {};
      if (teacherName) {
        const normalized = normalizeCommonLessonTeacherName(teacherName);
        next[day][period][classId] = normalized;
        updateClassAbsenceForCommonLesson(day, period, classId, true);
      } else {
        if (next[day][period][classId]) {
          delete next[day][period][classId];
        }
        updateClassAbsenceForCommonLesson(day, period, classId, false);
        if (Object.keys(next[day][period] || {}).length === 0) {
          delete next[day][period];
        }
        if (Object.keys(next[day] || {}).length === 0) {
          delete next[day];
        }
      }
      return next;
    });
  }, [normalizeCommonLessonTeacherName, updateClassAbsenceForCommonLesson]);


  const handleOpenCommonLessonModal = useCallback((day, period, classId) => {
    setCurrentCommonLesson({ day, period, classId });
    setModals(m => ({ ...m, commonLesson: true }));
  }, [setCurrentCommonLesson, setModals]);

  const handleCloseCommonLessonModal = useCallback(() => {
    setModals(m => ({ ...m, commonLesson: false }));
    setCurrentCommonLesson({ day: null, period: null, classId: null });
  }, [setCurrentCommonLesson, setModals]);

  const handleOpenDutyTeacherExcelModal = useCallback(() => {
    setModals(m => ({ ...m, dutyTeacherExcel: true }));
  }, [setModals]);

  const handleCloseDutyTeacherExcelModal = useCallback(() => {
    setModals(m => ({ ...m, dutyTeacherExcel: false }));
  }, [setModals]);

  

  const handleExcelReplaceConfirm = useCallback(async () => {
    const { data, existingCount } = excelReplaceModal;
    setExcelReplaceModal({ isOpen: false, data: null });
    if (!data) return;

    try {
      const result = await importDutyTeachersData(data);
      const replacedCount = existingCount ?? result.removedCount;
      if (replacedCount > 0) {
        addNotification(`${replacedCount} mevcut öğretmen silindi, ${result.insertedCount} yeni öğretmen yüklendi`, "success");
      } else {
        addNotification(`${result.insertedCount} nöbetçi öğretmen Excel'den yüklendi`, "success");
      }
      setActiveSection('classes');

    } catch (e) {
      logger.error('Excel yükleme hatası:', e);
      addNotification(`Excel yükleme hatası: ${e.message}`, "error");
    } finally {
      // no-op
    }
  }, [excelReplaceModal, addNotification, importDutyTeachersData, setActiveSection, setExcelReplaceModal]);

  const handleExcelReplaceCancel = useCallback(() => {
    setExcelReplaceModal({ isOpen: false, data: null });
    addNotification("Excel yükleme iptal edildi", "info");
  }, [addNotification, setExcelReplaceModal]);

  const handleTeacherScheduleReplaceConfirm = useCallback(async () => {
    const { data, existingCount } = teacherScheduleReplaceModal;
    setTeacherScheduleReplaceModal({ isOpen: false, data: null });
    if (!data || !data.schedules) return;

    try {
      // clearTeacherSchedules() çağrılmıyor: saveTeacherSchedules zaten mevcut snapshot'ı günceller
      // (clear+save arasında başka cihaz poll yaparsa boş veri görürü engeller)
      const schedules = data.schedules;
      setTeacherSchedules(schedules);
      setTeacherSchedulesHydrated(true);
      await saveTeacherSchedules(schedules).catch((err) => {
        logger.error('Teacher schedule Supabase save error:', err);
        throw err;
      });

      addNotification(
        existingCount > 0
          ? `Mevcut ders programları silindi, ${Object.keys(schedules).length} öğretmenin yeni ders programı yüklendi`
          : `${Object.keys(schedules).length} öğretmenin ders programı yüklendi`,
        'success'
      );
    } catch (error) {
      logger.error('Ders programı değiştirme hatası:', error);
      addNotification(`Ders programı yükleme hatası: ${error.message}`, 'error');
    }
  }, [teacherScheduleReplaceModal, setTeacherSchedules, setTeacherSchedulesHydrated, addNotification, setTeacherScheduleReplaceModal]);

  const handleTeacherScheduleReplaceCancel = useCallback(() => {
    setTeacherScheduleReplaceModal({ isOpen: false, data: null });
    addNotification("Ders programı yükleme iptal edildi", "info");
  }, [addNotification, setTeacherScheduleReplaceModal]);

  const handleOptionChange = (name, value) => {
    setOptions(prev => ({ ...prev, [name]: value }));
  };


  



  /* ===================== PDF Çizelge Yükleme ===================== */

  const loadScheduleFromPDF = useCallback((importData) => {
    const {
      schedule,
      matchingResults,
      manualMappings,
      conflicts,
      autoAddedTeachers,
    } = importData;

    setPdfSchedule(schedule);

    if (!schedule || !matchingResults) {
      addNotification("Geçersiz PDF verisi", "error");
      return;
    }

    let results = matchingResults?.results ? { ...matchingResults.results } : { ...matchingResults };
    let summary = matchingResults?.summary ? { ...matchingResults.summary } : null;
    const autoAddedCount = Array.isArray(autoAddedTeachers) ? autoAddedTeachers.length : 0;

    const uniquePdfTeachers = new Set();
    Object.values(schedule || {}).forEach((dayData) => {
      Object.values(dayData || {}).forEach((periodNames) => {
        if (Array.isArray(periodNames)) {
          periodNames.forEach((name) => uniquePdfTeachers.add(name));
        }
      });
    });

    if (autoAddedCount > 0) {
      setTeachers((prev) => [...prev, ...(autoAddedTeachers || [])]);

      const updatedMatched = [...(results?.matched || [])];
      const updatedUnmatched = [...(results?.unmatched || [])];
      const autoTeacherNames = new Set();

      autoAddedTeachers.forEach((teacher) => {
        updatedMatched.push({
          pdfName: teacher.teacherName,
          teacher,
          confidence: 1.0,
          systemName: teacher.teacherName,
        });
        autoTeacherNames.add(teacher.teacherName);
      });

      const filteredUnmatched = updatedUnmatched.filter((item) => !autoTeacherNames.has(item.pdfName));

      results = {
        ...results,
        matched: updatedMatched,
        unmatched: filteredUnmatched,
      };

      const uncertainCount = Array.isArray(results.uncertain) ? results.uncertain.length : 0;
      const total = updatedMatched.length + uncertainCount + filteredUnmatched.length;
      summary = {
        total,
        matched: updatedMatched.length,
        uncertain: uncertainCount,
        unmatched: filteredUnmatched.length,
        successRate: total ? (updatedMatched.length / total) * 100 : 0,
      };

      addNotification(`${autoAddedCount} öğretmen otomatik olarak sisteme eklendi`, "success");
    }

    const matchedCount = Array.isArray(results?.matched) ? results.matched.length : 0;
    const unmatchedList = Array.isArray(results?.unmatched) ? results.unmatched : [];
    const unmatchedCount = unmatchedList.length;
    const uncertainCount = Array.isArray(results?.uncertain) ? results.uncertain.length : 0;

    if (!summary) {
      const total = matchedCount + uncertainCount + unmatchedCount;
      summary = {
        total,
        matched: matchedCount,
        uncertain: uncertainCount,
        unmatched: unmatchedCount,
        successRate: total ? (matchedCount / total) * 100 : 0,
      };
    }

    const allMatches = new Map();

    if (Array.isArray(autoAddedTeachers)) {
      autoAddedTeachers.forEach((teacher) => {
        allMatches.set(teacher.teacherName, teacher);
      });
    }

    if (Array.isArray(results?.matched)) {
      results.matched.forEach((match) => {
        if (match?.pdfName && match.teacher) {
          allMatches.set(match.pdfName, match.teacher);
        }
      });
    }

    Object.entries(manualMappings || {}).forEach(([pdfName, teacherId]) => {
      const teacher = teachers.find((t) => t.teacherId === teacherId);
      if (teacher) {
        allMatches.set(pdfName, teacher);
      }
    });

    if (classes.length === 0) {
      addNotification({
        message: "Öğretmenler eklendi! Nöbet atamaları için önce sınıfları ekleyin.",
        type: "warning",
        actionLabel: "Sınıfları Ekle",
        onAction: () => setActiveSection("classes"),
      });
      return;
    }

    const PDF_DAY_TO_SYSTEM_CONFLICTS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri' };
    const resolvedConflicts = new Map();
    (conflicts || []).forEach((conflict) => {
      if (conflict.resolution === 'use_pdf') {
        const conflictSystemDay = PDF_DAY_TO_SYSTEM_CONFLICTS[conflict.day] || conflict.day;
        resolvedConflicts.set(`${conflictSystemDay}|${conflict.period}|${conflict.classId}`, conflict.pdfTeacher.teacherId);
      }
    });

    setLocked((prev) => {
      const next = { ...prev };
      let localAssignmentCount = 0;
      let localConflictCount = 0;

      const PDF_DAY_TO_SYSTEM = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri' };
      Object.entries(schedule).forEach(([dayKey, dayData]) => {
        const systemDay = PDF_DAY_TO_SYSTEM[dayKey] || dayKey;
        Object.entries(dayData || {}).forEach(([period, pdfNames]) => {
          if (Array.isArray(pdfNames) && pdfNames.length > 0) {
            const availableClasses = classes.filter(
              (c) =>
                !next[`${systemDay}|${period}|${c.classId}`] ||
                resolvedConflicts.has(`${systemDay}|${period}|${c.classId}`)
            );

            pdfNames.forEach((pdfName, index) => {
              const teacher = allMatches.get(pdfName);
              if (teacher && teacher.teacherId && index < availableClasses.length) {
                const isValidTeacher = teachers.some((t) => t.teacherId === teacher.teacherId);
                if (!isValidTeacher) {
                  logger.warn(
                    `Invalid teacherId "${teacher.teacherId}" for PDF name "${pdfName}", skipping assignment`
                  );
                  return;
                }

                const classId = availableClasses[index].classId;
                const key = `${systemDay}|${period}|${classId}`;

                if (resolvedConflicts.has(key)) {
                  const conflictTeacherId = resolvedConflicts.get(key);
                  if (teachers.some((t) => t.teacherId === conflictTeacherId)) {
                    next[key] = conflictTeacherId;
                    localConflictCount += 1;
                  } else {
                    logger.warn(
                      `Invalid teacherId "${conflictTeacherId}" in conflict resolution for ${key}, skipping`
                    );
                  }
                } else if (!next[key]) {
                  next[key] = teacher.teacherId;
                  localAssignmentCount += 1;
                }
              } else if (!teacher) {
                logger.warn(`Teacher not found for PDF name "${pdfName}", skipping assignment`);
              }
            });
          }
        });
      });

      addNotification(
        `${localAssignmentCount} atama yüklendi${localConflictCount > 0 ? `, ${localConflictCount} çakışma çözüldü` : ''}`,
        "success"
      );

      return next;
    });

    setActiveSection("schedule");
  }, [teachers, classes, addNotification, setActiveSection]);


  const deleteAbsent = useCallback(async (absentIdToDelete) => {
    const targetAbsent = absentPeople.find(p => p.absentId === absentIdToDelete);
    if (!targetAbsent) {
      addNotification('Mazeret kaydı bulunamadı', 'warning');
      return;
    }

    const absentTeacherName = targetAbsent?.name || null;
    const validDayKeys = new Set(DAYS.map(d => d.key));
    const daysToProcess = (targetAbsent?.days || []).filter(dayKey => validDayKeys.has(dayKey));
    const fallbackDays = daysToProcess.length > 0 ? daysToProcess : Array.from(validDayKeys);

    // STEP 1: Collect affected data for backup (optimistic update)
    const affectedClassIds = new Set();
    const slotsToClear = [];
    const slotKeys = new Set();
    const commonLessonsToDelete = [];

    // Analyze classAbsence to find affected slots
    const updatedClassAbsence = (() => {
      const next = { ...classAbsence };
      Object.keys(next).forEach(dk => {
        // Shallow copy the day object
        next[dk] = { ...(next[dk] || {}) };

        Object.keys(next[dk]).forEach(pk => {
          // Shallow copy the period object
          const per = { ...(next[dk][pk] || {}) };
          let changed = false;

          Object.keys(per).forEach(cid => {
            const decoded = decodeClassAbsenceValue(per[cid]);
            const numericPeriod = Number(pk);
            const shouldRemove =
              decoded.absentId === absentIdToDelete ||
              decoded.commonLessonOwnerId === absentIdToDelete;

            if (shouldRemove) {
              changed = true;
              affectedClassIds.add(cid);

              const slotKey = `${dk}|${numericPeriod}|${cid}`;
              if (!slotKeys.has(slotKey)) {
                slotKeys.add(slotKey);
                slotsToClear.push({
                  dayKey: dk,
                  period: Number.isFinite(numericPeriod) ? numericPeriod : Number(pk) || pk,
                  classId: cid,
                });
              }

              if (decoded.absentId === COMMON_LESSON_LABEL) {
                commonLessonsToDelete.push({
                  day: dk,
                  period: Number.isFinite(numericPeriod) ? numericPeriod : Number(pk) || pk,
                  classId: cid,
                });
              }
              delete per[cid];
            }
          });

          // Assign back the modified period object or delete if empty
          if (changed) {
            if (Object.keys(per).length === 0) {
              delete next[dk][pk];
            } else {
              next[dk][pk] = per;
            }
          }
        });

        // Clean up empty days
        if (Object.keys(next[dk]).length === 0) delete next[dk];
      });
      return next;
    })();

    // Find common lessons by teacher name
    Object.keys(commonLessons || {}).forEach(dayKey => {
      Object.keys(commonLessons[dayKey] || {}).forEach(periodKey => {
        const period = Number(periodKey);
        Object.entries(commonLessons[dayKey][period] || {}).forEach(([classId, teacherName]) => {
          if ((absentTeacherName && normalizeForComparison(teacherName) === normalizeForComparison(absentTeacherName)) || teacherName === absentIdToDelete) {
            const existing = commonLessonsToDelete.find(s =>
              s.day === dayKey && s.period === period && s.classId === classId
            );
            if (!existing) {
              commonLessonsToDelete.push({ day: dayKey, period, classId });
            }
          }
        });
      });
    });

    // Determine classes to remove (no longer have any absents)
    const stillHasAbsent = new Set();
    fallbackDays.forEach((dayKey) => {
      const dayRecords = updatedClassAbsence?.[dayKey] || {};
      Object.values(dayRecords).forEach(byClass => {
        Object.entries(byClass || {}).forEach(([cid, aId]) => {
          const { absentId } = decodeClassAbsenceValue(aId);
          if (absentId && absentId !== absentIdToDelete) {
            stillHasAbsent.add(cid);
          }
        });
      });
    });
    const classesToRemove = Array.from(affectedClassIds).filter(cid => !stillHasAbsent.has(cid));

    // STEP 2: OPTIMISTIC UPDATE - Update UI immediately
    setAbsentPeople(prev => prev.filter(p => p.absentId !== absentIdToDelete));
    setClassAbsence(() => updatedClassAbsence);

    setClassFree((prev) => {
      const next = { ...prev };
      slotsToClear.forEach(({ dayKey, period, classId }) => {
        const periodKey = Number(period);
        const dayEntry = next[dayKey];
        if (!dayEntry) return;
        const slotSet = dayEntry[periodKey];
        if (slotSet instanceof Set) {
          slotSet.delete(classId);
        } else if (Array.isArray(slotSet)) {
          dayEntry[periodKey] = new Set(slotSet.filter((cid) => cid !== classId));
        }
      });
      fallbackDays.forEach((dayKey) => {
        if (!next[dayKey]) return;
        Object.keys(next[dayKey]).forEach(pk => {
          const set = next[dayKey][pk];
          if (set instanceof Set) {
            classesToRemove.forEach(cid => set.delete(cid));
          }
        });
      });
      return next;
    });

    setCommonLessons((prev) => {
      const next = { ...prev };
      commonLessonsToDelete.forEach(({ day, period, classId }) => {
        if (next[day]?.[period]?.[classId]) {
          next[day][period] = { ...next[day][period] };
          delete next[day][period][classId];
          if (Object.keys(next[day][period]).length === 0) {
            delete next[day][period];
          }
        }
        if (next[day] && Object.keys(next[day]).length === 0) {
          delete next[day];
        }
      });
      return next;
    });

    setClasses(prevClasses => prevClasses.filter(c => !classesToRemove.includes(c.classId)));

    // STEP 3: BATCH DELETE - Background cleanup (parallel)
    try {
      const deletePromises = [
        deleteAbsentById(absentIdToDelete),
        deleteClassAbsenceByAbsent(absentIdToDelete)
      ];

      // Batch delete common lessons
      if (commonLessonsToDelete.length > 0) {
        deletePromises.push(
          ...commonLessonsToDelete.map(({ day, period, classId }) =>
            deleteCommonLessonsBySlot(day, period, classId)
          )
        );
      }

      // Delete by teacher name (fallback)
      if (absentTeacherName) {
        deletePromises.push(deleteCommonLessonsByTeacher(absentTeacherName));
      }

      // Delete affected classes
      if (classesToRemove.length > 0) {
        deletePromises.push(
          ...classesToRemove.map((cid) => deleteClassById(cid))
        );
      }

      // Execute all deletes in parallel
      await Promise.all(deletePromises);

      // Update class_free in Firebase
      if (slotsToClear.length > 0) {
        await bulkUpsertClassFree(
          slotsToClear.map(({ dayKey, period, classId }) => ({
            day: dayKey,
            period: Number(period),
            classId,
            isSelected: false,
          }))
        );
      }

      addNotification("Mazeret kaydı silindi", "success");
    } catch (error) {
      logger.error('Batch delete error:', error);
      // Sayfa reload yerine sadece veritabanından taze veri çek
      // → Kullanıcının diğer değişiklikleri kaybolmaz
      addNotification('Silme işlemi tamamlanamadı, veriler yenileniyor', 'error');
      try {
        await refreshAbsenceData();
      } catch (refreshErr) {
        logger.error('Refresh after delete error:', refreshErr);
      }
    }
  }, [absentPeople, classAbsence, commonLessons, setClassAbsence, setClassFree, setCommonLessons, setClasses, setAbsentPeople, addNotification, refreshAbsenceData]);

  useEffect(() => {
    if (!hydratedRef.current) return;

    const currentDateString = new Date().toDateString();

    if (!lastCleanupDate) {
      setLastCleanupDate(currentDateString);
      persistCleanupDate(currentDateString);
      return;
    }

    if (currentDateString === lastCleanupDate) return;

    const currentDayIndex = new Date().getDay();
    const todayAndFutureDayKeys = REAL_DAY_KEYS.slice(currentDayIndex);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    if (Array.isArray(absentPeople) && absentPeople.length > 0) {
      const staleAbsents = absentPeople.filter(person => {
        if (!person?.absentId) return false;
        // Tarihli kayıtlar için: yalnızca bugünden önceki günlerin kayıtlarını temizle
        if (person.date) {
          const personDate = new Date(person.date);
          personDate.setHours(0, 0, 0, 0);
          return personDate < startOfToday;
        }
        // Tarihi olmayan eski kayıtlar için:
        if (!Array.isArray(person.days) || person.days.length === 0) return true;
        return !person.days.some(d => todayAndFutureDayKeys.includes(d));
      });

      if (staleAbsents.length > 0) {
        staleAbsents.forEach(person => {
          deleteAbsent(person.absentId);
        });
      }
    }

    setLastCleanupDate(currentDateString);
    persistCleanupDate(currentDateString);
  }, [absentPeople, deleteAbsent, lastCleanupDate]);

  

  


  /* ======================= Atama verilerini hazırlama ======================= */

  const blockedAbsentTeacherNames = useMemo(() => {
    const blocked = new Set();
    (absentPeople || []).forEach((person) => {
      if (!person) return;
      const baseName = person.name || person.teacherName || person.displayName;
      const normalizedName = normalizeForComparison(baseName);
      if (!normalizedName) return;
      const effectiveDays =
        Array.isArray(person.days) && person.days.length > 0
          ? person.days
          : DAYS.map((d) => d.key);
      if (effectiveDays.includes(day)) {
        blocked.add(normalizedName);
      }
    });
    return blocked;
  }, [absentPeople, day]);

  const lastAbsenceRefreshLabel = useMemo(() => {
    const { lastRefreshedAt } = absenceRefreshState;
    if (!lastRefreshedAt) {
      return "Henüz yapılmadı";
    }
    try {
      return new Intl.DateTimeFormat("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(lastRefreshedAt);
    } catch {
      return String(lastRefreshedAt);
    }
  }, [absenceRefreshState]);

  const scheduledTeacherOptions = useMemo(() => {
    if (!teacherSchedules || Object.keys(teacherSchedules).length === 0) return [];

    const seen = new Set();
    const opts = [];

    Object.keys(teacherSchedules).forEach(scheduleName => {
      if (!scheduleName) return;
      const normalizedScheduleName = normalizeForComparison(scheduleName);
      if (!normalizedScheduleName) return;

      const matchingTeacher = teachers.find(t => normalizeForComparison(t.teacherName) === normalizedScheduleName);
      const teacherId = matchingTeacher?.teacherId || `auto_${normalizedScheduleName}`;
      if (seen.has(teacherId)) return;
      seen.add(teacherId);

      const displayName = matchingTeacher?.teacherName || scheduleName;
      opts.push({
        teacherId,
        teacherName: displayName,
        normalizedName: normalizedScheduleName,
      });
    });

    opts.sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'tr', { sensitivity: 'base' }));
    return opts;
  }, [teacherSchedules, teachers]);

  const teacherSchedulesList = useMemo(() => {
    return Object.entries(teacherSchedules || {}).sort(([aName], [bName]) =>
      aName.localeCompare(bName, 'tr', { sensitivity: 'base' })
    );
  }, [teacherSchedules]);

  useEffect(() => {
    if (!classFree || !day) return;
    const snapshot = classFree?.[day];
    if (!snapshot) {
      logger.log('[DEBUG] classFree snapshot missing for day:', day);
      return;
    }
    const classNameMap = classes.reduce((acc, cls) => {
      acc[cls.classId] = cls.className;
      return acc;
    }, {});
    // Debug: classFree snapshot for current day
    Object.entries(snapshot).map(([period, set]) => {
      const ids = Array.from(set instanceof Set ? set : Array.isArray(set) ? set : []);
      const withNames = ids.map((cid) => `${cid} (${classNameMap[cid] || '??'})`);
      return [period, withNames];
    });
  }, [classFree, day, classes]);

  // (teachersForCurrentDay has been moved to the top of the component)

  const normalizedClassNames = useMemo(() => {
    const set = new Set();
    (classes || []).forEach((cls) => {
      const normalized = normalizeClassLabel(cls?.className);
      if (normalized) set.add(normalized);
    });
    return set;
  }, [classes]);

  const freeTeachersByDay = useFreeTeachersByDay({
    teacherFree,
    day,
    periods,
    teacherMap,
    absentPeople: absentPeopleForCurrentDay,
  });

  const classFreeForCurrentDay = useClassFreeForDay({ classFree, day, periods });

  const absentIdsForCurrentDay = useMemo(
    () => new Set(absentPeopleForCurrentDay.map((person) => person.absentId)),
    [absentPeopleForCurrentDay],
  );

  const filteredClassAbsence = useFilteredClassAbsence({
    classAbsence,
    day,
    absentIdsForCurrentDay,
  });

  const filteredClassFree = useFilteredClassFree({
    classFree,
    classAbsence,
    day,
    periods,
    absentIdsForCurrentDay,
  });

  const filteredCommonLessons = useMemo(() => {
    const dayCommon = commonLessons?.[day];
    if (!dayCommon || typeof dayCommon !== 'object') return commonLessons;
    const dayAbsences = classAbsence?.[day] || {};
    const filteredDay = {};

    Object.entries(dayCommon).forEach(([p, classMap]) => {
      if (!classMap || typeof classMap !== 'object') return;
      const validClassMap = {};
      Object.entries(classMap).forEach(([cid, tName]) => {
        const rawAbs = dayAbsences?.[p]?.[cid];
        if (rawAbs) {
          const { commonLessonOwnerId } = decodeClassAbsenceValue(rawAbs);
          if (commonLessonOwnerId && !absentIdsForCurrentDay.has(commonLessonOwnerId)) {
            return;
          }
        }
        validClassMap[cid] = tName;
      });
      if (Object.keys(validClassMap).length > 0) {
        filteredDay[p] = validClassMap;
      }
    });

    return { ...commonLessons, [day]: filteredDay };
  }, [commonLessons, day, classAbsence, absentIdsForCurrentDay]);

  const classesForCurrentDay = useMemo(() => {
    const includedIds = new Set();

    const dayFree = filteredClassFree?.[day] || {};
    Object.values(dayFree).forEach((setOrArray) => {
      const ids = setOrArray instanceof Set ? Array.from(setOrArray) : Array.isArray(setOrArray) ? setOrArray : [];
      ids.forEach(id => includedIds.add(id));
    });

    const dayAbsence = filteredClassAbsence?.[day] || {};
    Object.values(dayAbsence).forEach((classMap) => {
      Object.keys(classMap || {}).forEach(id => includedIds.add(id));
    });

    return classes
      .filter(cls => includedIds.has(cls.classId) && !isImesLesson(cls.className))
      .map(cls => ({
        ...cls,
        className: normalizeClassName(cls.className) || cls.className,
      }));
  }, [classes, filteredClassFree, filteredClassAbsence, day]);

  const freeClassesByDay = useMemo(() => {
    const classById = new Map(classes.map((c) => [c.classId, c]));
    const dayFree = { [day]: {} };

    periods.forEach((p) => {
      const combined = new Set();
      const freeSet = filteredClassFree?.[day]?.[p];
      if (freeSet instanceof Set) {
        freeSet.forEach((cid) => {
          const cls = classById.get(cid);
          if (cls && !isImesLesson(cls.className)) {
            combined.add(cid);
          }
        });
      } else if (Array.isArray(freeSet)) {
        freeSet.forEach((cid) => {
          const cls = classById.get(cid);
          if (cls && !isImesLesson(cls.className)) {
            combined.add(cid);
          }
        });
      }

      const absenceMap = filteredClassAbsence?.[day]?.[p];
      if (absenceMap && typeof absenceMap === 'object') {
        Object.entries(absenceMap).forEach(([classId, rawValue]) => {
          const { absentId, allowDuty } = decodeClassAbsenceValue(rawValue);
          if (!allowDuty) return;
          if (!absentIdsForCurrentDay.has(absentId)) return;
          const cls = classById.get(classId);
          if (cls && !isImesLesson(cls.className)) {
            combined.add(classId);
          }
        });
      }

      dayFree[day][p] = combined;
    });

    return dayFree;
  }, [classes, filteredClassFree, filteredClassAbsence, day, periods, absentIdsForCurrentDay]);



  // Locked state'teki geçersiz teacherId'leri otomatik temizle
  useEffect(() => {
    if (!teachers.length || !locked || Object.keys(locked).length === 0) return;

    const validTeacherIds = new Set(teachers.map(t => t.teacherId));
    const invalidEntries = Object.entries(locked).filter(([, teacherId]) => {
      if (!teacherId) return false;
      if (teacherId === MANUAL_EMPTY_TEACHER_ID || teacherId === MANUAL_ADMIN_TEACHER_ID) return false;
      return !validTeacherIds.has(teacherId);
    });

    if (invalidEntries.length > 0) {
      setLocked(prev => {
        const next = { ...prev };
        invalidEntries.forEach(([key]) => {
          delete next[key];
        });
        return next;
      });

      const sampleName = invalidEntries
        .map(([, tid]) => teacherMap.get(tid)?.teacherName)
        .filter(Boolean)[0];
      const message =
        invalidEntries.length === 1 && sampleName
          ? `${sampleName} için geçersiz kilit temizlendi`
          : `${invalidEntries.length} geçersiz öğretmen kilidi temizlendi`;
      addNotification({
        message,
        type: 'info',
        duration: 4000
      });
    }
  }, [teachers, locked, addNotification, teacherMap]); // teachers veya kilitler değiştiğinde çalışır

  // Gün değiştiğinde, o güne ait geçersiz locked kayıtlarını temizle
  useEffect(() => {
    if (!locked || Object.keys(locked).length === 0) return;
    if (!teachers.length) return;

    const validTeacherIds = new Set(teachers.map(t => t.teacherId));
    // Seçili güne ait tüm locked kayıtlarını bul
    const dayEntries = Object.entries(locked).filter(([key]) => {
      return key.startsWith(`${day}|`);
    });

    // Geçersiz teacherId'ye sahip olanları bul
    const invalidDayEntries = dayEntries.filter(([, teacherId]) => {
      if (!teacherId) return false;
      if (teacherId === MANUAL_EMPTY_TEACHER_ID || teacherId === MANUAL_ADMIN_TEACHER_ID) return false;
      return !validTeacherIds.has(teacherId);
    });

    if (invalidDayEntries.length > 0) {
      setLocked(prev => {
        const next = { ...prev };
        invalidDayEntries.forEach(([key]) => {
          delete next[key];
        });
        return next;
      });

      // Sadece kullanıcıya bildirim göster, çok fazla bildirim olmasın
      const invalidTeacherIds = invalidDayEntries.map(([, tid]) => tid).join(', ');
      logger.log(`Gün değişti (${day}): ${invalidDayEntries.length} geçersiz locked kayıt temizlendi:`, invalidTeacherIds);
    }
  }, [day, teachers, locked]); // day, teachers veya kilitler değiştiğinde çalışır

  // Gün veya görev listesi değiştiğinde, o güne ait kilitleri ve teacherFree setlerini aktif nöbetçilere göre temizle
  useEffect(() => {
    if (!hydratedRef.current) return;

    const activeTeacherIds = new Set(
      (teachersForCurrentDay || [])
        .map(t => t?.teacherId)
        .filter(Boolean)
    );

    // Kilitli kayıtları temizle
    const removedLocks = [];
    setLocked(prev => {
      if (!prev || typeof prev !== 'object') return prev;

      let changed = false;
      const next = { ...prev };

      Object.entries(prev).forEach(([key, teacherId]) => {
        if (!teacherId) return;
        if (teacherId === MANUAL_EMPTY_TEACHER_ID || teacherId === MANUAL_ADMIN_TEACHER_ID) return;
        if (!key.startsWith(`${day}|`)) return;
        if (activeTeacherIds.has(teacherId)) return;

        delete next[key];
        removedLocks.push({ key, teacherId });
        changed = true;
      });

      return changed ? next : prev;
    });

    // teacherFree setlerinden aktif olmayan öğretmenleri çıkar
    setTeacherFree(prev => {
      if (!prev || typeof prev !== 'object') return prev;

      let changed = false;
      const next = { ...prev };

      (periods || []).forEach(period => {
        const prevSet = prev[period] instanceof Set
          ? prev[period]
          : new Set(Array.isArray(prev[period]) ? prev[period] : []);

        const filtered = new Set(
          Array.from(prevSet).filter(tid => activeTeacherIds.has(tid))
        );

        if (filtered.size !== prevSet.size) {
          next[period] = filtered;
          changed = true;
        }
      });

      return changed ? next : prev;
    });

    if (removedLocks.length > 0) {
      const dayLabel = DAYS.find(d => d.key === day)?.label || day;
      addNotification({
        message: `${removedLocks.length} kilitli atama ${dayLabel} gününde aktif olmayan nöbetçilerden temizlendi`,
        type: 'info',
        duration: 2500
      });
    }
  }, [day, periods, teachersForCurrentDay, addNotification]);

  // Boş/mazeretli olmayan veya ortak ders bulunmayan sınıflara ait yetim kilitleri otomatik temizle
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!locked || Object.keys(locked).length === 0) return;

    const dayLocks = Object.entries(locked).filter(([k]) => k.startsWith(`${day}|`));
    if (dayLocks.length === 0) return;

    const dayFree = freeClassesByDay?.[day] || {};
    const dayCommon = commonLessons?.[day] || {};

    const orphanLocks: { key: string; period: string | number; classId: string }[] = [];

    dayLocks.forEach(([key]) => {
      const parts = key.split('|');
      if (parts.length < 3) return;
      const period = parts[1];
      const classId = parts[2];

      const periodFreeSet = dayFree[period];
      const isFree = periodFreeSet instanceof Set
        ? periodFreeSet.has(classId)
        : Array.isArray(periodFreeSet)
          ? periodFreeSet.includes(classId)
          : false;

      const isCommon = Boolean(dayCommon?.[period]?.[classId]);

      if (!isFree && !isCommon) {
        orphanLocks.push({ key, period, classId });
      }
    });

    if (orphanLocks.length > 0) {
      setLocked(prev => {
        const next = { ...prev };
        orphanLocks.forEach(({ key }) => {
          delete next[key];
        });
        return next;
      });

      orphanLocks.forEach(({ period, classId }) => {
        upsertLock({ day, period: Number(period), classId, teacherId: null }).catch(err => {
          logger.error('Orphan lock cleanup error:', err);
        });
      });
    }
  }, [day, locked, freeClassesByDay, commonLessons]);

  const { schedule: rawAssignment } = useMemo(
    () =>
      assignDuties({
        teachers: teachersForCurrentDay,
        freeTeachers: freeTeachersByDay,
        classes,
        freeClasses: freeClassesByDay,
        locked,
        options,
        commonLessons: filteredCommonLessons,
        classLocations,
        locationZoneMapping,
        absentPeople: absentPeopleForCurrentDay,
      }),
    [teachersForCurrentDay, classes, freeTeachersByDay, freeClassesByDay, options, locked, filteredCommonLessons, classLocations, locationZoneMapping, absentPeopleForCurrentDay]
  );
  const assignment = useMemo(
    () => applyFairnessAdjustments({
      baseSchedule: rawAssignment,
      day,
      periods,
      classes,
      teachersForCurrentDay,
      freeTeachersByDay,
      freeClassesByDay,
      commonLessons: filteredCommonLessons,
      locked,
      options,
      teacherMap,
      classLocations,
      locationZoneMapping,
      absentPeople: absentPeopleForCurrentDay,
    }),
    [rawAssignment, day, periods, classes, teachersForCurrentDay, freeTeachersByDay, freeClassesByDay, filteredCommonLessons, locked, options, teacherMap, classLocations, locationZoneMapping, absentPeopleForCurrentDay]
  );

  const unassignedForSelectedDay = useMemo(() => {
    const items = [];
    const dayFree = freeClassesByDay?.[day] || {};
    const dayAssignment = assignment?.[day] || {};

    periods.forEach((period) => {
      const baseSet = dayFree?.[period];
      const needed = baseSet instanceof Set
        ? new Set(baseSet)
        : new Set(Array.isArray(baseSet) ? baseSet : []);

      (dayAssignment?.[period] || []).forEach(({ classId }) => needed.delete(classId));

      needed.forEach((classId) => {
        const lockKey = `${day}|${period}|${classId}`;
        const lockValue = locked?.[lockKey];
        if (lockValue === MANUAL_ADMIN_TEACHER_ID) {
          return;
        }

        const cls = classes.find((c) => c.classId === classId);

        // Ortak ders / grup birleştirme olan dersler diğer grup öğretmeniyle devam eder, nöbetçi atanması gerekmez
        if (filteredCommonLessons?.[day]?.[period]?.[classId]) {
          return;
        }

        items.push({
          period,
          classId,
          className: cls?.className || classId,
        });
      });
    });

    return items.sort(
      (a, b) =>
        a.period - b.period ||
        (a.className || '').localeCompare(b.className || '', 'tr', { sensitivity: 'base' })
    );
  }, [assignment, freeClassesByDay, day, classes, periods, locked, filteredCommonLessons]);

  useEffect(() => {
    const todaysAbsents = Array.isArray(absentPeopleForCurrentDay) ? absentPeopleForCurrentDay : [];
    if (todaysAbsents.length === 0) return;

    const dayAssignments = assignment?.[day] || {};
    const maxPerSlot = Number.parseInt(options?.maxClassesPerSlot, 10) || 1;

    const teacherDailyLoad = {};
    const slotUsage = {};
    Object.entries(dayAssignments).forEach(([periodKey, rows]) => {
      const periodNum = Number(periodKey);
      (rows || []).forEach(({ teacherId }) => {
        if (!teacherId) return;
        teacherDailyLoad[teacherId] = (teacherDailyLoad[teacherId] || 0) + 1;
        if (!slotUsage[periodNum]) slotUsage[periodNum] = {};
        slotUsage[periodNum][teacherId] = (slotUsage[periodNum][teacherId] || 0) + 1;
      });
    });

    const absentNameSet = new Set(
      todaysAbsents
        .map((person) => normalizeForComparison(person?.name || ''))
        .filter(Boolean),
    );

    const availableByPeriod = freeTeachersByDay?.[day] || {};
    const teacherNameById = new Map((teachersForCurrentDay || []).map((item) => [item.teacherId, item.teacherName]));

    todaysAbsents.forEach((person) => {
      const absentId = person?.absentId;
      if (!absentId || alertedAbsentIdsRef.current.has(absentId)) return;

      alertedAbsentIdsRef.current.add(absentId);
      const absentNameKey = normalizeForComparison(person?.name || '');
      const impacted = [];

      Object.entries(dayAssignments).forEach(([periodKey, rows]) => {
        const periodNum = Number(periodKey);
        (rows || []).forEach(({ classId, teacherId }) => {
          const teacherName = teacherNameById.get(teacherId) || '';
          if (!teacherName) return;
          if (normalizeForComparison(teacherName) !== absentNameKey) return;

          const className = classes.find((item) => item.classId === classId)?.className || classId;
          const freeSet = availableByPeriod?.[periodNum] instanceof Set
            ? availableByPeriod[periodNum]
            : new Set(Array.isArray(availableByPeriod?.[periodNum]) ? availableByPeriod[periodNum] : []);

          const alternatives = Array.from(freeSet)
            .filter((candidateId) => {
              if (!candidateId || candidateId === teacherId) return false;
              if ((slotUsage?.[periodNum]?.[candidateId] || 0) >= maxPerSlot) return false;
              const candidateName = teacherNameById.get(candidateId);
              if (!candidateName) return false;
              return !absentNameSet.has(normalizeForComparison(candidateName));
            })
            .sort((a, b) => (teacherDailyLoad[a] || 0) - (teacherDailyLoad[b] || 0))
            .slice(0, 3)
            .map((candidateId) => teacherNameById.get(candidateId) || candidateId);

          impacted.push({ period: periodNum, className, alternatives });
        });
      });

      if (impacted.length === 0) return;

      const preview = impacted
        .slice(0, 2)
        .map((item) => `${item.period}. saat ${item.className}: ${item.alternatives.length ? item.alternatives.join(', ') : 'öneri bulunamadı'}`)
        .join(' | ');

      addNotification({
        message: `${person.name || 'Öğretmen'} devamsızlığı eklendi. Hızlı yeniden atama önerisi: ${preview}`,
        type: 'warning',
        duration: 9000,
        actionLabel: 'Planlamayı Aç',
        onAction: () => setActiveSection('schedule'),
      });
    });
  }, [
    absentPeopleForCurrentDay,
    assignment,
    day,
    options,
    freeTeachersByDay,
    teachersForCurrentDay,
    classes,
    addNotification,
    setActiveSection,
  ]);

  const assignmentInsights = useMemo(() => {
    const summary = {
      coverageByPeriod: [],
      teacherSummaries: [],
    }

    const assignmentsForDay = assignment?.[day] || {}
    const dayClassFree = classFree?.[day] || {}
    const maxPerSlot = Number.parseInt(options?.maxClassesPerSlot, 10) || 1
    const preventConsecutive = !!options?.preventConsecutive
    const teacherAssignmentCount = {}
    const teacherAssignmentDetails = {}
    const slotUsage = {}

    periods.forEach((period) => {
      const rows = assignmentsForDay[period] || []
      rows.forEach(({ teacherId, classId }) => {
        teacherAssignmentCount[teacherId] = (teacherAssignmentCount[teacherId] || 0) + 1
        if (!teacherAssignmentDetails[teacherId]) {
          teacherAssignmentDetails[teacherId] = []
        }
        const className = classes.find((c) => c.classId === classId)?.className || classId
        teacherAssignmentDetails[teacherId].push({ period, classId, className })
        if (!slotUsage[period]) slotUsage[period] = {}
        slotUsage[period][teacherId] = (slotUsage[period][teacherId] || 0) + 1
      })
    })

    summary.coverageByPeriod = periods.map((period) => {
      const rawSet = dayClassFree?.[period]
      const requiredSet = rawSet instanceof Set ? new Set(rawSet) : new Set(Array.isArray(rawSet) ? rawSet : [])
      const assigned = (assignmentsForDay[period] || []).length
      const lockedCount = Object.keys(locked || {}).filter((key) => {
        if (!key.startsWith(`${day}|${period}|`)) return false;
        const v = (locked || {})[key];
        return v === MANUAL_EMPTY_TEACHER_ID || v === MANUAL_ADMIN_TEACHER_ID;
      }).length
      const remainingClassIds = new Set(requiredSet)
        ; (assignmentsForDay[period] || []).forEach(({ classId }) => remainingClassIds.delete(classId))
      const remainingClasses = Array.from(remainingClassIds).map((classId) => {
        const cls = classes.find((c) => c.classId === classId)
        return cls?.className || classId
      })
      return {
        period,
        assigned,
        required: requiredSet.size,
        lockedCount,
        remainingClasses,
      }
    })

    summary.teacherSummaries = teachers.map((teacher) => {
      const teacherId = teacher.teacherId
      const assignmentsForTeacher = teacherAssignmentDetails[teacherId] || []
      const reasons = []
      periods.forEach((period) => {
        const freeSet = teacherFree?.[period] instanceof Set
          ? teacherFree[period]
          : new Set(Array.isArray(teacherFree?.[period]) ? teacherFree[period] : [])
        if (!freeSet.has(teacherId)) return

        const assignedHere = (assignmentsForDay[period] || []).some((item) => item.teacherId === teacherId)
        if (assignedHere) return

        const classesNeedingSet = dayClassFree?.[period] instanceof Set
          ? new Set(dayClassFree[period])
          : new Set(Array.isArray(dayClassFree?.[period]) ? dayClassFree[period] : [])
          ; (assignmentsForDay[period] || []).forEach(({ classId }) => classesNeedingSet.delete(classId))
        const classesNeeding = Array.from(classesNeedingSet)

        if (classesNeeding.length === 0) {
          reasons.push({
            period,
            message: 'Bu saatte görev bekleyen sınıf yok.',
          })
          return
        }

        if ((teacherAssignmentCount[teacherId] || 0) >= (teacher.maxDutyPerDay ?? 6)) {
          reasons.push({
            period,
            message: 'Günlük görev limiti dolduğu için görevlendirilmedi.',
          })
          return
        }

        const slotCount = slotUsage[period]?.[teacherId] || 0
        if (slotCount >= maxPerSlot) {
          reasons.push({
            period,
            message: `Aynı saatte en fazla ${maxPerSlot} görev sınırına ulaştı.`,
          })
          return
        }

        if (preventConsecutive) {
          const prevAssigned = (assignmentsForDay[period - 1] || []).some((item) => item.teacherId === teacherId)
          const nextAssigned = (assignmentsForDay[period + 1] || []).some((item) => item.teacherId === teacherId)
          if (prevAssigned || nextAssigned) {
            reasons.push({
              period,
              message: 'Ardışık saat engeli nedeniyle görevlendirilmedi.',
            })
            return
          }
        }

        const lockedForClasses = classesNeeding.filter((classId) => {
          const lockKey = `${day}|${period}|${classId}`
          const lockedTeacher = locked?.[lockKey]
          return lockedTeacher && lockedTeacher !== teacherId
        })
        if (lockedForClasses.length === classesNeeding.length) {
          reasons.push({
            period,
            message: 'İlgili sınıflar başka öğretmen için kilitlenmiş.',
          })
          return
        }

        const classNameList = classesNeeding
          .map((classId) => classes.find((c) => c.classId === classId)?.className || classId)
          .slice(0, 3)
        reasons.push({
          period,
          message: `Adil dağılım nedeniyle diğer öğretmenlere öncelik verildi.${classNameList.length ? ` (${classNameList.join(', ')} sınıfı)` : ''}`,
        })
      })

      return {
        teacher,
        assignments: assignmentsForTeacher,
        unassignedReasons: reasons,
      }
    })

    return summary
  }, [assignment, day, teachers, classes, classFree, teacherFree, locked, options, periods])

  const balanceReport = useMemo(() => {
    const teacherList = Array.isArray(teachersForCurrentDay) ? teachersForCurrentDay : [];
    if (teacherList.length === 0) {
      return { overall: { fairnessScore: 100 }, perTeacher: [] };
    }

    const dayKeyToLabel = new Map((DAYS || []).map((item) => [item.key, item.label]));
    const dayKeys = Array.from(dayKeyToLabel.keys());
    const totalByTeacher = {};
    const byTeacherByDay = {};

    Object.entries(assignment || {}).forEach(([dayKey, periodsMap]) => {
      Object.values(periodsMap || {}).forEach((rows) => {
        (rows || []).forEach(({ teacherId }) => {
          if (!teacherId) return;
          totalByTeacher[teacherId] = (totalByTeacher[teacherId] || 0) + 1;
          if (!byTeacherByDay[teacherId]) byTeacherByDay[teacherId] = {};
          byTeacherByDay[teacherId][dayKey] = (byTeacherByDay[teacherId][dayKey] || 0) + 1;
        });
      });
    });

    const loads = teacherList.map((teacher) => totalByTeacher[teacher.teacherId] || 0);
    const avg = loads.length > 0 ? loads.reduce((sum, value) => sum + value, 0) / loads.length : 0;
    const variance = loads.length > 0
      ? loads.reduce((sum, value) => sum + ((value - avg) ** 2), 0) / loads.length
      : 0;
    const stdDev = Math.sqrt(variance);
    const overallFairnessScore = avg > 0 ? Math.max(0, Math.min(100, 100 - ((stdDev / avg) * 100))) : 100;

    const perTeacher = teacherList
      .map((teacher) => {
        const weeklyLoad = totalByTeacher[teacher.teacherId] || 0;
        const monthlyLoad = weeklyLoad * 4;
        const personalFairness = avg > 0
          ? Math.max(0, Math.min(100, 100 - ((Math.abs(weeklyLoad - avg) / avg) * 100)))
          : 100;

        const dayBreakdown = dayKeys.map((dayKey) => ({
          dayKey,
          dayLabel: dayKeyToLabel.get(dayKey) || dayKey,
          count: byTeacherByDay?.[teacher.teacherId]?.[dayKey] || 0,
        }));

        return {
          teacherId: teacher.teacherId,
          teacherName: teacher.teacherName,
          weeklyLoad,
          monthlyLoad,
          fairnessScore: personalFairness,
          dayBreakdown,
        };
      })
      .sort((a, b) => b.weeklyLoad - a.weeklyLoad || a.teacherName.localeCompare(b.teacherName, 'tr'));

    return {
      overall: {
        fairnessScore: overallFairnessScore,
        averageWeeklyLoad: avg,
      },
      perTeacher,
    };
  }, [assignment, teachersForCurrentDay])

  const dropAssign = useCallback(({ day, period, fromClassId, toClassId, teacherId }) => {
    if (!teacherId || !toClassId) return

    const teacher = teachers.find((t) => t.teacherId === teacherId)
    const toClass = classes.find((c) => c.classId === toClassId)

    setLocked(prev => {
      recordHistory(prev)
      const next = { ...prev }
      const toKey = `${day}|${period}|${toClassId}`

      if (fromClassId) {
        const fromKey = `${day}|${period}|${fromClassId}`
        if (next[fromKey] === teacherId) {
          delete next[fromKey]
          upsertLock({ day, period, classId: fromClassId, teacherId: null }).catch(err =>
            logger.error('Lock remove error:', err)
          )
        }
      } else {
        const prefix = `${day}|${period}|`
        const existingKeys = Object.keys(next).filter(key => key.startsWith(prefix) && next[key] === teacherId)
        existingKeys.forEach(k => {
          delete next[k]
          const [, , removedCid] = k.split('|')
          upsertLock({ day, period, classId: removedCid, teacherId: null }).catch(err =>
            logger.error('Lock remove error:', err)
          )
        })
      }

      next[toKey] = teacherId

      upsertLock({ day, period, classId: toClassId, teacherId }).catch(err =>
        logger.error('Lock upsert error:', err)
      )
      return next
    })

    const dayLabel = DAYS.find((d) => d.key === day)?.label || day
    const classLabel = toClass?.className || 'Sınıf'
    const teacherLabel = teacher?.teacherName || 'Öğretmen'
    addNotification({
      message: `${teacherLabel}, ${dayLabel} ${period}. saatte ${classLabel} sınıfına atandı`,
      type: 'success',
      duration: 2200,
    })
  }, [addNotification, classes, teachers])

  const handleManualAssign = useCallback(({ day, period, classId, teacherId }) => {
    if (!teacherId || !classId) {
      addNotification({
        message: 'Geçerli bir öğretmen seçin.',
        type: 'warning',
        duration: 2000,
      })
      return
    }
    dropAssign({ day, period, fromClassId: null, toClassId: classId, teacherId })
  }, [dropAssign, addNotification])

  const handleManualClear = useCallback(({ day, period, classId }) => {
    const key = `${day}|${period}|${classId}`
    const cls = classes.find((c) => c.classId === classId)
    const classLabel = cls?.className || 'Sınıf'
    const dayLabel = DAYS.find((d) => d.key === day)?.label || day

    setLocked((prev) => {
      recordHistory(prev)
      if (prev?.[key] === MANUAL_EMPTY_TEACHER_ID) {
        return prev
      }
      const next = { ...(prev || {}) }
      next[key] = MANUAL_EMPTY_TEACHER_ID
      return next
    })

    upsertLock({ day, period, classId, teacherId: MANUAL_EMPTY_TEACHER_ID }).catch((err) =>
      logger.error('Manual empty upsert error:', err)
    )
    addNotification({
      message: `${dayLabel} ${period}. saat için ${classLabel} atama yapılmadı olarak ayarlandı`,
      type: 'info',
      duration: 2200,
    })
  }, [classes, addNotification, recordHistory])

  const handleManualSetAdmin = useCallback(({ day, period, classId }) => {
    const key = `${day}|${period}|${classId}`
    const cls = classes.find((c) => c.classId === classId)
    const classLabel = cls?.className || 'Sınıf'
    const dayLabel = DAYS.find((d) => d.key === day)?.label || day

    setLocked((prev) => {
      recordHistory(prev)
      if (prev?.[key] === MANUAL_ADMIN_TEACHER_ID) {
        return prev
      }
      const next = { ...(prev || {}) }
      next[key] = MANUAL_ADMIN_TEACHER_ID
      return next
    })

    upsertLock({ day, period, classId, teacherId: MANUAL_ADMIN_TEACHER_ID }).catch((err) =>
      logger.error('Manual admin upsert error:', err)
    )
    addNotification({
      message: `${dayLabel} ${period}. saat için ${classLabel} idare kontrolüne alındı`,
      type: 'info',
      duration: 2200,
    })
  }, [classes, addNotification, recordHistory])

  const handleManualRelease = useCallback(({ day, period, classId }) => {
    const key = `${day}|${period}|${classId}`
    const cls = classes.find((c) => c.classId === classId)
    const classLabel = cls?.className || 'Sınıf'
    const dayLabel = DAYS.find((d) => d.key === day)?.label || day

    setLocked((prev) => {
      recordHistory(prev)
      if (!prev || !prev[key]) {
        return prev
      }
      const next = { ...prev }
      delete next[key]
      return next
    })

    upsertLock({ day, period, classId, teacherId: null }).catch((err) =>
      logger.error('Manual release error:', err)
    )
    addNotification({
      message: `${dayLabel} ${period}. saatteki ${classLabel} görevi yeniden otomatik plana bırakıldı`,
      type: 'success',
      duration: 2200,
    })
  }, [classes, addNotification, recordHistory])

  // JPEG export — usePdfExport hook'una taşındı
  const { exportJPG } = usePdfExport({ day, displayDate, addNotification });

  /* ================================ Render ================================ */

  useEffect(() => {
    const onKey = (e) => {
      const isCtrlP = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p';
      if (isCtrlP) {
        e.preventDefault();
        setActiveSection('outputs');
        setTimeout(() => window.print(), 50);
        return;
      }

      if (activeSection === 'schedule') {
        const isCtrlZ = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey;
        const isCtrlY = (e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey));
        if (isCtrlZ) {
          e.preventDefault();
          undo();
        } else if (isCtrlY) {
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setActiveSection, activeSection, undo, redo]);

  const hasOpenModal =
    modals.teacher ||
    modals.class ||
    modals.absent ||
    modals.zone ||
    modals.commonLesson ||
    modals.dutyTeacherExcel ||
    confirmationModal.isOpen ||
    excelReplaceModal.isOpen ||
    teacherScheduleReplaceModal.isOpen ||
    pdfImportModal ||
    selectedTeacher !== null

  return (
    <div className="wrap">
      <ModernNotificationSystem notifications={notifications} onRemove={removeNotification} onAction={onNotificationAction} />

      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        day={day}
        handleDayChange={handleDayChange}
        weekOffset={weekOffset}
        goToNextWeek={goToNextWeek}
        goToPrevWeek={goToPrevWeek}
        goToCurrentWeek={goToCurrentWeek}
      />

      {/* Sekmeler */}
      <Tabs
        active={activeSection}
        onChange={setActiveSection}
        items={[
          { key: "courseSchedule", label: "Öğretmen Ders Programı", icon: "bookOpen", group: "Veri" },
          { key: "classSchedules", label: "Sınıf Programları", icon: "bookOpen", group: "Veri" },
          { key: "teachers", label: "Nöbetçi Öğretmenler", icon: "users", group: "Veri" },
          { key: "dutyZones", label: "Nöbet Yerleri", icon: "mapPin", group: "Veri" },
          
          { key: "absents", label: "Okula Gelemeyenler", icon: "userX", group: "Planlama" },
          { key: "classes", label: "Sınıflar", icon: "home", group: "Planlama" },
          { key: "schedule", label: "Planlama", icon: "calendar", group: "Planlama" },
          
          { key: "outputs", label: "Çıktılar", icon: "printer", group: "Çıktı" }
        ]}
        IconComponent={Icon}
      />

      <main className="content">
        {activeSection === "teachers" && (
          <TeachersSection
            teachers={teachers}
            teachersForCurrentDay={teachersForCurrentDay}
            periods={periods}
            teacherFree={teacherFree}
            options={options}
            onOptionChange={handleOptionChange}
            dayOptions={DAYS}
            onToggleTeacherFree={toggleTeacherFree}
            onToggleAllTeachersFree={setAllTeachersFree}
            onSetTeacherPeriodsFree={setTeacherPeriodsFree}
            onDeleteTeacher={deleteTeacher}
            onEditTeacher={(teacher) => setEditingTeacher(teacher)}
            onOpenDutyTeacherExcelModal={handleOpenDutyTeacherExcelModal}
            onOpenPdfImport={() => setPdfImportModal(true)}
            onOpenAddTeacherModal={() => setModals((m) => ({ ...m, teacher: true }))}
            onDeletePdfTeachers={deleteAllPdfTeachers}
            onDeleteAllTeachers={deleteAllTeachers}
            IconComponent={Icon}
            day={day}
          />
        )}

        <Suspense fallback={null}>
          {activeSection === "courseSchedule" && (
            <CourseScheduleSection
              uploadInputId="teacher-schedule-upload-direct"
              onUpload={handleTeacherScheduleUpload}
              teacherSchedulesList={teacherSchedulesList}
              onDeleteAllSchedules={deleteAllTeacherSchedules}
              onOpenTeacherSchedule={openTeacherSchedule}
              IconComponent={Icon}
            />
          )}

          {activeSection === "classSchedules" && (
            <ClassSchedulesSection
              classes={classes}
              teacherSchedules={teacherSchedules}
              teachers={teachers}
              IconComponent={Icon}
              onUploadSinifProgrami={handleSinifProgramiUpload}
              classLocations={classLocations}
              onDeleteAll={handleDeleteAllClassLocations}
              onDeriveFromTeachers={handleDeriveClassSchedulesFromTeachers}
            />
          )}

          {activeSection === "classes" && (
            <ClassesSection
              classes={classes}
              classesForCurrentDay={classesForCurrentDay}
              periods={periods}
              classFreeForCurrentDay={filteredClassFree}
              absentPeopleForCurrentDay={absentPeopleForCurrentDay}
              filteredClassAbsence={filteredClassAbsence}
              commonLessons={filteredCommonLessons}
              day={day}
              onToggleClassFree={toggleClassFree}
              onSetAllClassesFree={setAllClassesFree}
              onSelectAbsence={handleSelectAbsence}
              onOpenCommonLessonModal={(slotDay, period, classId) =>
                handleOpenCommonLessonModal(slotDay, period, classId)
              }
              onDeleteClass={deleteClass}
              teachers={teachers}
              onAddClass={() => setModals((m) => ({ ...m, class: true }))}
              onDeleteAllClasses={deleteAllClasses}
              classLocations={classLocations}
              IconComponent={Icon}
            />
          )}

          {activeSection === "dutyZones" && (
            <DutyZonesSection
              dutyZones={dutyZones}
              IconComponent={Icon}
              classLocations={classLocations}
              locationZoneMapping={locationZoneMapping}
              setLocationZoneMapping={setLocationZoneMapping}
              onSaveLocationZoneMapping={() => saveLocationZoneMapping(locationZoneMapping)}
              onAddZone={() => setModals((m) => ({ ...m, zone: true }))}
              onDeleteZone={deleteZone}
              onUpdateZone={updateZone}
            />
          )}

          {activeSection === "absents" && (
            <AbsentsSection
              absentPeople={absentPeople}
              absentPeopleForCurrentDay={absentPeopleForCurrentDay}
              onAddAbsent={() => setModals((m) => ({ ...m, absent: true }))}
              onDeleteAbsent={deleteAbsent}
              onDeleteAllAbsents={deleteAllAbsents}
              IconComponent={Icon}
              teacherSchedules={teacherSchedules}
              classLocations={classLocations}
            />
          )}

          {activeSection === "schedule" && (
            <ScheduleSection
              day={day}
              periods={periods}
              classesForCurrentDay={classesForCurrentDay}
              teachersForCurrentDay={teachersForCurrentDay}
              freeTeachersByDay={freeTeachersByDay}
              freeClassesByDay={freeClassesByDay}
              assignment={assignment}
              locked={locked}
              options={options}
              assignmentInsights={assignmentInsights}
              balanceReport={balanceReport}
              unassignedForSelectedDay={unassignedForSelectedDay}
              commonLessons={filteredCommonLessons}
              classes={classes}
              classLocations={classLocations}
              locationZoneMapping={locationZoneMapping}
              teacherSchedules={teacherSchedules}
              IconComponent={Icon}
              onOptionChange={handleOptionChange}
              onSetAllTeachersMaxDuty={setAllTeachersMaxDuty}
              onDropAssign={dropAssign}
              onManualAssign={handleManualAssign}
              onManualClear={handleManualClear}
              onManualSetAdmin={handleManualSetAdmin}
              onManualRelease={handleManualRelease}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
            />
          )}

          {activeSection === "outputs" && (
            <OutputsSection
              day={day}
              displayDate={displayDate}
              periods={periods}
              assignment={assignment}
              locked={locked}
              teachersForCurrentDay={teachersForCurrentDay}
              classes={classes}
              classAbsence={classAbsence}
              filteredClassAbsence={filteredClassAbsence}
              absentPeopleForCurrentDay={absentPeopleForCurrentDay}
              commonLessons={commonLessons}
              classLocations={classLocations}
              locationZoneMapping={locationZoneMapping}
              teacherSchedules={teacherSchedules}
              onExportJPG={exportJPG}
              onPrint={() => window.print()}
              IconComponent={Icon}
            />
          )}
        </Suspense>
      </main>

      {hasOpenModal && (
        <Suspense fallback={null}>
          <GlobalModals
            modals={modals}
            setModals={setModals}
            addTeacher={addTeacher}
            addClass={addClass}
            addAbsent={addAbsent}
            addZone={addZone}
            day={day}
            DAYS={DAYS}
            currentDateFormatted={activeDateFormatted}
            currentDateKey={activeDateKey}
            currentWeekKey={activeWeekKey}
            scheduledTeacherOptions={scheduledTeacherOptions}
            handleCloseCommonLessonModal={handleCloseCommonLessonModal}
            handleSetCommonLesson={handleSetCommonLesson}
            handleSelectAbsence={handleSelectAbsence}
            currentCommonLesson={currentCommonLesson}
            commonLessons={commonLessons}
            confirmationModal={confirmationModal}
            setConfirmationModal={setConfirmationModal}
            excelReplaceModal={excelReplaceModal}
            handleExcelReplaceCancel={handleExcelReplaceCancel}
            handleExcelReplaceConfirm={handleExcelReplaceConfirm}
            teacherScheduleReplaceModal={teacherScheduleReplaceModal}
            handleTeacherScheduleReplaceCancel={handleTeacherScheduleReplaceCancel}
            handleTeacherScheduleReplaceConfirm={handleTeacherScheduleReplaceConfirm}
            pdfImportModal={pdfImportModal}
            setPdfImportModal={setPdfImportModal}
            loadScheduleFromPDF={loadScheduleFromPDF}
            teachers={teachers}
            classes={classes}
            locked={locked}
            IconComponent={Icon}
            handleCloseDutyTeacherExcelModal={handleCloseDutyTeacherExcelModal}
            loadDutyTeachersFromExcel={loadDutyTeachersFromExcel}
            selectedTeacher={selectedTeacher}
            setSelectedTeacher={setSelectedTeacher}
            teacherSchedulesList={teacherSchedulesList}
            blockedAbsentTeacherNames={blockedAbsentTeacherNames}
            dutyZones={dutyZones}
          />
        </Suspense>
      )}

      {editingTeacher && (
        <EditTeacherModal
          isOpen={!!editingTeacher}
          teacher={editingTeacher}
          dutyZones={dutyZones}
          day={day}
          onClose={() => setEditingTeacher(null)}
          onSubmit={(data) => {
            editTeacher(data.teacherId, data);
            setEditingTeacher(null);
          }}
        />
      )}

      {/* Footer removed as per request */}
    </div>
  );
}
