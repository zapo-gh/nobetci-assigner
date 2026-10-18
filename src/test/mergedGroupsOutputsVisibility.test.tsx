import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PrintableAssignmentList from '../components/PrintableAssignmentList';
import PrintableDailyList from '../components/PrintableDailyList';
import AssignmentText from '../components/AssignmentText';
import OutputsSection from '../components/OutputsSection';

describe('Merged Groups (Birleştirilen Gruplar) Outputs Visibility', () => {
  const day = 'Tue';
  const displayDate = '20.10.2026';
  const periods = ['5', '6', '7', '8', '9', '10', '11'];

  const teachers = [
    { teacherId: 't_rahmi', teacherName: 'RAHMİ TEKİN' },
    { teacherId: 't_mehmet', teacherName: 'MEHMET CAN' },
    { teacherId: 't_seyrani', teacherName: 'SEYRANİ GÜL' },
    { teacherId: 't_mahmut', teacherName: 'MAHMUT DOĞRUYOL' },
    { teacherId: 't_halil', teacherName: 'HALİL AKÇAY' },
  ];

  const classes = [
    { classId: 'cls_9g', className: 'AMP 9-G' },
    { classId: 'cls_9i', className: 'AMP 9-I' },
    { classId: 'cls_10mot', className: 'AMP 10 MOT' },
    { classId: 'cls_10muh', className: 'AMP 10 MUHASEBE' },
    { classId: 'cls_10a', className: 'AMP 10-A' },
    { classId: 'cls_12bil', className: 'AMP 12 BİLİŞİM' },
  ];

  const assignment = {
    Tue: {
      8: [{ classId: 'cls_9g', teacherId: 't_rahmi' }],
    },
  };

  const commonLessons = {
    Tue: {
      6: {
        cls_9i: 'MEHMET CAN',
        cls_10mot: 'SEYRANİ GÜL',
        cls_10muh: 'MAHMUT DOĞRUYOL',
        cls_10a: 'RAHMİ TEKİN',
        cls_12bil: 'HALİL AKÇAY',
      },
      7: {
        cls_9i: 'MEHMET CAN',
        cls_10mot: 'SEYRANİ GÜL',
        cls_10a: 'RAHMİ TEKİN',
        cls_12bil: 'HALİL AKÇAY',
      },
      8: {
        cls_10mot: 'SEYRANİ GÜL',
        cls_10a: 'RAHMİ TEKİN',
        cls_12bil: 'HALİL AKÇAY',
      },
      9: {
        cls_10mot: 'SEYRANİ GÜL',
        cls_10a: 'RAHMİ TEKİN',
        cls_12bil: 'HALİL AKÇAY',
      },
      10: {
        cls_10a: 'RAHMİ TEKİN',
        cls_12bil: 'HALİL AKÇAY',
      },
      11: {
        cls_12bil: 'HALİL AKÇAY',
      },
    },
  };

  const classAbsence = {
    Tue: {
      8: { cls_9g: 'abs_zehra' },
      6: { cls_9i: 'COMMON_LESSON:no-duty' },
      7: { cls_9i: 'COMMON_LESSON:no-duty' },
    },
  };

  const absentPeople = [
    { absentId: 'abs_zehra', name: 'ZEHRA KOŞAN', reason: 'gorevli-izinli', days: ['Tue'] },
  ];

  it('renders all merged groups in PrintableAssignmentList (Görev Listesi) when showMergedLessons is true', () => {
    render(
      <PrintableAssignmentList
        day={day}
        displayDate={displayDate}
        periods={periods}
        teachers={teachers}
        classes={classes}
        assignment={assignment}
        commonLessons={commonLessons}
        showMergedLessons={true}
        classAbsence={classAbsence}
        absentPeople={absentPeople}
      />
    );

    // Genuine duty assignment is present
    expect(screen.getByText('RAHMİ TEKİN')).toBeInTheDocument();
    expect(screen.getByText('ZEHRA KOŞAN')).toBeInTheDocument();

    // All merged teachers are present with their merge tags
    expect(screen.getAllByText(/Grup Birleştirilecek \(MEHMET CAN\)/).length).toBe(2);
    expect(screen.getAllByText(/Grup Birleştirilecek \(SEYRANİ GÜL\)/).length).toBe(4);
    expect(screen.getAllByText(/Grup Birleştirilecek \(MAHMUT DOĞRUYOL\)/).length).toBe(1);
    expect(screen.getAllByText(/Grup Birleştirilecek \(RAHMİ TEKİN\)/).length).toBe(5);
    expect(screen.getAllByText(/Grup Birleştirilecek \(HALİL AKÇAY\)/).length).toBe(6);

    // Dummy placeholder text is NOT rendered
    expect(screen.queryByText('Mazeretli Öğretmen')).not.toBeInTheDocument();
  });

  it('renders all merged groups in PrintableDailyList (Çizelge) when showMergedLessons is true', () => {
    render(
      <PrintableDailyList
        day={day}
        displayDate={displayDate}
        periods={periods}
        teachers={teachers}
        classes={classes}
        assignment={assignment}
        commonLessons={commonLessons}
        showMergedLessons={true}
        classAbsence={classAbsence}
        absentPeople={absentPeople}
      />
    );

    // All 5 teachers appear in the Çizelge table
    expect(screen.getByText('RAHMİ TEKİN')).toBeInTheDocument();
    expect(screen.getByText('MEHMET CAN')).toBeInTheDocument();
    expect(screen.getByText('SEYRANİ GÜL')).toBeInTheDocument();
    expect(screen.getByText('MAHMUT DOĞRUYOL')).toBeInTheDocument();
    expect(screen.getByText('HALİL AKÇAY')).toBeInTheDocument();

    // The merged lessons cards are displayed inside cells
    expect(screen.getAllByText(/Grup Birleştirilecek/).length).toBeGreaterThanOrEqual(18);
  });

  it('renders all merged groups in AssignmentText (WhatsApp & Plain text) when showMergedLessons is true', () => {
    render(
      <AssignmentText
        day={day}
        displayDate={displayDate}
        periods={periods}
        teachers={teachers}
        classes={classes}
        assignment={assignment}
        commonLessons={commonLessons}
        showMergedLessons={true}
        classAbsence={classAbsence}
        absentPeople={absentPeople}
      />
    );

    expect(screen.getAllByText(/MEHMET CAN/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/SEYRANİ GÜL/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/MAHMUT DOĞRUYOL/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/HALİL AKÇAY/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders OutputsSection with both duty count and merged count without runtime errors', () => {
    const IconMock = () => <span>icon</span>;
    render(
      <OutputsSection
        day={day}
        displayDate={displayDate}
        periods={periods}
        assignment={assignment}
        locked={{}}
        teachersForCurrentDay={teachers}
        classes={classes}
        classAbsence={classAbsence}
        absentPeopleForCurrentDay={absentPeople}
        commonLessons={commonLessons}
        classLocations={{}}
        locationZoneMapping={{}}
        teacherSchedules={{}}
        IconComponent={IconMock}
      />
    );

    expect(screen.getByText(/1 Görevlendirme/)).toBeInTheDocument();
    expect(screen.getByText(/Birleştirildi/)).toBeInTheDocument();
  });

  it('lists merged teachers in the "Dersi Birleştirilenler" WhatsApp tab even without an owner absence record', () => {
    render(
      <AssignmentText
        day={day}
        displayDate={displayDate}
        periods={periods}
        teachers={teachers}
        classes={classes}
        assignment={assignment}
        commonLessons={commonLessons}
        showMergedLessons={true}
        classAbsence={classAbsence}
        absentPeople={absentPeople}
      />
    );

    fireEvent.click(screen.getByText('Dersi Birleştirilenler'));

    expect(screen.queryByText('Grup Birleştirmesi Bulunmuyor')).not.toBeInTheDocument();
    expect(screen.getByText(/5 Öğretmen İçin Özel Mesaj Hazırlandı/)).toBeInTheDocument();
    ['MEHMET CAN', 'SEYRANİ GÜL', 'MAHMUT DOĞRUYOL', 'RAHMİ TEKİN', 'HALİL AKÇAY'].forEach((name) => {
      expect(screen.getAllByText(name).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('PrintableAssignmentList resolves absent teacher from teacherSchedules without crashing', () => {
    const schedules = {
      'ZEHRA KOŞAN': { tuesday: { 6: 'AMP 9-I' } },
    };
    render(
      <PrintableAssignmentList
        day={day}
        displayDate={displayDate}
        periods={periods}
        teachers={teachers}
        classes={classes}
        assignment={assignment}
        commonLessons={commonLessons}
        showMergedLessons={true}
        classAbsence={{}}
        absentPeople={absentPeople}
        teacherSchedules={schedules}
        classLocations={{}}
      />
    );

    expect(screen.getAllByText(/Grup Birleştirilecek \(MEHMET CAN\)/).length).toBe(2);
  });
});
