/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';

const TeachersContext = createContext(null);

export function TeachersProvider({ children }) {
    // Teacher State
    const [teachers, setTeachers] = useState([]);
    const [teacherFree, setTeacherFree] = useState({});
    const [teacherSchedules, setTeacherSchedules] = useState({});
    const [teacherSchedulesHydrated, setTeacherSchedulesHydrated] = useState(false);

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
