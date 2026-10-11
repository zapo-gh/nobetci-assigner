import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AssignmentEditor from '../components/AssignmentEditor';
import { MANUAL_EMPTY_TEACHER_ID, MANUAL_ADMIN_TEACHER_ID } from '../utils/assignDuty';

describe('AssignmentEditor - Manual Assignment Persistence & Selection', () => {
  const dummyClasses = [
    { classId: 'cls-10p', className: 'AMP 10 PAZARLA' },
  ];
  const dummyTeachers = [
    { teacherId: 't-omer', teacherName: 'ÖMER MURAT YILDIZ' },
    { teacherId: 't-ali', teacherName: 'ALİ YILMAZ' },
  ];
  const periods = [1, 2, 3, 4, 5];
  const day = 'Mon';

  const freeClassesByDay = {
    Mon: {
      5: new Set(['cls-10p']),
    },
  };

  const assignment = {
    Mon: {
      5: [{ classId: 'cls-10p', teacherId: 't-omer' }],
    },
  };

  it('clicking a teacher in the modal immediately assigns the teacher', () => {
    const handleManualAssign = vi.fn();

    render(
      <AssignmentEditor
        day={day}
        periods={periods}
        classes={dummyClasses}
        teachers={dummyTeachers}
        availableTeachersByPeriod={{ 5: new Set(['t-ali']) }}
        freeClassesByDay={freeClassesByDay}
        assignment={assignment}
        locked={{}}
        onManualAssign={handleManualAssign}
      />
    );

    // Find and click the "Düzenle" button
    const editBtn = screen.getByRole('button', { name: /Görevi Düzenle|Düzenle/i });
    fireEvent.click(editBtn);

    // Find ALİ YILMAZ in the modal
    const aliCard = screen.getByText('ALİ YILMAZ');
    expect(aliCard).toBeInTheDocument();

    // Clicking ALİ YILMAZ once should immediately call onManualAssign
    fireEvent.click(aliCard);

    expect(handleManualAssign).toHaveBeenCalledWith({
      day: 'Mon',
      period: 5,
      classId: 'cls-10p',
      teacherId: 't-ali',
    });
  });

  it('quick action buttons immediately trigger their corresponding save handler', () => {
    const handleManualRelease = vi.fn();
    const handleManualClear = vi.fn();
    const handleManualSetAdmin = vi.fn();

    const { unmount } = render(
      <AssignmentEditor
        day={day}
        periods={periods}
        classes={dummyClasses}
        teachers={dummyTeachers}
        availableTeachersByPeriod={{ 5: new Set(['t-ali']) }}
        freeClassesByDay={freeClassesByDay}
        assignment={assignment}
        locked={{}}
        onManualRelease={handleManualRelease}
        onManualClear={handleManualClear}
        onManualSetAdmin={handleManualSetAdmin}
      />
    );

    // Test "Atama Yapma" quick action
    let editBtn = screen.getByRole('button', { name: /Görevi Düzenle|Düzenle/i });
    fireEvent.click(editBtn);
    const atamaYapmaBtn = screen.getByRole('button', { name: /Atama Yapma/i });
    fireEvent.click(atamaYapmaBtn);
    expect(handleManualClear).toHaveBeenCalledWith({
      day: 'Mon',
      period: 5,
      classId: 'cls-10p',
    });

    unmount();

    // Test "Otomatik" quick action
    const { unmount: unmount2 } = render(
      <AssignmentEditor
        day={day}
        periods={periods}
        classes={dummyClasses}
        teachers={dummyTeachers}
        availableTeachersByPeriod={{ 5: new Set(['t-ali']) }}
        freeClassesByDay={freeClassesByDay}
        assignment={assignment}
        locked={{}}
        onManualRelease={handleManualRelease}
        onManualClear={handleManualClear}
        onManualSetAdmin={handleManualSetAdmin}
      />
    );

    editBtn = screen.getByRole('button', { name: /Görevi Düzenle|Düzenle/i });
    fireEvent.click(editBtn);
    const otomatikBtn = screen.getByRole('button', { name: /Otomatik/i });
    fireEvent.click(otomatikBtn);
    expect(handleManualRelease).toHaveBeenCalledWith({
      day: 'Mon',
      period: 5,
      classId: 'cls-10p',
    });

    unmount2();

    // Test "İdare" quick action
    render(
      <AssignmentEditor
        day={day}
        periods={periods}
        classes={dummyClasses}
        teachers={dummyTeachers}
        availableTeachersByPeriod={{ 5: new Set(['t-ali']) }}
        freeClassesByDay={freeClassesByDay}
        assignment={assignment}
        locked={{}}
        onManualRelease={handleManualRelease}
        onManualClear={handleManualClear}
        onManualSetAdmin={handleManualSetAdmin}
      />
    );

    editBtn = screen.getByRole('button', { name: /Görevi Düzenle|Düzenle/i });
    fireEvent.click(editBtn);
    const idareBtn = screen.getByRole('button', { name: /İdare/i });
    fireEvent.click(idareBtn);
    expect(handleManualSetAdmin).toHaveBeenCalledWith({
      day: 'Mon',
      period: 5,
      classId: 'cls-10p',
    });
  });

  it('displays locked teacher when cell is manually locked', () => {
    const locked = {
      'Mon|5|cls-10p': 't-ali',
    };

    render(
      <AssignmentEditor
        day={day}
        periods={periods}
        classes={dummyClasses}
        teachers={dummyTeachers}
        availableTeachersByPeriod={{ 5: new Set(['t-ali']) }}
        freeClassesByDay={freeClassesByDay}
        assignment={assignment}
        locked={locked}
      />
    );

    // The cell should display ALİ YILMAZ (the locked teacher)
    expect(screen.getByText('ALİ YILMAZ')).toBeInTheDocument();
  });
});
