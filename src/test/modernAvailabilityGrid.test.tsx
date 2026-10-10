import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
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
});
