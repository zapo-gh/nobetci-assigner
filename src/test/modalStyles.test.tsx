import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmationModal from '../components/ConfirmationModal';
import InputModal from '../components/InputModal';
import Icon from '../components/Icon';

describe('ConfirmationModal Styling & Interactions', () => {
  it('renders correctly with default Hayır and Evet buttons', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <ConfirmationModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Tüm Mazeretleri Sil"
        message="Bu işlem tüm mazeret kayıtlarını ve mevcut sınıf atamalarını temizleyecek. Devam edilsin mi?"
        confirmText="Evet"
        cancelText="Hayır"
        type="warning"
        IconComponent={Icon}
      />
    );

    const titleEl = screen.getByText('Tüm Mazeretleri Sil');
    expect(titleEl).toBeTruthy();

    const cancelBtn = screen.getByText('Hayır');
    const confirmBtn = screen.getByText('Evet');

    expect(cancelBtn).toBeTruthy();
    expect(confirmBtn).toBeTruthy();

    // Verify destructive class applied because title contains "Sil"
    expect(confirmBtn.className).toContain('confirm-modal-confirm-danger');

    // Click confirm
    fireEvent.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    // Click cancel
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders warning variant for non-delete warning actions', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Mevcut Nöbetçi Öğretmen Listesi"
        message="Yeni Excel dosyası ile değiştirmek istediğinizden emin misiniz?"
        confirmText="Değiştir"
        cancelText="İptal"
        type="warning"
        IconComponent={Icon}
      />
    );

    const confirmBtn = screen.getByText('Değiştir');
    expect(confirmBtn.className).toContain('confirm-modal-confirm-warning');
  });

  it('renders info variant for general confirmations', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Grup birleştirilsin mi?"
        message="Ahmet Yılmaz bu derse giriyor. Grup birleştirilsin mi?"
        confirmText="Birleştir"
        cancelText="Hayır"
        type="info"
        IconComponent={Icon}
      />
    );

    const confirmBtn = screen.getByText('Birleştir');
    expect(confirmBtn.className).toContain('confirm-modal-confirm-info');
  });

  it('closes on Escape key press', () => {
    const handleClose = vi.fn();

    render(
      <ConfirmationModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={() => {}}
        title="Test"
        message="Test message"
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe('InputModal Interactions', () => {
  it('renders input, cancel and confirm buttons', () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();

    render(
      <InputModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Yeni İsim"
        defaultValue="Test"
        confirmText="Tamam"
        cancelText="İptal"
      />
    );

    expect(screen.getByText('Yeni İsim')).toBeTruthy();
    const confirmBtn = screen.getByText('Tamam');
    const cancelBtn = screen.getByText('İptal');

    expect(confirmBtn).toBeTruthy();
    expect(cancelBtn).toBeTruthy();

    fireEvent.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledWith('Test');
  });
});

describe('Icon Aliases', () => {
  it('renders alert-triangle, help-circle and warning aliases without crashing', () => {
    const { container: alertTri } = render(<Icon name="alert-triangle" size={20} />);
    expect(alertTri.querySelector('svg')).toBeTruthy();

    const { container: helpCircle } = render(<Icon name="help-circle" size={20} />);
    expect(helpCircle.querySelector('svg')).toBeTruthy();

    const { container: warningIcon } = render(<Icon name="warning" size={20} />);
    expect(warningIcon.querySelector('svg')).toBeTruthy();
  });
});
