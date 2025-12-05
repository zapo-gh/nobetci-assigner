import React, { createContext, useContext, useState } from 'react';

const ClassesContext = createContext(null);

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

export function useClasses() {
    const context = useContext(ClassesContext);
    if (!context) {
        throw new Error('useClasses must be used within ClassesProvider');
    }
    return context;
}
