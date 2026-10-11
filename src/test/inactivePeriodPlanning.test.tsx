import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import AssignmentEditor from '../components/AssignmentEditor';
import { MANUAL_EMPTY_TEACHER_ID } from '../utils/assignDuty';

describe('AssignmentEditor - Inactive Slot Handling', () => {
  const dummyClasses = [
    { classId: 'cls-10p', className: 'AMP 10 PAZARLAMA' },
  ];
  const dummyTeachers = [
    { teacherId: 't-zafer', teacherName: 'ZAFER KÜLTE' },
  ];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const day = 'Mon';

  it('renders an empty slot (dash) when period 9 is NOT free, even if locked contains a stale lock', () => {
    // Period 8 is free, period 9 is NOT free
    const freeClassesByDay = {
      Mon: {
        8: new Set(['cls-10p']),
        9: new Set(), // NOT free
      },
    };

    // Stale lock remaining from earlier
    const locked = {
      'Mon|8|cls-10p': 't-zafer',
      'Mon|9|cls-10p': MANUAL_EMPTY_TEACHER_ID,
    };

    const assignment = {
      Mon: {
        8: [{ classId: 'cls-10p', teacherId: 't-zafer' }],
      },
    };

    const { container } = render(
      <AssignmentEditor
        day={day}
        periods={periods}
        classes={dummyClasses}
        teachers={dummyTeachers}
        availableTeachersByPeriod={{}}
        freeClassesByDay={freeClassesByDay}
        assignment={assignment}
        locked={locked}
      />
    );

    // Period 8 should show assigned teacher
    expect(screen.getByText('ZAFER KÜLTE')).toBeTruthy();

    // Period 9 should NOT show "Atama Yapılmadı" or "Kilitli" because it's not a free slot!
    expect(screen.queryByText('Atama Yapılmadı')).toBeNull();
    expect(screen.queryByText(/Kilitli/)).toBeNull();

    // Class duty count badge and column header show "1 görev"
    expect(screen.getAllByText('1 görev').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Atama Yapılmadı and Kilitli when period 9 IS free and manually locked to empty', () => {
    // Both 8 and 9 are free
    const freeClassesByDay = {
      Mon: {
        8: new Set(['cls-10p']),
        9: new Set(['cls-10p']),
      },
    };

    const locked = {
      'Mon|8|cls-10p': 't-zafer',
      'Mon|9|cls-10p': MANUAL_EMPTY_TEACHER_ID,
    };

    const assignment = {
      Mon: {
        8: [{ classId: 'cls-10p', teacherId: 't-zafer' }],
      },
    };

    render(
      <AssignmentEditor
        day={day}
        periods={periods}
        classes={dummyClasses}
        teachers={dummyTeachers}
        availableTeachersByPeriod={{}}
        freeClassesByDay={freeClassesByDay}
        assignment={assignment}
        locked={locked}
      />
    );

    expect(screen.getByText('ZAFER KÜLTE')).toBeTruthy();
    expect(screen.getByText('Atama Yapılmadı')).toBeTruthy();
    expect(screen.getByText(/Kilitli/)).toBeTruthy();
  });

  it('does not treat common lessons as unassigned and displays birleştirildi badge on class card', () => {
    const commonClasses = [
      { classId: 'cls-9i', className: 'AMP 9-I' },
    ];
    const commonLessons = {
      Mon: {
        6: { 'cls-9i': 'BÜLENT AYGÜN' },
        7: { 'cls-9i': 'BÜLENT AYGÜN' },
      },
    };

    render(
      <AssignmentEditor
        day={day}
        periods={periods}
        classes={commonClasses}
        teachers={dummyTeachers}
        availableTeachersByPeriod={{}}
        freeClassesByDay={{ Mon: {} }}
        commonLessons={commonLessons}
        assignment={{ Mon: {} }}
        locked={{}}
        unassignedForSelectedDay={[]}
      />
    );

    // Class badge should show "2 birleştirildi" instead of "Boş"
    expect(screen.getByText('2 birleştirildi')).toBeTruthy();

    // There should be NO warning button for "Atanamayanlar"
    expect(screen.queryByText(/Atanamayanlar/)).toBeNull();

    // In periods 6 and 7, it renders the common lesson badge
    expect(screen.getAllByText(/Birleştirildi/).length).toBe(2);
    expect(screen.getAllByText('BÜLENT AYGÜN').length).toBe(2);
  });
});

