import React, { createContext, useContext, useState, useCallback } from 'react';
import {
    insertTeacher,
    deleteTeacher as deleteTeacherDB,
    updateTeacher,
} from '../services/supabaseDataService';

const TeachersContext = createContext(null);

export function TeachersProvider({ children }) {
    // Teacher State
    const [teachers, setTeachers] = useState([]);
    const [teacherFree, setTeacherFree] = useState({});
    const [teacherSchedules, setTeacherSchedules] = useState({});
    const [teacherSchedulesHydrated, setTeacherSchedulesHydrated] = useState(false);

    // Teacher Actions
    const addTeacher = useCallback(async (data) => {
        try {
            const newTeacher = await insertTeacher(data);
            setTeachers((prev) => [...prev, newTeacher]);
            return newTeacher;
        } catch (error) {
            console.error('Failed to add teacher:', error);
            throw error;
        }
    }, []);

    const deleteTeacher = useCallback(async (teacherId) => {
        try {
            await deleteTeacherDB(teacherId);
            setTeachers((prev) => prev.filter((t) => t.teacherId !== teacherId));
        } catch (error) {
            console.error('Failed to delete teacher:', error);
            throw error;
        }
    }, []);

    const updateTeacherMaxDuty = useCallback(async (teacherId, maxDutyPerDay) => {
        try {
            await updateTeacher(teacherId, { maxDutyPerDay });
            setTeachers((prev) =>
                prev.map((t) => (t.teacherId === teacherId ? { ...t, maxDutyPerDay } : t))
            );
        } catch (error) {
            console.error('Failed to update teacher:', error);
            throw error;
        }
    }, []);

    const setAllTeachersMaxDuty = useCallback((value) => {
        const parsed = parseInt(value, 10);
        const safe = Number.isFinite(parsed) ? Math.max(1, Math.min(9, parsed)) : 6;
        setTeachers((prev) => prev.map((t) => ({ ...t, maxDutyPerDay: safe })));
    }, []);

    const value = {
        // State
        teachers,
        teacherFree,
        teacherSchedules,
        teacherSchedulesHydrated,
        // Setters
        setTeachers,
        setTeacherFree,
        setTeacherSchedules,
        setTeacherSchedulesHydrated,
        // Actions
        addTeacher,
        deleteTeacher,
        updateTeacherMaxDuty,
        setAllTeachersMaxDuty,
    };

    return <TeachersContext.Provider value={value}>{children}</TeachersContext.Provider>;
}

export function useTeachers() {
    const context = useContext(TeachersContext);
    if (!context) {
        throw new Error('useTeachers must be used within TeachersProvider');
    }
    return context;
}
