import React, { useState } from 'react';
import { ClassesContext } from './ClassesContextObject.js';

export function ClassesProvider({ children }) {
    // Class State
    const [classes, setClasses] = useState([]);
    const [classFree, setClassFree] = useState({});
    const [classAbsence, setClassAbsence] = useState({});

    const value = {
        // State
        classes,
        classFree,
        classAbsence,
        // Setters
        setClasses,
        setClassFree,
        setClassAbsence,
    };

    return <ClassesContext.Provider value={value}>{children}</ClassesContext.Provider>;
}
