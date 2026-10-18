import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PrintNotesCard from '../components/PrintNotesCard';
import OfficialSignatures from '../components/OfficialSignatures';
import PrintableDailyList from '../components/PrintableDailyList';
import PrintableAssignmentList from '../components/PrintableAssignmentList';
import AssignmentText from '../components/AssignmentText';
import { assignDuties } from '../utils/assignDuty';

describe('Outputs Standardization (Çizelge & Görev Listesi)', () => {
  describe('PrintNotesCard', () => {
    it('renders unified header with title, status badge, toggle checkbox, and edit button', () => {
      render(
        <PrintNotesCard
          notes="10-I Pazarlama sınıfı yoklaması evlere gidecektir."
          notesEnabled={true}
          titlePrefix="Çizelge Açıklamaları"
        />
      );

      expect(screen.getByText('Çizelge Açıklamaları')).toBeInTheDocument();
      expect(screen.getByText('Çıktıda Görünür')).toBeInTheDocument();
      expect(screen.getByText('Çıktıda Göster')).toBeInTheDocument();
      expect(screen.getByText('✏️ Düzenle')).toBeInTheDocument();
      expect(screen.getByText('AÇIKLAMALAR:')).toBeInTheDocument();
      expect(screen.getAllByText('10-I Pazarlama sınıfı yoklaması evlere gidecektir.').length).toBeGreaterThanOrEqual(1);
    });

    it('opens edit panel with quick templates when edit button is clicked', () => {
      render(
        <PrintNotesCard
          notes="Test notu"
          notesEnabled={true}
          titlePrefix="Görev Listesi Açıklamaları"
        />
      );

      const editBtn = screen.getByText('✏️ Düzenle');
      fireEvent.click(editBtn);

      expect(screen.getByText('+ Boş Ders Kuralı')).toBeInTheDocument();
      expect(screen.getByText('+ Defter/Yoklama İmzası')).toBeInTheDocument();
      expect(screen.getByText('+ Birleştirilen Gruplar')).toBeInTheDocument();
      expect(screen.getByText('+ Görev Yeri Kuralı')).toBeInTheDocument();
      expect(screen.getByText('Standart 3 Madde')).toBeInTheDocument();
      expect(screen.getByText('Kaydet')).toBeInTheDocument();
      expect(screen.getByText('Vazgeç')).toBeInTheDocument();
    });
  });

  describe('OfficialSignatures', () => {
    it('renders unified MEB signature blocks', () => {
      render(<OfficialSignatures />);
      expect(screen.getByText('Nöbetçi Müdür Yardımcısı')).toBeInTheDocument();
      expect(screen.getByText('UYGUNDUR')).toBeInTheDocument();
      expect(screen.getByText('Okul Müdürü')).toBeInTheDocument();
    });
  });

  describe('PrintableDailyList (Çizelge View)', () => {
    it('renders standardized title, uppercase headers, empty state, notes card, and signatures', () => {
      const { container } = render(
        <PrintableDailyList
          day="Tue"
          displayDate="13.10.2026"
          periods={['1', '2']}
          teachers={[]}
          classes={[]}
          notes="10-I Pazarlama sınıfı yoklaması evlere gidecektir."
          notesEnabled={true}
        />
      );

      // Standard document paper wrapper
      expect(container.querySelector('.print-wrap')).toBeInTheDocument();

      // Title
      expect(
        screen.getByText('Tarih: 13.10.2026 (Salı) Nöbetçi Öğretmen Boş Ders Görevlendirme Listesi')
      ).toBeInTheDocument();

      // Table headers uppercase
      expect(screen.getByText('ÖĞRETMEN')).toBeInTheDocument();
      expect(screen.getByText('1. SAAT')).toBeInTheDocument();
      expect(screen.getByText('2. SAAT')).toBeInTheDocument();

      // Empty cell standardized
      expect(screen.getAllByText('Bu günde görevi olan öğretmen bulunmuyor.').length).toBeGreaterThanOrEqual(1);
      expect(container.querySelector('.empty-table-cell')).toBeInTheDocument();
      expect(container.querySelector('.table-empty-state-screen')).toBeInTheDocument();

      // Interactive notes card
      expect(screen.getByText('Çizelge Açıklamaları')).toBeInTheDocument();
      expect(screen.getByText('✏️ Düzenle')).toBeInTheDocument();

      // Signatures
      expect(screen.getByText('Nöbetçi Müdür Yardımcısı')).toBeInTheDocument();
      expect(screen.getByText('UYGUNDUR')).toBeInTheDocument();
    });
  });

  describe('PrintableAssignmentList (Görev Listesi View)', () => {
    it('renders standardized title, headers, empty state, notes card with controls, and signatures', () => {
      const { container } = render(
        <PrintableAssignmentList
          day="Tue"
          displayDate="13.10.2026"
          periods={['1', '2']}
          teachers={[]}
          classes={[]}
          notes="10-I Pazarlama sınıfı yoklaması evlere gidecektir."
          notesEnabled={true}
        />
      );

      // Standard document paper wrapper
      expect(container.querySelector('.print-wrap')).toBeInTheDocument();

      // Title
      expect(
        screen.getByText('Tarih: 13.10.2026 (Salı) Nöbetçi Öğretmen Boş Ders Görevlendirme Listesi')
      ).toBeInTheDocument();

      // Table headers
      expect(screen.getByText('Ders Saati')).toBeInTheDocument();
      expect(screen.getByText('İzinli / Mazeretli Öğretmen')).toBeInTheDocument();
      expect(screen.getByText('Sınıfı')).toBeInTheDocument();
      expect(screen.getByText('Derslik No')).toBeInTheDocument();
      expect(screen.getByText('Ders İsmi')).toBeInTheDocument();
      expect(screen.getByText('Görevlendirilen Öğretmen')).toBeInTheDocument();
      expect(screen.getByText('İmza')).toBeInTheDocument();

      // Empty cell standardized
      expect(
        screen.getAllByText('Bu günde görevlendirme veya mazeretli öğretmen kaydı bulunmuyor.').length
      ).toBeGreaterThanOrEqual(1);
      expect(container.querySelector('.empty-table-cell')).toBeInTheDocument();
      expect(container.querySelector('.table-empty-state-screen')).toBeInTheDocument();

      // Interactive notes card (previously missing on screen in Görev Listesi)
      expect(screen.getByText('Görev Listesi Açıklamaları')).toBeInTheDocument();
      expect(screen.getByText('✏️ Düzenle')).toBeInTheDocument();

      // Signatures
      expect(screen.getByText('Nöbetçi Müdür Yardımcısı')).toBeInTheDocument();
      expect(screen.getByText('UYGUNDUR')).toBeInTheDocument();

      // Orientation selector (Portrait default)
      expect(screen.getByText('Dikey (A4)')).toBeInTheDocument();
      expect(screen.getByText('Yatay (A4)')).toBeInTheDocument();
      expect(container.querySelector('.print-wrap.orientation-portrait')).toBeInTheDocument();

      // Switch to landscape
      fireEvent.click(screen.getByText('Yatay (A4)'));
      expect(container.querySelector('.print-wrap.orientation-landscape')).toBeInTheDocument();
    });

    it('does not display stale teacher locks for non-absent classes as ghost duties with Mazeretli Öğretmen', () => {
      // 1 real assignment on 8th period (Rahmi Tekin -> AMP 9-G)
      // plus stale locks in locked from prior sessions for non-absent classes (e.g. Zafer Külte, Burcu Sungur)
      const assignment = {
        Tue: {
          8: [{ classId: 'cls_9g', teacherId: 't_rahmi' }],
        },
      };
      const locked = {
        'Tue|1|cls_10p': 't_zafer', // non-absent class, stale lock!
        'Tue|2|cls_11g': 't_burcu', // non-absent class, stale lock!
        'Tue|8|cls_9g': 't_rahmi',  // real lock matching assignment
      };
      const classAbsence = {
        Tue: {
          8: { cls_9g: 'abs_zehra' },
        },
      };
      const absentPeople = [
        { absentId: 'abs_zehra', name: 'ZEHRA KOŞAN', reason: 'gorevli-izinli', days: ['Tue'] },
      ];
      const teachers = [
        { teacherId: 't_rahmi', teacherName: 'RAHMİ TEKİN' },
        { teacherId: 't_zafer', teacherName: 'ZAFER KÜLTE' },
        { teacherId: 't_burcu', teacherName: 'BURCU SUNGUR' },
      ];
      const classes = [
        { classId: 'cls_9g', className: 'AMP 9-G' },
        { classId: 'cls_10p', className: 'AMP 10 PAZARLA' },
        { classId: 'cls_11g', className: 'AMP 11-G' },
      ];

      render(
        <PrintableAssignmentList
          day="Tue"
          displayDate="20.10.2026"
          periods={['1', '2', '8']}
          teachers={teachers}
          classes={classes}
          assignment={assignment}
          locked={locked}
          classAbsence={classAbsence}
          absentPeople={absentPeople}
        />
      );

      // Only the genuine duty should be rendered
      expect(screen.getByText('RAHMİ TEKİN')).toBeInTheDocument();
      expect(screen.getByText('ZEHRA KOŞAN')).toBeInTheDocument();
      expect(screen.getByText(/Görevli İzinli/)).toBeInTheDocument();
      expect(screen.getByText('AMP 9-G')).toBeInTheDocument();

      // Ghost duties from stale locks should NOT be rendered!
      expect(screen.queryByText('ZAFER KÜLTE')).not.toBeInTheDocument();
      expect(screen.queryByText('BURCU SUNGUR')).not.toBeInTheDocument();
      expect(screen.queryByText('Mazeretli Öğretmen')).not.toBeInTheDocument();
    });

    it('displays common lessons when showMergedLessons is true and does NOT display Mazeretli Öğretmen placeholder', () => {
      const commonLessons = {
        Tue: {
          3: { cls_10m: 'GÜLCAN KARAN' },
          6: { cls_9i: 'MEHMET CAN' },
        },
      };
      const assignment = {
        Tue: {
          8: [{ classId: 'cls_9g', teacherId: 't_rahmi' }],
        },
      };
      const classAbsence = {
        Tue: {
          8: { cls_9g: 'abs_zehra' },
        },
      };
      const absentPeople = [
        { absentId: 'abs_zehra', name: 'ZEHRA KOŞAN', reason: 'gorevli-izinli', days: ['Tue'] },
      ];
      const teachers = [
        { teacherId: 't_rahmi', teacherName: 'RAHMİ TEKİN' },
      ];
      const classes = [
        { classId: 'cls_9g', className: 'AMP 9-G' },
        { classId: 'cls_10m', className: 'AMP 10 MUHASEB' },
        { classId: 'cls_9i', className: 'AMP 9-I' },
      ];

      const { unmount } = render(
        <PrintableAssignmentList
          day="Tue"
          displayDate="20.10.2026"
          periods={['3', '6', '8']}
          teachers={teachers}
          classes={classes}
          assignment={assignment}
          commonLessons={commonLessons}
          showMergedLessons={true}
          classAbsence={classAbsence}
          absentPeople={absentPeople}
        />
      );

      // The genuine duty is rendered
      expect(screen.getByText('RAHMİ TEKİN')).toBeInTheDocument();
      expect(screen.getByText('ZEHRA KOŞAN')).toBeInTheDocument();

      // Common lessons are rendered when showMergedLessons is true
      expect(screen.getByText(/GÜLCAN KARAN/)).toBeInTheDocument();
      expect(screen.getByText(/MEHMET CAN/)).toBeInTheDocument();
      // Dummy placeholder must NEVER be rendered
      expect(screen.queryByText('Mazeretli Öğretmen')).not.toBeInTheDocument();

      unmount();

      // When showMergedLessons is false, common lessons must be hidden
      render(
        <PrintableAssignmentList
          day="Tue"
          displayDate="20.10.2026"
          periods={['3', '6', '8']}
          teachers={teachers}
          classes={classes}
          assignment={assignment}
          commonLessons={commonLessons}
          showMergedLessons={false}
          classAbsence={classAbsence}
          absentPeople={absentPeople}
        />
      );

      expect(screen.getByText('RAHMİ TEKİN')).toBeInTheDocument();
      expect(screen.queryByText(/GÜLCAN KARAN/)).not.toBeInTheDocument();
      expect(screen.queryByText(/MEHMET CAN/)).not.toBeInTheDocument();
    });

    it('WhatsApp format in AssignmentText displays common lessons when showMergedLessons is true and hides when false', () => {
      const commonLessons = {
        Tue: {
          6: { cls_9i: 'MEHMET CAN', cls_10m: 'SEYRANİ GÜL' },
          7: { cls_10a: 'RAHMİ TEKİN' },
        },
      };
      const assignment = {
        Tue: {
          8: [{ classId: 'cls_9g', teacherId: 't_rahmi' }],
        },
      };
      const classAbsence = {
        Tue: {
          8: { cls_9g: 'abs_zehra' },
        },
      };
      const absentPeople = [
        { absentId: 'abs_zehra', name: 'ZEHRA KOŞAN', reason: 'gorevli-izinli', days: ['Tue'] },
      ];
      const teachers = [
        { teacherId: 't_rahmi', teacherName: 'RAHMİ TEKİN' },
      ];
      const classes = [
        { classId: 'cls_9g', className: 'AMP 9-G' },
        { classId: 'cls_10m', className: 'AMP 10 MOT' },
        { classId: 'cls_9i', className: 'AMP 9-İ' },
        { classId: 'cls_10a', className: 'AMP 10-A' },
      ];

      const { unmount } = render(
        <AssignmentText
          day="Tue"
          displayDate="20.10.2026"
          periods={['6', '7', '8']}
          teachers={teachers}
          classes={classes}
          assignment={assignment}
          commonLessons={commonLessons}
          showMergedLessons={true}
          classAbsence={classAbsence}
          absentPeople={absentPeople}
        />
      );

      // WhatsApp text must contain Rahmi Tekin and Zehra Koşan
      expect(screen.getAllByText(/RAHMİ TEKİN/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/ZEHRA KOŞAN/).length).toBeGreaterThanOrEqual(1);

      // Must contain common lessons when showMergedLessons is true
      expect(screen.getAllByText(/MEHMET CAN/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/SEYRANİ GÜL/).length).toBeGreaterThanOrEqual(1);

      unmount();

      // When showMergedLessons is false, must hide common lessons
      render(
        <AssignmentText
          day="Tue"
          displayDate="20.10.2026"
          periods={['6', '7', '8']}
          teachers={teachers}
          classes={classes}
          assignment={assignment}
          commonLessons={commonLessons}
          showMergedLessons={false}
          classAbsence={classAbsence}
          absentPeople={absentPeople}
        />
      );

      expect(screen.getAllByText(/RAHMİ TEKİN/).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText(/MEHMET CAN/)).not.toBeInTheDocument();
      expect(screen.queryByText(/SEYRANİ GÜL/)).not.toBeInTheDocument();
    });

    it('assignDuties assigns a duty teacher when all co-teachers of a class are absent', () => {
      // Sınıf: cls_10a (AMP 10-A)
      // Normalde ortak girenler: Öğretmen 1 (Ali) ve Öğretmen 2 (Ahmet)
      // Bugün İKİSİ DE İZİNLİ!
      const commonLessons = {
        Tue: {
          6: { cls_10a: 'Ahmet Can' },
        },
      };
      const classAbsence = {
        Tue: {
          6: { cls_10a: 'abs_ali' },
        },
      };
      const absentPeople = [
        { absentId: 'abs_ali', name: 'Ali Veli', days: ['Tue'] },
        { absentId: 'abs_ahmet', name: 'Ahmet Can', days: ['Tue'] }, // Ahmet de izinli!
      ];
      const teachers = [
        { teacherId: 't_nobetci', teacherName: 'Nöbetçi Öğretmen', maxDutyPerDay: 4 },
      ];
      const classes = [
        { classId: 'cls_10a', className: 'AMP 10-A' },
      ];
      const freeClasses = {
        Tue: {
          6: new Set(['cls_10a']),
        },
      };
      const freeTeachers = {
        Tue: {
          6: new Set(['t_nobetci']),
        },
      };

      const result = assignDuties({
        teachers,
        classes,
        freeClasses,
        freeTeachers,
        commonLessons,
        classAbsence,
        absentPeople,
      });

      // Her iki ortak öğretmen de izinli olduğu için grup birleştirilemez;
      // nöbetçi öğretmen bu sınıfa atanmalıdır!
      const assignmentsOnTuePeriod6 = result.schedule?.Tue?.['6'] || [];
      expect(assignmentsOnTuePeriod6).toHaveLength(1);
      expect(assignmentsOnTuePeriod6[0].classId).toBe('cls_10a');
      expect(assignmentsOnTuePeriod6[0].teacherId).toBe('t_nobetci');
    });
  });
});

