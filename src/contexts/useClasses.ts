import { useContext } from 'react';
import { ClassesContext } from './ClassesContextObject.js';

export function useClasses() {
  const context = useContext(ClassesContext);
  if (!context) {
    throw new Error('useClasses must be used within ClassesProvider');
  }
  return context;
}
