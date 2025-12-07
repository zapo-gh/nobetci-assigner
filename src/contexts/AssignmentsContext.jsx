/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';

const AssignmentsContext = createContext(null);

export function AssignmentsProvider({ children }) {
    // Assignment State
    const [locked, setLocked] = useState({});
    const [absentPeople, setAbsentPeople] = useState([]);
    const [commonLessons, setCommonLessons] = useState({});
    const [pdfSchedule, setPdfSchedule] = useState({});
    const [options, setOptions] = useState({
        preventConsecutive: true,
        maxClassesPerSlot: 1,
        ignoreConsecutiveLimit: false,
    });

    // Cleanup tracking
    const [lastCleanupDate, setLastCleanupDate] = useState(null);

    // Refresh state
    const [absenceRefreshState, setAbsenceRefreshState] = useState({
        isRefreshing: false,
        lastRefreshedAt: null,
        error: null,
    });

    const value = {
        // State
        locked,
        absentPeople,
        commonLessons,
        pdfSchedule,
        options,
        lastCleanupDate,
        absenceRefreshState,
        // Setters
        setLocked,
        setAbsentPeople,
        setCommonLessons,
        setPdfSchedule,
        setOptions,
        setLastCleanupDate,
        setAbsenceRefreshState,
    };

    return <AssignmentsContext.Provider value={value}>{children}</AssignmentsContext.Provider>;
}

export function useAssignments() {
    const context = useContext(AssignmentsContext);
    if (!context) {
        throw new Error('useAssignments must be used within AssignmentsProvider');
    }
    return context;
}
