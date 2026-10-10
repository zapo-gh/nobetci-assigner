// @ts-nocheck
import { useState, useCallback, useRef, useLayoutEffect } from 'react';
import { logger } from '../utils/logger.js';

// Bugünün gününü otomatik seç (Pazartesi=1, Cuma=5)
const getTodayKey = () => {
    const today = new Date().getDay(); // 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
    const dayMap = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri" };
    return dayMap[today] || "Mon"; // Hafta sonu ise Pazartesi seç
};

export function useUI() {
    const [day, setDayState] = useState(() => {
        try {
            const saved = localStorage.getItem("selected_day");
            if (saved && ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(saved)) {
                return saved;
            }
        } catch {}
        return getTodayKey();
    });

    const setDay = useCallback((newDay) => {
        setDayState(prev => {
            const val = typeof newDay === 'function' ? newDay(prev) : newDay;
            try {
                if (val) localStorage.setItem("selected_day", val);
            } catch {}
            return val;
        });
    }, []);

    const [weekOffset, setWeekOffset] = useState(0);

    const goToNextWeek = useCallback(() => setWeekOffset(prev => prev + 1), []);
    const goToPrevWeek = useCallback(() => setWeekOffset(prev => prev - 1), []);
    const goToCurrentWeek = useCallback(() => setWeekOffset(0), []);

    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem("theme") || "dark";
        } catch {
            return "dark";
        }
    });

    const [activeSection, setActiveSectionState] = useState(() => {
        try {
            const saved = localStorage.getItem("active_section");
            if (saved) return saved;
        } catch {}
        return "teachers";
    });

    const setActiveSection = useCallback((sec) => {
        setActiveSectionState(prev => {
            const val = typeof sec === 'function' ? sec(prev) : sec;
            try {
                if (val) localStorage.setItem("active_section", val);
            } catch {}
            return val;
        });
    }, []);

    const [toolbarExpanded, setToolbarExpanded] = useState(false);

    const [modals, setModals] = useState({
        teacher: false,
        class: false,
        absent: false,
        commonLesson: false,
        dutyTeacherExcel: false,
        zone: false
    });

    const [pdfImportModal, setPdfImportModal] = useState(false);
    const [excelReplaceModal, setExcelReplaceModal] = useState({ isOpen: false, data: null });
    const [teacherScheduleReplaceModal, setTeacherScheduleReplaceModal] = useState({ isOpen: false, data: null });
    const [currentCommonLesson, setCurrentCommonLesson] = useState({ day: null, period: null, classId: null });
    const [selectedTeacher, setSelectedTeacher] = useState(null);

    const [confirmationModal, setConfirmationModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning',
        onConfirm: null,
        onCancel: null,
        confirmText: 'Evet',
        cancelText: 'Hayır',
    });

    const scrollRestoreRef = useRef(0);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => {
            const next = prev === "dark" ? "light" : "dark";
            try {
                localStorage.setItem("theme", next);
            } catch (storageError) {
                logger.warn('[useUI] Failed to persist theme preference', storageError);
            }
            return next;
        });
    }, []);

    const openTeacherSchedule = useCallback((teacherName, schedule) => {
        if (typeof window !== 'undefined') {
            scrollRestoreRef.current =
                window.scrollY ||
                window.pageYOffset ||
                document.documentElement.scrollTop ||
                0;
        }
        setSelectedTeacher({ name: teacherName, schedule });
    }, []);

    // Restore scroll when modal closes
    useLayoutEffect(() => {
        if (!selectedTeacher && typeof window !== 'undefined' && scrollRestoreRef.current > 0) {
            window.scrollTo({ top: scrollRestoreRef.current, left: 0, behavior: 'auto' });
        }
    }, [selectedTeacher]);

    const showConfirmation = useCallback((title, message, type = 'warning', onConfirm, onCancel, confirmText = 'Evet', cancelText = 'Hayır') => {
        setConfirmationModal({
            isOpen: true,
            title,
            message,
            type,
            onConfirm: () => {
                if (onConfirm) onConfirm();
                setConfirmationModal(prev => ({ ...prev, isOpen: false }));
            },
            onCancel: () => {
                if (onCancel) onCancel();
                setConfirmationModal(prev => ({ ...prev, isOpen: false }));
            },
            confirmText,
            cancelText
        });
    }, []);

    const requestConfirmation = useCallback(({
        title,
        message,
        type = 'warning',
        confirmText = 'Evet',
        cancelText = 'Hayır',
    }) => {
        return new Promise((resolve) => {
            setConfirmationModal({
                isOpen: true,
                title,
                message,
                type,
                confirmText,
                cancelText,
                onConfirm: () => {
                    resolve(true);
                    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
                },
                onCancel: () => {
                    resolve(false);
                    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
                },
            });
        });
    }, []);

    const closeConfirmation = useCallback(() => {
        setConfirmationModal(prev => ({ ...prev, isOpen: false }));
    }, []);

    // Tema değişikliğini uygula
    useLayoutEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute("data-theme", theme);
        }
    }, [theme]);

    return {
        day,
        setDay,
        weekOffset,
        setWeekOffset,
        goToNextWeek,
        goToPrevWeek,
        goToCurrentWeek,
        theme,
        toggleTheme,
        activeSection,
        setActiveSection,
        toolbarExpanded,
        setToolbarExpanded,
        modals,
        setModals,
        pdfImportModal,
        setPdfImportModal,
        excelReplaceModal,
        setExcelReplaceModal,
        teacherScheduleReplaceModal,
        setTeacherScheduleReplaceModal,
        currentCommonLesson,
        setCurrentCommonLesson,
        selectedTeacher,
        setSelectedTeacher,
        openTeacherSchedule,
        confirmationModal,
        setConfirmationModal,
        showConfirmation,
        requestConfirmation,
        closeConfirmation
    };
}
