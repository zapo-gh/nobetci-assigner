import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import TeachersSection from '../components/TeachersSection';
import CourseScheduleSection from '../components/CourseScheduleSection';
import ClassSchedulesSection from '../components/ClassSchedulesSection';
import Icon from '../components/Icon';

describe('TeachersSection and Schedules UI enhancements', () => {
  it('does NOT render RuleEngineCard in TeachersSection', () => {
    render(
      <TeachersSection
        teachers={[]}
        teachersForCurrentDay={[]}
        periods={['1', '2']}
        teacherFree={{}}
        IconComponent={Icon}
        day="Mon"
      />
    );

    // Kural Motoru should NOT be in the document
    expect(screen.queryByText(/Kural Motoru/i)).toBeNull();
    expect(screen.queryByText(/Aynı güne 2 nöbet verme/i)).toBeNull();
    expect(screen.queryByText(/Yasak Ekle/i)).toBeNull();
  });

  it('renders modern CourseScheduleSection with instant search and weekday indicators', () => {
    const mockList = [
      [
        'BURCU SUNGUR',
        {
          monday: { '1': '10-A', '2': '10-A' },
          tuesday: { '1': '11-B' },
        },
      ],
    ];

    render(
      <CourseScheduleSection
        teacherSchedulesList={mockList}
        IconComponent={Icon}
        onUpload={() => {}}
        onDeleteAllSchedules={() => {}}
        onOpenTeacherSchedule={() => {}}
      />
    );

    expect(screen.getByText('BURCU SUNGUR')).toBeInTheDocument();
    expect(screen.getByText(/3 Saat Ders/)).toBeInTheDocument();
    expect(screen.getByText(/Öğretmen El Programı Yükle/)).toBeInTheDocument();
  });

  it('renders modern ClassSchedulesSection with unified level/branch filters and stats', () => {
    render(
      <ClassSchedulesSection
        classes={[{ classId: 'c1', className: 'AMP 10-A' }]}
        teacherSchedules={{}}
        classLocations={{}}
        IconComponent={Icon}
      />
    );

    expect(screen.getByText('AMP 10-A')).toBeInTheDocument();
    expect(screen.getByText('Seviye:')).toBeInTheDocument();
    expect(screen.getByText('Alan:')).toBeInTheDocument();
    expect(screen.getByText('Sınıf El Programı Yükle')).toBeInTheDocument();
  });
});
