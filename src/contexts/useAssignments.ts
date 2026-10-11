import { useContext } from 'react';
import { AssignmentsContext } from './AssignmentsContextObject.js';

export function useAssignments() {
  const context = useContext(AssignmentsContext);
  if (!context) {
    throw new Error('useAssignments must be used within AssignmentsProvider');
  }
  return context;
}
