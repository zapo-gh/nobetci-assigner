import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CommonLessonModal from '../components/CommonLessonModal';

describe('CommonLessonModal', () => {
  const mockClassInfo = { classId: 'cls-9i', className: 'AMP 9-I' };
  const mockTeachers = [
    { teacherId: 't1', teacherName: 'BÜLENT AYGÜN' },
    { teacherId: 't2', teacherName: 'MEHMET CAN' },
    { teacherId: 't3', teacherName: 'AHMET YILMAZ' },
  ];

  it('automatically detects and pre-selects fixed co-teacher from schedule', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    // Mehmet Can is absent, Bülent Aygün is teaching AMP 9-I on Tue 6th period
    const teacherSchedules = {
      'BÜLENT AYGÜN': {
        Tue: {
          6: 'AMP 9-I',
        },
      },
    };
    const absentPeople = [{ name: 'MEHMET CAN', absentId: 'a1' }];

    render(
      <CommonLessonModal
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
        classInfo={mockClassInfo}
        day="Tue"
        period={6}
        teachers={mockTeachers}
        teacherSchedules={teacherSchedules}
        absentPeople={absentPeople}
      />
    );

    // Verify context banner
    expect(screen.getByText('AMP 9-I')).toBeDefined();
    expect(screen.getByText(/Salı/i)).toBeDefined();
    expect(screen.getByText(/6\. Saat/i)).toBeDefined();

    // Verify fixed co-teacher card
    expect(screen.getByText(/DİĞER GRUBUN ÖĞRETMENİ \(SABİT DERS\)/i)).toBeDefined();
    expect(screen.getByText(/BÜLENT AYGÜN/i)).toBeDefined();

    // Submitting merges with detected teacher
    const submitBtn = screen.getByRole('button', { name: /Grubu Birleştir/i });
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith('BÜLENT AYGÜN');
  });

  it('allows teacher selection from dropdown when no co-teacher is detected', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(
      <CommonLessonModal
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
        classInfo={mockClassInfo}
        day="Tue"
        period={6}
        teachers={mockTeachers}
        teacherSchedules={{}}
        absentPeople={[]}
      />
    );

    // Should render teacher select dropdown
    const select = screen.getByLabelText(/Dersi Birleştirecek Öğretmen/i);
    expect(select).toBeDefined();

    // Select Ahmet Yılmaz
    fireEvent.change(select, { target: { value: 'AHMET YILMAZ' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Grubu Birleştir/i });
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith('AHMET YILMAZ');
  });

  it('triggers onClose when cancel button is clicked', () => {
    const onClose = vi.fn();

    render(
      <CommonLessonModal
        isOpen={true}
        onClose={onClose}
        onSubmit={vi.fn()}
        classInfo={mockClassInfo}
        day="Tue"
        period={6}
        teachers={mockTeachers}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /İptal/i });
    fireEvent.click(cancelBtn);

    expect(onClose).toHaveBeenCalled();
  });
});
