import React, { useState } from 'react';
import Modal from './Modal';

export default function AddTeacherModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    teacherName: '',
    maxDutyPerDay: '6'
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
    if (!formData.teacherName.trim()) {
      newErrors.teacherName = 'Öğretmen adı zorunludur';
    }
    const max = parseInt(formData.maxDutyPerDay, 10);
    if (!Number.isFinite(max) || max < 1 || max > 9) {
      newErrors.maxDutyPerDay = 'Günlük görev limiti 1-9 arasında olmalıdır';
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
      teacherName: formData.teacherName.trim(),
      maxDutyPerDay: parseInt(formData.maxDutyPerDay, 10)
    });
    setFormData({ teacherName: '', maxDutyPerDay: '2' });
    setErrors({});
    onClose();
  };

  const handleClose = () => {
    setFormData({ teacherName: '', maxDutyPerDay: '2' });
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Yeni Öğretmen Ekle" size="small">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="teacherName" className="form-label">
            Öğretmen Adı <span className="required">*</span>
          </label>
          <input
            type="text"
            id="teacherName"
            name="teacherName"
            className={`form-input ${errors.teacherName ? 'error' : ''}`}
            value={formData.teacherName}
            onChange={handleChange}
            placeholder="Örn: Ahmet Yılmaz"
            autoFocus
          />
          {errors.teacherName && <span className="error-message">{errors.teacherName}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="maxDutyPerDay" className="form-label">
            Günlük Görev Limiti <span className="required">*</span>
          </label>
          <input
            type="number"
            id="maxDutyPerDay"
            name="maxDutyPerDay"
            className={`form-input ${errors.maxDutyPerDay ? 'error' : ''}`}
            value={formData.maxDutyPerDay}
            onChange={handleChange}
            min="1"
            max="9"
          />
          {errors.maxDutyPerDay && <span className="error-message">{errors.maxDutyPerDay}</span>}
          <small className="form-hint">Bir günde bu öğretmene verilebilecek maksimum görev sayısı (1-9)</small>
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
