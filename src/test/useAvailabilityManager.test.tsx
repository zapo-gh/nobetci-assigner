import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { TeachersProvider } from '../contexts/TeachersContext';
import { ClassesProvider } from '../contexts/ClassesContext';
import { AssignmentsProvider } from '../contexts/AssignmentsContext';
import { useAvailabilityManager } from '../hooks/useAvailabilityManager';
import { useClasses } from '../contexts/useClasses';

// Mock firebaseDataService
vi.mock('../services/firebaseDataService', () => ({
  upsertTeacherFree: vi.fn().mockResolvedValue(true),
  upsertClassFree: vi.fn().mockResolvedValue(true),
  bulkUpsertClassFree: vi.fn().mockResolvedValue(true),
  upsertClassAbsence: vi.fn().mockResolvedValue(true),
  upsertLock: vi.fn().mockResolvedValue(true),
}));

describe('useAvailabilityManager - toggleClassFree restoration', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TeachersProvider>
      <ClassesProvider>
        <AssignmentsProvider>{children}</AssignmentsProvider>
      </ClassesProvider>
    </TeachersProvider>
  );

  it('restores previous absentId when toggling off and then toggling back on', () => {
    const { result } = renderHook(
      () => {
        const avail = useAvailabilityManager();
        const classesContext = useClasses();
        return { avail, classesContext };
      },
      { wrapper }
    );

    const day = 'Mon';
    const period = 9;
    const cid = 'c-10p';

    // 1. Initial state: period 9 is active with an absent teacher
    act(() => {
      result.current.classesContext.setClassFree({
        [day]: { [period]: new Set([cid]) },
      });
      result.current.classesContext.setClassAbsence({
        [day]: { [period]: { [cid]: 'abs-mcan' } },
      });
    });

    expect(result.current.classesContext.classAbsence[day][period][cid]).toBe('abs-mcan');

    // 2. Toggle off (user untoggles capsule)
    act(() => {
      result.current.avail.toggleClassFree(day, period, cid);
    });

    // Absence should be cleaned up
    expect(result.current.classesContext.classAbsence?.[day]?.[period]?.[cid]).toBeUndefined();

    // 3. Toggle back on (user re-clicks capsule)
    act(() => {
      result.current.avail.toggleClassFree(day, period, cid);
    });

    // The absence should be seamlessly restored from cache!
    expect(result.current.classesContext.classAbsence?.[day]?.[period]?.[cid]).toBe('abs-mcan');
  });
});
