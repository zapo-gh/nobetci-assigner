import React, { useState } from 'react';
import { AssignmentsContext } from './AssignmentsContextObject.js';

export function AssignmentsProvider({ children }) {
    // Assignment State
    const [locked, setLocked] = useState({});
    const [absentPeople, setAbsentPeople] = useState([]);
    const [commonLessons, setCommonLessons] = useState({});
    const [pdfSchedule, setPdfSchedule] = useState({});
    const [options, setOptions] = useState({
        preventConsecutive: false,
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
