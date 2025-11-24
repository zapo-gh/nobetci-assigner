import { useState, useEffect, useRef, useCallback } from 'react';
import {
    loadInitialData,
    saveTeacherSchedules,
    saveCommonLessons,
    upsertTeacherFree,
    upsertClassFree,
    upsertClassAbsence,
    upsertLock,
    replacePdfSchedule,
    // @ts-ignore
} from '../services/supabaseDataService.js';
// @ts-ignore
import { realtimeSync } from '../services/realtimeSync.js';
// @ts-ignore
import { pollingSync } from '../services/pollingSync.js';
// @ts-ignore
import { mapSetToArray, arrayToSetMap } from '../utils/helpers.js';
import { migrateClassFree, migrateClassAbsence, normalizeAbsentPeople, stableStringify } from '../utils/migrations';
import { DAYS, PERIODS, STORAGE_KEY_PREFIX } from '../constants';
import { AppData, Teacher, Class, Absent, ClassFree, TeacherFree, ClassAbsence, Locks, PdfSchedule, TeacherSchedules, CommonLessons } from '../types';
import { APP_ENV } from '../config/index.js';

// Logger mock if not imported
const logger = {
    info: console.log,
    warn: console.warn,
    error: console.error
};

const DISABLE_LOCAL_STORAGE = true; // Kept from App.jsx
const STORAGE_KEY = `${APP_ENV.mode || 'development'}_${STORAGE_KEY_PREFIX}`;

export function useAppData(day: string, periods: number[], options: any) {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [absentPeople, setAbsentPeople] = useState<Absent[]>([]);
    const [classFree, setClassFree] = useState<ClassFree>({});
    const [teacherFree, setTeacherFree] = useState<TeacherFree>({});
    const [classAbsence, setClassAbsence] = useState<ClassAbsence>({});
    const [locked, setLocked] = useState<Locks>({});
    const [pdfSchedule, setPdfSchedule] = useState<PdfSchedule>({});
    const [teacherSchedules, setTeacherSchedules] = useState<TeacherSchedules>({});
    const [commonLessons, setCommonLessons] = useState<CommonLessons>({});

    const [teacherSchedulesHydrated, setTeacherSchedulesHydrated] = useState(false);
    const hydratedRef = useRef(false);
    const skipNextSupabaseSaveRef = useRef(false);
    const classFreeSnapshotRef = useRef('');
    const classAbsenceSnapshotRef = useRef('');
    const classAbsenceStateRef = useRef<ClassAbsence>({});
    const pendingRealtimeEventsRef = useRef<any[]>([]);

    // Refs for state that shouldn't trigger effects but needed in callbacks
    const isAnyModalOpenRef = useRef(false);
    const isPlanEditorActiveRef = useRef(false);
    const isClassEditorActiveRef = useRef(false);

    // Helper to check if we should defer realtime updates
    const shouldDeferRealtime = useCallback(() => {
        return isAnyModalOpenRef.current || isPlanEditorActiveRef.current || isClassEditorActiveRef.current;
    }, []);

    // --- Realtime Handlers ---

    const handleRealtimeAbsents = useCallback((payload: any, opts: any = {}) => {
        if (!payload) return;
        if (!opts.fromQueue && shouldDeferRealtime()) {
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

    const handleRealtimeClassFree = useCallback((payload: any, opts: any = {}) => {
        if (!payload) return;
        if (!opts.fromQueue && shouldDeferRealtime()) {
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

    const handleRealtimeClassAbsence = useCallback((payload: any, opts: any = {}) => {
        if (!payload) return;
        if (!opts.fromQueue && shouldDeferRealtime()) {
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
        setClassAbsence((prev: any) => {
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

    const handleRealtimeCommonLessons = useCallback((payload: any, opts: any = {}) => {
        if (!payload) return;
        if (!opts.fromQueue && shouldDeferRealtime()) {
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

        setCommonLessons((prev: any = {}) => {
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
    }, [shouldDeferRealtime]);

    // --- Polling Handlers ---

    const handlePollingTeachers = useCallback((data: any) => {
        if (!Array.isArray(data)) return;
        setTeachers(data);
    }, []);

    const handlePollingClasses = useCallback((data: any) => {
        if (!Array.isArray(data)) return;
        setClasses(data);
    }, []);

    const handlePollingTeacherSchedules = useCallback((data: any) => {
        if (!Array.isArray(data)) return;
        skipNextSupabaseSaveRef.current = true;
        setTeacherSchedulesHydrated(true);

        const schedules: any = {};
        data.forEach((row: any) => {
            const teacherName = row?.teacher_name || row?.teacherName;
            if (!teacherName) return;

            if (teacherName === '__snapshot__') {
                Object.assign(schedules, row?.schedule || {});
            } else {
                schedules[teacherName] = row?.schedule || {};
            }
        });

        setTeacherSchedules(schedules);
    }, []);

    const handlePollingLocks = useCallback((data: any) => {
        if (!Array.isArray(data)) return;
        const lockedMap: any = {};
        data.forEach((row: any) => {
            if (row?.day && typeof row.period !== 'undefined' && row.classId && row.teacherId) {
                const key = `${row.day}|${row.period}|${row.classId}`;
                lockedMap[key] = row.teacherId;
            }
        });
        setLocked(lockedMap);
    }, []);

    const flushPendingRealtimeEvents = useCallback(() => {
        if (!pendingRealtimeEventsRef.current.length) return;
        const queue = pendingRealtimeEventsRef.current.slice();
        pendingRealtimeEventsRef.current = [];
        queue.forEach(({ type, payload }) => {
            switch (type) {
                case 'absents':
                    handleRealtimeAbsents(payload, { fromQueue: true });
                    break;
                case 'classFree':
                    handleRealtimeClassFree(payload, { fromQueue: true });
                    break;
                case 'classAbsence':
                    handleRealtimeClassAbsence(payload, { fromQueue: true });
                    break;
                case 'commonLessons':
                    handleRealtimeCommonLessons(payload, { fromQueue: true });
                    break;
                default:
                    break;
            }
        });
    }, [handleRealtimeAbsents, handleRealtimeClassFree, handleRealtimeClassAbsence, handleRealtimeCommonLessons]);

    // --- Effects ---

    useEffect(() => {
        classFreeSnapshotRef.current = stableStringify(mapSetToArray(classFree));
    }, [classFree]);

    useEffect(() => {
        classAbsenceStateRef.current = classAbsence;
        classAbsenceSnapshotRef.current = stableStringify(classAbsence);
    }, [classAbsence]);

    // Load Data
    useEffect(() => {
        if (hydratedRef.current) return;

        let isMounted = true;

        const loadData = async () => {
            try {
                try {
                    const supabaseData = await loadInitialData();
                    if (!isMounted) return;

                    setTeachers(supabaseData.teachers || []);
                    setClasses(supabaseData.classes || []);
                    setAbsentPeople(normalizeAbsentPeople(supabaseData.absents || [], supabaseData.classAbsence || {}));
                    setTeacherFree(arrayToSetMap(supabaseData.teacherFree || {}));
                    setClassFree(migrateClassFree(supabaseData.classFree || {}));
                    setClassAbsence(migrateClassAbsence(supabaseData.classAbsence || {}));
                    setLocked(supabaseData.locked || {});
                    setPdfSchedule(supabaseData.pdfSchedule || {});
                    setTeacherSchedules(supabaseData.teacherSchedules || {});
                    setTeacherSchedulesHydrated(true);
                    setCommonLessons(supabaseData.commonLessons || {});

                    if (!DISABLE_LOCAL_STORAGE) {
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
                        };
                        try {
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(localStoragePayload));
                        } catch (storageError) {
                            logger.warn('LocalStorage update failed:', storageError);
                        }
                    }

                    logger.info('Data loaded from Supabase successfully');
                    if (isMounted) hydratedRef.current = true;
                    return;
                } catch (supabaseError: any) {
                    logger.warn('Supabase load failed, falling back to localStorage:', supabaseError.message);
                }

                // Fallback to LocalStorage
                if (!DISABLE_LOCAL_STORAGE) {
                    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
                    if (raw) {
                        const parsed = JSON.parse(raw || '{}') || {};
                        if (isMounted) {
                            if (Array.isArray(parsed.teachers)) setTeachers(parsed.teachers);
                            if (Array.isArray(parsed.classes)) setClasses(parsed.classes);
                            setTeacherFree(arrayToSetMap(parsed.teacherFree || {}));
                            setClassFree(migrateClassFree(parsed.classFree || {}));
                            setClassAbsence(migrateClassAbsence(parsed.classAbsence || {}));
                            setAbsentPeople(normalizeAbsentPeople(parsed.absentPeople || [], parsed.classAbsence || {}));
                            if (parsed.locked && typeof parsed.locked === 'object') setLocked(parsed.locked);
                            if (parsed.pdfSchedule && typeof parsed.pdfSchedule === 'object') setPdfSchedule(parsed.pdfSchedule);
                            if (parsed.teacherSchedules && typeof parsed.teacherSchedules === 'object') {
                                setTeacherSchedules(parsed.teacherSchedules);
                                setTeacherSchedulesHydrated(true);
                            }
                            if (parsed.commonLessons && typeof parsed.commonLessons === 'object') setCommonLessons(parsed.commonLessons);
                        }
                    }
                }
            } catch (error) {
                logger.error('Data loading failed:', error);
            } finally {
                if (isMounted) hydratedRef.current = true;
            }
        };

        loadData();
        return () => { isMounted = false; };
    }, [day, periods, options]);

    // Subscriptions
    useEffect(() => {
        const unsubscribeRealtime = realtimeSync.subscribe({
            absents: handleRealtimeAbsents,
            classFree: handleRealtimeClassFree,
            classAbsence: handleRealtimeClassAbsence,
            commonLessons: handleRealtimeCommonLessons,
        });

        const unsubscribePolling = pollingSync.start({
            teachers: handlePollingTeachers,
            classes: handlePollingClasses,
            teacherSchedules: handlePollingTeacherSchedules,
            locks: handlePollingLocks,
        }, 8000);

        return () => {
            if (typeof unsubscribeRealtime === 'function') unsubscribeRealtime();
            if (typeof unsubscribePolling === 'function') unsubscribePolling();
        };
    }, [handleRealtimeAbsents, handleRealtimeClassFree, handleRealtimeClassAbsence, handleRealtimeCommonLessons, handlePollingTeachers, handlePollingClasses, handlePollingTeacherSchedules, handlePollingLocks]);

    return {
        teachers, setTeachers,
        classes, setClasses,
        absentPeople, setAbsentPeople,
        classFree, setClassFree,
        teacherFree, setTeacherFree,
        classAbsence, setClassAbsence,
        locked, setLocked,
        pdfSchedule, setPdfSchedule,
        teacherSchedules, setTeacherSchedules,
        commonLessons, setCommonLessons,
        teacherSchedulesHydrated, setTeacherSchedulesHydrated,
        hydratedRef,
        skipNextSupabaseSaveRef,
        isAnyModalOpenRef,
        isPlanEditorActiveRef,
        isClassEditorActiveRef,
        flushPendingRealtimeEvents
    };
}
