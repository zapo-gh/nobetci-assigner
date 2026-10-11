// @ts-nocheck
import { useState, useCallback, useRef, useEffect } from 'react';

export function useAssignmentHistory(locked, setLocked, addNotification) {
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const isUndoRedoAction = useRef(false);

  // Take snapshot before manual action
  const recordHistory = useCallback((prevLocked) => {
    if (isUndoRedoAction.current) return;
    setPast((prev) => [...prev.slice(-30), { ...(prevLocked || {}) }]);
    setFuture([]); // new manual action invalidates redo stack
  }, []);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    isUndoRedoAction.current = true;
    setFuture((prev) => [{ ...(locked || {}) }, ...prev]);
    setPast(newPast);
    setLocked(previous);
    setTimeout(() => {
      isUndoRedoAction.current = false;
    }, 50);

    if (addNotification) {
      addNotification({
        message: 'Son planlama işlemi geri alındı (Undo)',
        type: 'info',
        duration: 2000,
      });
    }
  }, [past, locked, setLocked, addNotification]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);

    isUndoRedoAction.current = true;
    setPast((prev) => [...prev, { ...(locked || {}) }]);
    setFuture(newFuture);
    setLocked(next);
    setTimeout(() => {
      isUndoRedoAction.current = false;
    }, 50);

    if (addNotification) {
      addNotification({
        message: 'Planlama işlemi yinelendi (Redo)',
        type: 'info',
        duration: 2000,
      });
    }
  }, [future, locked, setLocked, addNotification]);

  return {
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undo,
    redo,
    recordHistory,
  };
}
