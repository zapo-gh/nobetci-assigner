import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ModernAvailabilityGrid from '../components/ModernAvailabilityGrid';

describe('ModernAvailabilityGrid layout and teacher row updates', () => {
  it('does not render ratio badges like 6/11 in teacher rows and displays full teacher and location names', () => {
    const mockRows = [
      {
        teacherId: 't1',
        teacherName: 'BURCU SUNGUR',
        dutyLocations: { monday: 'BAHÇE GİRİŞİ VE ÖN BAHÇE' },
      },
      {
        teacherId: 't2',
        teacherName: 'GÜLTEKİN ALCAN',
        dutyLocations: { monday: 'ARKA BAHÇE - MOTORLU ARAÇLAR' },
      },
    ];

    const periods = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
    // Burcu is free for 6 periods (6/11), Gültekin for 8 periods (8/11)
    const selectedMap = {
      '1': new Set(['t1', 't2']),
      '2': new Set(['t1', 't2']),
      '3': new Set(['t1', 't2']),
      '4': new Set(['t1', 't2']),
      '5': new Set(['t1', 't2']),
      '6': new Set(['t1', 't2']),
      '7': new Set(['t2']),
      '8': new Set(['t2']),
    };

    render(
      <ModernAvailabilityGrid
        rows={mockRows}
        periods={periods}
        selectedMap={selectedMap}
        day="Mon"
      />
    );

    // Full teacher names should be rendered
    expect(screen.getByText(/BURCU SUNGUR/)).toBeInTheDocument();
    expect(screen.getByText(/GÜLTEKİN ALCAN/)).toBeInTheDocument();

    // Full location names should be rendered
    expect(screen.getByText('BAHÇE GİRİŞİ VE ÖN BAHÇE')).toBeInTheDocument();
    expect(screen.getByText('ARKA BAHÇE - MOTORLU ARAÇLAR')).toBeInTheDocument();

    // Ratio badges 6/11 or 8/11 should NOT exist in the document (hoursBadge removed)
    expect(screen.queryByText('6/11')).toBeNull();
    expect(screen.queryByText('8/11')).toBeNull();
  });

  it('renders common lessons as a clean interactive badge without duplicate select', async () => {
    const { default: ModernClassAvailabilityGrid } = await import('../components/ModernClassAvailabilityGrid');

    const mockClasses = [
      { classId: 'cls-9i', className: 'AMP 9-I' },
    ];
    const mockTeachers = [
      { teacherId: 't-bulent', teacherName: 'BÜLENT AYGÜN' },
    ];
    const periods = [6, 7];
    const classFree = {
      Tue: {
        6: new Set(['cls-9i']),
        7: new Set(['cls-9i']),
      },
    };
    const classAbsence = {
      Tue: {
        6: { 'cls-9i': 'COMMON_LESSON::absent-mehmet' },
        7: { 'cls-9i': 'COMMON_LESSON::absent-mehmet' },
      },
    };
    const commonLessons = {
      Tue: {
        6: { 'cls-9i': 'BÜLENT AYGÜN' },
        7: { 'cls-9i': 'BÜLENT AYGÜN' },
      },
    };

    const onCancelCommonLesson = vi.fn();
    render(
      <ModernClassAvailabilityGrid
        classes={mockClasses}
        teachers={mockTeachers}
        periods={periods}
        classFree={classFree}
        classAbsence={classAbsence}
        commonLessons={commonLessons}
        onCancelCommonLesson={onCancelCommonLesson}
        day="Tue"
      />
    );

    // Should display Grup Birleştirildi headers
    const groupHeaders = screen.getAllByText(/Grup Birleştirildi/i);
    expect(groupHeaders.length).toBe(2);

    // Should display B. AYGÜN badges
    const badges = screen.getAllByText(/B\. AYGÜN/i);
    expect(badges.length).toBe(2);

    // Should display İptal Et buttons
    const cancelButtons = screen.getAllByRole('button', { name: /İptal Et/i });
    expect(cancelButtons.length).toBe(2);

    // Clicking cancel button should trigger onCancelCommonLesson
    fireEvent.click(cancelButtons[0]);
    expect(onCancelCommonLesson).toHaveBeenCalledWith('Tue', 6, 'cls-9i');

    // Should NOT have any duplicate <select> element displaying "Birleştir" for common lesson
    const selects = screen.queryAllByRole('combobox');
    expect(selects.length).toBe(0);
  });
});

