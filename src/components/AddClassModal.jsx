import React, { useState } from 'react';
import Modal from './Modal';

export default function AddClassModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    className: ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.className.trim()) {
      newErrors.className = 'Sınıf adı zorunludur';
    }
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSubmit({
      className: formData.className.trim()
    });
    setFormData({ className: '' });
    setErrors({});
    onClose();
  };

  const handleClose = () => {
    setFormData({ className: '' });
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Yeni Sınıf Ekle" size="small">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="className" className="form-label">
            Sınıf Adı <span className="required">*</span>
          </label>
          <input
            type="text"
            id="className"
            name="className"
            className={`form-input ${errors.className ? 'error' : ''}`}
            value={formData.className}
            onChange={handleChange}
            placeholder="Örn: 9/A, 10/B, 11/C"
            autoFocus
          />
          {errors.className && <span className="error-message">{errors.className}</span>}
          <small className="form-hint">Sınıfın adını veya kodunu girin</small>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={handleClose}>
            İptal
          </button>
          <button type="submit" className="btn">
            Ekle
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
