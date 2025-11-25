import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { normalizeForComparison } from '../utils/pdfParser';

const REASON_OPTIONS = [
  { value: 'Raporlu', label: 'Raporlu' },
  { value: 'Sevkli', label: 'Sevkli' },
  { value: 'İzinli', label: 'İzinli' },
  { value: 'Görevli İzinli', label: 'Görevli İzinli' },
  { value: 'Diğer', label: 'Diğer' }
];

export default function AddAbsentModal({
  isOpen,
  onClose,
  onSubmit,
  currentDayKey,
  currentDayLabel,
  teacherOptions = [],
  blockedTeacherNames = new Set(),
}) {
  const [formData, setFormData] = useState({
    name: '',
    reason: 'Raporlu',
    customReason: '',
  });
  const [errors, setErrors] = useState({});
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  const blockedSet = useMemo(() => {
    if (!blockedTeacherNames) return new Set();
    if (blockedTeacherNames instanceof Set) return blockedTeacherNames;
    if (Array.isArray(blockedTeacherNames)) return new Set(blockedTeacherNames.map(normalizeForComparison));
    return new Set();
  }, [blockedTeacherNames]);

  const preparedTeacherOptions = useMemo(() => {
    if (!Array.isArray(teacherOptions)) return [];
    const seen = new Set();
    return teacherOptions
      .map(opt => ({
        teacherName: opt.teacherName,
        teacherId: opt.teacherId,
        normalizedName: normalizeForComparison(opt.teacherName || ''),
      }))
      .filter(opt => {
        if (!opt.teacherName || !opt.normalizedName) return false;
        if (blockedSet.has(opt.normalizedName)) return false;
        if (seen.has(opt.normalizedName)) return false;
        seen.add(opt.normalizedName);
        return true;
      })
      .sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'tr', { sensitivity: 'base' }));
  }, [teacherOptions, blockedSet]);

  useEffect(() => {
    if (!isOpen) return;
    setFormData({
      name: '',
      reason: 'Raporlu',
      customReason: '',
    });
    setErrors({});
    setSelectedTeacher(null);
  }, [isOpen, currentDayKey]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleTeacherInput = (value) => {
    const inputValue = value || '';
    setFormData(prev => ({ ...prev, name: inputValue }));

    // Eğer liste boşsa eşleşmeye çalışmaya gerek yok
    if (!preparedTeacherOptions.length) {
      setSelectedTeacher(null);
      return;
    }

    // Kullanıcı yazarken sürekli eşleşme yapıp blur'a sebep olmamak için
    // sadece datalist'ten seçildiği an (tam eşleşme olduğunda) teacher set edelim
    const normalized = normalizeForComparison(inputValue);
    if (!normalized) {
      setSelectedTeacher(null);
      return;
    }

    if (blockedSet.has(normalized)) {
      setSelectedTeacher(null);
      setErrors(prev => ({ ...prev, name: 'Bu öğretmen seçili gün için zaten mazeretli' }));
      return;
    }

    const exactMatch = preparedTeacherOptions.find(
      opt => opt.normalizedName === normalized
    );

    if (exactMatch) {
      setSelectedTeacher(exactMatch);
      if (errors.name) {
        setErrors(prev => ({ ...prev, name: '' }));
      }
    } else {
      setSelectedTeacher(null);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!preparedTeacherOptions.length) {
      newErrors.name = 'Önce ders programı yüklemelisiniz.';
    } else {
      const trimmed = formData.name.trim();
      if (!trimmed) {
        newErrors.name = 'Öğretmen adı zorunludur';
      } else if (!selectedTeacher) {
        newErrors.name = 'Listeden bir öğretmen seçmelisiniz';
      } else if (blockedSet.has(normalizeForComparison(trimmed))) {
        newErrors.name = 'Bu öğretmen seçili gün için zaten mazeretli';
      }
    }
    if (!formData.reason) {
      newErrors.reason = 'Neden seçilmelidir';
    }
    if (formData.reason === 'Diğer' && !formData.customReason.trim()) {
      newErrors.customReason = 'Lütfen mazeret açıklaması girin';
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
      name: selectedTeacher?.teacherName || formData.name.trim(),
      teacherId: selectedTeacher?.teacherId,
      reason: formData.reason === 'Diğer' ? formData.customReason.trim() : formData.reason,
      days: [currentDayKey],
    });
    handleClose();
  };

  const handleClose = () => {
    setFormData({ name: '', reason: 'Raporlu', customReason: '' });
    setErrors({});
    setSelectedTeacher(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Okula Gelemeyen Öğretmen Ekle" size="small">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name" className="form-label">
            Öğretmen Adı <span className="required">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            className={`form-input ${errors.name ? 'error' : ''}`}
            value={formData.name}
            onChange={(e) => handleTeacherInput(e.target.value)}
            placeholder={preparedTeacherOptions.length ? 'Örn: Ayşe Yılmaz' : 'Önce ders programı yükleyin'}
            autoFocus
            list="absent-teacher-options"
          />
          <datalist id="absent-teacher-options">
            {preparedTeacherOptions.map(option => (
              <option key={option.teacherId} value={option.teacherName} />
            ))}
          </datalist>
          {errors.name && (
            <span className="error-message">{errors.name}</span>
          )}
          {!errors.name && !preparedTeacherOptions.length && (
            <small className="form-hint">Mazeret eklemek için önce ders programını sisteme yükleyin.</small>
          )}
          {selectedTeacher === null && formData.name.trim() && preparedTeacherOptions.length > 0 && !errors.name && (
            <span className="error-message" style={{ marginTop: '6px' }}>
              Bu isimle eşleşen öğretmen bulunamadı. Lütfen listeden bir öğretmen seçin.
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="reason" className="form-label">
            Neden <span className="required">*</span>
          </label>
          <select
            id="reason"
            name="reason"
            className={`form-input ${errors.reason ? 'error' : ''}`}
            value={formData.reason}
            onChange={handleChange}
          >
            {REASON_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.reason && <span className="error-message">{errors.reason}</span>}
          <small className="form-hint">Öğretmenin okula gelememe nedeni</small>
        </div>

        {formData.reason === 'Diğer' && (
          <div className="form-group custom-reason-field">
            <label htmlFor="customReason" className="form-label">
              Mazeret Açıklaması <span className="required">*</span>
            </label>
            <input
              type="text"
              id="customReason"
              name="customReason"
              className={`form-input ${errors.customReason ? 'error' : ''}`}
              value={formData.customReason}
              onChange={handleChange}
              placeholder="Örn: Eş Doğum İzni, Mahkeme"
              maxLength={50}
            />
            {errors.customReason && <span className="error-message">{errors.customReason}</span>}
            <small className="form-hint">Lütfen özel mazeret nedenini yazın</small>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">
            Mazeretli Gün
          </label>
          <div className="day-display">
            <span>{currentDayLabel}</span>
          </div>
          <small className="form-hint">Mazeretler yalnızca seçili gün için geçerlidir. Gün değiştiğinde otomatik temizlenir.</small>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={handleClose}>
            İptal
          </button>
          <button type="submit" className="btn" disabled={!preparedTeacherOptions.length}>
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

        .day-display {
          padding: 10px 14px;
          background: var(--bg-secondary, #0b1328);
          border: 1px solid var(--border-default, #2e3d6e);
          border-radius: 8px;
          font-weight: 600;
          color: var(--text-primary, #e8eefc);
        }
        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid var(--border-color, #2e3d6e);
        }

        select.form-input {
          cursor: pointer;
        }

        .custom-reason-field {
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
            max-height: 0;
          }
          to {
            opacity: 1;
            transform: translateY(0);
            max-height: 200px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .custom-reason-field {
            animation: none;
          }
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
