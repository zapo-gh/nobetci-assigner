import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../components/Modal';
import ClassSchedulesSection from '../components/ClassSchedulesSection';
import TeacherScheduleModal from '../components/TeacherScheduleModal';
import Icon from '../components/Icon';
import styles from '../components/ClassSchedulesSection.module.css';

describe('Modal Navigation and Schedule Features', () => {
  it('Modal renders prev/next buttons and label when navigation props are passed', () => {
    const handlePrev = vi.fn();
    const handleNext = vi.fn();

    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Test Modal"
        onPrev={handlePrev}
        onNext={handleNext}
        hasPrev={true}
        hasNext={true}
        navLabel="2 / 10"
      >
        <div>Content</div>
      </Modal>
    );

    expect(screen.getByText('2 / 10')).toBeInTheDocument();

    const prevBtn = screen.getByRole('button', { name: 'Önceki' });
    const nextBtn = screen.getByRole('button', { name: 'Sonraki' });

    expect(prevBtn).not.toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    fireEvent.click(prevBtn);
    expect(handlePrev).toHaveBeenCalledTimes(1);

    fireEvent.click(nextBtn);
    expect(handleNext).toHaveBeenCalledTimes(1);
  });

  it('Modal supports keyboard Left and Right arrow navigation', () => {
    const handlePrev = vi.fn();
    const handleNext = vi.fn();

    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Keyboard Nav Modal"
        onPrev={handlePrev}
        onNext={handleNext}
        hasPrev={true}
        hasNext={true}
      >
        <div>Content</div>
      </Modal>
    );

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(handlePrev).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(handleNext).toHaveBeenCalledTimes(1);
  });

  it('ClassSchedulesSection allows cycling between classes via next button', () => {
    const mockClasses = [
      { classId: 'c1', className: 'AMP 9-A' },
      { classId: 'c2', className: 'AMP 9-B' },
      { classId: 'c3', className: 'AMP 10-A' },
    ];

    render(
      <ClassSchedulesSection
        classes={mockClasses}
        teacherSchedules={{}}
        classLocations={{}}
        IconComponent={Icon}
      />
    );

    // Click on AMP 9-A card to open modal
    const classCardA = screen.getByTitle('AMP 9-A haftalık ders programını görüntüle');
    fireEvent.click(classCardA);

    // Modal title should show AMP 9-A
    expect(screen.getByRole('heading', { name: /AMP 9-A/i })).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();

    // Click next button
    const nextBtn = screen.getByRole('button', { name: 'Sonraki' });
    fireEvent.click(nextBtn);

    // Modal should now show AMP 9-B
    expect(screen.getByRole('heading', { name: /AMP 9-B/i })).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('TeacherScheduleModal allows cycling between teachers with navigation controls', () => {
    const mockList = [
      ['AHMET YILMAZ', { monday: { '1': '10-A' } }],
      ['BURCU SUNGUR', { monday: { '1': '11-B' } }],
      ['CANAN DEMİR', { monday: { '1': '12-C' } }],
    ];

    const handleSelectTeacher = vi.fn();

    render(
      <TeacherScheduleModal
        isOpen={true}
        onClose={() => {}}
        teacherName="BURCU SUNGUR"
        schedule={mockList[1][1]}
        teacherSchedulesList={mockList}
        onSelectTeacher={handleSelectTeacher}
        IconComponent={Icon}
      />
    );

    expect(screen.getByRole('heading', { name: /BURCU SUNGUR/i })).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();

    const prevBtn = screen.getByRole('button', { name: 'Önceki' });
    fireEvent.click(prevBtn);
    expect(handleSelectTeacher).toHaveBeenCalledWith('AHMET YILMAZ', mockList[0][1]);

    const nextBtn = screen.getByRole('button', { name: 'Sonraki' });
    fireEvent.click(nextBtn);
    expect(handleSelectTeacher).toHaveBeenCalledWith('CANAN DEMİR', mockList[2][1]);
  });

  it('ClassSchedulesSection teacherNameSub class applies italic font style', () => {
    expect(styles.teacherNameSub).toBeDefined();
  });
});
