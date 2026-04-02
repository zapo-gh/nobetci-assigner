import { useContext } from 'react';
import { TeachersContext } from './TeachersContextObject.js';

export function useTeachers() {
  const context = useContext(TeachersContext);
  if (!context) {
    throw new Error('useTeachers must be used within TeachersProvider');
  }
  return context;
}
