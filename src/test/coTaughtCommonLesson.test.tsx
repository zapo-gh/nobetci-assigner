import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import CommonLessonModal from '../components/CommonLessonModal';
import AssignmentText from '../components/AssignmentText';
import ModernClassAvailabilityGrid from '../components/ModernClassAvailabilityGrid';
import { useFilteredClassFree, useFilteredClassAbsence } from '../hooks/useDerivedAvailability';
import { assignDuties } from '../utils/assignDuty';
import { renderHook } from '@testing-library/react';

describe('Co-Taught Common Lessons (Zehra Koşan & Mahmut Doğruyol in AMP 10 MUHASEB)', () => {
  const teacherSchedules = {
    'MAHMUT DOĞRUYOL': {
      tuesday: {
        5: '10 MUHASEB',
        6: '10 MUHASEB',
      },
    },
    'ZEHRA KOŞAN': {
      tuesday: {
        1: '10 MUHASEB',
        2: '10 MUHASEB',
        5: '10 MUHASEB',
        6: '10 MUHASEB',
      },
    },
  };

  const classLocations = {
    '10 MUHASEB': {
      tuesday: {
        6: {
          location: 'C-07/D-08',
          subject: 'EKONOMİ',
          teacherNamesStr: 'DOĞRUYOL/Z.KOŞ',
        },
      },
    },
  };

  const absentPeople = [
    {
      absentId: 'abs_zehra',
      name: 'ZEHRA KOŞAN',
      reason: 'gorevli-izinli',
      days: ['Tue'],
    },
  ];

  const teachers = [
    { teacherId: 't_mahmut', teacherName: 'MAHMUT DOĞRUYOL', dutyDays: ['Tue'], dutyLocations: { tuesday: '2. KAT' } },
    { teacherId: 't_zehra', teacherName: 'ZEHRA KOŞAN', dutyDays: [], dutyLocations: {} },
    { teacherId: 't_omer', teacherName: 'ÖMER MURAT', dutyDays: ['Tue'], dutyLocations: { tuesday: 'ZEMİN KAT' } },
  ];

  const classes = [
    { classId: 'cls_10muh', className: 'AMP 10 MUHASEB' },
    { classId: 'cls_9a', className: 'AMP 9-A BİL' },
  ];

  it('CommonLessonModal automatically detects MAHMUT DOĞRUYOL as co-teacher candidate for AMP 10 MUHASEB at Tue period 6', () => {
    render(
      <CommonLessonModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        currentTeacherName=""
        classInfo={{ classId: 'cls_10muh', className: 'AMP 10 MUHASEB' }}
        day="Tue"
        period={6}
        teachers={teachers}
        teacherSchedules={teacherSchedules}
        classLocations={classLocations}
        absentPeople={absentPeople}
      />
    );

    expect(screen.getByText(/DİĞER GRUBUN ÖĞRETMENİ/i)).toBeInTheDocument();
    expect(screen.getByText(/MAHMUT DOĞRUYOL/i)).toBeInTheDocument();
  });

  it('useFilteredClassFree excludes merged class from free classes, preventing duty teacher assignment', () => {
    const classFree = {
      Tue: {
        6: new Set(['cls_10muh']),
      },
    };
    const classAbsence = {
      Tue: {
        6: {
          cls_10muh: 'abs_zehra',
        },
      },
    };
    const commonLessons = {
      Tue: {
        6: {
          cls_10muh: 'MAHMUT DOĞRUYOL',
        },
      },
    };

    const { result: freeResult } = renderHook(() =>
      useFilteredClassFree({
        classFree,
        classAbsence,
        day: 'Tue',
        periods: [6],
        absentIdsForCurrentDay: new Set(['abs_zehra']),
        commonLessons,
        absentPeople,
      })
    );

    // cls_10muh MUST NOT be in the free classes set for period 6
    const period6Free = freeResult.current.Tue[6];
    expect(period6Free.has('cls_10muh')).toBe(false);

    const { result: absResult } = renderHook(() =>
      useFilteredClassAbsence({
        classAbsence,
        day: 'Tue',
        absentIdsForCurrentDay: new Set(['abs_zehra']),
        commonLessons,
        absentPeople,
      })
    );

    // cls_10muh must be marked as COMMON_LESSON in filtered absences
    expect(absResult.current.Tue[6].cls_10muh).toBe('COMMON_LESSON');
  });

  it('assignDuties does NOT assign Ömer Murat (or any duty teacher) to AMP 10 MUHASEB when merged under Mahmut Doğruyol', () => {
    const commonLessons = {
      Tue: {
        6: {
          cls_10muh: 'MAHMUT DOĞRUYOL',
        },
      },
    };

    const result = assignDuties({
      teachers,
      classes,
      teacherFree: { Tue: { 6: new Set(['t_mahmut', 't_omer']) } },
      classFree: { Tue: { 6: new Set(['cls_10muh']) } },
      options: { singleDutyPerDay: false, prioritizeFloor: true, balancedAssignment: true },
      locked: {},
      commonLessons,
      classLocations,
      locationZoneMapping: {},
      absentPeople,
      classAbsence: { Tue: { 6: { cls_10muh: 'COMMON_LESSON' } } },
    });

    const period6Assignments = result.Tue?.[6] || [];
    const muhasebAssignment = period6Assignments.find((a: any) => a.classId === 'cls_10muh');
    // AMP 10 MUHASEB should NOT have any duty teacher assigned!
    expect(muhasebAssignment).toBeUndefined();
  });

  it('AssignmentText formats merged lesson in WhatsApp text displaying Mahmut Doğruyol and absent Zehra Koşan', () => {
    const commonLessons = {
      Tue: {
        6: {
          cls_10muh: 'MAHMUT DOĞRUYOL',
        },
      },
    };

    render(
      <AssignmentText
        day="Tue"
        periods={[6]}
        classes={classes}
        teachers={teachers}
        assignment={{ Tue: { 6: [] } }}
        locked={{}}
        displayDate="17.10.2026"
        absentPeople={absentPeople}
        classAbsence={{ Tue: { 6: { cls_10muh: 'COMMON_LESSON' } } }}
        commonLessons={commonLessons}
        classLocations={classLocations}
        teacherSchedules={teacherSchedules}
        showMergedLessons={true}
      />
    );

    const matches = screen.getAllByText(/Grup Birleştirilecek - MAHMUT DOĞRUYOL/i);
    expect(matches.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ZEHRA KOŞAN/i).length).toBeGreaterThan(0);
  });

  it('ModernClassAvailabilityGrid renders Grup Birleştirildi card with MAHMUT DOĞRUYOL for AMP 10 MUHASEB', () => {
    const commonLessons = {
      Tue: {
        6: {
          cls_10muh: 'MAHMUT DOĞRUYOL',
        },
      },
    };

    render(
      <ModernClassAvailabilityGrid
        classes={classes}
        periods={[6]}
        day="Tue"
        classFree={{ Tue: { 6: new Set(['cls_10muh']) } }}
        classAbsence={{ Tue: { 6: { cls_10muh: 'COMMON_LESSON' } } }}
        commonLessons={commonLessons}
        absentPeople={absentPeople}
        teachers={teachers}
        onToggleClassFree={vi.fn()}
        onSelectAbsence={vi.fn()}
        onCancelCommonLesson={vi.fn()}
      />
    );

    expect(screen.getByText('Grup Birleştirildi')).toBeInTheDocument();
    expect(screen.getByText(/M\. DOĞRUYOL/i)).toBeInTheDocument();
  });
});
