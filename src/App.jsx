import React, { useEffect, useMemo, useState, useCallback, useRef, useLayoutEffect } from "react";
import html2canvas from "html2canvas";
import { assignDuties, MANUAL_EMPTY_TEACHER_ID } from "./utils/assignDuty.js";
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
  PERIODS as HELPER_PERIODS
} from "./utils/helpers.js";
import "./styles.css";
import styles from './components/Tabs.module.css'; // Tabs.module.css dosyasını import et
import { APP_ENV } from './config/index.js';
import {
  loadInitialData,
  insertTeacher,
  deleteTeacherById,
  insertClass,
  getClassByName,
  deleteClassById,
  insertAbsent,
  deleteAbsentById,
  deleteClassAbsenceByAbsent,
  upsertClassFree,
  upsertTeacherFree,
  upsertClassAbsence,
  upsertLock,
  replacePdfSchedule,
  saveTeacherSchedules,
  saveCommonLessons,
  bulkSaveClassFree,
  bulkSaveClassAbsence,
  clearTeacherSchedules,
  clearTeachersData,
  clearClassesData,
  clearAbsentsData,
  clearClassAbsenceData,
  clearCommonLessonsData,
  resetClassFreeData,
  resetTeacherFreeData,
  clearLocksData,
  TEACHER_SCHEDULES_SNAPSHOT_KEY,
} from './services/supabaseDataService.js';
import { realtimeSync } from './services/realtimeSync.js';

import Tabs from "./components/Tabs.jsx";
import PrintableDailyList from "./components/PrintableDailyList.jsx";
import AssignmentText from "./components/AssignmentText.jsx";
import ModernNotificationSystem from "./components/ModernNotificationSystem.jsx";
import ModernClassAvailabilityGrid from "./components/ModernClassAvailabilityGrid.jsx";
import ModernAvailabilityGrid from "./components/ModernAvailabilityGrid.jsx";
import AssignmentEditor from "./components/AssignmentEditor.jsx";
import EmptyState from "./components/EmptyState.jsx";
import ConflictSuggestions from "./components/ConflictSuggestions.jsx";
import CsvValidationReport from "./components/CsvValidationReport.jsx";
import AddTeacherModal from "./components/AddTeacherModal.jsx";
import AddClassModal from "./components/AddClassModal.jsx";
import AddAbsentModal from "./components/AddAbsentModal.jsx";
import CommonLessonModal from "./components/CommonLessonModal.jsx";
import AbsenteeList from './components/AbsenteeList.jsx';
import ConfirmationModal from "./components/ConfirmationModal.jsx";
import PdfScheduleImportModal from "./components/PdfScheduleImportModal.jsx";
import TeacherScheduleModal from "./components/TeacherScheduleModal.jsx";
import DutyTeacherExcelImportModal from "./components/DutyTeacherExcelImportModal.jsx";
import AssignmentInsights from "./components/AssignmentInsights.jsx";

// ================= ICONS =================
// Feather Icons (https://feathericons.com/)

// ...App fonksiyonu tanımı aşağıda...
  // ...diğer state'ler...
  const Icon = ({ name, size = 20 }) => {
    const icons = {
      sun: <><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></>,
      moon: <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></>,
      upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></>,
      download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></>,
      save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13H7v8"></polyline><polyline points="7 3 7 8H15"></polyline></>,
      trash: <><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></>,
      clipboard: <><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></>,
      users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></>,
      home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></>,
      userX: <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line></>,
      calendar: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></>,
      printer: <><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></>,
      lock: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></>,
      unlock: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></>,
      pin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></>,
      zap: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></>,
      bookOpen: <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></>,
      info: <><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></>,
      user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></>,
      alertTriangle: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></>,
    };
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="icon"
      >
        {icons[name] || null}
      </svg>
    );
  }

  // Sekme state'leri eksik, ekliyoruz
  //const [activeSection, setActiveSection] = useState("teachers");


function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";
  const label  = isDark ? "Açık temaya geç" : "Koyu temaya geç";
  return (
    <button
      className="iconBtn theme-toggle"
      onClick={onToggle}
      aria-label={label}
      title={label}
      type="button"
    >
      <span className="ico" aria-hidden="true" style={{pointerEvents:'none'}}>
        {isDark ? <Icon name="sun" /> : <Icon name="moon" />}
      </span>
    </button>
  );
}





/* ====================== Sabitler & Yardımcılar ====================== */

const DISABLE_LOCAL_STORAGE = true;
const STORAGE_KEY = `${APP_ENV.mode || 'development'}_nobetci_persist_v4`;
const LAST_ABSENT_CLEANUP_KEY = `${APP_ENV.mode || 'development'}_last_absent_cleanup`;
const DAYS = [
  { key: "Mon", label: "Pazartesi", short: "Pzt" },
  { key: "Tue", label: "Salı", short: "Sal" },
  { key: "Wed", label: "Çarşamba", short: "Çar" },
  { key: "Thu", label: "Perşembe", short: "Per" },
  { key: "Fri", label: "Cuma", short: "Cum" }
];
const REAL_DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];


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
  // Bugünün gününü otomatik seç (Pazartesi=1, Cuma=5)
  const getTodayKey = () => {
    const today = new Date().getDay(); // 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
    const dayMap = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri" };
    return dayMap[today] || "Mon"; // Hafta sonu ise Pazartesi seç
  };
  
  const [day, setDay] = useState(getTodayKey());
  const [periods, setPeriods] = useState(PERIODS);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("theme") || "dark";
    } catch {
      return "dark";
    }
  });

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
  const [activeSection, setActiveSection] = useState("teachers");
  const [toolbarExpanded, setToolbarExpanded] = useState(false);
  const hydratedRef = useRef(false);
  const [modals, setModals] = useState({ teacher: false, class: false, absent: false, commonLesson: false, dutyTeacherExcel: false })
  const [pdfImportModal, setPdfImportModal] = useState(false)
  const [excelReplaceModal, setExcelReplaceModal] = useState({ isOpen: false, data: null })
  const [currentCommonLesson, setCurrentCommonLesson] = useState({ day: null, period: null, classId: null })
  const [pdfSchedule, setPdfSchedule] = useState({})
  const [teacherSchedules, setTeacherSchedules] = useState({}) // Store individual teacher class schedules
  const [teacherSchedulesHydrated, setTeacherSchedulesHydrated] = useState(false)
  const classFreeSnapshotRef = useRef('')
  const classAbsenceSnapshotRef = useRef('')
  const classAbsenceStateRef = useRef({})
  const skipNextSupabaseSaveRef = useRef(false)
  const isAnyModalOpenRef = useRef(false)
  const isPlanEditorActiveRef = useRef(false)
  const isClassEditorActiveRef = useRef(false)
  const pendingRealtimeEventsRef = useRef([])
  const [selectedTeacher, setSelectedTeacher] = useState(null) // Selected teacher for modal display
  const scrollRestoreRef = useRef(0)
  const openTeacherSchedule = useCallback((teacherName, schedule) => {
    if (typeof window !== 'undefined') {
      scrollRestoreRef.current =
        window.scrollY ||
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        0
    }
    setSelectedTeacher({ name: teacherName, schedule })
  }, [])

  useLayoutEffect(() => {
    if (selectedTeacher && typeof window !== 'undefined') {
      const target = scrollRestoreRef.current
      window.scrollTo({ top: target, left: 0, behavior: 'auto' })
    }
  }, [selectedTeacher])
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: null
  })

  const toggleToolbar = useCallback(() => {
    setToolbarExpanded(prev => !prev);
  }, []);

  // Toplu: Tüm öğretmenlerin günlük max görev değerini güncelle
  const setAllTeachersMaxDuty = useCallback((value) => {
    const parsed = parseInt(value, 10);
    const safe = Number.isFinite(parsed) ? Math.max(1, Math.min(9, parsed)) : 6;
    setTeachers(prev => prev.map(t => ({ ...t, maxDutyPerDay: safe })));
  }, []);

  const shouldDeferRealtime = useCallback(() => {
    return isAnyModalOpenRef.current || isPlanEditorActiveRef.current || isClassEditorActiveRef.current;
  }, []);

  const handleRealtimeClasses = useCallback((payload, options = {}) => {
    if (!payload) return;
    if (!options.fromQueue && shouldDeferRealtime()) {
      pendingRealtimeEventsRef.current.push({ type: 'classes', payload });
      return;
    }

    const { eventType, new: newRow, old } = payload;
    if (eventType === 'DELETE' && old?.classId) {
      setClasses(prev => prev.filter(cls => cls.classId !== old.classId));
      return;
    }

    const targetRow = newRow || old;
    if (!targetRow?.classId) return;

    setClasses(prev => {
      const idx = prev.findIndex(cls => cls.classId === targetRow.classId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...targetRow };
        return next;
      }
      return [...prev, targetRow];
    });
  }, [shouldDeferRealtime]);

  const handleRealtimeAbsents = useCallback((payload, options = {}) => {
    if (!payload) return;
    // Modal açıkken realtime güncellemelerini kuyruğa al
    if (!options.fromQueue && shouldDeferRealtime()) {
      pendingRealtimeEventsRef.current.push({ type: 'absents', payload });
      return;
    }
    const { eventType, new: newRow, old } = payload;

    if (eventType === 'DELETE' && old?.absentId) {
      setAbsentPeople(prev => prev.filter(item => item.absentId !== old.absentId));
      return;
    }

    if (!newRow?.absentId) return;
    const normalized = normalizeAbsentPeople([newRow], classAbsenceStateRef.current || {})[0] || newRow;

    setAbsentPeople(prev => {
      const idx = prev.findIndex(item => item.absentId === normalized.absentId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = normalized;
        return next;
      }
      return [...prev, normalized];
    });
  }, [shouldDeferRealtime]);

  const handleRealtimeClassFree = useCallback((payload, options = {}) => {
    if (!payload) return;
    // Modal açıkken realtime güncellemelerini kuyruğa al
    if (!options.fromQueue && shouldDeferRealtime()) {
      pendingRealtimeEventsRef.current.push({ type: 'classFree', payload });
      return;
    }
    const dataSnapshot = payload?.new?.data || {};
    const serializedIncoming = stableStringify(dataSnapshot);
    if (serializedIncoming === classFreeSnapshotRef.current) {
      return;
    }
    skipNextSupabaseSaveRef.current = true;
    classFreeSnapshotRef.current = serializedIncoming;
    setClassFree(migrateClassFree(dataSnapshot || {}));
  }, [shouldDeferRealtime]);

  const handleRealtimeClassAbsence = useCallback((payload, options = {}) => {
    if (!payload) return;
    // Modal açıkken realtime güncellemelerini kuyruğa al
    if (!options.fromQueue && shouldDeferRealtime()) {
      pendingRealtimeEventsRef.current.push({ type: 'classAbsence', payload });
      return;
    }
    const { eventType, new: newRow, old } = payload;
    const targetRow = eventType === 'DELETE' ? old : newRow;
    if (!targetRow) return;
    const { day, period, classId } = targetRow;
    const parsedPeriod = Number(period);
    const periodKey = Number.isFinite(parsedPeriod) ? parsedPeriod : (Number.isFinite(period) ? period : null);
    if (!day || !classId || periodKey === null) return;

    skipNextSupabaseSaveRef.current = true;
    setClassAbsence((prev) => {
      const next = { ...prev };
      if (!next[day]) next[day] = {};

      if (eventType === 'DELETE') {
        if (!next[day][periodKey]) return prev;
        const updatedPeriod = { ...next[day][periodKey] };
        delete updatedPeriod[classId];
        if (Object.keys(updatedPeriod).length === 0) {
          delete next[day][periodKey];
        } else {
          next[day][periodKey] = updatedPeriod;
        }
        if (Object.keys(next[day]).length === 0) {
          delete next[day];
        }
        return next;
      }

      next[day] = { ...(next[day] || {}) };
      next[day][periodKey] = { ...(next[day][periodKey] || {}) };
      next[day][periodKey][classId] = newRow.absentId;
      return next;
    });
  }, [shouldDeferRealtime]);

  const handleRealtimeLocks = useCallback((payload, options = {}) => {
    if (!payload) return;
    if (!options.fromQueue && isAnyModalOpenRef.current) {
      pendingRealtimeEventsRef.current.push({ type: 'locks', payload });
      return;
    }

    const { eventType, new: newRow, old } = payload;
    const target = eventType === 'DELETE' ? old : newRow;
    if (!target?.day || typeof target.period === 'undefined' || !target.classId) return;
    const key = `${target.day}|${target.period}|${target.classId}`;

    setLocked((prev = {}) => {
      const next = { ...prev };
      if (eventType === 'DELETE' || !target.teacherId) {
        delete next[key];
      } else {
        next[key] = target.teacherId;
      }
      return next;
    });
  }, []);

  const handleRealtimeCommonLessons = useCallback((payload, options = {}) => {
    if (!payload) return;
    if (!options.fromQueue && isAnyModalOpenRef.current) {
      pendingRealtimeEventsRef.current.push({ type: 'commonLessons', payload });
      return;
    }

    const { eventType, new: newRow, old } = payload;
    const target = eventType === 'DELETE' ? old : newRow;
    const dayKey = target?.day;
    const period = Number(target?.period);
    const classId = target?.class_id;
    const teacherName = target?.teacher_name;
    if (!dayKey || !Number.isFinite(period) || !classId) return;

    setCommonLessons((prev = {}) => {
      const next = { ...prev };
      if (!next[dayKey]) next[dayKey] = {};
      if (!next[dayKey][period]) next[dayKey][period] = {};

      if (eventType === 'DELETE' || !teacherName) {
        delete next[dayKey][period][classId];
        if (Object.keys(next[dayKey][period]).length === 0) {
          delete next[dayKey][period];
        }
        if (Object.keys(next[dayKey]).length === 0) {
          delete next[dayKey];
        }
      } else {
        next[dayKey][period][classId] = teacherName;
      }
      return next;
    });
  }, []);

  const handleRealtimeTeacherSchedules = useCallback((payload, options = {}) => {
    if (!payload) return;
    // Modal açıkken realtime güncellemelerini kuyruğa al
    if (!options.fromQueue && shouldDeferRealtime()) {
      pendingRealtimeEventsRef.current.push({ type: 'teacherSchedules', payload });
      return;
    }

    const { eventType, new: newRow, old } = payload;
    const teacherName =
      newRow?.teacher_name ||
      old?.teacher_name ||
      newRow?.teacherName ||
      old?.teacherName;

    if (!teacherName) return;

    skipNextSupabaseSaveRef.current = true;
    setTeacherSchedulesHydrated(true);

    const isSnapshotRow = teacherName === TEACHER_SCHEDULES_SNAPSHOT_KEY;

    setTeacherSchedules((prev = {}) => {
      if (isSnapshotRow) {
        if (eventType === 'DELETE') {
          return {};
        }
        return newRow?.schedule || {};
      }

      const next = { ...prev };

      if (eventType === 'DELETE') {
        delete next[teacherName];
        return next;
      }

      next[teacherName] = newRow?.schedule || {};
      return next;
    });
  }, [shouldDeferRealtime]);

  const flushPendingRealtimeEvents = useCallback(() => {
    if (!pendingRealtimeEventsRef.current.length) return;
    const queue = pendingRealtimeEventsRef.current.slice();
    pendingRealtimeEventsRef.current = [];
    queue.forEach(({ type, payload }) => {
      switch (type) {
        case 'classes':
          handleRealtimeClasses(payload, { fromQueue: true });
          break;
        case 'absents':
          handleRealtimeAbsents(payload, { fromQueue: true });
          break;
        case 'classFree':
          handleRealtimeClassFree(payload, { fromQueue: true });
          break;
        case 'classAbsence':
          handleRealtimeClassAbsence(payload, { fromQueue: true });
          break;
        case 'teacherSchedules':
          handleRealtimeTeacherSchedules(payload, { fromQueue: true });
          break;
        case 'locks':
          handleRealtimeLocks(payload, { fromQueue: true });
          break;
        case 'commonLessons':
          handleRealtimeCommonLessons(payload, { fromQueue: true });
          break;
        default:
          break;
      }
    });
  }, [handleRealtimeClasses, handleRealtimeAbsents, handleRealtimeClassFree, handleRealtimeClassAbsence, handleRealtimeTeacherSchedules, handleRealtimeLocks, handleRealtimeCommonLessons]);

  const showConfirmation = useCallback((title, message, type = 'warning', onConfirm) => {
    setConfirmationModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: () => {
        onConfirm();
        setConfirmationModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, []);

  const handleDayChange = useCallback((nextDay) => {
    if (!nextDay || nextDay === day) return;
    setDay(nextDay);
  }, [day]);

  // Tema
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (err) {
      logger.warn('Tema kaydetme hatası:', err);
    }
  }, [theme]);

  useEffect(() => {
    classFreeSnapshotRef.current = stableStringify(mapSetToArray(classFree));
  }, [classFree]);

  useEffect(() => {
    classAbsenceStateRef.current = classAbsence;
    classAbsenceSnapshotRef.current = stableStringify(classAbsence);
  }, [classAbsence]);

  // Modal açık/kapalı durumunu izle
  useEffect(() => {
    const isAnyOpen = 
      modals.teacher || 
      modals.class || 
      modals.absent || 
      modals.commonLesson || 
      modals.dutyTeacherExcel ||
      pdfImportModal ||
      excelReplaceModal.isOpen ||
      confirmationModal.isOpen;
    
    // Modal kapandıktan sonra bekleyen realtime event'leri uygula
    isAnyModalOpenRef.current = isAnyOpen;
    if (!isAnyOpen && !isPlanEditorActiveRef.current && hydratedRef.current) {
      flushPendingRealtimeEvents();
    }
  }, [modals, pdfImportModal, excelReplaceModal.isOpen, confirmationModal.isOpen, flushPendingRealtimeEvents]);

  const handlePlanEditorStateChange = useCallback((isActive) => {
    isPlanEditorActiveRef.current = isActive;
    if (!isActive && !isAnyModalOpenRef.current && !isClassEditorActiveRef.current && hydratedRef.current) {
      flushPendingRealtimeEvents();
    }
  }, [flushPendingRealtimeEvents]);

  const handleClassEditorStateChange = useCallback((isActive) => {
    isClassEditorActiveRef.current = isActive;
    if (!isActive && !isAnyModalOpenRef.current && !isPlanEditorActiveRef.current && hydratedRef.current) {
      flushPendingRealtimeEvents();
    }
  }, [flushPendingRealtimeEvents]);

  useEffect(() => {
    const unsubscribe = realtimeSync.subscribe({
      absents: handleRealtimeAbsents,
      classes: handleRealtimeClasses,
      classFree: handleRealtimeClassFree,
      classAbsence: handleRealtimeClassAbsence,
      teacherSchedules: handleRealtimeTeacherSchedules,
      locks: handleRealtimeLocks,
      commonLessons: handleRealtimeCommonLessons,
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [handleRealtimeAbsents, handleRealtimeClasses, handleRealtimeClassFree, handleRealtimeClassAbsence, handleRealtimeTeacherSchedules, handleRealtimeLocks, handleRealtimeCommonLessons]);

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

          // Supabase verilerini state'e yükle
          setTeachers(supabaseData.teachers || [])
          setClasses(supabaseData.classes || [])
          setAbsentPeople(normalizeAbsentPeople(supabaseData.absents || [], supabaseData.classAbsence || {}))
          setTeacherFree(arrayToSetMap(supabaseData.teacherFree || {}))
          setClassFree(migrateClassFree(supabaseData.classFree || {}))
          setClassAbsence(migrateClassAbsence(supabaseData.classAbsence || {}))
          setLocked(supabaseData.locked || {})
          setPdfSchedule(supabaseData.pdfSchedule || {})
          setTeacherSchedules(supabaseData.teacherSchedules || {})
        setTeacherSchedulesHydrated(true)
          setCommonLessons(supabaseData.commonLessons || {})

        if (!DISABLE_LOCAL_STORAGE) {
          // Supabase'den başarılı veri çekildi, localStorage'i güncelle
          const localStoragePayload = {
            day,
            periods,
            teachers: supabaseData.teachers || [],
            classes: supabaseData.classes || [],
            teacherFree: mapSetToArray(supabaseData.teacherFree || {}),
            classFree: mapSetToArray(migrateClassFree(supabaseData.classFree || {})),
            absentPeople: normalizeAbsentPeople(supabaseData.absents || [], supabaseData.classAbsence || {}),
            classAbsence: migrateClassAbsence(supabaseData.classAbsence || {}),
            commonLessons: supabaseData.commonLessons || {},
            options,
            locked: supabaseData.locked || {},
            pdfSchedule: supabaseData.pdfSchedule || {},
            teacherSchedules: supabaseData.teacherSchedules || {},
            lastSaved: Date.now(),
          }
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(localStoragePayload))
          } catch (storageError) {
            logger.warn('LocalStorage update failed:', storageError)
          }
          }

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
  }, [day, periods, options])

  // Otomatik kaydet
  useEffect(() => {
    if (!hydratedRef.current || !teacherSchedulesHydrated) return

    const shouldSkipSupabaseSync = skipNextSupabaseSaveRef.current
    if (shouldSkipSupabaseSync) {
      skipNextSupabaseSaveRef.current = false
    }

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

    if (!shouldSkipSupabaseSync) {
      if (teacherSchedules && Object.keys(teacherSchedules).length > 0) {
      saveTeacherSchedules(teacherSchedules).catch(err => logger.error('Auto save teacherSchedules error:', err));
      }
      bulkSaveClassFree(serializedClassFree).catch(err => logger.error('Auto save classFree error:', err))
      bulkSaveClassAbsence(classAbsence).catch(err => logger.error('Auto save classAbsence error:', err))
      saveCommonLessons(commonLessons).catch(err => logger.error('Auto save commonLessons error:', err));
    }
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

  // Sistem yüklendiğinde nöbetçi öğretmenlerin boş saatlerini otomatik işaretle
  useEffect(() => {
    if (hydratedRef.current && teacherSchedules && pdfSchedule) {
      const timer = setTimeout(() => {
        autoMarkDutyTeachersFree();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [teacherSchedules, pdfSchedule, autoMarkDutyTeachersFree]);

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
    
      setClassFree((prev) => {
      // Mevcut Set'i al veya boş bir Set oluştur
      const prevSet = prev[day]?.[p] || new Set();
      
      // Önce mevcut durumu kontrol et (callback içinde güvenli)
      wasSelected = prevSet.has(cid);
      
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
    []
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
      if (absentId) next[day][period][classId] = absentId;
      else delete next[day][period][classId];
      upsertClassAbsence({ day, period, classId, absentId }).catch((err) => {
        logger.error('Class absence upsert error:', err);
      });
      return next;
    });
  }, []);

  const handleSetCommonLesson = useCallback((day, period, classId, teacherName) => {
    setCommonLessons((prev) => {
      const next = { ...prev };
      if (!next[day]) next[day] = {};
      if (!next[day][period]) next[day][period] = {};
      if (teacherName) next[day][period][classId] = teacherName;
      else delete next[day][period][classId];
      return next;
    });
  }, []);


  const handleOpenCommonLessonModal = useCallback((day, period, classId) => {
    setCurrentCommonLesson({ day, period, classId });
    setModals(m => ({ ...m, commonLesson: true }));
  }, []);

  const handleCloseCommonLessonModal = useCallback(() => {
    setModals(m => ({ ...m, commonLesson: false }));
    setCurrentCommonLesson({ day: null, period: null, classId: null });
  }, []);

  const handleOpenDutyTeacherExcelModal = useCallback(() => {
    setModals(m => ({ ...m, dutyTeacherExcel: true }));
  }, []);

  const handleCloseDutyTeacherExcelModal = useCallback(() => {
    setModals(m => ({ ...m, dutyTeacherExcel: false }));
  }, []);

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
  }, [excelReplaceModal, addNotification, importDutyTeachersData, setActiveSection]);

  const handleExcelReplaceCancel = useCallback(() => {
    setExcelReplaceModal({ isOpen: false, data: null });
    addNotification("Excel yükleme iptal edildi", "info");
  }, [addNotification]);

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
        // Modern modal ile onay iste
        setExcelReplaceModal({
          isOpen: true,
          data: data,
          existingCount: existingTeachers.length
        });
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
  }, [teachers, classes, addNotification]);

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
    try {
      const created = await insertClass({ className: data.className });
      setClasses((prev) => [...prev, created]);
    addNotification(`${data.className} eklendi`, "success");
    } catch (error) {
      logger.error('Class insert error:', error);
      addNotification("Sınıf eklenemedi", "error");
    }
  };
  const addAbsent = async (data) => {
  const effectiveDays = [day];
  const dayLabelMap = new Map(DAYS.map(d => [d.key, d.label]));
  const normalizeDayKey = (value = '') => {
    const trimmed = String(value || '').trim().toLowerCase();
    if (!trimmed) return '';

    const removeDiacritics = (str) =>
      typeof str.normalize === 'function'
        ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        : str;

    const sanitized = removeDiacritics(trimmed).replace(/[^a-z]/g, '');

    const startsWithAny = (needle, ...haystack) =>
      haystack.some(prefix => needle.startsWith(prefix));

    if (startsWithAny(sanitized, 'mon', 'paz')) return 'monday';
    if (startsWithAny(sanitized, 'tue', 'sali', 'sal')) return 'tuesday';
    if (startsWithAny(sanitized, 'wed', 'cars', 'car', 'çar', 'carsamba')) return 'wednesday';
    if (startsWithAny(sanitized, 'thu', 'per', 'pers', 'persembe')) return 'thursday';
    if (startsWithAny(sanitized, 'fri', 'cum')) return 'friday';

    return sanitized || trimmed;
  };

  const resolveDaySchedule = (scheduleObj = {}, requestedKey) => {
    if (!scheduleObj || typeof scheduleObj !== 'object') return {};
    if (!requestedKey) return {};
    const normalizedTarget = normalizeDayKey(requestedKey);

    const availableKeys = Object.keys(scheduleObj);
    const directKey = availableKeys.find(
      key => normalizeDayKey(key) === normalizedTarget
    );

    if (directKey && scheduleObj[directKey]) {
      return scheduleObj[directKey] || {};
    }

    logger.warn(
      `[addAbsent] resolveDaySchedule: Could not find schedule for "${requestedKey}" (normalized: "${normalizedTarget}"). Available keys:`,
      availableKeys
    );

    return {};
  };
  // 1) Mazeret kaydını ekle (gün bilgisiyle)
  let createdAbsent;
  try {
    createdAbsent = await insertAbsent({ name: data.name, teacherId: data.teacherId, reason: data.reason, days: effectiveDays });
    // Realtime sync zaten ekleyecek, manuel eklemeyelim (duplicate önlemek için)
  } catch (error) {
    logger.error('Absent insert error:', error);
    addNotification('Mazeret kaydedilemedi', 'error');
    return;
  }

  const absentId = createdAbsent?.absentId;
  if (!absentId) {
    logger.error('Absent ID not found after insert');
    addNotification('Mazeret kaydı oluşturulamadı', 'error');
    return;
  }
  const dayLabelText = effectiveDays.map(key => dayLabelMap.get(key) || key).join(', ');
  addNotification(`${data.name} (${data.reason}) eklendi${dayLabelText ? ` — Günler: ${dayLabelText}` : ''}`, 'success');

  // 2) Seçilen günlere göre öğretmenin derslerini işaretle
  try {
    if (!teacherSchedules || Object.keys(teacherSchedules).length === 0) {
      logger.warn(`[addAbsent] teacherSchedules is empty or null`);
      return;
    }

    const dayKeyMapping = { Mon: 'monday', Tue: 'tuesday', Wed: 'wednesday', Thu: 'thursday', Fri: 'friday' };

    // İsim eşleştirme (normalize edilmiş)
    const targetNameNorm = normalizeForComparison(data.name);
    logger.log(`[addAbsent] Looking for teacher: "${data.name}" (normalized: "${targetNameNorm}")`);
    logger.log(`[addAbsent] Available teachers in teacherSchedules:`, Object.keys(teacherSchedules));
    const matchedTeacherName = Object.keys(teacherSchedules).find((n) => normalizeForComparison(n) === targetNameNorm);
    if (!matchedTeacherName) {
      logger.warn(`[addAbsent] Teacher not found in teacherSchedules: "${data.name}"`);
      return;
    }
    logger.log(`[addAbsent] Found teacher: "${matchedTeacherName}"`);

    const teacherSchedule = teacherSchedules[matchedTeacherName] || {};
    logger.log(`[addAbsent] Teacher schedule keys for ${matchedTeacherName}:`, Object.keys(teacherSchedule || {}));
    logger.log(
      `[addAbsent] Teacher schedule normalized keys:`,
      Object.keys(teacherSchedule || {}).map(key => `${key} -> ${normalizeDayKey(key)}`)
    );
    const daySchedules = {};

    const normalizeClassKey = (name = '') => String(name || '').trim().toUpperCase();
    const classNameCache = new Map();
    const existingClassIds = new Set(classes.map((c) => c.classId));
    classes.forEach((c) => {
      classNameCache.set(normalizeClassKey(c.className), c);
    });
    const classNamesToResolve = new Map();
    const classResolutionPromises = new Map();
    const newlyDiscoveredClasses = [];

    const ensureClassRecord = async (rawName) => {
      const canonicalLabel = String(rawName || '').trim();
      if (!canonicalLabel) return null;
      const key = normalizeClassKey(canonicalLabel);
      if (classNameCache.has(key)) {
        return classNameCache.get(key);
      }
      if (classResolutionPromises.has(key)) {
        return classResolutionPromises.get(key);
      }

      const promise = (async () => {
        let record = await getClassByName(canonicalLabel);
        if (!record) {
          record = await insertClass({ className: canonicalLabel });
        }
        classNameCache.set(key, record);
        if (!existingClassIds.has(record.classId)) {
          existingClassIds.add(record.classId);
          newlyDiscoveredClasses.push(record);
        }
        return record;
      })();

      classResolutionPromises.set(key, promise);
      return promise;
    };

    const classNameToId = new Map();

    effectiveDays.forEach((uiDay) => {
      const scheduleDayKey = dayKeyMapping[uiDay];
      if (!scheduleDayKey) {
        logger.warn(`[addAbsent] No scheduleDayKey for uiDay: ${uiDay}`);
        return;
      }
      let scheduleForDay = resolveDaySchedule(teacherSchedule, scheduleDayKey);
      if (!scheduleForDay || Object.keys(scheduleForDay).length === 0) {
        logger.warn(`[addAbsent] teacherSchedule[${scheduleDayKey}] is empty or undefined for uiDay: ${uiDay}`);
      }
      daySchedules[uiDay] = scheduleForDay || {};
      logger.log(`[addAbsent] uiDay: ${uiDay}, scheduleDayKey: ${scheduleDayKey}, scheduleForDay:`, scheduleForDay);

      const classListForDay = Array.from(new Set(Object.values(scheduleForDay).filter(Boolean)));
      logger.log(`[addAbsent] classListForDay for ${uiDay}:`, classListForDay);
      classListForDay.forEach((className) => {
        const canonicalLabel = String(className).trim();
        if (!canonicalLabel) return;
        const key = normalizeClassKey(canonicalLabel);
        if (!classNamesToResolve.has(key)) {
          classNamesToResolve.set(key, canonicalLabel);
        }
      });
    });

    // Önce classNameCache'deki TÜM mevcut sınıfları classNameToId'ye ekle
    // Bu, schedule'dan gelen sınıf isimlerinin cache'deki sınıflarla eşleşmesini sağlar
    classNameCache.forEach((classRecord, key) => {
      if (classRecord?.classId) {
        classNameToId.set(key, classRecord.classId);
      }
    });

    // Schedule'dan gelen tüm sınıf isimlerini normalize edip topla
    // Eğer daySchedules boşsa, teacherSchedule'dan direkt al
    const scheduleClassNamesMap = new Map(); // normalizedKey -> originalClassName
    effectiveDays.forEach((uiDay) => {
      let scheduleForDay = daySchedules[uiDay];
      if (!scheduleForDay || Object.keys(scheduleForDay).length === 0) {
        // daySchedules boşsa, teacherSchedule'dan direkt al
        const scheduleDayKey = dayKeyMapping[uiDay];
        if (scheduleDayKey) {
          scheduleForDay = resolveDaySchedule(teacherSchedule, scheduleDayKey);
          daySchedules[uiDay] = scheduleForDay; // daySchedules'ı güncelle
          logger.log(`[addAbsent] daySchedules[${uiDay}] was empty, loaded from teacherSchedule[${scheduleDayKey}]:`, scheduleForDay);
        }
      }
      Object.values(scheduleForDay || {}).forEach((className) => {
        if (className) {
          const normalizedKey = normalizeClassKey(className);
          if (!scheduleClassNamesMap.has(normalizedKey)) {
            scheduleClassNamesMap.set(normalizedKey, String(className).trim());
          }
        }
      });
    });

    // Schedule'dan gelen her sınıf ismi için classNameToId'de kayıt olduğundan emin ol
    await Promise.all(
      Array.from(scheduleClassNamesMap.entries()).map(async ([normalizedKey, originalClassName]) => {
        if (!classNameToId.has(normalizedKey)) {
          // Önce cache'de bu sınıf var mı kontrol et
          if (classNameCache.has(normalizedKey)) {
            const cachedClass = classNameCache.get(normalizedKey);
            if (cachedClass?.classId) {
              classNameToId.set(normalizedKey, cachedClass.classId);
              return;
            }
          }
          // Cache'de yoksa, classNamesToResolve'dan label'ı bul ve ensureClassRecord ile resolve et
          const label = classNamesToResolve.get(normalizedKey);
          if (label) {
            const record = await ensureClassRecord(label);
            if (record) {
              classNameToId.set(normalizedKey, record.classId);
            }
          } else {
            // classNamesToResolve'da da yoksa, orijinal sınıf ismini kullan ve resolve et
            const record = await ensureClassRecord(originalClassName);
            if (record) {
              classNameToId.set(normalizedKey, record.classId);
            }
          }
        }
      })
    );

    // classNamesToResolve'daki tüm sınıfları da resolve et (ekstra güvenlik için)
    await Promise.all(
      Array.from(classNamesToResolve.entries()).map(async ([key, label]) => {
        if (!classNameToId.has(key)) {
          const record = await ensureClassRecord(label);
          if (record) {
            classNameToId.set(key, record.classId);
          }
        }
      })
    );

    // Debug: classNameToId Map'inin içeriğini kontrol et
    logger.log(`[addAbsent] classNameToId Map size: ${classNameToId.size}`);
    logger.log(`[addAbsent] classNameToId keys:`, Array.from(classNameToId.keys()));
    logger.log(`[addAbsent] classNamesToResolve keys:`, Array.from(classNamesToResolve.keys()));
    logger.log(`[addAbsent] scheduleClassNamesMap:`, Array.from(scheduleClassNamesMap.entries()));
    logger.log(`[addAbsent] daySchedules:`, daySchedules);
    logger.log(`[addAbsent] teacherSchedule:`, teacherSchedule);

    if (newlyDiscoveredClasses.length > 0) {
      setClasses((prev) => {
        const existingIds = new Set(prev.map((c) => c.classId));
        const additions = newlyDiscoveredClasses.filter((c) => !existingIds.has(c.classId));
        if (!additions.length) return prev;
        const next = [...prev, ...additions];
        const unique = [];
        const seen = new Set();
        next.forEach((cls) => {
          if (!cls?.classId || seen.has(cls.classId)) return;
          seen.add(cls.classId);
          unique.push(cls);
        });
        return unique;
      });
    }

    const classFreeOps = [];
    const classAbsenceOps = [];

    effectiveDays.forEach((uiDay) => {
      const scheduleDayKey = dayKeyMapping[uiDay];
      let scheduleForDay = daySchedules[uiDay];

      if (!scheduleForDay || Object.keys(scheduleForDay).length === 0) {
        if (scheduleDayKey) {
          scheduleForDay = resolveDaySchedule(teacherSchedule, scheduleDayKey);
          daySchedules[uiDay] = scheduleForDay;
          logger.log(`[addAbsent] daySchedules[${uiDay}] was empty, using teacherSchedule[${scheduleDayKey}]:`, scheduleForDay);
        } else {
          scheduleForDay = {};
        }
      }

      logger.log(`[addAbsent] Processing day ${uiDay}, scheduleForDay:`, scheduleForDay);

      Object.entries(scheduleForDay).forEach(([periodStr, className]) => {
        const period = Number(periodStr);
        if (!className || !periods.includes(period)) {
          logger.log(`[addAbsent] Skipping: className="${className}", period=${period}`);
          return;
        }
        const normalizedKey = normalizeClassKey(className);
        const id = classNameToId.get(normalizedKey);
        logger.log(`[addAbsent] className="${className}", normalizedKey="${normalizedKey}", id=${id}`);
        if (!id) {
          logger.warn(`[addAbsent] Sınıf ID bulunamadı: "${className}" (normalized: "${normalizedKey}")`);
          logger.warn(`[addAbsent] classNameToId keys:`, Array.from(classNameToId.keys()));
          logger.warn(`[addAbsent] classNameToId entries:`, Array.from(classNameToId.entries()));
          return;
        }
        classFreeOps.push({ day: uiDay, period, classId: id });
        classAbsenceOps.push({ day: uiDay, period, classId: id, absentId });
        logger.log(`[addAbsent] Queued ops for day ${uiDay}, period ${period}, classId ${id}`);
      });
    });

    logger.log(`[addAbsent] classFreeOps length: ${classFreeOps.length}`, classFreeOps);
    logger.log(`[addAbsent] classAbsenceOps length: ${classAbsenceOps.length}`, classAbsenceOps);

    if (classFreeOps.length > 0) {
    setClassFree((prev) => {
      const next = { ...prev };
      const ensureSet = (d, p) => {
        if (!next[d]) next[d] = {};
          if (!(next[d][p] instanceof Set)) {
            next[d][p] = new Set(Array.isArray(next[d][p]) ? next[d][p] : []);
          }
        };

        classFreeOps.forEach(({ day: dKey, period: per, classId: cId }) => {
          ensureSet(dKey, per);
          next[dKey][per].add(cId);
      });

      return next;
    });
    } else {
      logger.warn('[addAbsent] No classFreeOps generated');
    }

    if (classAbsenceOps.length > 0) {
    setClassAbsence((prev) => {
      const next = { ...prev };

        classAbsenceOps.forEach(({ day: dKey, period: per, classId: cId, absentId: aId }) => {
          if (!next[dKey]) next[dKey] = {};
          if (!next[dKey][per]) next[dKey][per] = {};
          next[dKey][per][cId] = aId;
      });

      return next;
    });
    } else {
      logger.warn('[addAbsent] No classAbsenceOps generated');
    }

    try {
      await Promise.all(classFreeOps.map(({ day: dKey, period: per, classId: cId }) =>
      upsertClassFree({ day: dKey, period: per, classId: cId, isSelected: true })
      ));
    } catch (err) {
      logger.error('Class free bulk insert error:', err);
      addNotification('Sınıfların boşluk bilgisi Supabase’e yazılamadı. Lütfen tekrar deneyin.', 'error');
    }

    try {
      await Promise.all(classAbsenceOps.map((payload) => upsertClassAbsence(payload)));
    } catch (err) {
      logger.error('Class absence bulk insert error:', err);
      addNotification('Mazeretli sınıf işaretleri Supabase’e kaydedilemedi.', 'error');
    }

    const addedCount = newlyDiscoveredClasses.length;
    let markedCount = 0;
    effectiveDays.forEach((uiDay) => {
      markedCount += Object.keys(daySchedules[uiDay] || {}).length;
    });

    if (addedCount > 0 || markedCount > 0) {
      addNotification(
        `${data.name} için ${addedCount} sınıf eklendi, ${markedCount} saat işaretlendi`,
        'info'
      );
    }
  } catch (err) {
    console.warn('Mazeret eklemede sınıf/periyot işaretleme hatası:', err);
    addNotification(`Sınıf işaretleme başarısız: ${err.message || err}`, 'error');
  }
  };

  const deleteAbsent = useCallback(async (absentIdToDelete) => {
    try {
      await deleteAbsentById(absentIdToDelete)
      await deleteClassAbsenceByAbsent(absentIdToDelete)
    } catch (error) {
      logger.error('Absent delete error:', error)
      addNotification('Mazeret silinemedi', 'error')
      return
    }
    const validDayKeys = new Set(DAYS.map(d => d.key));
    const targetAbsent = absentPeople.find(p => p.absentId === absentIdToDelete);
    const daysToProcess = (targetAbsent?.days || []).filter(dayKey => validDayKeys.has(dayKey));
    const fallbackDays = daysToProcess.length > 0 ? daysToProcess : Array.from(validDayKeys);

    // 1) İlgili günlerde bu mazeretliye bağlı sınıfları topla
    const affectedClassIds = new Set();
    fallbackDays.forEach((dayKey) => {
      const dayAbs = classAbsence?.[dayKey] || {};
      Object.values(dayAbs).forEach((byClass) => {
        Object.entries(byClass || {}).forEach(([classId, aId]) => {
          if (aId === absentIdToDelete) {
            affectedClassIds.add(classId);
          }
        });
      });
    });

    // 2) classAbsence içinden bu mazeretliyi tüm gün/periyotlardan temizle
    const updatedClassAbsence = (() => {
      const next = { ...classAbsence };
      Object.keys(next).forEach(dk => {
        Object.keys(next[dk] || {}).forEach(pk => {
          const per = { ...(next[dk][pk] || {}) };
          Object.keys(per).forEach(cid => {
            if (per[cid] === absentIdToDelete) delete per[cid];
          });
          if (Object.keys(per).length === 0) delete next[dk][pk];
        });
        if (next[dk] && Object.keys(next[dk]).length === 0) delete next[dk];
      });
      return next;
    })();

    setClassAbsence(() => updatedClassAbsence);

      const stillHasAbsent = new Set();
      fallbackDays.forEach((dayKey) => {
        const dayRecords = classAbsence?.[dayKey] || {};
        Object.values(dayRecords).forEach(byClass => {
          Object.entries(byClass || {}).forEach(([cid, aId]) => {
            if (aId !== absentIdToDelete) {
              stillHasAbsent.add(cid);
            }
          });
        });
      });

    const classesToRemove = Array.from(affectedClassIds).filter(cid => !stillHasAbsent.has(cid));

    if (classesToRemove.length > 0) {
      try {
        await Promise.all(classesToRemove.map((cid) => deleteClassById(cid)));
      } catch (err) {
        logger.error('Auto class delete error:', err);
      }
    }

    if (classesToRemove.length > 0) {
        setClassFree(prev => {
          const next = { ...prev };
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
      }

    setClasses(prevClasses => {
      const filtered = prevClasses.filter(c => !classesToRemove.includes(c.classId));
      if (classesToRemove.length > 0) {
        addNotification(`${classesToRemove.length} sınıf otomatik kaldırıldı (mazeretli kalmadı)`, 'info');
      }
      return filtered;
    });

    // 4) Mazeret kaydını kaldır
    setAbsentPeople(prev => prev.filter(p => p.absentId !== absentIdToDelete));
    addNotification("Mazeret kaydı silindi", "info");
  }, [absentPeople, classAbsence, setClassAbsence, setClassFree, setClasses, setAbsentPeople, addNotification]);

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
    addNotification("Sınıf silindi", "info");
    } catch (error) {
      logger.error('Class delete error:', error)
      addNotification('Sınıf silinemedi', 'error')
    }
  };

  /* ======================= Atama verilerini hazırlama ======================= */

  // Performance: Öğretmen Map (O(1) lookup)
  const teacherMap = useMemo(() => 
    new Map(teachers.map(t => [t.teacherId, t])), 
    [teachers]
  );

  const absentPeopleForCurrentDay = useMemo(() => {
    if (!Array.isArray(absentPeople)) return [];
    return absentPeople.filter(person => {
      if (!person || typeof person !== 'object') return false;
      if (!Array.isArray(person.days) || person.days.length === 0) return true;
      return person.days.includes(day);
    });
  }, [absentPeople, day]);

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

  // PDF'den gelen schedule verisine göre o günün nöbetçi öğretmenlerini filtrele
  const teachersForCurrentDay = useMemo(() => {
    // Gün adı mapping: sistem gün adları -> PDF gün adları
    const dayMapping = {
      'Mon': 'monday',
      'Tue': 'tuesday', 
      'Wed': 'wednesday',
      'Thu': 'thursday',
      'Fri': 'friday'
    };
    
    const pdfDayKey = dayMapping[day];
    
    if (!pdfSchedule[pdfDayKey] || Object.keys(pdfSchedule[pdfDayKey]).length === 0) {
      // PDF schedule yoksa tüm öğretmenleri göster
      return teachers;
    }
    
    // O günün nöbetçi öğretmenlerini topla
    const dutyTeachers = new Set();
    Object.values(pdfSchedule[pdfDayKey]).forEach(periodTeachers => {
      if (Array.isArray(periodTeachers)) {
        periodTeachers.forEach(teacherName => {
          // Öğretmen adını normalize et ve eşleştir
          const normalizedName = teacherName.toUpperCase().replace(/[ÇĞIİÖŞÜ]/g, (match) => {
            const map = { 'Ç': 'C', 'Ğ': 'G', 'I': 'I', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U' };
            return map[match] || match;
          });
          
          // Öğretmen listesinde eşleşen öğretmeni bul
          const matchingTeacher = teachers.find(t => {
            const normalizedTeacherName = t.teacherName.toUpperCase().replace(/[ÇĞIİÖŞÜ]/g, (match) => {
              const map = { 'Ç': 'C', 'Ğ': 'G', 'I': 'I', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U' };
              return map[match] || match;
            });
            return normalizedTeacherName === normalizedName;
          });
          
          if (matchingTeacher) {
            dutyTeachers.add(matchingTeacher.teacherId);
          }
        });
      }
    });
    
    // Sadece o gün nöbetçi olan öğretmenleri döndür
    // Önce teacherId ile eşleştirmeyi dene
    let filteredTeachers = teachers.filter(t => dutyTeachers.has(t.teacherId));
    
    // Eğer hiç eşleşme yoksa, teacherName ile eşleştirmeyi dene
    if (filteredTeachers.length === 0) {
      filteredTeachers = teachers.filter(t => {
        const normalizedName = normalizeForComparison(t.teacherName);
        return dutyTeachers.has(normalizedName);
      });
    }
    
    console.log('Filtered teachers count:', filteredTeachers.length);
    console.log('Filtered teachers:', filteredTeachers.map(t => t.teacherName));
    return filteredTeachers;
  }, [teachers, pdfSchedule, day]);

  const freeTeachersByDay = useMemo(() => {
    // Okula gelemeyen öğretmenlerin adlarını normalize edilmiş halde topla
    const absentNames = new Set(
      absentPeople.map(a => a.name.trim().toLowerCase().replace(/\s+/g, ' '))
    );
    
    return {
      [day]: Object.fromEntries(
        periods.map(p => {
          const freeTids = Array.from(teacherFree[p] || []);
          // Absent olmayan öğretmenleri filtrele (Map ile O(1) lookup)
          const available = freeTids.filter(tid => {
            const teacher = teacherMap.get(tid); // O(1) instead of O(n)
            if (!teacher) return false;
            const teacherName = teacher.teacherName.trim().toLowerCase().replace(/\s+/g, ' ');
            return !absentNames.has(teacherName);
          });
          return [p, new Set(available)];
        })
      )
    };
  }, [teacherFree, day, periods, teacherMap, absentPeople]);
  const absentIdsForCurrentDay = useMemo(() => {
    return new Set(absentPeopleForCurrentDay.map(person => person.absentId));
  }, [absentPeopleForCurrentDay]);

  const filteredClassAbsence = useMemo(() => {
    const result = { [day]: {} };
    const dayAbsences = classAbsence?.[day] || {};
    Object.entries(dayAbsences).forEach(([periodKey, classesForPeriod]) => {
      const filtered = Object.entries(classesForPeriod || {}).reduce((acc, [classId, absentId]) => {
        if (absentIdsForCurrentDay.has(absentId)) {
          acc[classId] = absentId;
        }
        return acc;
      }, {});
      if (Object.keys(filtered).length > 0) {
        result[day][periodKey] = filtered;
      }
    });
    return result;
  }, [classAbsence, day, absentIdsForCurrentDay]);

  const classFreeForCurrentDay = useMemo(() => {
    const dayData = classFree?.[day];
    if (dayData && Object.keys(dayData).length > 0) {
      const normalized = {};
      periods.forEach((p) => {
        const set = dayData[p];
        normalized[p] = new Set(
          set instanceof Set ? Array.from(set) : Array.isArray(set) ? set : []
        );
      });
      return { [day]: normalized };
    }

    const fallback = {};
    periods.forEach((p) => {
      fallback[p] = new Set();
      Object.values(classFree || {}).forEach((dayMap) => {
        const set = dayMap?.[p];
        if (set instanceof Set) {
          set.forEach((cid) => fallback[p].add(cid));
        } else if (Array.isArray(set)) {
          set.forEach((cid) => fallback[p].add(cid));
        }
      });
    });
    return { [day]: fallback };
  }, [classFree, day, periods]);

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
    const validClassIds = new Set(classes.map((c) => c.classId))
    const dayFree = { [day]: {} }

    periods.forEach((p) => {
      const combined = new Set()
      const freeSet = classFree?.[day]?.[p]
      if (freeSet instanceof Set) {
        freeSet.forEach((cid) => validClassIds.has(cid) && combined.add(cid))
      } else if (Array.isArray(freeSet)) {
        freeSet.forEach((cid) => validClassIds.has(cid) && combined.add(cid))
      }

      const absenceMap = filteredClassAbsence?.[day]?.[p]
      if (absenceMap && typeof absenceMap === 'object') {
        Object.keys(absenceMap).forEach((classId) => {
          if (validClassIds.has(classId)) {
            combined.add(classId)
          }
        })
      }

      dayFree[day][p] = combined
    })

    return dayFree
  }, [classes, classFree, filteredClassAbsence, day, periods])

  const applyFairnessAdjustments = useCallback((baseSchedule) => {
    if (!baseSchedule || !baseSchedule[day]) return baseSchedule;
    const daySchedule = baseSchedule[day] || {};
    const freeMap = freeTeachersByDay[day] || {};
    const dayFreeClasses = freeClassesByDay?.[day] || {};
    const dayCommonLessons = commonLessons?.[day] || {};

    const assignmentCounts = {};
    const teacherPeriods = {};
    const slotUsage = {};

    periods.forEach((period) => {
      const rows = daySchedule[period] || [];
      slotUsage[period] = {};
      rows.forEach(({ teacherId }) => {
        if (!teacherId) return;
        assignmentCounts[teacherId] = (assignmentCounts[teacherId] || 0) + 1;
        slotUsage[period][teacherId] = (slotUsage[period][teacherId] || 0) + 1;
        if (!teacherPeriods[teacherId]) teacherPeriods[teacherId] = [];
        teacherPeriods[teacherId].push(period);
      });
    });
    Object.values(teacherPeriods).forEach(list => list.sort((a, b) => a - b));

    const dayNeedsByPeriod = new Map();
    periods.forEach((period) => {
      const baseSet = dayFreeClasses?.[period];
      const needed = baseSet instanceof Set
        ? new Set(baseSet)
        : new Set(Array.isArray(baseSet) ? baseSet : []);
      (daySchedule[period] || []).forEach(({ classId }) => needed.delete(classId));
      dayNeedsByPeriod.set(period, needed);
    });

    const zeroDutyTeachers = teachersForCurrentDay
      .map(t => t.teacherId)
      .filter(id => id && (assignmentCounts[id] || 0) === 0);

    if (zeroDutyTeachers.length === 0) {
      return baseSchedule;
    }

    const parsedMaxPerSlot = Number.parseInt(options?.maxClassesPerSlot, 10);
    const maxPerSlot = Number.isFinite(parsedMaxPerSlot) && parsedMaxPerSlot > 0 ? parsedMaxPerSlot : 1;

    const isTeacherFree = (period, teacherId) => {
      const source = freeMap[period];
      if (!source) return false;
      if (source instanceof Set) return source.has(teacherId);
      if (Array.isArray(source)) return source.includes(teacherId);
      return false;
    };

    const hasConsecutiveConflict = (teacherId, targetPeriod) => {
      if (!options?.preventConsecutive) return false;
      const assigned = teacherPeriods[teacherId] || [];
      return assigned.some(p => Math.abs(p - targetPeriod) === 1);
    };

    let adjustedSchedule = baseSchedule;
    let adjustedDay = daySchedule;
    let changed = false;

    const ensureClone = () => {
      if (changed) return;
      adjustedDay = Object.fromEntries(
        Object.entries(daySchedule).map(([period, assignments]) => [
          period,
          Array.isArray(assignments) ? assignments.map(item => ({ ...item })) : [],
        ])
      );
      adjustedSchedule = { ...baseSchedule, [day]: adjustedDay };
      changed = true;
    };

    const getMaxDuty = (teacherId) => {
      const record = teacherMap.get(teacherId);
      const parsed = Number.parseInt(record?.maxDutyPerDay, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 6;
    };

    const canTakePeriod = (teacherId, period) => {
      if (!isTeacherFree(period, teacherId)) return false;
      if ((assignmentCounts[teacherId] || 0) >= getMaxDuty(teacherId)) return false;
      if ((slotUsage[period]?.[teacherId] || 0) >= maxPerSlot) return false;
      if (hasConsecutiveConflict(teacherId, period)) return false;
      return true;
    };

    const tryFillFromNeeds = (teacherId, availablePeriods) => {
      for (const period of availablePeriods) {
        const needSet = dayNeedsByPeriod.get(period);
        if (!needSet || needSet.size === 0) continue;

        for (const classId of Array.from(needSet)) {
          const lockKey = `${day}|${period}|${classId}`;
          const lockOwner = locked?.[lockKey];
          if (lockOwner && lockOwner !== MANUAL_EMPTY_TEACHER_ID) continue;
          if (dayCommonLessons?.[period]?.[classId]) continue;
          if (!canTakePeriod(teacherId, period)) continue;

          ensureClone();
          if (!adjustedDay[period]) adjustedDay[period] = [];
          adjustedDay[period].push({ classId, teacherId });
          assignmentCounts[teacherId] = (assignmentCounts[teacherId] || 0) + 1;
          teacherPeriods[teacherId] = [...(teacherPeriods[teacherId] || []), period].sort((a, b) => a - b);
          slotUsage[period] = slotUsage[period] || {};
          slotUsage[period][teacherId] = (slotUsage[period][teacherId] || 0) + 1;
          needSet.delete(classId);
          return true;
        }
      }
      return false;
    };

    const trySwapAssignments = (teacherId, availablePeriods) => {
      for (const period of availablePeriods) {
        const assignments = adjustedDay[period] || [];
        if (!assignments.length) continue;

        const candidates = assignments
          .map((assignment, idx) => ({
            idx,
            classId: assignment.classId,
            teacherId: assignment.teacherId,
            donorCount: assignmentCounts[assignment.teacherId] || 0,
          }))
          .filter(candidate =>
            candidate.teacherId &&
            candidate.teacherId !== teacherId &&
            candidate.donorCount > (assignmentCounts[teacherId] || 0) &&
            candidate.donorCount > 1
          )
          .sort((a, b) => b.donorCount - a.donorCount || a.idx - b.idx);

        for (const candidate of candidates) {
          const lockKey = `${day}|${period}|${candidate.classId}`;
          const lockOwner = locked?.[lockKey];
          if (lockOwner && lockOwner !== MANUAL_EMPTY_TEACHER_ID) continue;
          if (!canTakePeriod(teacherId, period)) continue;

          ensureClone();
          assignments[candidate.idx] = { classId: candidate.classId, teacherId };

          assignmentCounts[candidate.teacherId] = Math.max(
            (assignmentCounts[candidate.teacherId] || 0) - 1,
            0
          );
          assignmentCounts[teacherId] = (assignmentCounts[teacherId] || 0) + 1;

          slotUsage[period] = slotUsage[period] || {};
          slotUsage[period][teacherId] = (slotUsage[period][teacherId] || 0) + 1;
          if (slotUsage[period][candidate.teacherId]) {
            slotUsage[period][candidate.teacherId] = Math.max(slotUsage[period][candidate.teacherId] - 1, 0);
          }

          const donorPeriods = [...(teacherPeriods[candidate.teacherId] || [])];
          const index = donorPeriods.indexOf(period);
          if (index >= 0) donorPeriods.splice(index, 1);
          teacherPeriods[candidate.teacherId] = donorPeriods;
          teacherPeriods[teacherId] = [...(teacherPeriods[teacherId] || []), period].sort((a, b) => a - b);
          return true;
        }
      }
      return false;
    };

    zeroDutyTeachers.forEach((teacherId) => {
      const availablePeriods = periods.filter((period) => isTeacherFree(period, teacherId));
      if (!availablePeriods.length) return;

      if (tryFillFromNeeds(teacherId, availablePeriods)) {
        return;
      }

      trySwapAssignments(teacherId, availablePeriods);
    });

    return changed ? adjustedSchedule : baseSchedule;
  }, [day, periods, teachersForCurrentDay, freeTeachersByDay, locked, options, teacherMap, freeClassesByDay, commonLessons]);

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
      
      addNotification({
        message: `${invalidEntries.length} geçersiz öğretmen kaydı temizlendi (${invalidEntries.map(([, tid]) => tid).join(', ')})`,
        type: 'info',
        duration: 4000
      });
    }
  }, [teachers, locked, addNotification]); // teachers veya kilitler değiştiğinde çalışır

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
    () => applyFairnessAdjustments(rawAssignment),
    [rawAssignment, applyFairnessAdjustments]
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
      ;(assignmentsForDay[period] || []).forEach(({ classId }) => remainingClassIds.delete(classId))
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
        ;(assignmentsForDay[period] || []).forEach(({ classId }) => classesNeedingSet.delete(classId))
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
          const absId = classAbsence?.[day]?.[p]?.[a.classId];
          const abs = absId ? absentMap[absId] : null;
          const reason = abs ? (REASON_LABELS[abs.reason] || abs.reason) : "";
          const suffix = abs ? ` (${abs.name} - ${reason})` : "";
          const teacherDisplayName = t?.teacherName || (a.teacherId.startsWith('auto_') ? 'Bilinmeyen Öğretmen' : a.teacherId);
          assignmentLines.push(`${p}. saat — ${c?.className || a.classId}: ${teacherDisplayName}${suffix}`);
        });

        if (commonLessons?.[day]?.[p]) {
          Object.entries(commonLessons[day][p]).forEach(([classId, teacherName]) => {
            const c = classes.find(x => x.classId === classId);
            assignmentLines.push(`${p}. saat — ${c?.className || classId}: Ders Birleştirilecek - ${teacherName}`);
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

  function clearAllData() {
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
              replacePdfSchedule({})
            ]);
          } catch (err) {
            logger.error('clearAllData remote error:', err);
            addNotification('Veriler silinirken bir hata oluştu', 'error');
            return;
          }

          try {
            const keysToRemove = new Set([
              STORAGE_KEY,
              LAST_ABSENT_CLEANUP_KEY,
              'theme',
            ]);
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
      window.location.reload();
    }, 1000);
        })();
      }
    );
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
  }, [])

  return (
    <div className={`wrap ${toolbarExpanded ? 'toolbarExpanded' : ''}`}>
      <ModernNotificationSystem notifications={notifications} onRemove={removeNotification} onAction={onNotificationAction} />

      <header className="topbar">
        <div className="flex justify-between items-center mb-4 w-full">
          <div className="flex items-center gap-3">
            {/* Menü Toggle Butonu */}
            <button className="header-menu-toggle" onClick={toggleToolbar} title={toolbarExpanded ? "Menüyü Kapat" : "Menüyü Aç"}>
              <div className="menu-icon">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </button>
            <h1 className="app-title" style={{ margin: '0' }}>Nöbetçi Öğretmen Görevlendirme</h1>
          </div>
          
          {/* Sağ üst köşeye gün seçici ve tema butonu */}
          <div className="flex items-center gap-3">
            {/* Gün Seçici */}
            <div className="day-selector-header">
              <div className="day-selector">
                {DAYS.map(dayObj => (
                  <button
                    key={dayObj.key}
                    className={`day-btn ${day === dayObj.key ? 'active' : ''}`}
                    onClick={() => handleDayChange(dayObj.key)}
                    title={dayObj.label}
                  >
                    {dayObj.short}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Tema Butonu */}
            <button
              className={styles.themeToggleBtn}
              onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
              title={theme === "dark" ? "Açık tema" : "Koyu tema"}
              aria-label={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
            >
              {theme === "dark"
                ? <Icon name="sun" size={18} />
                : <Icon name="moon" size={18} />}
            </button>
          </div>
        </div>
        
        <style>{`
              .day-selector-header .day-selector {
                display: flex;
                gap: var(--space-1);
                background-color: var(--bg-elevated);
                border-radius: var(--radius-md);
                padding: var(--space-1);
                border: 1px solid var(--border-default);
                height: 40px; /* Tema butonuyla aynı yükseklik */
                align-items: center;
              }
              .day-selector-header .day-btn {
                padding: var(--space-1) var(--space-2);
                border: none;
                background-color: transparent;
                color: var(--text-secondary);
                font-weight: var(--font-weight-medium);
                border-radius: var(--radius-sm);
                cursor: pointer;
                transition: all var(--transition-default);
                font-size: 0.85rem;
                min-width: 32px;
                height: 32px; /* Tema butonuyla uyumlu yükseklik */
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .day-selector-header .day-btn:hover {
                background-color: var(--bg-hover);
                color: var(--text-primary);
              }
              .day-selector-header .day-btn.active {
                background-color: var(--primary);
                color: var(--text-on-primary);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                font-weight: var(--font-weight-bold);
                transform: none;
                border: 1px solid var(--primary);
              }
              @media (max-width: 768px) {
                .day-selector-header .day-selector {
                  height: 36px;
                }
                .day-selector-header .day-btn {
                  padding: var(--space-1);
                  font-size: 0.75rem;
                  min-width: 28px;
                  height: 28px;
                }
              }
            `}</style>
      </header>

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
          <div
            role="tabpanel"
            id="panel-teachers"
            aria-labelledby="tab-teachers"
          >
            <div className="section-toolbar">
              <button className="btn-tertiary" onClick={handleOpenDutyTeacherExcelModal}>
                <Icon name="upload" size={16} />
                <span>Nöbetçi Öğretmen Excel Yükle</span>
              </button>
              <button className="btn-tertiary" onClick={() => setPdfImportModal(true)}>
                <Icon name="upload" size={16} />
                <span>PDF Çizelgesi Yükle</span>
              </button>
              <button className="btn-secondary" onClick={() => setModals(m => ({ ...m, teacher: true }))}>
                <span style={{ marginRight: '4px', fontWeight: 'bold' }}>+</span>
                <Icon name="users" size={16} />
                <span className="btn-text">Yeni Öğretmen Ekle</span>
              </button>
              <div className="toolbar-spacer"></div>
              {teachers.some(t => t.teacherId.startsWith('auto_')) && (
                <button 
                  className="btn-danger" 
                  onClick={deleteAllPdfTeachers}
                  title="PDF'den eklenen tüm öğretmenleri sil"
                  aria-label="PDF'den eklenen tüm öğretmenleri sil"
                >
                  <Icon name="trash" size={16} />
                </button>
              )}
              {teachers.length > 0 && (
                <button
                  className="btn-outline btn-sm"
                  onClick={() => {
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
                      }
                    );
                  }}
                  title="Tüm öğretmenleri sil"
                >
                  <Icon name="trash" size={14} />
                  <span>Tümünü Sil</span>
                </button>
              )}
            </div>
            <ModernAvailabilityGrid
              rows={teachersForCurrentDay}
              rowKey="teacherId"
              rowNameKey="teacherName"
              periods={periods}
              selectedMap={teacherFree}
              onToggle={toggleTeacherFree}
              onToggleAll={setAllTeachersFree}
              onDelete={deleteTeacher}
              //extraCol={(t) => `Max ${t.maxDutyPerDay} görev`}
              IconComponent={Icon}
            />
          </div>
        )}

        {activeSection === "courseSchedule" && (
          <div
            role="tabpanel"
            id="panel-courseSchedule"
            aria-labelledby="tab-courseSchedule"
          >
            <div className="section-toolbar">
              <div className="toolbar-actions">
                <input 
                  type="file" 
                  accept=".pdf,.xlsx,.xls" 
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      try {
                        console.log('Starting teacher schedule upload from Excel...');
                        const schedules = await parseTeacherSchedulesFromExcel(file);
                        setTeacherSchedules(schedules);
                        setTeacherSchedulesHydrated(true);
                        await saveTeacherSchedules(schedules).catch((err) => {
                          logger.error('Teacher schedule Supabase save error:', err);
                          throw err;
                        });
                        addNotification(
                          `${Object.keys(schedules).length} öğretmenin ders programı yüklendi`, 
                          "success"
                        );

                      } catch (error) {
                        console.error('Excel parsing error:', error);
                        addNotification(
                          `Ders programı yükleme hatası: ${error.message}`, 
                          "error"
                        );
                      }
                    }
                  }}
                  style={{ display: 'none' }}
                  id="teacher-schedule-upload-direct"
                />
                <label
                  htmlFor="teacher-schedule-upload-direct"
                  className="btn-tertiary"
                  title="Excel'den Ders Programı Yükle"
                >
                  <Icon name="upload" size={16} />
                  <span className="btn-text">Excel Yükle</span>
                </label>
              </div>
            </div>
            
            <div className="course-schedule-content">
              {teacherSchedulesList.length === 0 ? (
                <EmptyState
                  IconComponent={Icon}
                  icon="calendar"
                  title="Henüz Ders Programı Eklenmedi"
                  size={44}
                  className="empty-state-card"
                />
              ) : null}
              
              {teacherSchedulesList.length > 0 && (
                <div className="schedule-preview">
                  <div className="schedule-preview-header">
                    <h3>Yüklenen Ders Programları</h3>
                    <button 
                      className="btn-outline btn-sm"
                      onClick={() => {
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
                          }
                        );
                      }}
                      title="Tüm ders programlarını sil"
                    >
                      <Icon name="trash" size={14} />
                      <span>Tümünü Sil</span>
                    </button>
                  </div>
                  <div className="teacher-schedule-list">
                    {teacherSchedulesList.map(([teacherName, schedule]) => {
                      const dayDefinitions = [
                        { key: 'monday', label: 'Pzt' },
                        { key: 'tuesday', label: 'Sal' },
                        { key: 'wednesday', label: 'Çar' },
                        { key: 'thursday', label: 'Per' },
                        { key: 'friday', label: 'Cum' },
                      ]

                      const dayStats = dayDefinitions
                        .map(({ key, label }) => {
                          const count = Object.keys(schedule?.[key] || {}).length
                          if (!count) return null
                          return { key, label, count }
                        })
                        .filter(Boolean)

                      const totalLessons = dayStats.reduce((sum, day) => sum + day.count, 0)

                      return (
                        <div 
                          key={teacherName} 
                          className="teacher-schedule-item clickable"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openTeacherSchedule(teacherName, schedule);
                          }}
                        >
                          <div className="teacher-card-header">
                            <div className="teacher-name">
                              <Icon name="user" size={16} />
                              <span>{teacherName}</span>
                            </div>
                            <div className="teacher-card-meta">
                              <span className="meta-chip">
                                <Icon name="calendar" size={12} />
                                {dayStats.length || 0} gün
                              </span>
                              <span className="meta-chip">
                                <Icon name="book" size={12} />
                                {totalLessons} ders
                              </span>
                            </div>
                          </div>
                          <div className="teacher-card-body">
                            {dayStats.length > 0 ? (
                              dayStats.map(({ key, label, count }) => (
                                <div key={key} className="teacher-day-row">
                                  <span className="day-label">{label}</span>
                                  <span className="day-count">{count} ders</span>
                                </div>
                              ))
                            ) : (
                              <div className="teacher-card-empty">
                                <Icon name="info" size={12} />
                                <span>Günlük ders bilgisi yok</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === "classes" && (
          <div
            role="tabpanel"
            id="panel-classes"
            aria-labelledby="tab-classes"
          >
            <div className="section-toolbar">
              <button className="btn-secondary" onClick={() => setModals(m => ({ ...m, class: true }))}>
                <span style={{ marginRight: '4px', fontWeight: 'bold' }}>+</span>
                <Icon name="home" size={16} />
                <span className="btn-text">Yeni Sınıf Ekle</span>
              </button>
              <div className="toolbar-spacer"></div>
              {classes.length > 0 && (
                <button
                  className="btn-outline btn-sm"
                  onClick={() => {
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
                              resetClassFreeData(),
                            ]);
                            setClasses([]);
                            setClassAbsence({});
                            setClassFree({});
                            addNotification('Tüm sınıf kayıtları silindi', 'info');
                          } catch (error) {
                            logger.error('Class bulk delete error:', error);
                            addNotification('Sınıflar silinemedi', 'error');
                          }
                        })();
                      }
                    );
                  }}
                  title="Tüm sınıfları sil"
                >
                  <Icon name="trash" size={14} />
                  <span>Tümünü Sil</span>
                </button>
              )}
            </div>
            <ModernClassAvailabilityGrid
      classes={classesForCurrentDay}
              periods={periods}
              classFree={classFreeForCurrentDay}
              onToggleClassFree={toggleClassFree}
              onSetAllClassesFree={setAllClassesFree}
              absentPeople={absentPeopleForCurrentDay}
              classAbsence={filteredClassAbsence}
              onSelectAbsence={handleSelectAbsence}
              commonLessons={commonLessons}
              onOpenCommonLessonModal={(day, period, classId) => handleOpenCommonLessonModal(day, period, classId)}
              onDelete={deleteClass}
              day={day}
              IconComponent={Icon}
              teachers={teachers}
              onDropdownStateChange={handleClassEditorStateChange}
            />
          </div>
        )}

        {activeSection === "absents" && (
          <div
            role="tabpanel"
            id="panel-absents"
            aria-labelledby="tab-absents"
          >
            <div className="section-toolbar">
              <button className="btn-secondary" onClick={() => setModals(m => ({ ...m, absent: true }))}>
                <span style={{ marginRight: '4px', fontWeight: 'bold' }}>+</span>
                <Icon name="userX" size={16} />
                <span className="btn-text">Yeni Mazeretli Ekle</span>
              </button>
              <div className="toolbar-spacer"></div>
              {absentPeople.length > 0 && (
                <button
                  className="btn-outline btn-sm"
                  onClick={() => {
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
                            ]);
                            setAbsentPeople([]);
                            setClassAbsence({});
                            setClasses([]);
                            setClassFree({});
                            addNotification('Tüm mazeret kayıtları silindi', 'info');
                          } catch (error) {
                            logger.error('Absent bulk delete error:', error);
                            addNotification('Mazeret kayıtları silinemedi', 'error');
                          }
                        })();
                      }
                    );
                  }}
                  title="Tüm mazeretleri sil"
                >
                  <Icon name="trash" size={14} />
                  <span>Tümünü Sil</span>
                </button>
              )}
            </div>
            <AbsenteeList 
              absentPeople={absentPeopleForCurrentDay}
              onDelete={deleteAbsent}
              IconComponent={Icon}
            />
          </div>
        )}

        {activeSection === "schedule" && (
          <div
            role="tabpanel"
            id="panel-schedule"
            aria-labelledby="tab-schedule"
          >
            {/* Atama Seçenekleri */}
            <div className="assignment-options-row">
              {/* Atama Kuralları */}
              <div className="option-card">
                <label className="control-label">
                  <Icon name="zap" size={16} />
                  <span>Atama Kuralları</span>
                </label>
                <div className="options-grid single">
                  <div className="option-item">
                    <label htmlFor="preventConsecutive" className="option-label">
                      <input
                        type="checkbox"
                        id="preventConsecutive"
                        name="preventConsecutive"
                        checked={options.preventConsecutive}
                        onChange={(e) => handleOptionChange('preventConsecutive', e.target.checked)}
                      />
                      <span>Ardışık Görevi Engelle</span>
                    </label>
                    <small>Öğretmene art arda saatlerde görev verilmesini önler.</small>
                  </div>
                </div>
              </div>

              {/* Aynı Saatte Max Görev */}
              <div className="option-card narrow">
                <div className="control-label-with-input">
                  <input
                    type="number"
                    id="maxClassesPerSlot"
                    name="maxClassesPerSlot"
                    value={options.maxClassesPerSlot}
                    onChange={(e) => handleOptionChange('maxClassesPerSlot', e.target.value)}
                    className="option-input-inline"
                    min="1"
                    max="5"
                  />
                  <label htmlFor="maxClassesPerSlot" className="control-label">
                    <Icon name="layers" />
                    <span>Aynı Saatte Max Görev</span>
                  </label>
                </div>
                <small className="option-description">Bir öğretmene aynı saatte en fazla kaç görev verilebileceği.</small>
              </div>

              {/* Günlük Max Görev (Toplu) */}
              <div className="option-card narrow">
                <div className="control-label-with-input">
                  <input
                    type="number"
                    id="bulkMaxDuty"
                    name="bulkMaxDuty"
                    defaultValue={6}
                    onChange={(e) => setAllTeachersMaxDuty(e.target.value)}
                    className="option-input-inline"
                    min="1"
                    max="9"
                  />
                  <label htmlFor="bulkMaxDuty" className="control-label">
                    <Icon name="sliders" />
                    <span>Günlük Max Görev (Toplu)</span>
                  </label>
                </div>
                <small className="option-description">Tüm öğretmenlerin günlük görev limitini topluca günceller.</small>
              </div>
            </div>
            
            <style>{`
              .assignment-options-row {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: var(--space-3);
                margin-bottom: var(--space-4);
              }
              .option-card {
                padding: var(--space-2);
                background-color: var(--bg-elevated);
                border: 1px solid var(--border-default);
                border-radius: var(--radius-lg);
              }
              .option-card.narrow { align-self: start; }
              .control-group {
                display: flex;
                flex-direction: column;
                gap: var(--space-1);
              }
              .control-label {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                font-weight: var(--font-weight-medium);
                font-size: 0.8rem;
                color: var(--text-secondary);
              }
              .control-label-with-input {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                margin-bottom: var(--space-2);
              }
              .option-input-inline {
                width: 60px;
                padding: var(--space-1) var(--space-2);
                border-radius: var(--radius-md);
                border: 1px solid var(--border-default);
                background-color: var(--bg-default);
                color: var(--text-primary);
                text-align: center;
                flex-shrink: 0;
              }
              .option-description {
                display: block;
                font-size: 0.65rem;
                color: var(--text-muted);
                line-height: 1.2;
                margin-top: var(--space-1);
              }
              .options-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: var(--space-2);
              }
              .options-grid.single { grid-template-columns: 1fr; }
              @media (min-width: 480px) {
                .assignment-options-row { grid-template-columns: 1fr 1fr 1fr; }
              }
              @media (min-width: 768px) {
                .assignment-options-row { grid-template-columns: 1fr 1fr 1fr; }
              }
              .option-item {
                display: flex;
                flex-direction: column;
                gap: 2px;
              }
              .option-label {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                cursor: pointer;
              }
              .option-label span {
                font-weight: var(--font-weight-medium);
                font-size: 0.8rem;
              }
              .option-input {
                width: 60px;
                padding: var(--space-1) var(--space-2);
                border-radius: var(--radius-md);
                border: 1px solid var(--border-default);
                background-color: var(--bg-default);
                color: var(--text-primary);
                text-align: center;
              }
              .option-item small {
                font-size: 0.65rem;
                color: var(--text-muted);
                padding-left: 24px;
                line-height: 1.2;
              }
              /* Günlük görev sayısı özeti */
              @media (max-width: 479px) {
                .options-grid {
                  grid-template-columns: 1fr;
                  gap: var(--space-2);
                }
                .option-item {
                  gap: 1px;
                }
                .option-item small {
                  font-size: 0.65rem;
                  padding-left: 24px;
                  line-height: 1.2;
                }
                .option-label span {
                  font-size: 0.8rem;
                }
              }
            `}</style>
            <AssignmentEditor
              day={day}
              periods={periods}
              classes={classesForCurrentDay}
              teachers={teachersForCurrentDay}
              availableTeachersByPeriod={freeTeachersByDay[day] || {}}
              assignment={assignment}
              locked={locked}
              onDropAssign={dropAssign}
              onManualAssign={handleManualAssign}
              onManualClear={handleManualClear}
              onManualRelease={handleManualRelease}
              commonLessons={commonLessons}
              onManualEditorStateChange={handlePlanEditorStateChange}
              IconComponent={Icon}
            />
            {unassignedForSelectedDay.length > 0 && (
              <div className="unassigned-card" role="alert">
                <div className="unassigned-header">
                  <Icon name="alertTriangle" size={16} />
                  <span>Atanamayan sınıflar ({unassignedForSelectedDay.length})</span>
                </div>
                <p className="unassigned-description">
                  Bu sınıflar için uygun öğretmen bulunamadı. Kuralları gevşetebilir, manuel atama yapabilir veya ilgili öğretmenlerin boş saatlerini kontrol edebilirsiniz.
                </p>
                <ul className="unassigned-list">
                  {unassignedForSelectedDay.map(({ period, classId, className }) => (
                    <li key={`${period}-${classId}`}>
                      <span className="badge">{period}. saat</span>
                      <span>{className}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <ConflictSuggestions 
              assignment={assignment} 
              day={day} 
              teachers={teachersForCurrentDay} 
              classes={classes} 
              freeTeachersByDay={freeTeachersByDay}
              freeClassesByDay={freeClassesByDay}
              maxClassesPerSlot={options.maxClassesPerSlot}
            />

            <AssignmentInsights
              insights={assignmentInsights}
              IconComponent={Icon}
            />
          </div>
        )}

        {activeSection === "outputs" && (
          <div
            id="panel-outputs"
            role="tabpanel"
            aria-labelledby="tab-outputs"
          >
            <div className="toolbar no-print">
              <button className="btn" onClick={exportJPG}><Icon name="download" size={16} /> JPG indir</button>
              <button className="btn" onClick={() => window.print()}><Icon name="printer" size={16} /> Yazdır</button>
            </div>
            <PrintableDailyList
              day={day}
              displayDate={displayDate}
              periods={periods}
              assignment={assignment}
              teachers={teachersForCurrentDay}
              classes={classes}
              classAbsence={filteredClassAbsence}
              absentPeople={absentPeopleForCurrentDay}
              commonLessons={commonLessons}
            />
            <AssignmentText
              day={day}
              displayDate={displayDate}
              periods={periods}
              assignment={assignment}
              teachers={teachersForCurrentDay}
              classes={classes}
              classAbsence={classAbsence}
              absentPeople={absentPeopleForCurrentDay}
              commonLessons={commonLessons}
            />
          </div>
        )}
      </main>

      {modals.teacher && (
        <AddTeacherModal
          isOpen={modals.teacher}
          onClose={() => setModals(m => ({ ...m, teacher: false }))}
          onSubmit={addTeacher}
        />
      )}

      {modals.class && (
        <AddClassModal
          isOpen={modals.class}
          onClose={() => setModals(m => ({ ...m, class: false }))}
          onSubmit={addClass}
        />
      )}

      {modals.absent && (
        <AddAbsentModal
          isOpen={modals.absent}
          onClose={() => setModals(m => ({ ...m, absent: false }))}
          onSubmit={addAbsent}
          currentDayKey={day}
          currentDayLabel={DAYS.find(d => d.key === day)?.label || day}
          teacherOptions={scheduledTeacherOptions}
        />
      )}

      {modals.commonLesson && (
        <CommonLessonModal
          isOpen={modals.commonLesson}
          onClose={handleCloseCommonLessonModal}
          onSubmit={(teacherName) => {
            if (currentCommonLesson.day && currentCommonLesson.period && currentCommonLesson.classId) {
              handleSetCommonLesson(currentCommonLesson.day, currentCommonLesson.period, currentCommonLesson.classId, teacherName);
              // Also set classAbsence to mark it as common lesson
              handleSelectAbsence(currentCommonLesson.day, currentCommonLesson.period, currentCommonLesson.classId, "COMMON_LESSON");
            }
            handleCloseCommonLessonModal();
          }}
          currentTeacherName={currentCommonLesson.day && currentCommonLesson.period && currentCommonLesson.classId ? 
            commonLessons[currentCommonLesson.day]?.[currentCommonLesson.period]?.[currentCommonLesson.classId] : ""}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        message={confirmationModal.message}
        type={confirmationModal.type}
        IconComponent={Icon}
      />

      {/* Excel Replace Modal */}
      <ConfirmationModal
        isOpen={excelReplaceModal.isOpen}
        onClose={handleExcelReplaceCancel}
        onConfirm={handleExcelReplaceConfirm}
        title="Mevcut Nöbetçi Öğretmen Listesi"
        message={`Mevcut ${excelReplaceModal.existingCount} nöbetçi öğretmen bulunuyor. Yeni Excel dosyası ile değiştirmek istediğinizden emin misiniz?\n\nMevcut öğretmenler silinecek ve yeni liste yüklenecek.`}
        type="warning"
        confirmText="Değiştir"
        cancelText="İptal"
        IconComponent={Icon}
      />

      <PdfScheduleImportModal
        isOpen={pdfImportModal}
        onClose={() => setPdfImportModal(false)}
        onImport={loadScheduleFromPDF}
        teachers={teachers}
        classes={classes}
        locked={locked}
        IconComponent={Icon}
      />

      {/* Duty Teacher Excel Import Modal */}
      {modals.dutyTeacherExcel && (
        <DutyTeacherExcelImportModal
          isOpen={modals.dutyTeacherExcel}
          onClose={handleCloseDutyTeacherExcelModal}
          onImport={loadDutyTeachersFromExcel}
        />
      )}

      {/* Teacher Schedule Modal */}
      <TeacherScheduleModal
        isOpen={selectedTeacher !== null}
        onClose={() => setSelectedTeacher(null)}
        teacherName={selectedTeacher?.name}
        schedule={selectedTeacher?.schedule}
        IconComponent={Icon}
      />

      {/* Footer removed as per request */}
    </div>
  );
}