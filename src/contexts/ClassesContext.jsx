import React, { createContext, useContext, useState, useCallback } from 'react';
import {
    insertClass,
    deleteClass as deleteClassDB,
} from '../services/supabaseDataService';

const ClassesContext = createContext(null);

export function ClassesProvider({ children }) {
    // Class State
    const [classes, setClasses] = useState([]);
    const [classFree, setClassFree] = useState({});
    const [classAbsence, setClassAbsence] = useState({});

    // Class Actions
    const addClass = useCallback(async (data) => {
        try {
            const newClass = await insertClass(data);
            setClasses((prev) => [...prev, newClass]);
            return newClass;
        } catch (error) {
            console.error('Failed to add class:', error);
            throw error;
        }
    }, []);

    const deleteClass = useCallback(async (classId) => {
        try {
            await deleteClassDB(classId);
            setClasses((prev) => prev.filter((c) => c.classId !== classId));
        } catch (error) {
            console.error('Failed to delete class:', error);
            throw error;
        }
    }, []);

    const value = {
        // State
        classes,
        classFree,
        classAbsence,
        // Setters
        setClasses,
        setClassFree,
        setClassAbsence,
        // Actions
        addClass,
        deleteClass,
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
