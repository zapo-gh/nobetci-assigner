// @ts-nocheck
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
      return 'Grup birleştirilecek öğretmen adı zorunludur';
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Grup Birleştirilecek Öğretmeni" size="small">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="teacherName" className="form-label">
            Grup Birleştirilecek Öğretmeni Adı <span className="required">*</span>
          </label>
          <input
            type="text"
            id="teacherName"
            name="teacherName"
            className={`input w-full ${error ? 'error' : ''}`}
            value={teacherName}
            onChange={handleChange}
            placeholder="Örn: Ahmet Yılmaz"
            autoFocus
          />
          {error && <span className="error-message">{error}</span>}
          <small className="form-hint">
            Bu öğretmen bu sınıfa grup birleştirilecek ders verecektir. Nöbetçi öğretmen ataması yapılmayacaktır.
          </small>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={handleClose}>
            İptal
          </button>
          <button type="submit" className="btn-submit">
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
          font-weight: 600;
          color: #374151;
          font-size: 0.95rem;
        }

        .required {
          color: #ef4444;
        }

        .error-message {
          display: block;
          margin-top: 6px;
          color: #ef4444;
          font-size: 0.875rem;
        }

        .form-hint {
          display: block;
          margin-top: 6px;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .btn-cancel {
          padding: 10px 22px;
          border-radius: 10px;
          border: 1.5px solid #d1d5db;
          background: #fff;
          color: #374151;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s ease;
        }

        .btn-cancel:hover {
          background: #f8fafc;
          border-color: #9ca3af;
          color: #111827;
        }

        .btn-submit {
          padding: 10px 22px;
          border-radius: 10px;
          border: none;
          background: #4338ca;
          color: #fff;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          font-family: inherit;
          box-shadow: 0 2px 6px rgba(67, 56, 202, 0.25);
          transition: all 0.15s ease;
        }

        .btn-submit:hover {
          background: #3730a3;
          transform: translateY(-1px);
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
