import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { useFilteredClassFree, useFilteredClassAbsence } from '../hooks/useDerivedAvailability';
import AbsentsSection from '../components/AbsentsSection';
import Icon from '../components/Icon';
import { renderHook } from '@testing-library/react';

describe('Date-based Absence Scoping', () => {
  it('useFilteredClassFree excludes slots whose absent record belongs to another date', () => {
    const day = 'Tue';
    const periods = [1, 2, 9];
    const classFree = {
      Tue: {
        9: new Set(['cls-10p']),
      },
    };
    const classAbsence = {
      Tue: {
        9: {
          'cls-10p': 'abs-13oct', // Belonging to Oct 13 absentee
        },
      },
    };

    // On Oct 7, absentIdsForCurrentDay does NOT have 'abs-13oct'
    const absentIdsOct7 = new Set<string>();

    const { result } = renderHook(() =>
      useFilteredClassFree({
        classFree,
        classAbsence,
        day,
        periods,
        absentIdsForCurrentDay: absentIdsOct7,
      })
    );

    // Period 9 should NOT be free on Oct 7!
    expect(result.current.Tue[9].has('cls-10p')).toBe(false);
  });

  it('useFilteredClassFree includes slots when the absent teacher IS active on current date', () => {
    const day = 'Tue';
    const periods = [1, 2, 9];
    const classFree = {
      Tue: {
        9: new Set(['cls-10p']),
      },
    };
    const classAbsence = {
      Tue: {
        9: {
          'cls-10p': 'abs-13oct',
        },
      },
    };

    // On Oct 13, absentIdsForCurrentDay HAS 'abs-13oct'
    const absentIdsOct13 = new Set(['abs-13oct']);

    const { result } = renderHook(() =>
      useFilteredClassFree({
        classFree,
        classAbsence,
        day,
        periods,
        absentIdsForCurrentDay: absentIdsOct13,
      })
    );

    // Period 9 SHOULD be free on Oct 13!
    expect(result.current.Tue[9].has('cls-10p')).toBe(true);
  });

  it('AbsentsSection defaults to showing selected day absentees', () => {
    const allAbsents = [
      { absentId: 'a1', name: 'FATMA KAYA', days: ['Tue'], date: '2026-10-13', reason: 'Raporlu' },
    ];
    const todayAbsents: any[] = []; // Empty on Oct 7

    render(
      <AbsentsSection
        absentPeople={allAbsents}
        absentPeopleForCurrentDay={todayAbsents}
        onAddAbsent={() => {}}
        onDeleteAbsent={() => {}}
        onDeleteAllAbsents={() => {}}
        IconComponent={Icon}
      />
    );

    // Since todayAbsents is empty, it displays empty state for today by default!
    expect(screen.getByText('Seçili Gün (0)')).toBeTruthy();
    expect(screen.getByText('Tüm Mazeretliler (1)')).toBeTruthy();
    expect(screen.queryByText('FATMA KAYA')).toBeNull();
  });
});
