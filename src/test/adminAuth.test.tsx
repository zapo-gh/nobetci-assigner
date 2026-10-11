import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  hashPassword,
  verifyPassword,
  isSessionAuthenticated,
  setSessionAuthenticated,
  clearSession
} from '../utils/authUtils';
import LoginScreen from '../components/LoginScreen';
import ChangePasswordModal from '../components/ChangePasswordModal';

vi.mock('../services/firebaseDataService', () => ({
  getAdminAuthConfig: vi.fn().mockResolvedValue({ passwordHash: 'mock_hash', updatedAt: Date.now() }),
  setAdminAuthConfig: vi.fn().mockResolvedValue(undefined),
}));

describe('Admin Authentication & Security Lock', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('authUtils', () => {
    it('hashes passwords consistently and verifies correct password', async () => {
      const hash1 = await hashPassword('1234');
      const hash2 = await hashPassword('1234');
      expect(hash1).toBe(hash2);

      const isValid = await verifyPassword('1234', hash1);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('wrongpass', hash1);
      expect(isInvalid).toBe(false);
    });

    it('manages session authentication in sessionStorage and localStorage', () => {
      expect(isSessionAuthenticated()).toBe(false);

      // Session without rememberMe
      setSessionAuthenticated(false);
      expect(sessionStorage.getItem('nobetci_auth_session')).toBe('true');
      expect(localStorage.getItem('nobetci_auth_remember')).toBeNull();
      expect(isSessionAuthenticated()).toBe(true);

      // Clear session
      clearSession();
      expect(isSessionAuthenticated()).toBe(false);

      // Session with rememberMe
      setSessionAuthenticated(true);
      expect(localStorage.getItem('nobetci_auth_remember')).toBe('true');
      expect(isSessionAuthenticated()).toBe(true);

      clearSession();
      expect(isSessionAuthenticated()).toBe(false);
    });
  });

  describe('LoginScreen Component', () => {
    it('renders logo, badge, password input, and login button', async () => {
      render(<LoginScreen onLoginSuccess={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Yönetici Girişi')).toBeInTheDocument();
      });

      expect(screen.getByText('MEB Nöbet & Görevlendirme')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Yönetici şifrenizi giriniz')).toBeInTheDocument();
      expect(screen.getByText('Bu cihazda oturumu açık tut')).toBeInTheDocument();
      expect(screen.getByText('🔓 Giriş Yap')).toBeInTheDocument();
    });

    it('toggles password visibility with eye button', async () => {
      render(<LoginScreen onLoginSuccess={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Yönetici şifrenizi giriniz')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Yönetici şifrenizi giriniz') as HTMLInputElement;
      expect(input.type).toBe('password');

      const eyeBtn = screen.getByTitle('Şifreyi Göster');
      fireEvent.click(eyeBtn);
      expect(input.type).toBe('text');

      fireEvent.click(eyeBtn);
      expect(input.type).toBe('password');
    });

    it('shows error message when empty password submitted', async () => {
      render(<LoginScreen onLoginSuccess={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Yönetici şifrenizi giriniz')).toBeInTheDocument();
      });

      const submitBtn = screen.getByText('🔓 Giriş Yap');
      fireEvent.click(submitBtn);

      expect(screen.getByText('Lütfen yönetici şifresini giriniz.')).toBeInTheDocument();
    });
  });

  describe('ChangePasswordModal Component', () => {
    it('renders form fields when modal is open', () => {
      render(
        <ChangePasswordModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      expect(screen.getByText('Yönetici Şifresini Değiştir')).toBeInTheDocument();
      expect(screen.getByLabelText('Mevcut Şifre')).toBeInTheDocument();
      expect(screen.getByLabelText('Yeni Şifre')).toBeInTheDocument();
      expect(screen.getByLabelText('Yeni Şifre (Tekrar)')).toBeInTheDocument();
      expect(screen.getByText('Şifreyi Güncelle')).toBeInTheDocument();
    });
  });
});
