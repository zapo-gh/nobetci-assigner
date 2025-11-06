import React, { useState } from 'react';
import Modal from './Modal';

export default function OrtakDersModal({ isOpen, onClose, onSubmit, teachers = [], className, period }) {
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedTeacherId) return;

    onSubmit(selectedTeacherId);
    setSelectedTeacherId('');
    onClose();
  };

  const handleClose = () => {
    setSelectedTeacherId('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Ortak Ders Öğretmeni" size="small">
      <div className="mb-4">
        <p className="text-muted">
          <strong>{period}. Saat - {className}</strong> için öğretmen seçin:
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="teacherSelect" className="form-label">
            Öğretmen <span className="required">*</span>
          </label>
          <select
            id="teacherSelect"
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="form-input"
            required
          >
            <option value="">— Öğretmen Seçin —</option>
            {teachers.map(teacher => (
              <option key={teacher.teacherId} value={teacher.teacherId}>
                {teacher.teacherName} ({teacher.teacherId})
              </option>
            ))}
          </select>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={handleClose}>
            İptal
          </button>
          <button type="submit" className="btn" disabled={!selectedTeacherId}>
            Ata
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
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--primary, #4a90e2);
          box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid var(--border-color, #2e3d6e);
        }

        .text-muted {
          color: var(--text-muted);
          margin-bottom: 16px;
        }

        .mb-4 {
          margin-bottom: 16px;
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
