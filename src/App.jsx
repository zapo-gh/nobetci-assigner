/* global process */
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Header from './containers/Header.jsx';
import Icon from './components/Icon.jsx';
import { PERIODS, DAYS, REAL_DAY_KEYS } from './constants/index.js';
import TeachersSection from './components/TeachersSection.jsx';
import CourseScheduleSection from './components/CourseScheduleSection.jsx';
import ClassesSection from './components/ClassesSection.jsx';
import AbsentsSection from './components/AbsentsSection.jsx';
import ScheduleSection from './components/ScheduleSection.jsx';
import OutputsSection from './components/OutputsSection.jsx';
import GlobalModals from './components/GlobalModals.jsx';
import html2canvas from "html2canvas";
import { assignDuties, MANUAL_EMPTY_TEACHER_ID, applyFairnessAdjustments } from "./utils/assignDuty.js";
import { logger } from "./utils/logger.js";
import { normalizeForComparison } from "./utils/pdfParser.js";
import { parseTeacherSchedulesFromExcel } from "./utils/teacherScheduleExcelParser.js";
import {
  dateForSelectedDay,
  formatTRDate,
  validateTeacherData,
  validateClassData,
  mapSetToArray,
  arrayToSetMap,
  PERIODS as HELPER_PERIODS,
  normalizeClassLabel,
} from "./utils/helpers.js";
import "./styles.css";
import styles from './components/Tabs.module.css'; // Tabs.module.css dosyasını import et
import { APP_ENV, getAssetUrl } from './config/index.js';
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
  upsertTeacherFree,
  upsertClassAbsence,
  upsertLock,
  replacePdfSchedule,
  saveTeacherSchedules,
  clearTeacherSchedules,
  saveCommonLessons,
  bulkSaveClassFree,
  bulkSaveClassAbsence,
  TEACHER_SCHEDULES_SNAPSHOT_KEY,
} from './services/supabaseDataService.js';
import { smartPolling } from './services/smartPolling.js';
import { useUI } from './hooks/useUI.js';
import { useDutyTeacherFilter } from './hooks/useDutyTeacherFilter.js';
import {
  useFreeTeachersByDay,
  useClassFreeForDay,
  useFilteredClassAbsence,
} from './hooks/useDerivedAvailability.js';
import { useAbsentManager } from './hooks/useAbsentManager.js';
import { useBulkDeleteActions } from './hooks/useBulkDeleteActions.js';
import {
  COMMON_LESSON_LABEL,
  encodeClassAbsenceValue,
  decodeClassAbsenceValue,
} from './utils/classAbsence.js';

import Tabs from "./components/Tabs.jsx";
import ModernNotificationSystem from "./components/ModernNotificationSystem.jsx";
import AddTeacherModal from "./components/AddTeacherModal.jsx";
import AddClassModal from "./components/AddClassModal.jsx";
import AddAbsentModal from "./components/AddAbsentModal.jsx";
import CommonLessonModal from "./components/CommonLessonModal.jsx";

import ConfirmationModal from "./components/ConfirmationModal.jsx";
import PdfScheduleImportModal from "./components/PdfScheduleImportModal.jsx";
// Sekme state'leri eksik, ekliyoruz
//const [activeSection, setActiveSection] = useState("teachers");


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

const DISABLE_LOCAL_STORAGE = true;
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

const SMART_POLLING_ENABLED = false;
const SMART_POLLING_TABLES = Object.freeze({
  absents: true,
  class_free: true,
  class_absence: true,
  common_lessons: true,
});
const CURRENT_BUILD_VERSION = APP_ENV.buildVersion || 'dev';
const VERSION_RELOAD_STORAGE_KEY = `${APP_ENV.mode || 'development'}_last_version_reload`;
const SHOULD_CHECK_VERSION =
  APP_ENV.isProduction &&
  typeof CURRENT_BUILD_VERSION === 'string' &&
  CURRENT_BUILD_VERSION !== '' &&
  CURRENT_BUILD_VERSION !== 'dev';
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

    if (typeof console !== 'undefined' && isDevEnv) {
      console.warn('Bundle signature detection failed:', err);
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

const getLastReloadedVersion = () => {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem(VERSION_RELOAD_STORAGE_KEY);
  } catch {
    return null;
  }
};

const persistReloadedVersion = (version) => {
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (version) {
      sessionStorage.setItem(VERSION_RELOAD_STORAGE_KEY, version);
    } else {
      sessionStorage.removeItem(VERSION_RELOAD_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
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



function normalizeAbsentPeople(list = [], classAbsence = {}) {
  if (!Array.isArray(list)) return [];

  const validDayKeys = new Set(DAYS.map(d => d.key));
  const usageMap = {};

  if (classAbsence && typeof classAbsence === 'object') {
    Object.entries(classAbsence).forEach(([dayKey, periodObj]) => {
      Object.values(periodObj || {}).forEach(byClass => {
        Object.values(byClass || {}).forEach(absentId => {
          if (!usageMap[absentId]) usageMap[absentId] = new Set();
          usageMap[absentId].add(dayKey);
        });
      });
    });
  }

  return list.map(item => {
    if (!item || typeof item !== 'object') return item;
    const rawDays = Array.isArray(item.days) ? item.days : [];
    let normalizedDays = rawDays.filter(dayKey => validDayKeys.has(dayKey));

    if (normalizedDays.length === 0) {
      const usageDays = usageMap[item.absentId];
      if (usageDays && usageDays.size > 0) {
        normalizedDays = Array.from(usageDays).filter(dayKey => validDayKeys.has(dayKey));
      }
    }

    if (normalizedDays.length === 0) {
      normalizedDays = Array.from(validDayKeys);
    } else {
      normalizedDays = Array.from(new Set(normalizedDays));
    }

    return {
      ...item,
      days: normalizedDays,
    };
  });
}


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
  const currentDay = "Mon"; // Default to Monday for migration

  for (const [period, classData] of Object.entries(oldClassAbsence)) {
    if (typeof classData === 'object') {
      if (!migrated[currentDay]) migrated[currentDay] = {};
      migrated[currentDay][period] = classData;
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
  const {
    day, setDay,
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

  const [periods, setPeriods] = useState(PERIODS);

  const [teachers, setTeachers] = useState([]); // {teacherId, teacherName, maxDutyPerDay}
  const [classes, setClasses] = useState([]); // {classId, className}
  const [teacherFree, setTeacherFree] = useState({}); // {period:Set(teacherId)}
  const [classFree, setClassFree] = useState({}); // {day:{period:Set(classId)}}
  const [absentPeople, setAbsentPeople] = useState([]); // {absentId,name,reason,days}
  const [classAbsence, setClassAbsence] = useState({}); // {day:{period:{classId:absentId}}}
  const [commonLessons, setCommonLessons] = useState({}); // {day:{period:{classId:teacherName}}}
  const [lastCleanupDate, setLastCleanupDate] = useState(() => readStoredCleanupDate());
  const [options, setOptions] = useState({
    preventConsecutive: true,
    maxClassesPerSlot: 1,
    ignoreConsecutiveLimit: false // Ardışık saat sınırını yok sayar (acil durumlar için)
  });
  const [locked, setLocked] = useState({})

  const [notifications, setNotifications] = useState([]);
  const [absenceRefreshState, setAbsenceRefreshState] = useState({
    isRefreshing: false,
    lastRefreshedAt: null,
    error: null,
  });

  const hydratedRef = useRef(false);
  const [pdfSchedule, setPdfSchedule] = useState({})
  const [teacherSchedules, setTeacherSchedules] = useState({}) // Store individual teacher class schedules
  const [teacherSchedulesHydrated, setTeacherSchedulesHydrated] = useState(false)
  const classFreeSnapshotRef = useRef('')
  const classAbsenceSnapshotRef = useRef('')
  const classAbsenceStateRef = useRef({})
  const skipNextSupabaseSaveRef = useRef(false)
  const autoSaveTimeoutRef = useRef(null)
  const isPollingUpdateRef = useRef(false)
  const versionMismatchHandledRef = useRef(false)





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
  }, [normalizeCommonLessonTeacherName]);

  const applySupabaseSnapshot = useCallback(
    (supabaseData, { persistLocal = true } = {}) => {
      if (!supabaseData || typeof supabaseData !== 'object') return;

      isPollingUpdateRef.current = true;
      const releasePollingGuard = () => {
        setTimeout(() => {
          isPollingUpdateRef.current = false;
        }, 150);
      };

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
        setClasses(supabaseData.classes || []);
        setTeacherFree(teacherFreeSets);
        setClassFree(classFreeSets);
        setClassAbsence(classAbsenceMap);
        setAbsentPeople(normalizedAbsents);
        setCommonLessons(sanitizedCommonLessons);
        setLocked(supabaseData.locked || {});
        setPdfSchedule(supabaseData.pdfSchedule || {});

        // Teacher schedules'i yükle - boş olsa bile Supabase'den geldiğini işaretle
        const loadedTeacherSchedules = supabaseData.teacherSchedules || {}
        console.log('[applySupabaseSnapshot] Setting teacher schedules:', {
          count: Object.keys(loadedTeacherSchedules).length,
          keys: Object.keys(loadedTeacherSchedules).slice(0, 5)
        })
        setTeacherSchedules(loadedTeacherSchedules);
        setTeacherSchedulesHydrated(true);

        if (!DISABLE_LOCAL_STORAGE && persistLocal && typeof localStorage !== 'undefined') {
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
        releasePollingGuard();
      }
    },
    [
      day,
      periods,
      options,
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

  // Polling handler for absents
  const handlePollingAbsents = useCallback((data) => {
    if (!Array.isArray(data)) return;
    const normalized = normalizeAbsentPeople(data, classAbsenceStateRef.current || {});
    setAbsentPeople(normalized);
  }, []);

  // Polling handler for class_free
  const handlePollingClassFree = useCallback((data) => {
    if (!Array.isArray(data) || data.length === 0) return;
    // class_free tablosunda tek bir row var, data alanında tüm bilgi
    const dataSnapshot = data[0]?.data || {};
    const serializedIncoming = stableStringify(dataSnapshot);
    if (serializedIncoming === classFreeSnapshotRef.current) {
      return; // Değişiklik yok
    }
    classFreeSnapshotRef.current = serializedIncoming;
    setClassFree(migrateClassFree(dataSnapshot || {}));
  }, []);

  // Polling handler for class_absence
  const handlePollingClassAbsence = useCallback((data) => {
    if (!Array.isArray(data)) return;
    isPollingUpdateRef.current = true;
    const absenceMap = {};
    data.forEach(row => {
      const { day, period, classId, absentId } = row;
      if (!day || !period || !classId) return;
      if (!absenceMap[day]) absenceMap[day] = {};
      if (!absenceMap[day][period]) absenceMap[day][period] = {};
      absenceMap[day][period][classId] = absentId;
    });
    setClassAbsence(absenceMap);
    // Reset flag after state update
    setTimeout(() => {
      isPollingUpdateRef.current = false;
    }, 100);
  }, []);

  // Polling handler for common_lessons
  const handlePollingCommonLessons = useCallback((data) => {
    if (!Array.isArray(data)) return;
    const lessonsMap = {};
    data.forEach(row => {
      const { day, period, class_id, teacher_name } = row;
      if (!day || !period || !class_id || !teacher_name) return;
      if (!lessonsMap[day]) lessonsMap[day] = {};
      if (!lessonsMap[day][period]) lessonsMap[day][period] = {};
      lessonsMap[day][period][class_id] = normalizeCommonLessonTeacherName(teacher_name);
    });
    setCommonLessons(lessonsMap);
  }, [normalizeCommonLessonTeacherName]);

  // handleRealtimeTeacherSchedules removed - now using polling

  // handleRealtimeTeacherSchedules removed - now using polling




  const handleDayChange = useCallback((nextDay) => {
    if (!nextDay || nextDay === day) return;
    setDay(nextDay);
  }, [day, setDay]);

  const toggleToolbar = useCallback(() => {
    setToolbarExpanded(prev => !prev);
  }, [setToolbarExpanded]);




  useEffect(() => {
    classFreeSnapshotRef.current = stableStringify(mapSetToArray(classFree));
  }, [classFree]);

  useEffect(() => {
    classAbsenceStateRef.current = classAbsence;
    classAbsenceSnapshotRef.current = stableStringify(classAbsence);
  }, [classAbsence]);

  useEffect(() => {
    if (!commonLessons || Object.keys(commonLessons).length === 0) return;
    const { map: sanitizedMap, changed } = sanitizeCommonLessonsMap(commonLessons);
    if (!changed) return;
    setCommonLessons(sanitizedMap);
    saveCommonLessons(sanitizedMap).catch(err => logger.error('Common lesson sanitize save error:', err));
  }, [commonLessons, sanitizeCommonLessonsMap, setCommonLessons]);


  const smartPollingCallbacks = useMemo(() => {
    const callbacks = {};
    if (SMART_POLLING_TABLES.absents) callbacks.absents = handlePollingAbsents;
    if (SMART_POLLING_TABLES.class_free) callbacks.class_free = handlePollingClassFree;
    if (SMART_POLLING_TABLES.class_absence) callbacks.class_absence = handlePollingClassAbsence;
    if (SMART_POLLING_TABLES.common_lessons) callbacks.common_lessons = handlePollingCommonLessons;
    return callbacks;
  }, [handlePollingAbsents, handlePollingClassFree, handlePollingClassAbsence, handlePollingCommonLessons]);


  useEffect(() => {
    if (!SMART_POLLING_ENABLED) {
      logger.info('[SmartPolling] Disabled via SMART_POLLING_ENABLED flag');
      return undefined;
    }

    const callbackEntries = Object.entries(smartPollingCallbacks);
    if (callbackEntries.length === 0) {
      logger.info('[SmartPolling] No tables configured for polling');
      return undefined;
    }

    // Smart Polling subscription (sadece mazeret işlemleriyle ilişkili tablolar)
    const unsubscribePolling = smartPolling.start(Object.fromEntries(callbackEntries));

    return () => {
      if (typeof unsubscribePolling === 'function') {
        unsubscribePolling();
      }
    };
  }, [smartPollingCallbacks]);

  // İlk yüklemede önce Supabase'den, başarısız olursa localStorage'dan çek
  useEffect(() => {
    if (hydratedRef.current) {
      return
    }

    let isMounted = true

    const loadData = async () => {
      try {

        // Önce Supabase'den veri çekmeyi dene
        try {
          const supabaseData = await loadInitialData()
          if (!isMounted) return

          console.log('[App] Supabase data loaded:', {
            teachers: supabaseData.teachers?.length || 0,
            classes: supabaseData.classes?.length || 0,
            teacherSchedules: Object.keys(supabaseData.teacherSchedules || {}).length,
            hasTeacherSchedules: !!supabaseData.teacherSchedules && Object.keys(supabaseData.teacherSchedules).length > 0
          })

          applySupabaseSnapshot(supabaseData)

          logger.info('Data loaded from Supabase successfully')
          if (isMounted) {
            hydratedRef.current = true
          }
          return
        } catch (supabaseError) {
          logger.warn('Supabase load failed, falling back to localStorage:', supabaseError.message)
        }

        // Supabase başarısız olduysa localStorage'dan yükle
        if (!DISABLE_LOCAL_STORAGE) {
          const hydrateFromLocalStorage = () => {
            try {
              const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
              if (!raw) return

              const parsed = JSON.parse(raw || '{}') || {}
              if (!isMounted) return

              if (parsed.day) setDay(parsed.day)
              if (Array.isArray(parsed.periods) && parsed.periods.length) setPeriods(parsed.periods)
              if (Array.isArray(parsed.teachers)) setTeachers(parsed.teachers)
              if (Array.isArray(parsed.classes)) setClasses(parsed.classes)

              setTeacherFree(arrayToSetMap(parsed.teacherFree || {}))

              const migratedClassFree = migrateClassFree(parsed.classFree || {})
              setClassFree(migratedClassFree)

              const migratedClassAbsence = migrateClassAbsence(parsed.classAbsence || {})
              setClassAbsence(migratedClassAbsence)
              setAbsentPeople(normalizeAbsentPeople(parsed.absentPeople || [], parsed.classAbsence || {}))

              if (parsed.options && typeof parsed.options === 'object') {
                setOptions((prev) => ({ ...prev, ...parsed.options }))
              }

              if (parsed.locked && typeof parsed.locked === 'object') {
                setLocked(parsed.locked)
              }

              if (parsed.pdfSchedule && typeof parsed.pdfSchedule === 'object') {
                setPdfSchedule(parsed.pdfSchedule)
              }

              if (parsed.teacherSchedules && typeof parsed.teacherSchedules === 'object') {
                setTeacherSchedules(parsed.teacherSchedules)
                setTeacherSchedulesHydrated(true)
              }

              if (parsed.commonLessons && typeof parsed.commonLessons === 'object') {
                setCommonLessons(parsed.commonLessons)
              }
            } catch (error) {
              logger.error('Local data hydrate failed:', error)
            }
          }

          hydrateFromLocalStorage()
        }
      } catch (error) {
        logger.error('Data loading failed:', error)
      } finally {
        if (isMounted) {
          hydratedRef.current = true
        }
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [
    day,
    periods,
    options,
    setTeachers,
    setClasses,
    setAbsentPeople,
    setTeacherFree,
    setClassFree,
    setClassAbsence,
    setLocked,
    setPdfSchedule,
    setTeacherSchedules,
    setTeacherSchedulesHydrated,
    setCommonLessons,
    setDay,
    setPeriods,
    setOptions,
    sanitizeCommonLessonsMap,
    applySupabaseSnapshot,
  ])

  // Otomatik kaydet (debounced)
  useEffect(() => {
    if (!hydratedRef.current) return

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Debounce auto-save, especially for classAbsence
    autoSaveTimeoutRef.current = setTimeout(() => {
      const shouldSkipSupabaseSync = skipNextSupabaseSaveRef.current
      if (shouldSkipSupabaseSync) {
        skipNextSupabaseSaveRef.current = false
      }

      // Skip Supabase sync if this is a polling update
      const shouldSkipDueToPolling = isPollingUpdateRef.current

      const serializedTeacherFree = mapSetToArray(teacherFree)
      const serializedClassFree = mapSetToArray(classFree)

      if (!DISABLE_LOCAL_STORAGE) {
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
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {
          logger.warn("Otomatik kaydetme hatası:", e);
        }
      }

      if (!shouldSkipSupabaseSync && !shouldSkipDueToPolling) {
        if (teacherSchedules && Object.keys(teacherSchedules).length > 0) {
          saveTeacherSchedules(teacherSchedules).catch(err => logger.error('Auto save teacherSchedules error:', err));
        }
        bulkSaveClassFree(serializedClassFree).catch(err => logger.error('Auto save classFree error:', err))
        bulkSaveClassAbsence(classAbsence).catch(err => logger.error('Auto save classAbsence error:', err))
        saveCommonLessons(commonLessons).catch(err => logger.error('Auto save commonLessons error:', err));
      }
    }, 1000); // 1 second debounce

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [day, periods, teachers, classes, teacherFree, classFree, absentPeople, classAbsence, commonLessons, options, locked, pdfSchedule, teacherSchedules, teacherSchedulesHydrated]);

  // Bildirim sistemi (diğer fonksiyonlardan önce tanımlanmalı)
  const addNotification = useCallback((messageOrOpts, maybeType) => {
    // Supports: addNotification("msg", "success") OR addNotification({ message, type, duration, actionLabel, onAction })
    const opts = typeof messageOrOpts === 'string'
      ? { message: messageOrOpts, type: maybeType || 'info' }
      : (messageOrOpts || {})

    const id = Date.now() + Math.random()
    const n = {
      id,
      message: opts.message || '',
      type: opts.type || 'info',
      timestamp: Date.now(),
      actionLabel: opts.actionLabel || '',
      onAction: typeof opts.onAction === 'function' ? opts.onAction : null,
      duration: Number.isFinite(opts.duration) ? opts.duration : (opts.actionLabel ? 6000 : 4000)
    }
    setNotifications(prev => [...prev, n])
    // Auto dismiss
    if (n.duration > 0) {
      setTimeout(() => setNotifications(prev => prev.filter(x => x.id !== id)), n.duration)
    }
  }, [])

  const forceReloadWithVersion = useCallback(async (targetVersion) => {
    if (typeof window === 'undefined') return;

    // Cache'i temizle (hard refresh için)
    try {
      // Service worker'ları kaldır
      if (
        typeof navigator !== 'undefined' &&
        'serviceWorker' in navigator &&
        navigator.serviceWorker?.getRegistrations
      ) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map((registration) =>
            registration.unregister().catch(() => { })
          )
        );
      }
    } catch (err) {
      logger.warn?.('Service worker cleanup failed:', err);
    }

    try {
      // Cache'leri temizle
      if (typeof caches !== 'undefined' && caches?.keys) {
        const cacheKeys = await caches.keys();
        await Promise.all(
          cacheKeys.map((cacheKey) =>
            caches.delete(cacheKey).catch(() => false)
          )
        );
      }
    } catch (err) {
      logger.warn?.('Cache cleanup failed:', err);
    }

    // Cache bypass için timestamp ekle ve hard refresh yap
    const url = new URL(window.location.href);
    if (targetVersion) {
      url.searchParams.set('build', targetVersion);
    }
    // Her zaman cache bypass için timestamp ekle
    url.searchParams.set('_t', Date.now().toString());

    // location.replace ile cache bypass yaparak yenile
    window.location.replace(url.toString());
  }, []);

  useEffect(() => {
    if (!SHOULD_CHECK_VERSION) return undefined;

    const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

    const checkForNewVersion = async () => {
      // Sayfa yüklendiğinde, eğer sessionStorage'da lastReloaded varsa ve bu mevcut sürümle eşleşiyorsa, kontrolü atla
      // Bu, sayfa yenilendiğinde döngüye girmeyi önler
      const lastReloaded = getLastReloadedVersion();
      if (lastReloaded === CURRENT_BUILD_VERSION) {
        // Zaten bu sürüme yenilendi, tekrar kontrol etmeye gerek yok
        return;
      }

      // Eğer ref zaten set edilmişse (aynı render cycle'da tekrar çağrılmışsa), atla
      if (versionMismatchHandledRef.current) return;

      try {
        const response = await fetch(`${getAssetUrl('version.json')}?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!response.ok) return;

        const payload = await response.json();
        const remoteVersion = payload?.version;

        // Sürümler eşleşiyorsa, lastReloaded'ı temizle (artık gerek yok)
        if (remoteVersion === CURRENT_BUILD_VERSION) {
          persistReloadedVersion(null);
          return;
        }

        // Yeni sürüm varsa
        if (
          remoteVersion &&
          CURRENT_BUILD_VERSION &&
          remoteVersion !== CURRENT_BUILD_VERSION
        ) {
          // Eğer bu sürüme zaten yenilendi ama hala eski sürüm görünüyorsa (cache sorunu)
          if (lastReloaded === remoteVersion) {
            versionMismatchHandledRef.current = true;
            addNotification(
              'Yeni sürüm algılandı ancak tarayıcı önbelleği nedeniyle otomatik yenileme başarısız oldu. Lütfen sayfayı manuel olarak yenileyin.',
              'warning',
            );
            return;
          }

          // Yeni sürüm bulundu, yenile
          versionMismatchHandledRef.current = true;
          persistReloadedVersion(remoteVersion);
          addNotification('Yeni sürüm bulundu, sayfa yeniden yükleniyor...', 'info');
          setTimeout(() => {
            forceReloadWithVersion(remoteVersion);
          }, 1200);
        }
      } catch (error) {
        logger.warn('Version check failed:', error);
      }
    };

    // Sayfa açılır açılmaz kontrol et
    checkForNewVersion();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForNewVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    const intervalId = window.setInterval(checkForNewVersion, CHECK_INTERVAL);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(intervalId);
    };
  }, [addNotification, forceReloadWithVersion]);

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
      applySupabaseSnapshot(snapshot);

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
  }, [addNotification, applySupabaseSnapshot]);

  const handleManualRefreshClick = useCallback(() => {
    if (absenceRefreshState.isRefreshing) return;
    setToolbarExpanded(false);
    refreshAbsenceData();
  }, [absenceRefreshState.isRefreshing, refreshAbsenceData, setToolbarExpanded]);

  // Nöbetçi öğretmenlerin boş saatlerini otomatik işaretle (referanslardan önce tanımlandı)
  const autoMarkDutyTeachersFree = useCallback(() => {
    if (!teacherSchedules || Object.keys(teacherSchedules).length === 0) return;
    if (!pdfSchedule || Object.keys(pdfSchedule).length === 0) return;

    const dayMapping = { 'Mon': 'monday', 'Tue': 'tuesday', 'Wed': 'wednesday', 'Thu': 'thursday', 'Fri': 'friday' };
    const pdfDayKey = dayMapping[day];
    if (!pdfDayKey || !pdfSchedule[pdfDayKey]) return;

    const dutyTeachers = new Set();
    Object.values(pdfSchedule[pdfDayKey]).forEach(periodTeachers => {
      if (Array.isArray(periodTeachers)) {
        periodTeachers.forEach(teacherName => {
          const normalizedName = normalizeForComparison(teacherName);
          const matchingTeacher = teachers.find(t => normalizeForComparison(t.teacherName) === normalizedName);
          if (matchingTeacher) dutyTeachers.add(matchingTeacher.teacherId);
        });
      }
    });
    if (dutyTeachers.size === 0) return;

    setTeacherFree((prev) => {
      const next = { ...prev };

      dutyTeachers.forEach((teacherId) => {
        const teacher = teachers.find(t => t.teacherId === teacherId);
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
  }, [day, teacherSchedules, pdfSchedule, teachers, periods]);

  // Sistem yüklendiğinde ve gün değiştiğinde nöbetçi öğretmenlerin boş saatlerini otomatik işaretle
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!teacherSchedulesHydrated) return;
    if (!teacherSchedules || Object.keys(teacherSchedules).length === 0) return;
    if (!pdfSchedule || Object.keys(pdfSchedule).length === 0) return;

    // requestAnimationFrame kullanarak hemen çalıştır (gecikme yok)
    const rafId = requestAnimationFrame(() => {
      autoMarkDutyTeachersFree();
    });
    return () => cancelAnimationFrame(rafId);
  }, [day, teacherSchedules, pdfSchedule, teacherSchedulesHydrated, teachers, periods, autoMarkDutyTeachersFree]);

  const handleTeacherScheduleUpload = useCallback(
    async (event) => {
      const file = event?.target?.files?.[0];
      if (!file) return;

      // Mevcut ders programı varsa onay modalı göster
      const existingCount = teacherSchedules ? Object.keys(teacherSchedules).length : 0;
      if (existingCount > 0) {
        // Önce dosyayı parse et (hata kontrolü için)
        try {
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
          console.error('Excel parsing error:', error);
          addNotification(`Dosya okuma hatası: ${error.message}`, 'error');
          if (event?.target) {
            event.target.value = '';
          }
        }
        return;
      }

      // Mevcut veri yoksa direkt yükle
      try {
        console.log('Starting teacher schedule upload from Excel...');
        const schedules = await parseTeacherSchedulesFromExcel(file);
        setTeacherSchedules(schedules);
        setTeacherSchedulesHydrated(true);
        await saveTeacherSchedules(schedules).catch((err) => {
          logger.error('Teacher schedule Supabase save error:', err);
          throw err;
        });
        addNotification(`${Object.keys(schedules).length} öğretmenin ders programı yüklendi`, 'success');
      } catch (error) {
        console.error('Excel parsing error:', error);
        addNotification(`Ders programı yükleme hatası: ${error.message}`, 'error');
      } finally {
        if (event?.target) {
          event.target.value = '';
        }
      }
    },
    [teacherSchedules, setTeacherSchedules, setTeacherSchedulesHydrated, addNotification, setTeacherScheduleReplaceModal],
  );

  // Sekme açıldığında (sayfa görünür olduğunda) nöbetçi öğretmen işaretlemelerini güncelle
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!teacherSchedulesHydrated) return;
    if (!teacherSchedules || Object.keys(teacherSchedules).length === 0) return;
    if (!pdfSchedule || Object.keys(pdfSchedule).length === 0) return;

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
  }, [day, teacherSchedules, pdfSchedule, teacherSchedulesHydrated, teachers, periods, autoMarkDutyTeachersFree]);

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

  // Tarih metni
  const displayDate = useMemo(() => formatTRDate(dateForSelectedDay(day)), [day]);

  // Toggle yardımcıları
  const ensurePeriod = useCallback((obj, p) => {
    if (!obj[p]) obj[p] = new Set();
  }, []);
  const toggleTeacherFree = useCallback(
    (p, tid) => {
      setTeacherFree((prev) => {
        const next = { ...prev };
        ensurePeriod(next, p);
        const currentSet = new Set(next[p]);
        const willSelect = !currentSet.has(tid);
        if (willSelect) currentSet.add(tid);
        else currentSet.delete(tid);
        next[p] = currentSet;
        upsertTeacherFree({ period: p, teacherId: tid, isSelected: willSelect }).catch((err) => {
          logger.error('Teacher free toggle error:', err);
        });
        return next;
      });
    },
    [ensurePeriod]
  );
  const toggleClassFree = useCallback((day, p, cid) => {
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

    setClassFree((prev) => {
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
    upsertClassFree({ day, period: p, classId: cid, isSelected: isSelectedNow }).catch((err) => {
      logger.error('Class free toggle error:', err);
    });

    // Sadece checkbox kaldırıldığında mazeret bilgilerini temizle
    if (wasSelected) {
      setClassAbsence((prevAbs) => {
        const out = { ...prevAbs };
        if (out[day]?.[p]?.[cid]) {
          out[day][p] = { ...(out[day][p] || {}) };
          delete out[day][p][cid];
          if (Object.keys(out[day][p]).length === 0) delete out[day][p];
          if (Object.keys(out[day]).length === 0) delete out[day];
        }
        return out;
      });
      upsertClassAbsence({ day, period: p, classId: cid, absentId: null }).catch((err) => {
        logger.error('Class absence cleanup error:', err);
      });

      setCommonLessons((prevCommon) => {
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
    [classFree, classAbsence]
  );
  const setAllTeachersFree = useCallback(
    (p, on) => {
      const allTeacherIds = teachers.map((t) => t.teacherId);
      const previous = Array.from(teacherFree[p] || []);
      setTeacherFree((prev) => ({ ...prev, [p]: on ? new Set(allTeacherIds) : new Set() }));
      const operations = on
        ? allTeacherIds.map((tid) => upsertTeacherFree({ period: p, teacherId: tid, isSelected: true }))
        : previous.map((tid) => upsertTeacherFree({ period: p, teacherId: tid, isSelected: false }));
      Promise.all(operations).catch((err) => logger.error('setAllTeachersFree error:', err));
    },
    [teachers, teacherFree]
  );
  const setAllClassesFree = useCallback(
    (day, p, on) => {
      setClassFree((prev) => {
        const next = { ...prev };
        if (!next[day]) next[day] = {};
        next[day][p] = on ? new Set(classes.map((c) => c.classId)) : new Set();
        return next;
      });
      const classIds = classes.map((c) => c.classId);
      const previous = Array.from(classFree[day]?.[p] || []);
      const ops = on
        ? classIds.map((cid) => upsertClassFree({ day, period: p, classId: cid, isSelected: true }))
        : previous.map((cid) => upsertClassFree({ day, period: p, classId: cid, isSelected: false }));
      Promise.all(ops).catch((err) => logger.error('setAllClassesFree error:', err));
    },
    [classes, classFree]
  );
  const handleSelectAbsence = useCallback((day, period, classId, absentId) => {
    setClassAbsence((prev) => {
      const next = { ...prev };
      if (!next[day]) next[day] = {};
      if (!next[day][period]) next[day][period] = {};
      if (absentId) {
        const storedValue = encodeClassAbsenceValue(absentId, true);
        next[day][period][classId] = storedValue;
        upsertClassAbsence({ day, period, classId, absentId: storedValue }).catch((err) => {
          logger.error('Class absence upsert error:', err);
        });
      } else {
        delete next[day][period][classId];
        upsertClassAbsence({ day, period, classId, absentId: null }).catch((err) => {
          logger.error('Class absence cleanup error:', err);
        });
      }
      return next;
    });
  }, []);

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
  }, [teachers, periods, setPdfSchedule]);

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
      // Önce eski ders programlarını temizle
      await clearTeacherSchedules();

      // Yeni ders programlarını kaydet
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


  const loadDutyTeachersFromExcel = useCallback(
    async (data) => {
      if (!data || !data.dutyTeachers || data.dutyTeachers.length === 0) {
        addNotification("Yüklenecek öğretmen verisi bulunamadı", "warning");
        return;
      }

      // Mevcut öğretmenleri kontrol et
      const existingTeachers = teachers.filter(t => t.source === 'duty_schedule');
      if (existingTeachers.length > 0) {
        addNotification("Önce mevcut nöbetçi öğretmen listesini silmelisiniz.", "warning");
        return;
      }

      try {
        const result = await importDutyTeachersData(data);
        const replacedCount = existingTeachers.length > 0 ? existingTeachers.length : result.removedCount;
        if (replacedCount > 0) {
          addNotification(`${replacedCount} mevcut öğretmen silindi, ${result.insertedCount} yeni öğretmen yüklendi`, "success");
        } else {
          addNotification(`${result.insertedCount} nöbetçi öğretmen Excel'den yüklendi`, "success");
        }
        setActiveSection("classes");

      } catch (e) {
        logger.error(e);
        addNotification(`Excel yükleme hatası: ${e.message}`, "error");
      } finally {
        // no-op
      }
    },
    [addNotification, teachers, importDutyTeachersData, setActiveSection]
  );



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

    const resolvedConflicts = new Map();
    (conflicts || []).forEach((conflict) => {
      if (conflict.resolution === 'use_pdf') {
        resolvedConflicts.set(`${conflict.day}|${conflict.period}|${conflict.classId}`, conflict.pdfTeacher.teacherId);
      }
    });

    setLocked((prev) => {
      const next = { ...prev };
      let localAssignmentCount = 0;
      let localConflictCount = 0;

      Object.entries(schedule).forEach(([dayKey, dayData]) => {
        Object.entries(dayData || {}).forEach(([period, pdfNames]) => {
          if (Array.isArray(pdfNames) && pdfNames.length > 0) {
            const availableClasses = classes.filter(
              (c) =>
                !next[`${dayKey}|${period}|${c.classId}`] ||
                resolvedConflicts.has(`${dayKey}|${period}|${c.classId}`)
            );

            pdfNames.forEach((pdfName, index) => {
              const teacher = allMatches.get(pdfName);
              if (teacher && teacher.teacherId && index < availableClasses.length) {
                const isValidTeacher = teachers.some((t) => t.teacherId === teacher.teacherId);
                if (!isValidTeacher) {
                  console.warn(
                    `Invalid teacherId "${teacher.teacherId}" for PDF name "${pdfName}", skipping assignment`
                  );
                  return;
                }

                const classId = availableClasses[index].classId;
                const key = `${dayKey}|${period}|${classId}`;

                if (resolvedConflicts.has(key)) {
                  const conflictTeacherId = resolvedConflicts.get(key);
                  if (teachers.some((t) => t.teacherId === conflictTeacherId)) {
                    next[key] = conflictTeacherId;
                    localConflictCount += 1;
                  } else {
                    console.warn(
                      `Invalid teacherId "${conflictTeacherId}" in conflict resolution for ${key}, skipping`
                    );
                  }
                } else if (!next[key]) {
                  next[key] = teacher.teacherId;
                  localAssignmentCount += 1;
                }
              } else if (!teacher) {
                console.warn(`Teacher not found for PDF name "${pdfName}", skipping assignment`);
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

  /* ===================== Manuel ekleme/silme işlemleri ===================== */

  const addTeacher = async (data) => {
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
  const addClass = async (data) => {
    const errs = validateClassData({ classId: 'temp', className: data.className });
    if (errs.length) {
      addNotification(errs.join(", "), "error");
      return;
    }
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

  const absentPeopleForCurrentDay = useMemo(() => {
    if (!Array.isArray(absentPeople)) return [];
    return absentPeople.filter(person => {
      if (!person || typeof person !== 'object') return false;
      if (!Array.isArray(person.days) || person.days.length === 0) return true;
      return person.days.includes(day);
    });
  }, [absentPeople, day]);
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
          if (teacherName === absentTeacherName || teacherName === absentIdToDelete) {
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

    setClasses(prevClasses => {
      const filtered = prevClasses.filter(c => !classesToRemove.includes(c.classId));
      if (classesToRemove.length > 0) {
        addNotification(`${classesToRemove.length} sınıf otomatik kaldırıldı`, 'info');
      }
      return filtered;
    });

    addNotification("Mazeret siliniyor...", "info");

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

      // Update class_free in Supabase
      if (slotsToClear.length > 0) {
        await Promise.all(
          slotsToClear.map(({ dayKey, period, classId }) =>
            upsertClassFree({ day: dayKey, period: Number(period), classId, isSelected: false })
          )
        );
      }

      addNotification("Mazeret kaydı silindi", "success");
    } catch (error) {
      logger.error('Batch delete error:', error);
      addNotification('Silme işlemi tamamlanamadı, sayfa yenilenecek', 'error');

      // Reload page to get fresh data from server
      setTimeout(() => window.location.reload(), 2000);
    }
  }, [absentPeople, classAbsence, commonLessons, setClassAbsence, setClassFree, setCommonLessons, setClasses, setAbsentPeople, addNotification]);

  useEffect(() => {
    if (!hydratedRef.current) return;

    const currentDateString = new Date().toDateString();

    if (!lastCleanupDate) {
      setLastCleanupDate(currentDateString);
      persistCleanupDate(currentDateString);
      return;
    }

    if (currentDateString === lastCleanupDate) return;

    const currentRealDayKey = REAL_DAY_KEYS[new Date().getDay()] || 'Mon';

    if (Array.isArray(absentPeople) && absentPeople.length > 0) {
      const staleAbsents = absentPeople.filter(person => {
        if (!person?.absentId) return false;
        if (!Array.isArray(person.days) || person.days.length === 0) return true;
        return !person.days.includes(currentRealDayKey);
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

  const deleteTeacher = async (teacherIdToDelete) => {
    try {
      // Delete related locks first
      await deleteLocksByTeacher(teacherIdToDelete)
      // Then delete the teacher
      await deleteTeacherById(teacherIdToDelete)
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
      logger.error('Teacher delete error:', error)
      addNotification('Öğretmen silinemedi', 'error')
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

  const deleteClass = async (classIdToDelete) => {
    try {
      // Delete related records first (class_absence, common_lessons, locks)
      await Promise.all([
        deleteClassAbsenceByClass(classIdToDelete),
        deleteCommonLessonsByClass(classIdToDelete),
        deleteLocksByClass(classIdToDelete)
      ])
      // Then delete the class itself
      await deleteClassById(classIdToDelete)
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
      logger.error('Class delete error:', error)
      addNotification('Sınıf silinemedi', 'error')
    }
  };

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
      console.log('[DEBUG] classFree snapshot missing for day:', day);
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

  const teachersForCurrentDay = useDutyTeacherFilter(teachers, pdfSchedule, day);

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
    absentPeople,
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

  const classesForCurrentDay = useMemo(() => {
    const includedIds = new Set();

    const dayFree = classFree?.[day] || {};
    Object.values(dayFree).forEach((setOrArray) => {
      const ids = setOrArray instanceof Set ? Array.from(setOrArray) : Array.isArray(setOrArray) ? setOrArray : [];
      ids.forEach(id => includedIds.add(id));
    });

    const dayAbsence = filteredClassAbsence?.[day] || {};
    Object.values(dayAbsence).forEach((classMap) => {
      Object.keys(classMap || {}).forEach(id => includedIds.add(id));
    });

    return classes.filter(cls => includedIds.has(cls.classId));
  }, [classes, classFree, filteredClassAbsence, day]);

  const freeClassesByDay = useMemo(() => {
    const validClassIds = new Set(classes.map((c) => c.classId));
    const dayFree = { [day]: {} };

    periods.forEach((p) => {
      const combined = new Set();
      const freeSet = classFree?.[day]?.[p];
      if (freeSet instanceof Set) {
        freeSet.forEach((cid) => validClassIds.has(cid) && combined.add(cid));
      } else if (Array.isArray(freeSet)) {
        freeSet.forEach((cid) => validClassIds.has(cid) && combined.add(cid));
      }

      const absenceMap = classAbsence?.[day]?.[p];
      if (absenceMap && typeof absenceMap === 'object') {
        Object.entries(absenceMap).forEach(([classId, rawValue]) => {
          const { absentId, allowDuty } = decodeClassAbsenceValue(rawValue);
          if (!allowDuty) return;
          if (!absentIdsForCurrentDay.has(absentId)) return;
          if (validClassIds.has(classId)) {
            combined.add(classId);
          }
        });
      }

      dayFree[day][p] = combined;
    });

    return dayFree;
  }, [classes, classFree, classAbsence, day, periods, absentIdsForCurrentDay]);



  // Locked state'teki geçersiz teacherId'leri otomatik temizle
  useEffect(() => {
    if (!teachers.length || !locked || Object.keys(locked).length === 0) return;

    const validTeacherIds = new Set(teachers.map(t => t.teacherId));
    const invalidEntries = Object.entries(locked).filter(([, teacherId]) => {
      return teacherId && !validTeacherIds.has(teacherId);
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
      return teacherId && !validTeacherIds.has(teacherId);
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
      console.log(`Gün değişti (${day}): ${invalidDayEntries.length} geçersiz locked kayıt temizlendi:`, invalidTeacherIds);
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
        if (teacherId === MANUAL_EMPTY_TEACHER_ID) return;
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

  const { schedule: rawAssignment } = useMemo(
    () =>
      assignDuties({
        teachers,
        freeTeachers: freeTeachersByDay,
        classes,
        freeClasses: freeClassesByDay,
        locked,
        options,
        commonLessons
      }),
    [teachers, classes, freeTeachersByDay, freeClassesByDay, options, locked, commonLessons]
  );
  const assignment = useMemo(
    () => applyFairnessAdjustments({
      baseSchedule: rawAssignment,
      day,
      periods,
      teachersForCurrentDay,
      freeTeachersByDay,
      freeClassesByDay,
      commonLessons,
      locked,
      options,
      teacherMap
    }),
    [rawAssignment, day, periods, teachersForCurrentDay, freeTeachersByDay, freeClassesByDay, commonLessons, locked, options, teacherMap]
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
        const cls = classes.find((c) => c.classId === classId);
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
  }, [assignment, freeClassesByDay, day, classes, periods]);

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
      const lockedCount = Object.keys(locked || {}).filter((key) => key.startsWith(`${day}|${period}|`)).length
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

  const dropAssign = useCallback(({ day, period, fromClassId, toClassId, teacherId }) => {
    if (!teacherId || !toClassId) return

    const teacher = teachers.find((t) => t.teacherId === teacherId)
    const toClass = classes.find((c) => c.classId === toClassId)

    setLocked(prev => {
      const next = { ...prev }
      const toKey = `${day}|${period}|${toClassId}`

      let removedKey = null
      if (fromClassId) {
        const fromKey = `${day}|${period}|${fromClassId}`
        if (next[fromKey] === teacherId) {
          removedKey = fromKey
          delete next[fromKey]
        }
      } else {
        const prefix = `${day}|${period}|`
        const existingKey = Object.keys(next).find(key => key.startsWith(prefix) && next[key] === teacherId)
        if (existingKey) {
          removedKey = existingKey
          delete next[existingKey]
        }
      }

      next[toKey] = teacherId

      if (removedKey) {
        const [, , removedClassId] = removedKey.split('|')
        upsertLock({ day, period, classId: removedClassId, teacherId: null }).catch(err =>
          logger.error('Lock remove error:', err)
        )
      }
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

    let changed = false
    setLocked((prev) => {
      if (prev?.[key] === MANUAL_EMPTY_TEACHER_ID) {
        return prev
      }
      const next = { ...(prev || {}) }
      next[key] = MANUAL_EMPTY_TEACHER_ID
      changed = true
      return next
    })

    if (!changed) return

    upsertLock({ day, period, classId, teacherId: MANUAL_EMPTY_TEACHER_ID }).catch((err) =>
      logger.error('Manual empty upsert error:', err)
    )
    addNotification({
      message: `${dayLabel} ${period}. saat için ${classLabel} manuel olarak boş bırakıldı`,
      type: 'info',
      duration: 2200,
    })
  }, [classes, addNotification])

  const handleManualRelease = useCallback(({ day, period, classId }) => {
    const key = `${day}|${period}|${classId}`
    const cls = classes.find((c) => c.classId === classId)
    const classLabel = cls?.className || 'Sınıf'
    const dayLabel = DAYS.find((d) => d.key === day)?.label || day

    let removedTeacherId = null
    setLocked((prev) => {
      if (!prev || !prev[key]) {
        return prev
      }
      removedTeacherId = prev[key]
      const next = { ...prev }
      delete next[key]
      return next
    })

    if (!removedTeacherId) return

    upsertLock({ day, period, classId, teacherId: null }).catch((err) =>
      logger.error('Manual release error:', err)
    )
    addNotification({
      message: `${dayLabel} ${period}. saatteki ${classLabel} görevi yeniden otomatik plana bırakıldı`,
      type: 'success',
      duration: 2200,
    })
  }, [classes, addNotification])

  async function exportJPG() {
    try {
      addNotification("JPG oluşturuluyor...", "info");

      const outputSection = document.getElementById('panel-outputs');
      if (!outputSection) {
        addNotification("Çıktılar bölümü bulunamadı", "error");
        return;
      }

      // Geçici olarak gizlenecek elementleri seç
      const elementsToHide = document.querySelectorAll('.no-print, .topbar, .tabs-container, .screenOnly, .btn, .toolbar');
      elementsToHide.forEach(el => el.classList.add('temp-hidden-for-jpg'));

      // Assignment-text-container'ı başlığa göre bul ve gizle (CSS Module class name hash'li olabilir)
      const assignmentHeaders = outputSection.querySelectorAll('h3');
      assignmentHeaders.forEach(header => {
        if (header.textContent && header.textContent.includes('Görevlendirme Metni')) {
          const container = header.closest('div');
          if (container) {
            container.classList.add('temp-hidden-for-jpg');
            container.style.display = 'none';
          }
        }
      });

      // Print-only elementleri gizle (metni Canvas API ile çizeceğiz)
      const printOnlyElements = outputSection.querySelectorAll('.printOnly');
      printOnlyElements.forEach(el => {
        el.classList.add('temp-hidden-for-jpg');
        el.style.display = 'none';
      });

      // Mevcut tema ve stilleri sakla
      const originalTheme = document.documentElement.getAttribute('data-theme');

      // Geçici olarak light theme'e geç ve print moduna al
      document.documentElement.setAttribute('data-theme', 'light');
      outputSection.classList.add('force-print-styles');

      // Print stillerini uygulamak için geçici stil elementi ekle
      const printStyle = document.createElement('style');
      printStyle.id = 'temp-print-styles-for-jpg';
      printStyle.textContent = `
        #panel-outputs {
          background: white !important;
          color: black !important;
          padding: 20px !important;
          margin: 0 !important;
          box-shadow: none !important;
          border: none !important;
        }
        .printable-daily-list, .table-container {
          background: white !important;
          border: none !important;
          box-shadow: none !important;
          margin: 0 !important;
          padding: 10px !important;
        }
        .printOnly {
          display: block !important;
          font-family: 'Times New Roman', serif !important;
          font-size: 8.5pt !important;
          color: #000000 !important;
          width: 100% !important;
          max-width: 100% !important;
          white-space: pre-wrap !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .printLine {
          display: block !important;
          margin: 0 !important;
          padding: 0 !important;
          line-height: 1.15 !important;
          white-space: normal !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          max-width: 100% !important;
          width: 100% !important;
          font-size: 8.5pt !important;
          clear: both !important;
          float: none !important;
          box-sizing: border-box !important;
        }
        .printColumns {
          display: flex !important;
          flex-direction: row !important;
          gap: 4mm !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          align-items: flex-start !important;
        }
        .printCol {
          flex: 1 1 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
        }
        .printCol .printLine {
          flex: 0 0 auto !important;
          display: block !important;
          width: 100% !important;
          box-sizing: border-box !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
        .printCol > .printLine {
          display: block !important;
          clear: both !important;
          float: none !important;
        }
        /* İki sütun div yapısı için stiller */
        .printHeader {
          display: block !important;
          margin: 0 0 2px 0 !important;
          padding: 0 !important;
          font-size: 8.5pt !important;
          line-height: 1.15 !important;
        }
        .printTwoCols {
          display: block !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          position: relative !important;
        }
        .printColLeft {
          display: block !important;
          width: 48% !important;
          float: left !important;
          margin: 0 !important;
          padding: 0 2% 0 0 !important;
          box-sizing: border-box !important;
        }
        .printColRight {
          display: block !important;
          width: 48% !important;
          float: right !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
        }
        .printLineBlock {
          display: block !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          font-size: 8.5pt !important;
          line-height: 1.15 !important;
          white-space: normal !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          clear: both !important;
        }
        .print-title {
          margin-bottom: 3mm !important;
          font-size: 14pt !important;
        }
        .assign-table {
          border-collapse: collapse !important;
          width: 100% !important;
          font-size: 11pt !important;
          line-height: 1.2 !important;
          font-family: 'Times New Roman', serif !important;
        }
        .assign-table thead th, .assign-table tbody td {
          border: 0.8pt solid #000 !important;
          background: #fff !important;
          color: #000 !important;
          padding: 3px 4px !important;
          vertical-align: middle !important;
          text-align: center !important;
          display: table-cell !important;
        }
        .assign-table tbody tr {
          border: none !important;
        }
        .assign-table tbody tr td {
          border-top: 0.8pt solid #000 !important;
          border-bottom: 0.8pt solid #000 !important;
          border-left: 0.8pt solid #000 !important;
          border-right: 0.8pt solid #000 !important;
        }
        thead th {
          position: static !important;
        }
        .teacher-col {
          width: 170px !important;
        }
        .teacher-name .teacher-id {
          display: none !important;
        }
        .assign-table thead th:first-child,
        .assign-table tbody td:first-child {
          position: static !important;
          background: #fff !important;
          z-index: auto !important;
        }
        .cell-list {
          gap: 2px !important;
        }
        .cell-item {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          border-radius: 0 !important;
        }
        .abs {
          font-size: 8.5pt !important;
        }
        #panel-outputs * {
          font-family: 'Times New Roman', serif !important;
        }
        #panel-outputs *:not(.cell-item):not(.cell-list):not(.cell) {
          color: black !important;
        }
        #panel-outputs table, #panel-outputs thead, #panel-outputs tbody, #panel-outputs tr, #panel-outputs th, #panel-outputs td {
          background: white !important;
          color: black !important;
        }
      `;
      document.head.appendChild(printStyle);

      // DOM'un güncellenmesi için kısa bir bekleme
      await new Promise(resolve => setTimeout(resolve, 300));

      // Print-only elementlerin görünür olduğundan emin ol (inline style'lar zaten var)
      const printOnlyCheck = outputSection.querySelectorAll('.printOnly');
      printOnlyCheck.forEach(el => {
        if (!el.style.display || el.style.display === 'none') {
          el.style.display = 'block';
        }
      });

      // PrintColumns ve printCol elementlerinin stillerini kontrol et (eski yapı için)
      const printColumnsCheck = outputSection.querySelectorAll('.printColumns');
      printColumnsCheck.forEach(el => {
        el.style.display = 'flex';
        el.style.flexDirection = 'row';
      });

      const printColsCheck = outputSection.querySelectorAll('.printCol');
      printColsCheck.forEach(el => {
        el.style.display = 'flex';
        el.style.flexDirection = 'column';
      });

      const printLinesCheck = outputSection.querySelectorAll('.printCol .printLine');
      printLinesCheck.forEach(el => {
        el.style.display = 'block';
        el.style.whiteSpace = 'normal';
      });

      // Canvas'a çevir (hem tablo hem metin dahil)
      const canvas = await html2canvas(outputSection, {
        scale: 3, // Daha yüksek kalite
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 1400, // Daha geniş canvas
        width: 1400, // Sabit genişlik
        onclone: (clonedDoc) => {
          // Clone edilen dokümanda da light theme uygula
          const clonedSection = clonedDoc.getElementById('panel-outputs');
          if (clonedSection) {
            clonedSection.style.backgroundColor = '#ffffff';
            clonedSection.style.color = '#000000';
            clonedSection.style.padding = '20px';
            clonedSection.style.width = '1400px';
            clonedSection.style.minWidth = '1400px';
          }

          // Clone edilen dokümandaki gizli elementleri de gizle
          const clonedElementsToHide = clonedDoc.querySelectorAll('.temp-hidden-for-jpg');
          clonedElementsToHide.forEach(el => el.style.display = 'none');

          // Clone edilen dokümandaki print-only elementleri görünür yap
          const clonedPrintOnlyElements = clonedDoc.querySelectorAll('.printOnly');
          clonedPrintOnlyElements.forEach(el => {
            el.style.display = 'block';
          });

          // Clone edilen dokümandaki screen-only elementleri gizle
          const clonedScreenOnlyElements = clonedDoc.querySelectorAll('.screenOnly');
          clonedScreenOnlyElements.forEach(el => {
            el.style.display = 'none';
          });

          // Clone edilen dokümandaki assignment-text-container'ı başlığa göre bul ve gizle
          const clonedAssignmentHeaders = clonedDoc.querySelectorAll('h3');
          clonedAssignmentHeaders.forEach(header => {
            if (header.textContent && header.textContent.includes('Görevlendirme Metni')) {
              const container = header.closest('div');
              if (container) {
                container.style.display = 'none';
              }
            }
          });

          // Clone edilen dokümandaki printColumns ve printCol elementlerini düzgün stilize et
          const clonedPrintColumns = clonedDoc.querySelectorAll('.printColumns');
          clonedPrintColumns.forEach(el => {
            el.style.display = 'flex';
            el.style.flexDirection = 'row';
            el.style.gap = '4mm';
            el.style.width = '100%';
          });

          const clonedPrintCols = clonedDoc.querySelectorAll('.printCol');
          clonedPrintCols.forEach(el => {
            el.style.display = 'flex';
            el.style.flexDirection = 'column';
            el.style.flex = '1 1 0';
            el.style.alignItems = 'stretch';
          });

          // Print-only elementlerin inline style'larını kontrol et (zaten inline style'lar var)
          const clonedPrintOnly = clonedDoc.querySelectorAll('.printOnly');
          clonedPrintOnly.forEach(el => {
            if (!el.style.display || el.style.display === 'none') {
              el.style.display = 'block';
            }
          });

          // Eski printLine elementleri için (header için)
          const clonedPrintLines = clonedDoc.querySelectorAll('.printLine:not(.printLineBlock)');
          clonedPrintLines.forEach(el => {
            el.style.display = 'block';
            el.style.whiteSpace = 'normal';
            el.style.width = '100%';
            el.style.margin = '0';
            el.style.padding = '0';
          });

          // Clone edilen dokümandaki tablo hücrelerine border uygula
          const clonedTableCells = clonedDoc.querySelectorAll('.assign-table thead th, .assign-table tbody td');
          clonedTableCells.forEach(cell => {
            cell.style.border = '0.8pt solid #000';
            cell.style.borderTop = '0.8pt solid #000';
            cell.style.borderBottom = '0.8pt solid #000';
            cell.style.borderLeft = '0.8pt solid #000';
            cell.style.borderRight = '0.8pt solid #000';
            cell.style.display = 'table-cell';
          });

          // Clone edilen dokümandaki tüm elementlere print stillerini uygula
          const clonedPrintStyle = clonedDoc.createElement('style');
          clonedPrintStyle.textContent = printStyle.textContent;
          clonedDoc.head.appendChild(clonedPrintStyle);
        }
      });

      // Orijinal stilleri geri yükle
      document.head.removeChild(printStyle);
      document.documentElement.setAttribute('data-theme', originalTheme);
      outputSection.classList.remove('force-print-styles');
      elementsToHide.forEach(el => el.classList.remove('temp-hidden-for-jpg'));

      // Print-only elementleri geri yükle
      printOnlyElements.forEach(el => {
        el.classList.remove('temp-hidden-for-jpg');
        el.style.display = '';
      });

      // Assignment-text-container'ı geri yükle
      const assignmentHeadersRestore = outputSection.querySelectorAll('h3');
      assignmentHeadersRestore.forEach(header => {
        if (header.textContent && header.textContent.includes('Görevlendirme Metni')) {
          const container = header.closest('div');
          if (container) {
            container.classList.remove('temp-hidden-for-jpg');
            container.style.display = '';
          }
        }
      });

      // Görevlendirme metnini Canvas API ile çiz
      const REASON_LABELS = {
        "raporlu": "Raporlu",
        "sevkli": "Sevkli",
        "izinli": "İzinli",
        "gorevli-izinli": "Görevli İzinli",
        "diger": "Diğer"
      };

      // Metin verilerini hazırla
      const assignmentLines = [];
      const absentMap = {};
      (absentPeople || []).forEach(a => {
        if (a && a.absentId) absentMap[a.absentId] = { name: a.name, reason: a.reason };
      });

      for (const p of periods) {
        const arr = assignment?.[day]?.[p] || [];
        arr.forEach(a => {
          const c = classes.find(x => x.classId === a.classId);
          const t = teachers.find(x => x.teacherId === a.teacherId);
          const rawAbsValue = classAbsence?.[day]?.[p]?.[a.classId];
          const decodedAbs = decodeClassAbsenceValue(rawAbsValue);
          const abs = decodedAbs.absentId ? absentMap[decodedAbs.absentId] : null;
          const reason = abs ? (REASON_LABELS[abs.reason] || abs.reason) : "";
          const suffix = abs ? ` (${abs.name} - ${reason})` : "";
          const teacherDisplayName = t?.teacherName || (a.teacherId.startsWith('auto_') ? 'Bilinmeyen Öğretmen' : a.teacherId);
          assignmentLines.push(`${p}. saat — ${c?.className || a.classId}: ${teacherDisplayName}${suffix}`);
        });

        if (commonLessons?.[day]?.[p]) {
          Object.entries(commonLessons[day][p]).forEach(([classId, teacherName]) => {
            const c = classes.find(x => x.classId === classId);
            const teacherLabel = teacherName && teacherName !== COMMON_LESSON_LABEL
              ? teacherName
              : 'Diğer öğretmen';
            assignmentLines.push(`${p}. saat — ${c?.className || classId}: ${teacherLabel}`);
          });
        }
      }

      const headerLine = `Tarih: ${displayDate}`;
      const leftLines = assignmentLines.filter(l => {
        const m = l.match(/^(\d+)\.\s*saat/i);
        return m ? parseInt(m[1], 10) <= 6 : true;
      });
      const rightLines = assignmentLines.filter(l => {
        const m = l.match(/^(\d+)\.\s*saat/i);
        return m ? parseInt(m[1], 10) >= 7 : false;
      });

      // Metin canvas'ı oluştur (yüksek çözünürlük için scale)
      const scale = 3; // html2canvas ile aynı scale
      const textCanvas = document.createElement('canvas');
      const textCtx = textCanvas.getContext('2d');
      const fontSize = 13 * scale; // Scale ile çarp (11'den 13'e artırıldı)
      const lineHeight = fontSize * 1.3;
      const fontFamily = 'Times New Roman, serif';
      textCtx.font = `${fontSize}px ${fontFamily}`; // pt yerine px kullan (scale için)
      textCtx.fillStyle = '#000000';
      textCtx.textBaseline = 'top';
      textCtx.textAlign = 'left';

      // Canvas genişliğini hesapla (tablo genişliği ile aynı)
      const tableWidth = canvas.width;
      const colWidth = (tableWidth - 60 * scale) / 2; // Scale ile çarp
      const colGap = 60 * scale;

      // Canvas yüksekliğini hesapla
      const maxLines = Math.max(leftLines.length, rightLines.length);
      const headerHeight = lineHeight * 1.8;
      const textHeight = headerHeight + (maxLines * lineHeight) + 30 * scale; // Scale ile çarp
      textCanvas.width = tableWidth;
      textCanvas.height = textHeight;

      // Arka planı beyaz yap
      textCtx.fillStyle = '#ffffff';
      textCtx.fillRect(0, 0, textCanvas.width, textCanvas.height);

      // Metni çiz (scale ile çarpılmış koordinatlar)
      textCtx.fillStyle = '#000000';

      // Başlık (fontSize zaten scale ile çarpılmış)
      const headerFontSize = (fontSize / scale) + 2;
      textCtx.font = `${headerFontSize * scale}px ${fontFamily}`;
      textCtx.fillText(headerLine, 30 * scale, fontSize + 10 * scale);

      // Sütun metinleri (fontSize zaten scale ile çarpılmış)
      textCtx.font = `${fontSize}px ${fontFamily}`;

      // Sol sütun
      let y = headerHeight + fontSize + 5 * scale;
      leftLines.forEach(line => {
        textCtx.fillText(line, 30 * scale, y);
        y += lineHeight;
      });

      // Sağ sütun
      y = headerHeight + fontSize + 5 * scale;
      rightLines.forEach(line => {
        textCtx.fillText(line, 30 * scale + colWidth + colGap, y);
        y += lineHeight;
      });

      // İki canvas'ı birleştir
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = Math.max(canvas.width, textCanvas.width);
      finalCanvas.height = canvas.height + textCanvas.height;
      const finalCtx = finalCanvas.getContext('2d');

      // Arka planı beyaz yap
      finalCtx.fillStyle = '#ffffff';
      finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

      // Tabloyu çiz
      finalCtx.drawImage(canvas, 0, 0);

      // Metni çiz
      finalCtx.drawImage(textCanvas, 0, canvas.height);

      // Final canvas'ı JPG'ye çevir
      finalCanvas.toBlob((blob) => {
        if (!blob) {
          addNotification("JPG oluşturulamadı", "error");
          return;
        }

        // İndir
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gorevlendirme_${day}_${displayDate.replace(/\./g, '-')}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        addNotification("JPG başarıyla kaydedildi", "success");
      }, 'image/jpeg', 0.95); // 95% kalite
    } catch (e) {
      logger.error(e);
      addNotification("JPG oluşturma hatası", "error");
    }
  }

  /* ================================ Render ================================ */

  useEffect(() => {
    const onKey = (e) => {
      const isCtrlP = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p'
      if (isCtrlP) {
        e.preventDefault()
        setActiveSection('outputs')
        setTimeout(() => window.print(), 50)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setActiveSection])

  return (
    <div className={`wrap ${toolbarExpanded ? 'toolbarExpanded' : ''}`}>
      <ModernNotificationSystem notifications={notifications} onRemove={removeNotification} onAction={onNotificationAction} />

      <Header
        toolbarExpanded={toolbarExpanded}
        toggleToolbar={toggleToolbar}
        theme={theme}
        toggleTheme={toggleTheme}
        day={day}
        handleDayChange={handleDayChange}
      />

      {/* Toolbar */}
      <div className="toolbar">
        {/* Overlay - Menü dışına tıklayınca kapanır */}
        {toolbarExpanded && (
          <div className="toolbar-overlay" onClick={toggleToolbar}></div>
        )}

        {/* Toolbar İçeriği */}
        <div className={`toolbar-content ${toolbarExpanded ? 'expanded' : 'collapsed'}`} onClick={(e) => e.stopPropagation()}>
          {/* Tehlikeli Alan Grubu */}
          <div className="toolbar-group toolbar-group-danger">
            <div className="toolbar-group-header">
              <h3>⚠️ Tehlikeli İşlemler</h3>
              <p>Dikkatli kullanın - geri alınamaz işlemler</p>
            </div>
            <div className="toolbar-group-content">
              <button className="btn-danger" onClick={clearAllData} title="Tüm uygulama verilerini temizle">
                <Icon name="trash" size={16} /><span className="btn-text">Her Şeyi Sıfırla</span>
              </button>
            </div>
          </div>

          <div className="toolbar-group">
            <div className="toolbar-group-header">
              <h3>🔄 Veri Senkronizasyonu</h3>
              <p>Supabase ile manuel olarak eşitle</p>
            </div>
            <div className="toolbar-group-content">
              <button
                className="btn"
                onClick={handleManualRefreshClick}
                disabled={absenceRefreshState.isRefreshing}
              >
                <Icon name="refreshCw" size={16} />
                <span className="btn-text">
                  {absenceRefreshState.isRefreshing ? 'Yenileniyor...' : 'Verileri Güncelle'}
                </span>
              </button>
              <small
                style={{
                  display: 'block',
                  marginTop: '8px',
                  color: 'var(--text-muted, #8b9dc3)',
                }}
              >
                Son yenileme: {lastAbsenceRefreshLabel}
              </small>
              {absenceRefreshState.error && (
                <small
                  style={{
                    display: 'block',
                    marginTop: '4px',
                    color: 'var(--danger, #ff6b6b)',
                  }}
                >
                  {absenceRefreshState.error}
                </small>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sekmeler */}
      <Tabs
        active={activeSection}
        onChange={setActiveSection}
        items={[
          { key: "courseSchedule", label: "Ders Programı", icon: "bookOpen" },
          { key: "teachers", label: "Nöbetçi Öğretmenler", icon: "users" },
          { key: "absents", label: "Okula Gelemeyenler", icon: "userX" },
          { key: "classes", label: "Sınıflar", icon: "home" },
          { key: "schedule", label: "Planlama", icon: "calendar" },
          { key: "outputs", label: "Çıktılar", icon: "printer" }
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
            onToggleTeacherFree={toggleTeacherFree}
            onToggleAllTeachersFree={setAllTeachersFree}
            onDeleteTeacher={deleteTeacher}
            onOpenDutyTeacherExcelModal={handleOpenDutyTeacherExcelModal}
            onOpenPdfImport={() => setPdfImportModal(true)}
            onOpenAddTeacherModal={() => setModals((m) => ({ ...m, teacher: true }))}
            onDeletePdfTeachers={deleteAllPdfTeachers}
            onDeleteAllTeachers={deleteAllTeachers}
            IconComponent={Icon}
          />
        )}

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

        {activeSection === "classes" && (
          <ClassesSection
            classes={classes}
            classesForCurrentDay={classesForCurrentDay}
            periods={periods}
            classFreeForCurrentDay={classFreeForCurrentDay}
            absentPeopleForCurrentDay={absentPeopleForCurrentDay}
            filteredClassAbsence={filteredClassAbsence}
            commonLessons={commonLessons}
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
            IconComponent={Icon}
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
            unassignedForSelectedDay={unassignedForSelectedDay}
            commonLessons={commonLessons}
            classes={classes}
            IconComponent={Icon}
            onOptionChange={handleOptionChange}
            onSetAllTeachersMaxDuty={setAllTeachersMaxDuty}
            onDropAssign={dropAssign}
            onManualAssign={handleManualAssign}
            onManualClear={handleManualClear}
            onManualRelease={handleManualRelease}
          />
        )}

        {activeSection === "outputs" && (
          <OutputsSection
            day={day}
            displayDate={displayDate}
            periods={periods}
            assignment={assignment}
            teachersForCurrentDay={teachersForCurrentDay}
            classes={classes}
            classAbsence={classAbsence}
            filteredClassAbsence={filteredClassAbsence}
            absentPeopleForCurrentDay={absentPeopleForCurrentDay}
            commonLessons={commonLessons}
            onExportJPG={exportJPG}
            onPrint={() => window.print()}
            IconComponent={Icon}
          />
        )}
      </main>

      <GlobalModals
        modals={modals}
        setModals={setModals}
        addTeacher={addTeacher}
        addClass={addClass}
        addAbsent={addAbsent}
        day={day}
        DAYS={DAYS}
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
        blockedAbsentTeacherNames={blockedAbsentTeacherNames}
      />

      {/* Footer removed as per request */}
    </div>
  );
}
