import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PrintNotesCard from '../components/PrintNotesCard';
import OfficialSignatures from '../components/OfficialSignatures';
import PrintableDailyList from '../components/PrintableDailyList';
import PrintableAssignmentList from '../components/PrintableAssignmentList';

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
    });
  });
});
