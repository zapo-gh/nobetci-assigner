/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext } from 'react';
import { useUI } from '../hooks/useUI';

const UIContext = createContext(null);

export function UIProvider({ children }) {
    const uiState = useUI();

    return <UIContext.Provider value={uiState}>{children}</UIContext.Provider>;
}

export function useUIContext() {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUIContext must be used within UIProvider');
    }
    return context;
}
