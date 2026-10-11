import React, { useState } from 'react';
import Modal from './Modal';
import {
  hashPassword,
  verifyPassword,
  cacheAdminHashLocally,
  getCachedAdminHash
} from '../utils/authUtils';
import { getAdminAuthConfig, setAdminAuthConfig } from '../services/firebaseDataService';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
  onSuccess
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentPassword) {
      setErrorMsg('Lütfen mevcut şifrenizi giriniz.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setErrorMsg('Yeni şifre en az 4 karakter olmalıdır.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Yeni şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setIsLoading(true);
    try {
      // Mevcut hash'i doğrula
      let currentHash = getCachedAdminHash();
      const fbConfig = await getAdminAuthConfig();
      if (fbConfig?.passwordHash) {
        currentHash = fbConfig.passwordHash;
      }

      if (currentHash) {
        const isValid = await verifyPassword(currentPassword.trim(), currentHash);
        if (!isValid) {
          setErrorMsg('Mevcut şifreniz hatalı.');
          setIsLoading(false);
          return;
        }
      } else {
        // Eğer sistemde hiç hash yoksa varsayılan şifre 1234
        if (currentPassword.trim() !== '1234') {
          setErrorMsg('Mevcut şifreniz hatalı. (Varsayılan şifre: 1234)');
          setIsLoading(false);
          return;
        }
      }

      // Yeni şifreyi hashle ve kaydet
      const newHash = await hashPassword(newPassword.trim());
      await setAdminAuthConfig({ passwordHash: newHash });
      cacheAdminHashLocally(newHash);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg('Şifre güncellenirken bir hata oluştu: ' + (err?.message || ''));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Yönetici Şifresini Değiştir"
    >
      <form onSubmit={handleSubmit} className="change-pass-form">
        <p className="change-pass-desc">
          Okul yönetim şifrenizi buradan güncelleyebilirsiniz. Güncellenen şifre tüm cihazlarda geçerli olacaktır.
        </p>

        {errorMsg && (
          <div className="change-pass-alert">
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="cur-pass">Mevcut Şifre</label>
          <input
            id="cur-pass"
            type={showPassword ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Şu anki şifreniz"
            className="form-input"
            disabled={isLoading}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label htmlFor="new-pass">Yeni Şifre</label>
          <input
            id="new-pass"
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="En az 4 karakter"
            className="form-input"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="conf-pass">Yeni Şifre (Tekrar)</label>
          <input
            id="conf-pass"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Yeni şifrenizi tekrar giriniz"
            className="form-input"
            disabled={isLoading}
          />
        </div>

        <div className="show-pass-row">
          <label className="show-pass-label">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
            />
            <span>Şifreleri Göster</span>
          </label>
        </div>

        <div className="modal-actions-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Vazgeç
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
          </button>
        </div>
      </form>

      <style>{`
        .change-pass-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .change-pass-desc {
          font-size: 0.88rem;
          color: #64748b;
          margin: 0 0 4px 0;
          line-height: 1.45;
        }
        .change-pass-alert {
          padding: 8px 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          border-radius: 8px;
          font-size: 0.84rem;
          font-weight: 600;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .form-group label {
          font-size: 0.82rem;
          font-weight: 700;
          color: #334155;
        }
        .form-input {
          padding: 10px 12px;
          border: 1.5px solid #cbd5e1;
          border-radius: 10px;
          font-size: 0.92rem;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .form-input:focus {
          border-color: #6366f1;
        }
        .show-pass-row {
          font-size: 0.82rem;
        }
        .show-pass-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          color: #64748b;
        }
        .modal-actions-row {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 8px;
        }
      `}</style>
    </Modal>
  );
}
