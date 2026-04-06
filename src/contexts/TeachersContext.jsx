import React, { useState } from 'react';
import { TeachersContext } from './TeachersContextObject.js';

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
