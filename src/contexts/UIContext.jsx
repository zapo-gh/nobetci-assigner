import React from 'react';
import { useUI } from '../hooks/useUI';
import { UIContext } from './UIContextObject.js';

export function UIProvider({ children }) {
    const uiState = useUI();

    return <UIContext.Provider value={uiState}>{children}</UIContext.Provider>;
}
