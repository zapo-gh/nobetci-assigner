import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AssignmentInsights from '../components/AssignmentInsights';
import Icon from '../components/Icon';

describe('AssignmentInsights Compact Layout', () => {
  const mockInsights = {
    teacherSummaries: [
      {
        teacher: { teacherId: 't1', teacherName: 'ÖMER MURAT YILDIZ' },
        assignments: [
          { period: 9, classId: 'cls1', className: 'AMP 10 PAZARLA' }
        ],
        unassignedReasons: []
      },
      {
        teacher: { teacherId: 't2', teacherName: 'BURCU SUNGUR' },
        assignments: [],
        unassignedReasons: [{ period: 1, message: 'Boş saat yok' }]
      },
      {
        teacher: { teacherId: 't3', teacherName: 'MEHMET AYIK' },
        assignments: [],
        unassignedReasons: [{ period: 2, message: 'Görev yok' }]
      }
    ]
  };

  it('renders compact header, stats and period chips WITHOUT lesson names', () => {
    render(
      <AssignmentInsights insights={mockInsights} IconComponent={Icon} />
    );

    // Header title and stats
    expect(screen.getByText('Planlama Analizi')).toBeInTheDocument();
    expect(screen.getByText('1 Görev Atandı')).toBeInTheDocument();
    expect(screen.getByText('1 / 3 Görevde')).toBeInTheDocument();

    // Teacher names
    expect(screen.getByText('ÖMER MURAT YILDIZ')).toBeInTheDocument();
    expect(screen.getByText('BURCU SUNGUR')).toBeInTheDocument();
    expect(screen.getByText('MEHMET AYIK')).toBeInTheDocument();

    // Period is rendered as "9. Saat"
    expect(screen.getByText('9. Saat')).toBeInTheDocument();

    // LESSON / CLASS NAME SHOULD NOT BE DISPLAYED ON THE SCREEN TEXT!
    // (Only optionally in title tooltip)
    const elementsWithClassName = screen.queryAllByText('AMP 10 PAZARLA');
    expect(elementsWithClassName.length).toBe(0);
  });

  it('filters teachers by assigned and idle status', () => {
    render(
      <AssignmentInsights insights={mockInsights} IconComponent={Icon} />
    );

    // Initial state: all 3 teachers shown
    expect(screen.getByText('Tümü (3)')).toBeInTheDocument();
    expect(screen.getByText('Görevliler (1)')).toBeInTheDocument();
    expect(screen.getByText('Boştakiler (2)')).toBeInTheDocument();

    // Click "Görevliler (1)"
    fireEvent.click(screen.getByText('Görevliler (1)'));
    expect(screen.getByText('ÖMER MURAT YILDIZ')).toBeInTheDocument();
    expect(screen.queryByText('BURCU SUNGUR')).toBeNull();
    expect(screen.queryByText('MEHMET AYIK')).toBeNull();

    // Click "Boştakiler (2)"
    fireEvent.click(screen.getByText('Boştakiler (2)'));
    expect(screen.queryByText('ÖMER MURAT YILDIZ')).toBeNull();
    expect(screen.getByText('BURCU SUNGUR')).toBeInTheDocument();
    expect(screen.getByText('MEHMET AYIK')).toBeInTheDocument();
  });
});
