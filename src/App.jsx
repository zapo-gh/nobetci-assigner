import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
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
  saveImportHistory,
  saveSnapshots,
} from './services/supabaseDataService.js';
import { realtimeSync } from './services/realtimeSync.js';
import { supabase } from './services/supabaseClient.js';

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
import ImportHistory from "./components/ImportHistory.jsx";
import AssignmentInsights from "./components/AssignmentInsights.jsx";
import SnapshotManager from "./components/SnapshotManager.jsx";

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

const STORAGE_KEY = `${APP_ENV.mode || 'development'}_nobetci_persist_v4`;
const DAYS = [
  { key: "Mon", label: "Pazartesi", short: "Pzt" },
  { key: "Tue", label: "Salı", short: "Sal" },
  { key: "Wed", label: "Çarşamba", short: "Çar" },
  { key: "Thu", label: "Perşembe", short: "Per" },
  { key: "Fri", label: "Cuma", short: "Cum" }
];
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
  const [options, setOptions] = useState({
    preventConsecutive: true,
    maxClassesPerSlot: 1,
    ignoreConsecutiveLimit: false // Ardışık saat sınırını yok sayar (acil durumlar için)
  });
  const [locked, setLocked] = useState({})
  const [snapshots, setSnapshots] = useState([])

  const [_loading, setLoading] = useState({ teachers: false, classes: false, absents: false });
  const [notifications, setNotifications] = useState([]);
  const [importHistory, setImportHistory] = useState([]);
  const [activeSection, setActiveSection] = useState("teachers");
  const [toolbarExpanded, setToolbarExpanded] = useState(false);
  const hydratedRef = useRef(false);
  const [modals, setModals] = useState({ teacher: false, class: false, absent: false, commonLesson: false, dutyTeacherExcel: false })
  const [pdfImportModal, setPdfImportModal] = useState(false)
  const [excelReplaceModal, setExcelReplaceModal] = useState({ isOpen: false, data: null })
  const [currentCommonLesson, setCurrentCommonLesson] = useState({ day: null, period: null, classId: null })
  const [pdfSchedule, setPdfSchedule] = useState({})
  const [teacherSchedules, setTeacherSchedules] = useState({}) // Store individual teacher class schedules
  const [selectedTeacher, setSelectedTeacher] = useState(null) // Selected teacher for modal display
  const [initialDataLoading, setInitialDataLoading] = useState(true)
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

  // Tema
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (err) {
      logger.warn('Tema kaydetme hatası:', err);
    }
  }, [theme]);

  // İlk yüklemede önce Supabase'den, başarısız olursa localStorage'dan çek
  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        setInitialDataLoading(true)

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
          setCommonLessons(supabaseData.commonLessons || {})
          setImportHistory(supabaseData.importHistory || [])
          setSnapshots(supabaseData.snapshots || [])

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
            snapshots: supabaseData.snapshots || [],
            pdfSchedule: supabaseData.pdfSchedule || {},
            teacherSchedules: supabaseData.teacherSchedules || {},
            importHistory: supabaseData.importHistory || [],
            lastSaved: Date.now(),
          }
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(localStoragePayload))
          } catch (storageError) {
            logger.warn('LocalStorage update failed:', storageError)
          }

          logger.info('Data loaded from Supabase successfully')
          if (isMounted) {
            hydratedRef.current = true
            setInitialDataLoading(false)
          }
          return
        } catch (supabaseError) {
          logger.warn('Supabase load failed, falling back to localStorage:', supabaseError.message)
        }

        // Supabase başarısız olduysa localStorage'dan yükle
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

            if (Array.isArray(parsed.snapshots)) {
              setSnapshots(parsed.snapshots)
            }

            if (parsed.pdfSchedule && typeof parsed.pdfSchedule === 'object') {
              setPdfSchedule(parsed.pdfSchedule)
            }

            if (parsed.teacherSchedules && typeof parsed.teacherSchedules === 'object') {
              setTeacherSchedules(parsed.teacherSchedules)
            }

            if (parsed.commonLessons && typeof parsed.commonLessons === 'object') {
              setCommonLessons(parsed.commonLessons)
            }

            if (Array.isArray(parsed.importHistory)) {
              setImportHistory(parsed.importHistory)
            }
          } catch (error) {
            logger.error('Local data hydrate failed:', error)
          }
        }

        hydrateFromLocalStorage()
      } catch (error) {
        logger.error('Data loading failed:', error)
      } finally {
        if (isMounted) {
          hydratedRef.current = true
          setInitialDataLoading(false)
        }
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Sadece mount'ta çalışmalı

  // Realtime senkronizasyon - Supabase'deki değişiklikleri dinle
  useEffect(() => {
    if (!hydratedRef.current || initialDataLoading) return // İlk yükleme tamamlanana kadar bekle

    const unsubscribe = realtimeSync.subscribe({
      // Teachers değişiklikleri
      teachers: async (payload) => {
        if (payload.eventType === 'INSERT') {
          setTeachers(prev => {
            const exists = prev.find(t => t.teacherId === payload.new.teacherId)
            if (exists) return prev
            return [...prev, payload.new]
          })
        } else if (payload.eventType === 'UPDATE') {
          setTeachers(prev => prev.map(t => 
            t.teacherId === payload.new.teacherId ? payload.new : t
          ))
        } else if (payload.eventType === 'DELETE') {
          setTeachers(prev => prev.filter(t => t.teacherId !== payload.old.teacherId))
        }
      },

      // Classes değişiklikleri
      classes: async (payload) => {
        if (payload.eventType === 'INSERT') {
          setClasses(prev => {
            const exists = prev.find(c => c.classId === payload.new.classId)
            if (exists) return prev
            return [...prev, payload.new]
          })
        } else if (payload.eventType === 'UPDATE') {
          setClasses(prev => prev.map(c => 
            c.classId === payload.new.classId ? payload.new : c
          ))
        } else if (payload.eventType === 'DELETE') {
          setClasses(prev => prev.filter(c => c.classId !== payload.old.classId))
        }
      },

      // Absents değişiklikleri
      absents: async () => {
        // Tüm absents listesini yeniden yükle (normalizeAbsentPeople gerektiği için)
        try {
          const { data, error } = await supabase.from('absents').select('*').order('createdAt', { ascending: false })
          if (!error && data) {
            const { data: classAbsenceData } = await supabase.from('class_absence').select('*')
            const classAbsence = {}
            classAbsenceData?.forEach(item => {
              if (!classAbsence[item.day]) classAbsence[item.day] = {}
              if (!classAbsence[item.day][item.period]) classAbsence[item.day][item.period] = {}
              classAbsence[item.day][item.period][item.classId] = item.absentId
            })
            setAbsentPeople(normalizeAbsentPeople(data, classAbsence))
          }
        } catch (err) {
          logger.error('[RealtimeSync] Error reloading absents:', err)
        }
      },

      // Class Free değişiklikleri
      classFree: async () => {
        // Tüm class_free listesini yeniden yükle
        try {
          const { data, error } = await supabase.from('class_free').select('*')
          if (!error && data) {
            const classFree = {}
            data.forEach(item => {
              if (!classFree[item.day]) classFree[item.day] = {}
              classFree[item.day][item.period] = item.classIds || []
            })
            setClassFree(migrateClassFree(classFree))
          }
        } catch (err) {
          logger.error('[RealtimeSync] Error reloading classFree:', err)
        }
      },

      // Teacher Free değişiklikleri
      teacherFree: async () => {
        // Tüm teacher_free listesini yeniden yükle
        try {
          const { data, error } = await supabase.from('teacher_free').select('*')
          if (!error && data) {
            const teacherFree = {}
            data.forEach(item => {
              teacherFree[item.period] = item.teacherIds || []
            })
            setTeacherFree(arrayToSetMap(teacherFree))
          }
        } catch (err) {
          logger.error('[RealtimeSync] Error reloading teacherFree:', err)
        }
      },

      // Class Absence değişiklikleri
      classAbsence: async () => {
        // Tüm class_absence listesini yeniden yükle
        try {
          const { data, error } = await supabase.from('class_absence').select('*')
          if (!error && data) {
            const classAbsence = {}
            data.forEach(item => {
              if (!classAbsence[item.day]) classAbsence[item.day] = {}
              if (!classAbsence[item.day][item.period]) classAbsence[item.day][item.period] = {}
              classAbsence[item.day][item.period][item.classId] = item.absentId
            })
            setClassAbsence(migrateClassAbsence(classAbsence))
          }
        } catch (err) {
          logger.error('[RealtimeSync] Error reloading classAbsence:', err)
        }
      },

      // Locks değişiklikleri
      locks: async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const key = `${payload.new.day}|${payload.new.period}|${payload.new.classId}`
          setLocked(prev => ({
            ...prev,
            [key]: payload.new.teacherId
          }))
        } else if (payload.eventType === 'DELETE') {
          const key = `${payload.old.day}|${payload.old.period}|${payload.old.classId}`
          setLocked(prev => {
            const next = { ...prev }
            delete next[key]
            return next
          })
        }
      },

      // PDF Schedule değişiklikleri
      pdfSchedule: async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setPdfSchedule(payload.new.schedule || {})
        }
      },

      // Teacher Schedules değişiklikleri
      teacherSchedules: async () => {
        // Tüm teacher_schedules listesini yeniden yükle
        try {
          const { data, error } = await supabase.from('teacher_schedules').select('*')
          if (!error && data) {
            const teacherSchedules = {}
            data.forEach(item => {
              teacherSchedules[item.teacher_name] = item.schedule
            })
            setTeacherSchedules(teacherSchedules)
          }
        } catch (err) {
          logger.error('[RealtimeSync] Error reloading teacherSchedules:', err)
        }
      },

      // Common Lessons değişiklikleri
      commonLessons: async () => {
        // Tüm common_lessons listesini yeniden yükle
        try {
          const { data, error } = await supabase.from('common_lessons').select('*')
          if (!error && data) {
            const commonLessons = {}
            data.forEach(item => {
              if (!commonLessons[item.day]) commonLessons[item.day] = {}
              if (!commonLessons[item.day][item.period]) commonLessons[item.day][item.period] = {}
              commonLessons[item.day][item.period][item.class_id] = item.teacher_name
            })
            setCommonLessons(commonLessons)
          }
        } catch (err) {
          logger.error('[RealtimeSync] Error reloading commonLessons:', err)
        }
      },

      // Import History değişiklikleri
      importHistory: async (payload) => {
        if (payload.eventType === 'INSERT') {
          setImportHistory(prev => [payload.new, ...prev].slice(0, 20))
        }
      },

      // Snapshots değişiklikleri
      snapshots: async () => {
        // Tüm snapshots listesini yeniden yükle
        try {
          const { data, error } = await supabase.from('snapshots').select('*').order('ts', { ascending: false })
          if (!error && data) {
            setSnapshots(data)
          }
        } catch (err) {
          logger.error('[RealtimeSync] Error reloading snapshots:', err)
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [initialDataLoading])

  // Otomatik kaydet
  useEffect(() => {
    const payload = {
      day,
      periods,
      teachers,
      classes,
      teacherFree: mapSetToArray(teacherFree),
      classFree: mapSetToArray(classFree),
      absentPeople,
      classAbsence,
      commonLessons,
      options,
      lastSaved: Date.now(),
      locked,
      snapshots,
      pdfSchedule,
      teacherSchedules,
      importHistory,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

      // Save to Supabase as well
      replacePdfSchedule(pdfSchedule).catch(err => logger.error('Auto save pdfSchedule error:', err));
      saveTeacherSchedules(teacherSchedules).catch(err => logger.error('Auto save teacherSchedules error:', err));
      saveCommonLessons(commonLessons).catch(err => logger.error('Auto save commonLessons error:', err));
      saveImportHistory(importHistory).catch(err => logger.error('Auto save importHistory error:', err));
      saveSnapshots(snapshots).catch(err => logger.error('Auto save snapshots error:', err));
    } catch (e) {
      logger.warn("Otomatik kaydetme hatası:", e);
    }
  }, [day, periods, teachers, classes, teacherFree, classFree, absentPeople, classAbsence, commonLessons, options, locked, snapshots, pdfSchedule, teacherSchedules, importHistory]);

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

  const recordImportEvent = useCallback((entry) => {
    if (!entry || typeof entry !== 'object') return

    const baseEntry = {
      id: `import_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      importedAt: Date.now(),
      status: entry.status || 'success',
      type: entry.type || 'unknown',
      source: entry.source || 'manual',
      fileName: entry.fileName || '',
      fileSize: entry.fileSize ?? null,
      stats: Array.isArray(entry.stats) ? entry.stats : [],
      note: entry.note || '',
    }

    setImportHistory((prev) => {
      const next = [baseEntry, ...prev]
      return next.slice(0, 20)
    })
  }, [])

  const clearImportHistory = useCallback(() => {
    setImportHistory([])
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
  }, [teachers, periods, setPdfSchedule]); // replacePdfSchedule is a stable import

  const handleExcelReplaceConfirm = useCallback(async () => {
    const { data, existingCount } = excelReplaceModal;
    setExcelReplaceModal({ isOpen: false, data: null });
    if (!data) return;

    setLoading((s) => ({ ...s, teachers: true }));
    try {
      const result = await importDutyTeachersData(data);
      const replacedCount = existingCount ?? result.removedCount;
      if (replacedCount > 0) {
        addNotification(`${replacedCount} mevcut öğretmen silindi, ${result.insertedCount} yeni öğretmen yüklendi`, "success");
      } else {
        addNotification(`${result.insertedCount} nöbetçi öğretmen Excel'den yüklendi`, "success");
      }
      setActiveSection('classes');

      const dutyTeacherCount = data.dutyTeachers?.length || 0;
      const dayCount = data.dayTeachers instanceof Map ? data.dayTeachers.size : 0;

      recordImportEvent({
        type: 'duty-teacher',
        source: 'excel',
        fileName: data.fileMeta?.name || 'Nöbetçi Öğretmen Excel',
        fileSize: data.fileMeta?.size ?? null,
        status: dutyTeacherCount > 0 ? 'success' : 'warning',
        note: dutyTeacherCount > 0 ? '' : 'Excel dosyasında nöbetçi öğretmen bulunamadı.',
        stats: [
          { label: 'Öğretmen', value: dutyTeacherCount },
          { label: 'Gün', value: dayCount },
          { label: 'Eklenen', value: result.insertedCount },
          { label: 'Silinen', value: replacedCount },
        ],
      });
    } catch (e) {
      logger.error('Excel yükleme hatası:', e);
      addNotification(`Excel yükleme hatası: ${e.message}`, "error");
    } finally {
      setLoading((s) => ({ ...s, teachers: false }));
    }
  }, [excelReplaceModal, addNotification, importDutyTeachersData, setActiveSection, recordImportEvent]);

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

      setLoading((s) => ({ ...s, teachers: true }));
      
      try {
        const result = await importDutyTeachersData(data);
        const replacedCount = existingTeachers.length > 0 ? existingTeachers.length : result.removedCount;
        if (replacedCount > 0) {
          addNotification(`${replacedCount} mevcut öğretmen silindi, ${result.insertedCount} yeni öğretmen yüklendi`, "success");
        } else {
          addNotification(`${result.insertedCount} nöbetçi öğretmen Excel'den yüklendi`, "success");
        }
        setActiveSection("classes");

        const dutyTeacherCount = data.dutyTeachers?.length || 0;
        const dayCount = data.dayTeachers instanceof Map ? data.dayTeachers.size : 0;

        recordImportEvent({
          type: 'duty-teacher',
          source: 'excel',
          fileName: data.fileMeta?.name || 'Nöbetçi Öğretmen Excel',
          fileSize: data.fileMeta?.size ?? null,
          status: dutyTeacherCount > 0 ? 'success' : 'warning',
          note: dutyTeacherCount > 0 ? '' : 'Excel dosyasında nöbetçi öğretmen bulunamadı.',
          stats: [
            { label: 'Öğretmen', value: dutyTeacherCount },
            { label: 'Gün', value: dayCount },
            { label: 'Eklenen', value: result.insertedCount },
            { label: 'Silinen', value: replacedCount },
          ],
        });
        
      } catch (e) {
        logger.error(e);
        addNotification(`Excel yükleme hatası: ${e.message}`, "error");
      } finally {
        setLoading((s) => ({ ...s, teachers: false }));
      }
    },
    [addNotification, teachers, importDutyTeachersData, setActiveSection, recordImportEvent]
  );



  /* ===================== PDF Çizelge Yükleme ===================== */

  const loadScheduleFromPDF = useCallback((importData) => {
    const {
      schedule,
      matchingResults,
      manualMappings,
      conflicts,
      autoAddedTeachers,
      fileMeta,
    } = importData;

    setPdfSchedule(schedule);
    
    // Supabase'e kaydet
    replacePdfSchedule(schedule).catch(err => {
      logger.error('PDF schedule save error:', err);
      addNotification("PDF programı Supabase'e kaydedilemedi", "error");
    });
    
    if (!schedule || !matchingResults) {
      addNotification("Geçersiz PDF verisi", "error");
      return;
    }

    let results = matchingResults?.results ? { ...matchingResults.results } : { ...matchingResults };
    let summary = matchingResults?.summary ? { ...matchingResults.summary } : null;
    const autoAddedCount = Array.isArray(autoAddedTeachers) ? autoAddedTeachers.length : 0;

    const uniquePdfTeachers = new Set();
    let totalPdfSlots = 0;
    Object.values(schedule || {}).forEach((dayData) => {
      Object.values(dayData || {}).forEach((periodNames) => {
        if (Array.isArray(periodNames)) {
          periodNames.forEach((name) => uniquePdfTeachers.add(name));
          totalPdfSlots += periodNames.length;
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
    
    const noteParts = [];
    if (unmatchedCount > 0) {
      noteParts.push(`${unmatchedCount} isim eşleşmedi`);
    }
    if (autoAddedCount > 0) {
      noteParts.push(`${autoAddedCount} öğretmen otomatik eklendi`);
    }

    if (classes.length === 0) {
      addNotification({
        message: "Öğretmenler eklendi! Nöbet atamaları için önce sınıfları ekleyin.",
        type: "warning",
        actionLabel: "Sınıfları Ekle",
        onAction: () => setActiveSection("classes"),
      });

      recordImportEvent({
        type: 'pdf-schedule',
        source: 'pdf',
        fileName: fileMeta?.name || 'PDF Ders Programı',
        fileSize: fileMeta?.size ?? null,
        status: 'warning',
        note: ['Sınıf listesi boş olduğu için atama uygulanmadı.', ...noteParts].filter(Boolean).join(' '),
        stats: [
          { label: 'PDF Öğretmen', value: uniquePdfTeachers.size },
          { label: 'Toplam Slot', value: totalPdfSlots },
          { label: 'Eşleşen', value: matchedCount },
          { label: 'Eşleşmeyen', value: unmatchedCount },
          { label: 'Başarı Oranı', value: `${(summary?.successRate || 0).toFixed(1)}%` },
        ],
      });
      return;
    }

    const resolvedConflicts = new Map();
    (conflicts || []).forEach((conflict) => {
      if (conflict.resolution === 'use_pdf') {
        resolvedConflicts.set(`${conflict.day}|${conflict.period}|${conflict.classId}`, conflict.pdfTeacher.teacherId);
      }
    });

      let assignmentCount = 0;
      let conflictCount = 0;

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

      assignmentCount = localAssignmentCount;
      conflictCount = localConflictCount;

      return next;
    });

    recordImportEvent({
      type: 'pdf-schedule',
      source: 'pdf',
      fileName: fileMeta?.name || 'PDF Ders Programı',
      fileSize: fileMeta?.size ?? null,
      status: unmatchedCount > 0 ? 'warning' : 'success',
      note: noteParts.join(' '),
      stats: [
        { label: 'PDF Öğretmen', value: uniquePdfTeachers.size },
        { label: 'Toplam Slot', value: totalPdfSlots },
        { label: 'Eşleşen', value: matchedCount },
        { label: 'Eşleşmeyen', value: unmatchedCount },
        { label: 'Başarı Oranı', value: `${(summary?.successRate || 0).toFixed(1)}%` },
        { label: 'Atanan', value: assignmentCount },
        { label: 'Çözülen Çakışma', value: conflictCount },
      ],
    });

    setActiveSection("schedule");
  }, [teachers, classes, addNotification, recordImportEvent]);

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
  const validDays = new Set(DAYS.map(d => d.key));
  const selectedDaysRaw = Array.isArray(data.days) ? data.days.filter(d => validDays.has(d)) : [];
  const effectiveDays = selectedDaysRaw.length > 0 ? Array.from(new Set(selectedDaysRaw)) : [day];
  const dayLabelMap = new Map(DAYS.map(d => [d.key, d.label]));

  // 1) Mazeret kaydını ekle (gün bilgisiyle)
  let createdAbsent;
  try {
    createdAbsent = await insertAbsent({ name: data.name, teacherId: data.teacherId, reason: data.reason, days: effectiveDays });
    setAbsentPeople((prev) => [...prev, createdAbsent]);
  } catch (error) {
    logger.error('Absent insert error:', error);
    addNotification('Mazeret kaydedilemedi', 'error');
    return;
  }

  const absentId = createdAbsent?.absentId;
  const dayLabelText = effectiveDays.map(key => dayLabelMap.get(key) || key).join(', ');
  addNotification(`${data.name} (${data.reason}) eklendi${dayLabelText ? ` — Günler: ${dayLabelText}` : ''}`, 'success');

  // 2) Seçilen günlere göre öğretmenin derslerini işaretle
  try {
    if (!teacherSchedules || Object.keys(teacherSchedules).length === 0) return;

    const dayKeyMapping = { Mon: 'monday', Tue: 'tuesday', Wed: 'wednesday', Thu: 'thursday', Fri: 'friday' };

    // İsim eşleştirme (normalize edilmiş)
    const targetNameNorm = normalizeForComparison(data.name);
    const matchedTeacherName = Object.keys(teacherSchedules).find((n) => normalizeForComparison(n) === targetNameNorm);
    if (!matchedTeacherName) return;

    const teacherSchedule = teacherSchedules[matchedTeacherName] || {};
    const daySchedules = {};

    // 2a) Eklenecek sınıfları tespit et (tüm günler için)
    const existingClassNamesUpper = new Set(classes.map((c) => (c.className || '').trim().toUpperCase()));
    const newClassNames = [];

    effectiveDays.forEach((uiDay) => {
      const scheduleDayKey = dayKeyMapping[uiDay];
      if (!scheduleDayKey) return;
      const scheduleForDay = teacherSchedule[scheduleDayKey] || {};
      daySchedules[uiDay] = scheduleForDay;

      const classListForDay = Array.from(new Set(Object.values(scheduleForDay).filter(Boolean)));
      classListForDay.forEach((className) => {
        const normalized = String(className).trim().toUpperCase();
        if (existingClassNamesUpper.has(normalized)) return;
        newClassNames.push(String(className));
        existingClassNamesUpper.add(normalized);
      });
    });

    let insertedClasses = [];
    if (newClassNames.length > 0) {
      insertedClasses = await Promise.all(newClassNames.map((name) => insertClass({ className: name })));
      setClasses((prev) => [...prev, ...insertedClasses]);
    }

    const allClasses = [...classes, ...insertedClasses];
    const nameToId = new Map(allClasses.map((c) => [String(c.className).trim().toUpperCase(), c.classId]));

    const classFreeOps = [];
    const classAbsenceOps = [];

    setClassFree((prev) => {
      const next = { ...prev };
      const ensureSet = (d, p) => {
        if (!next[d]) next[d] = {};
        if (!(next[d][p] instanceof Set)) next[d][p] = new Set(Array.isArray(next[d][p]) ? next[d][p] : []);
      };

      effectiveDays.forEach((uiDay) => {
        const scheduleForDay = daySchedules[uiDay] || {};
        Object.entries(scheduleForDay).forEach(([periodStr, className]) => {
          const period = Number(periodStr);
          if (!className || !periods.includes(period)) return;
          const id = nameToId.get(String(className).trim().toUpperCase());
          if (!id) return;
          ensureSet(uiDay, period);
          next[uiDay][period].add(id);
          classFreeOps.push({ day: uiDay, period, classId: id });
        });
      });

      return next;
    });

    setClassAbsence((prev) => {
      const next = { ...prev };

      effectiveDays.forEach((uiDay) => {
        if (!next[uiDay]) next[uiDay] = {};
        const scheduleForDay = daySchedules[uiDay] || {};
        Object.entries(scheduleForDay).forEach(([periodStr, className]) => {
          const period = Number(periodStr);
          if (!className || !periods.includes(period)) return;
          const id = nameToId.get(String(className).trim().toUpperCase());
          if (!id) return;
          if (!next[uiDay][period]) next[uiDay][period] = {};
          next[uiDay][period][id] = absentId;
          classAbsenceOps.push({ day: uiDay, period, classId: id, absentId });
        });
      });

      return next;
    });

    Promise.all(classFreeOps.map(({ day: dKey, period: per, classId: cId }) =>
      upsertClassFree({ day: dKey, period: per, classId: cId, isSelected: true })
    )).catch(err => logger.error('Class free bulk insert error:', err));

    Promise.all(classAbsenceOps.map((payload) => upsertClassAbsence(payload))).catch(err => logger.error('Class absence bulk insert error:', err));

    const addedCount = insertedClasses.length;
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
  }
  };

  const deleteAbsent = async (absentIdToDelete) => {
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
    setClassAbsence(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(dk => {
        Object.keys(next[dk] || {}).forEach(pk => {
          const per = next[dk][pk] || {};
          Object.keys(per).forEach(cid => {
            if (per[cid] === absentIdToDelete) delete per[cid];
          });
          if (Object.keys(per).length === 0) delete next[dk][pk];
        });
        if (next[dk] && Object.keys(next[dk]).length === 0) delete next[dk];
      });
      return next;
    });

    // 3) Seçili günlerde bu sınıflarda başka mazeretli kalmadıysa sınıfı sil
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

    const toDelete = Array.from(affectedClassIds).filter(cid => !stillHasAbsent.has(cid));

    if (toDelete.length > 0) {
      try {
        // Sınıfları Supabase'den sil
        await Promise.all(toDelete.map(classId => deleteClassById(classId)));
        
        // ClassFree'dan kaldır ve Supabase'e kaydet
        const updatedClassFree = { ...classFree };
        const classFreeUpdates = [];
        
        fallbackDays.forEach((dayKey) => {
          if (!updatedClassFree[dayKey]) return;
          Object.keys(updatedClassFree[dayKey]).forEach(pk => {
            const set = new Set(updatedClassFree[dayKey][pk] || []);
            let changed = false;
            toDelete.forEach(cid => {
              if (set.delete(cid)) {
                changed = true;
                classFreeUpdates.push({ day: dayKey, period: Number(pk), classId: cid });
              }
            });
            if (changed) {
              updatedClassFree[dayKey][pk] = set;
            }
          });
        });
        
        setClassFree(updatedClassFree);
        
        // Supabase'e kaydet
        await Promise.all(classFreeUpdates.map(({ day, period, classId }) =>
          upsertClassFree({ day, period, classId, isSelected: false })
        ));
        
        // State'ten sınıfları kaldır
        setClasses(prevClasses => prevClasses.filter(c => !toDelete.includes(c.classId)));
        
        addNotification(`${toDelete.length} sınıf otomatik kaldırıldı (mazeretli kalmadı)`, 'info');
      } catch (error) {
        logger.error('Auto delete classes error:', error);
        addNotification('Sınıflar silinirken hata oluştu', 'error');
      }
    }

    // 4) Mazeret kaydını kaldır
    setAbsentPeople(prev => prev.filter(p => p.absentId !== absentIdToDelete));
    addNotification("Mazeret kaydı silindi", "info");
  };

  const deleteTeacher = async (teacherIdToDelete) => {
    try {
      await deleteTeacherById(teacherIdToDelete)
      setTeachers(prev => prev.filter(t => t.teacherId !== teacherIdToDelete));
      
      // TeacherFree'dan kaldır ve Supabase'e kaydet
      const updatedTeacherFree = { ...teacherFree };
      const periodsToUpdate = [];
      Object.keys(updatedTeacherFree).forEach(period => {
        const set = new Set(updatedTeacherFree[period] || []);
        if (set.delete(teacherIdToDelete)) {
          updatedTeacherFree[period] = set;
          periodsToUpdate.push(Number(period));
        }
      });
      
      setTeacherFree(updatedTeacherFree);
      
      // Supabase'e kaydet
      await Promise.all(periodsToUpdate.map(period => 
        upsertTeacherFree({ period, teacherId: teacherIdToDelete, isSelected: false })
      ));
      
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
      
      // TeacherFree'dan kaldır ve Supabase'e kaydet
      const updatedTeacherFree = { ...teacherFree };
      const removeIds = new Set(pdfTeachers.map(t => t.teacherId));
      const periodsToUpdate = new Map(); // period -> Set of teacherIds to remove
      
      Object.keys(updatedTeacherFree).forEach(period => {
        const set = new Set(updatedTeacherFree[period] || []);
        let changed = false;
        removeIds.forEach(id => {
          if (set.delete(id)) {
            changed = true;
            if (!periodsToUpdate.has(Number(period))) {
              periodsToUpdate.set(Number(period), new Set());
            }
            periodsToUpdate.get(Number(period)).add(id);
          }
        });
        if (changed) {
          updatedTeacherFree[period] = set;
        }
      });
      
      setTeacherFree(updatedTeacherFree);
      
      // Supabase'e kaydet
      await Promise.all(Array.from(periodsToUpdate.entries()).flatMap(([period, teacherIds]) =>
        Array.from(teacherIds).map(teacherId =>
          upsertTeacherFree({ period, teacherId, isSelected: false })
        )
      ));
      
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
      
      // ClassFree'dan kaldır ve Supabase'e kaydet
      const updatedClassFree = { ...classFree };
      const updates = []; // { day, period, classId }[]
      
      Object.keys(updatedClassFree).forEach(dayKey => {
        const perMap = { ...(updatedClassFree[dayKey] || {}) };
        let changed = false;
        Object.keys(perMap).forEach(period => {
          const set = new Set(perMap[period] || []);
          if (set.delete(classIdToDelete)) {
            perMap[period] = set;
            changed = true;
            updates.push({ day: dayKey, period: Number(period), classId: classIdToDelete });
          }
        });
        if (changed) {
          updatedClassFree[dayKey] = perMap;
        }
      });
      
      setClassFree(updatedClassFree);
      
      // Supabase'e kaydet
      await Promise.all(updates.map(({ day, period, classId }) =>
        upsertClassFree({ day, period, classId, isSelected: false })
      ));
      
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

  // PDF'den gelen schedule verisine göre o günün nöbetçi öğretmenlerini filtrele
  const teachersForCurrentDay = useMemo(() => {
    console.log('=== TEACHERS FILTERING DEBUG ===');
    console.log('Current day:', day);
    console.log('Teachers count:', teachers.length);
    console.log('PDF schedule keys:', Object.keys(pdfSchedule));
    
    // Gün adı mapping: sistem gün adları -> PDF gün adları
    const dayMapping = {
      'Mon': 'monday',
      'Tue': 'tuesday', 
      'Wed': 'wednesday',
      'Thu': 'thursday',
      'Fri': 'friday'
    };
    
    const pdfDayKey = dayMapping[day];
    console.log('PDF day key:', pdfDayKey);
    console.log('PDF schedule for day:', pdfSchedule[pdfDayKey]);
    
    if (!pdfSchedule[pdfDayKey] || Object.keys(pdfSchedule[pdfDayKey]).length === 0) {
      // PDF schedule yoksa tüm öğretmenleri göster
      console.log('No PDF schedule for day, returning all teachers');
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
  const freeClassesByDay = useMemo(
    () => ({
      [day]: Object.fromEntries(periods.map((p) => [p, new Set(Array.from(classFree[day]?.[p] || []))]))
    }),
    [classFree, day, periods]
  );

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
  }, [teachers, addNotification, locked]); // teachers değiştiğinde veya sayfa yüklendiğinde çalışır

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
  }, [day, teachers, locked]); // day veya teachers değiştiğinde çalışır

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

  const { schedule: assignment, unassigned: unassignedAssignments } = useMemo(
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

  const unassignedForSelectedDay = useMemo(() => {
    const dayData = unassignedAssignments?.[day] || {}
    const items = []
    Object.entries(dayData).forEach(([periodKey, classIds]) => {
      const period = Number(periodKey)
      if (!Number.isFinite(period)) return
      ;(classIds || []).forEach((classId) => {
        const cls = classes.find((c) => c.classId === classId)
        items.push({
          period,
          classId,
          className: cls?.className || classId,
        })
      })
    })
    return items.sort((a, b) => a.period - b.period || (a.className || '').localeCompare(b.className || '', 'tr', { sensitivity: 'base' }))
  }, [unassignedAssignments, day, classes])

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
      // const dailyCount = teacherAssignmentCount[teacherId] || 0 // Kullanılmıyor

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

  const saveSnapshot = useCallback(() => {
    // Veri kontrolü - en az bir veri olmalı
    const hasData = teachers.length > 0 || classes.length > 0 || absentPeople.length > 0 || 
                    Object.keys(teacherFree).length > 0 || Object.keys(classFree).length > 0 ||
                    Object.keys(locked).length > 0

    if (!hasData) {
      addNotification({ 
        message: 'Kaydedilecek veri yok. Önce öğretmen, sınıf veya mazeret bilgisi ekleyin.', 
        type: 'warning', 
        duration: 3000 
      })
      return
    }

    try {
      const snap = {
        id: `${Date.now()}`,
        name: `Anlık ${new Date().toLocaleString('tr-TR')}`,
        ts: Date.now(),
        data: {
          day,
          periods,
          teachers: JSON.parse(JSON.stringify(teachers)), // Deep copy
          classes: JSON.parse(JSON.stringify(classes)),
          teacherFree: mapSetToArray(teacherFree),
          classFree: mapSetToArray(classFree),
          absentPeople: JSON.parse(JSON.stringify(absentPeople)),
          classAbsence: JSON.parse(JSON.stringify(classAbsence)),
          options: JSON.parse(JSON.stringify(options)),
          locked: JSON.parse(JSON.stringify(locked)),
        }
      }
      
      setSnapshots(prev => {
        const newSnapshots = [snap, ...prev].slice(0, 15)
        return newSnapshots
      })
      
      // Kaydedilen veri türlerini bildir
      const savedItems = []
      if (teachers.length > 0) savedItems.push(`${teachers.length} öğretmen`)
      if (classes.length > 0) savedItems.push(`${classes.length} sınıf`)
      if (absentPeople.length > 0) savedItems.push(`${absentPeople.length} mazeret`)
      
      const message = savedItems.length > 0 
        ? `Anlık görüntü kaydedildi (${savedItems.join(', ')})`
        : 'Anlık görüntü kaydedildi'
      
      addNotification({ message, type: 'success', duration: 2500 })
    } catch (error) {
      logger.error('Anlık görüntü kaydetme hatası:', error)
      addNotification({ message: 'Anlık görüntü kaydedilemedi', type: 'error', duration: 3000 })
    }
  }, [day, periods, teachers, classes, teacherFree, classFree, absentPeople, classAbsence, options, locked, addNotification])

  const restoreSnapshot = useCallback((id) => {
    const snap = snapshots.find(s => s.id === id)
    if (!snap) return
    const d = snap.data || {}
    setDay(d.day || 'Mon')
    setPeriods(Array.isArray(d.periods) && d.periods.length ? d.periods : PERIODS)
    setTeachers(d.teachers || [])
    setClasses(d.classes || [])
    setTeacherFree(arrayToSetMap(d.teacherFree))
    // Migrate old classFree structure to new structure
    const migratedClassFree = migrateClassFree(d.classFree || {});
    setClassFree(migratedClassFree);
    setAbsentPeople(normalizeAbsentPeople(d.absentPeople, d.classAbsence))
    // Migrate old classAbsence structure to new structure
    const migratedClassAbsence = migrateClassAbsence(d.classAbsence || {});
    setClassAbsence(migratedClassAbsence);
    setOptions(d.options || { preventConsecutive: true, maxClassesPerSlot: 1, allowOverload: false })
    setLocked(d.locked || {})
    setActiveSection('schedule') // Geri yükleme sonrası planlama sekmesine geç
    addNotification({ message: 'Anlık görüntü geri yüklendi', type: 'info', duration: 2000 })
  }, [snapshots, addNotification])

  const deleteSnapshot = useCallback((id) => {
    setSnapshots(prev => prev.filter(s => s.id !== id))
    addNotification({ message: 'Anlık görüntü silindi', type: 'info', duration: 2000 })
  }, [addNotification])

  const exportSnapshot = useCallback((id) => {
    const snap = snapshots.find(s => s.id === id)
    if (!snap) {
      addNotification({ message: 'Anlık görüntü bulunamadı', type: 'error', duration: 2500 })
      return
    }

    try {
      const fileNameBase = snap.name
        ? snap.name.replaceAll(/[^a-zA-Z0-9-_ğüşöçıİĞÜŞÖÇ ]/g, '').trim().replace(/\s+/g, '_')
        : `snapshot_${snap.id}`
      const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${fileNameBase || 'snapshot'}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      addNotification({ message: 'Anlık görüntü dışa aktarıldı', type: 'success', duration: 2000 })
    } catch (error) {
      logger.error('Snapshot export error:', error)
      addNotification({ message: 'Anlık görüntü dışa aktarılamadı', type: 'error', duration: 2500 })
    }
  }, [snapshots, addNotification])

  const importSnapshots = useCallback(async (file) => {
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const incoming = Array.isArray(parsed) ? parsed : [parsed]
      const valid = incoming
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const data = item.data && typeof item.data === 'object' ? item.data : null
          if (!data) return null
          return {
            id: `import_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            name: item.name || `İçe Aktarılan (${new Date().toLocaleString('tr-TR')})`,
            ts: item.ts || Date.now(),
            data,
          }
        })
        .filter(Boolean)

      if (valid.length === 0) {
        addNotification({ message: 'İçe aktarılan dosyada geçerli anlık görüntü bulunamadı', type: 'warning', duration: 3000 })
        return
      }

      setSnapshots((prev) => {
        const merged = [...valid, ...prev]
        return merged.slice(0, 15)
      })
      addNotification({ message: `${valid.length} anlık görüntü içe aktarıldı`, type: 'success', duration: 2500 })
    } catch (error) {
      logger.error('Snapshot import error:', error)
      addNotification({ message: 'Anlık görüntü içe aktarılamadı', type: 'error', duration: 3000 })
    }
  }, [addNotification])

  const confirmDeleteAllSnapshots = useCallback(() => {
    showConfirmation(
      'Tüm Anlık Görüntüleri Sil',
      'Tüm anlık görüntüler silinsin mi?',
      'warning',
      () => {
        setSnapshots([])
        addNotification({ message: 'Tüm anlık görüntüler silindi', type: 'info', duration: 2000 })
      }
    )
  }, [showConfirmation, addNotification])

  /* ============================= Çıktılar (Excel/JSON) ============================= */

  // eslint-disable-next-line no-unused-vars
  function exportExcel() {
    try {
      const rows = [];
      for (const p of periods) {
        const arr = assignment?.[day]?.[p] || [];
        arr.forEach((a) => {
          rows.push({
            Day: day,
            Period: p,
            ClassId: a.classId,
            ClassName: classes.find((c) => c.classId === a.classId)?.className || "",
            TeacherId: a.teacherId,
            TeacherName: teachers.find((t) => t.teacherId === a.teacherId)?.teacherName || ""
          });
        });
      }
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${day}`);
      XLSX.writeFile(wb, `gorevlendirme_${day}.xlsx`);
      addNotification("Excel dışa aktarıldı", "success");
    } catch (e) {
      logger.error(e);
      addNotification("Excel yazılamadı", "error");
    }
  }

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

  const saveJSON = useCallback(() => {
    const payload = {
      day,
      periods,
      teachers,
      classes,
      teacherFree: mapSetToArray(teacherFree),
      classFree: mapSetToArray(classFree),
      absentPeople,
      classAbsence,
      commonLessons,
      options,
      locked,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nobetci-data.json";
    a.click();
    URL.revokeObjectURL(url);
    addNotification("JSON kaydedildi", "success");
  }, [day, periods, teachers, classes, teacherFree, classFree, absentPeople, classAbsence, commonLessons, options, locked, addNotification])
  function loadJSON(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        setDay(d.day || "Mon");
        setPeriods(Array.isArray(d.periods) && d.periods.length ? d.periods : PERIODS);
        setTeachers(d.teachers || []);
        setClasses(d.classes || []);
        setTeacherFree(arrayToSetMap(d.teacherFree));
        // Migrate old classFree structure to new structure
        const migratedClassFree = migrateClassFree(d.classFree || {});
        setClassFree(migratedClassFree);
        setAbsentPeople(normalizeAbsentPeople(d.absentPeople, d.classAbsence));
        // Migrate old classAbsence structure to new structure
        const migratedClassAbsence = migrateClassAbsence(d.classAbsence || {});
        setClassAbsence(migratedClassAbsence);
        setCommonLessons(d.commonLessons || {});
        setOptions(d.options || { preventConsecutive: true, maxClassesPerSlot: 1, ignoreConsecutiveLimit: false });
        setLocked(d.locked || {})
        addNotification("JSON yüklendi", "success");
      } catch (e) {
        console.error(e);
        addNotification(`JSON okunamadı: ${e.message}`, "error");
      }
    };
    r.readAsText(f);
  }

  function clearAllData() {
    showConfirmation(
      'Tüm Verileri Sil',
      'Tüm veriler (öğretmenler, sınıflar, boş saatler, mazeretler, kilitler, anlık görüntüler) silinsin mi?',
      'danger',
      () => {
    try {
      // Tüm localStorage'ı temizle
      localStorage.clear();
      // Alternatif olarak sadece uygulama verilerini sil
      localStorage.removeItem(STORAGE_KEY);
      // Diğer olası storage key'lerini de sil
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('nobetci') || key.includes('teacher') || key.includes('class'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
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
    setSnapshots([]);
    addNotification({ message: 'Tüm veriler temizlendi', type: 'warning', duration: 2500 });
    
    // Sayfayı yenile ki localStorage temizliği kesin olsun
    setTimeout(() => {
      window.location.reload();
    }, 1000);
      }
    );
  }

  /* ================================ Render ================================ */

  useEffect(() => {
    const onKey = (e) => {
      const isCtrlS = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'
      const isCtrlP = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p'
      if (isCtrlS) {
        e.preventDefault()
        saveJSON()
      }
      if (isCtrlP) {
        e.preventDefault()
        setActiveSection('outputs')
        setTimeout(() => window.print(), 50)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saveJSON])

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
                    onClick={() => {
                      setDay(dayObj.key);
                      // Gün değiştiğinde PDF schedule'ı temizle (isteğe bağlı)
                      // setPdfSchedule({});
                    }}
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
              {/* Veri İşlemleri Grubu */}
              <div className="toolbar-group">
            <div className="toolbar-group-header">
              <h3>📁 Veri İşlemleri</h3>
              <p>Verilerinizi yükleyin, kaydedin ve dışa aktarın</p>
            </div>
            <div className="toolbar-group-content">
              <label className="btn-tertiary">
                  <Icon name="upload" size={16} /><span className="btn-text">Veri Yükle (JSON)</span>
                  <input type="file" accept="application/json" onChange={loadJSON} style={{ display: "none" }} />
                </label>
              <button className="btn-tertiary" onClick={saveJSON}>
                  <Icon name="download" size={16} /><span className="btn-text">Veri Kaydet (JSON)</span>
                </button>
            </div>
              </div>

              {/* Anlık Görüntü Grubu */}
              <div className="toolbar-group">
            <div className="toolbar-group-header">
              <h3>📸 Anlık Görüntüler</h3>
              <p>Mevcut durumu kaydedin ve geri yükleyin</p>
            </div>
            <div className="toolbar-group-content">
              <SnapshotManager
                snapshots={snapshots}
                onCreate={saveSnapshot}
                onRestore={restoreSnapshot}
                onDelete={(id) => {
                  const snapshot = snapshots.find((s) => s.id === id)
                        showConfirmation(
                          'Anlık Görüntü Sil',
                          `"${snapshot?.name || 'Bu anlık görüntü'}" silinsin mi?`,
                          'warning',
                          () => deleteSnapshot(id)
                  )
                }}
                onDeleteAll={snapshots.length > 0 ? confirmDeleteAllSnapshots : undefined}
                onExport={exportSnapshot}
                onImport={importSnapshots}
                IconComponent={Icon}
              />
            </div>
              </div>

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
                      () => setTeachers([])
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
                        addNotification(
                          `${Object.keys(schedules).length} öğretmenin ders programı yüklendi`, 
                          "success"
                        );

                      const teacherCount = Object.keys(schedules || {}).length;
                      const totalLessons = Object.values(schedules || {}).reduce((sum, teacherSchedule = {}) => {
                        return sum + Object.values(teacherSchedule || {}).reduce((innerSum, daySchedule = {}) => {
                          return innerSum + Object.keys(daySchedule || {}).length;
                        }, 0);
                      }, 0);

                      recordImportEvent({
                        type: 'teacher-schedule',
                        source: 'excel',
                        fileName: file.name,
                        fileSize: file.size,
                        status: teacherCount > 0 ? 'success' : 'warning',
                        note: teacherCount > 0 ? '' : 'Excel dosyasında geçerli öğretmen bulunamadı.',
                        stats: [
                          { label: 'Öğretmen', value: teacherCount },
                          { label: 'Toplam Ders', value: totalLessons },
                        ],
                      });
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
              {Object.keys(teacherSchedules).length === 0 ? (
                <EmptyState
                  IconComponent={Icon}
                  icon="calendar"
                  title="Henüz Ders Programı Eklenmedi"
                  size={44}
                  className="empty-state-card"
                />
              ) : null}
              
              {Object.keys(teacherSchedules).length > 0 && (
                <div className="schedule-preview">
                  <div className="schedule-preview-header">
                    <h3>Yüklenen Ders Programları</h3>
                    <button 
                      className="btn-outline btn-sm"
                      onClick={() => {
                        if (confirm('Tüm ders programları silinecek. Emin misiniz?')) {
                          setTeacherSchedules({});
                          addNotification('Tüm ders programları silindi', 'info');
                        }
                      }}
                      title="Tüm ders programlarını sil"
                    >
                      <Icon name="trash" size={14} />
                      <span>Tümünü Sil</span>
                    </button>
                  </div>
                  <div className="teacher-schedule-list">
                    {Object.entries(teacherSchedules).map(([teacherName, schedule]) => (
                      <div 
                        key={teacherName} 
                        className="teacher-schedule-item clickable"
                        onClick={() => setSelectedTeacher({ name: teacherName, schedule })}
                      >
                        <div className="teacher-name">
                          <Icon name="user" size={16} />
                          <span>{teacherName}</span>
                        </div>
                        <div className="schedule-summary">
                          {Object.entries(schedule).map(([day, daySchedule]) => {
                            const classCount = Object.keys(daySchedule).length;
                            return classCount > 0 ? (
                              <span key={day} className="day-class-count">
                                {day === 'monday' ? 'Pzt' : 
                                 day === 'tuesday' ? 'Sal' :
                                 day === 'wednesday' ? 'Çar' :
                                 day === 'thursday' ? 'Per' :
                                 day === 'friday' ? 'Cum' : day}: {classCount} ders
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    ))}
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
                      () => setClasses([])
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
              classes={classes}
              periods={periods}
              classFree={classFree}
              onToggleClassFree={toggleClassFree}
              onSetAllClassesFree={setAllClassesFree}
              absentPeople={absentPeopleForCurrentDay}
              classAbsence={classAbsence}
              onSelectAbsence={handleSelectAbsence}
              commonLessons={commonLessons}
              onOpenCommonLessonModal={(day, period, classId) => handleOpenCommonLessonModal(day, period, classId)}
              onDelete={deleteClass}
              day={day}
              IconComponent={Icon}
              teachers={teachers}
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
                        setAbsentPeople([])
                        setClassAbsence({})
                        setClasses([])
                        setClassFree((prev) => {
                          const next = { ...prev }
                          Object.keys(next).forEach(dayKey => {
                            next[dayKey] = {}
                          })
                          return next
                        })
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
              absentPeople={absentPeople}
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
              .daily-summary { 
                margin-top: var(--space-3);
                padding: var(--space-2);
                background: var(--bg-elevated);
                border: 1px solid var(--border-default);
                border-radius: var(--radius-lg);
              }
              .summary-title { 
                font-weight: var(--font-weight-semibold); 
                margin-bottom: var(--space-2);
              }
              .summary-list { 
                display: flex; 
                flex-wrap: wrap; 
                gap: 6px 10px;
              }
              .summary-chip { 
                background: var(--bg-secondary);
                border: 1px solid var(--border-subtle);
                border-radius: 9999px;
                padding: 4px 10px;
                font-size: 0.9em;
                white-space: nowrap;
              }
              .summary-chip .sep { opacity: .7; }
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
            <ImportHistory
              history={importHistory}
              onClear={clearImportHistory}
              IconComponent={Icon}
            />
            
            <AssignmentEditor
              day={day}
              periods={periods}
              classes={classes}
              teachers={teachersForCurrentDay}
              availableTeachersByPeriod={freeTeachersByDay[day] || {}}
              assignment={assignment}
              locked={locked}
              onDropAssign={dropAssign}
              onManualAssign={handleManualAssign}
              onManualClear={handleManualClear}
              onManualRelease={handleManualRelease}
              commonLessons={commonLessons}
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

            {/* Günlük görev sayısı özeti (Planlama sayfası altı) */}
            <div className="daily-summary">
              <div className="summary-title">Günlük Görev Sayısı</div>
              <div className="summary-list">
                {(() => {
                  const m = {};
                  (periods || []).forEach(p => {
                    const arr = assignment?.[day]?.[p] || [];
                    arr.forEach(a => { m[a.teacherId] = (m[a.teacherId] || 0) + 1; });
                  });
                  return (teachersForCurrentDay || teachers).map(t => (
                    <span key={t.teacherId} className="summary-chip">
                      <strong>{t.teacherName}</strong>
                      <span className="sep"> — </span>
                      <span>{m[t.teacherId] || 0}</span>
                    </span>
                  ));
                })()}
              </div>
            </div>

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
              classAbsence={classAbsence}
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
          availableDays={DAYS}
          defaultSelectedDay={day}
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