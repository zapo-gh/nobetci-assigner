import React, { useState, useEffect } from 'react';
import Modal from './Modal';

export default function CommonLessonModal({ isOpen, onClose, onSubmit, currentTeacherName = "" }) {
  const [teacherName, setTeacherName] = useState('');
  const [error, setError] = useState('');

  // Update teacher name when modal opens with existing data
  useEffect(() => {
    if (isOpen) {
      setTeacherName(currentTeacherName);
      setError('');
    }
  }, [isOpen, currentTeacherName]);

  const handleChange = (e) => {
    const value = e.target.value;
    setTeacherName(value);
    if (error) {
      setError('');
    }
  };

  const validate = () => {
    if (!teacherName.trim()) {
      return 'Ders birleştirilecek öğretmeni adı zorunludur';
    }
    if (teacherName.trim().length < 2) {
      return 'Öğretmen adı en az 2 karakter olmalıdır';
    }
    return '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    onSubmit(teacherName.trim());
    setTeacherName('');
    setError('');
  };

  const handleClose = () => {
    setTeacherName('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Ders Birleştirilecek Öğretmeni" size="small">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="teacherName" className="form-label">
            Ders Birleştirilecek Öğretmeni Adı <span className="required">*</span>
          </label>
          <input
            type="text"
            id="teacherName"
            name="teacherName"
            className={`form-input ${error ? 'error' : ''}`}
            value={teacherName}
            onChange={handleChange}
            placeholder="Örn: Ahmet Yılmaz"
            autoFocus
          />
          {error && <span className="error-message">{error}</span>}
          <small className="form-hint">
            Bu öğretmen bu sınıfa ders birleştirilecek ders verecektir. Nöbetçi öğretmen ataması yapılmayacaktır.
          </small>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={handleClose}>
            İptal
          </button>
          <button type="submit" className="btn">
            Kaydet
          </button>
        </div>
      </form>

      <style>{`
        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: var(--text-primary, #e8eefc);
          font-size: 0.95rem;
        }

        .required {
          color: #ff6b6b;
        }

        .form-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border-color, #2e3d6e);
          border-radius: 8px;
          background: var(--bg-secondary, #0b1328);
          color: var(--text-primary, #e8eefc);
          font-size: 1rem;
          transition: all 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--primary, #4a90e2);
          box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
        }

        .form-input.error {
          border-color: #ff6b6b;
        }

        .form-input.error:focus {
          box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
        }

        .error-message {
          display: block;
          margin-top: 6px;
          color: #ff6b6b;
          font-size: 0.875rem;
        }

        .form-hint {
          display: block;
          margin-top: 6px;
          color: var(--text-muted, #8b9dc3);
          font-size: 0.875rem;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid var(--border-color, #2e3d6e);
        }

        @media (max-width: 480px) {
          .form-actions {
            flex-direction: column-reverse;
          }

          .form-actions button {
            width: 100%;
            justify-content: center;
          }

          .form-group {
            margin-bottom: 16px;
          }
        }
      `}</style>
    </Modal>
  );
}
