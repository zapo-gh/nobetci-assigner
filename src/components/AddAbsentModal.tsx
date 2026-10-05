// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { normalizeForComparison } from '../utils/nameNormalization.js';

const REASON_OPTIONS = [
  { value: 'Raporlu', label: 'Raporlu' },
  { value: 'Sevkli', label: 'Sevkli' },
  { value: 'İzinli', label: 'İzinli' },
  { value: 'Görevli İzinli', label: 'Görevli İzinli' },
  { value: 'Mazeret İzinli', label: 'Mazeret İzinli' },
  { value: 'Diğer', label: 'Diğer' }
];

const S = {
  label: {
    display: 'block',
    marginBottom: '6px',
    fontWeight: 600,
    fontSize: '0.875rem',
    color: '#374151',
  } as React.CSSProperties,
  input: (hasError: boolean) => ({
    width: '100%',
    padding: '10px 14px',
    fontSize: '0.95rem',
    border: hasError ? '2px solid #ef4444' : '1.5px solid #d1d5db',
    borderRadius: '10px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    background: '#fff',
    color: '#111827',
    fontFamily: 'inherit',
  }),
  hint: {
    margin: '5px 0 0',
    fontSize: '0.78rem',
    color: '#6b7280',
    lineHeight: 1.4,
  } as React.CSSProperties,
  error: {
    margin: '5px 0 0',
    fontSize: '0.78rem',
    color: '#ef4444',
  } as React.CSSProperties,
  dayBox: {
    padding: '10px 14px',
    background: '#f9fafb',
    border: '1.5px solid #e5e7eb',
    borderRadius: '10px',
    color: '#374151',
    fontWeight: 600,
    fontSize: '0.95rem',
  } as React.CSSProperties,
  actions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
    marginTop: '4px',
  } as React.CSSProperties,
  btnCancel: {
    padding: '10px 22px',
    borderRadius: '10px',
    border: '1.5px solid #d1d5db',
    background: '#fff',
    color: '#374151',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
  } as React.CSSProperties,
  btnSubmit: (disabled: boolean) => ({
    padding: '10px 22px',
    borderRadius: '10px',
    border: 'none',
    background: disabled ? '#c7d2fe' : '#4338ca',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
  }),
};

export default function AddAbsentModal({
  isOpen,
  onClose,
  onSubmit,
  currentDayKey,
  currentDayLabel,
  teacherOptions = [],
  blockedTeacherNames = new Set(),
}) {
  const [formData, setFormData] = useState({ name: '', reason: 'Raporlu', customReason: '' });
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
    setFormData({ name: '', reason: 'Raporlu', customReason: '' });
    setErrors({});
    setSelectedTeacher(null);
  }, [isOpen, currentDayKey]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleTeacherInput = (value) => {
    const inputValue = value || '';
    setFormData(prev => ({ ...prev, name: inputValue }));

    if (!preparedTeacherOptions.length) { setSelectedTeacher(null); return; }

    const normalized = normalizeForComparison(inputValue);
    if (!normalized) { setSelectedTeacher(null); return; }

    if (blockedSet.has(normalized)) {
      setSelectedTeacher(null);
      setErrors(prev => ({ ...prev, name: 'Bu öğretmen seçili gün için zaten mazeretli' }));
      return;
    }

    const exactMatch = preparedTeacherOptions.find(opt => opt.normalizedName === normalized);
    if (exactMatch) {
      setSelectedTeacher(exactMatch);
      if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
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
      if (!trimmed) newErrors.name = 'Öğretmen adı zorunludur';
      else if (!selectedTeacher) newErrors.name = 'Listeden bir öğretmen seçmelisiniz';
      else if (blockedSet.has(normalizeForComparison(trimmed))) newErrors.name = 'Bu öğretmen seçili gün için zaten mazeretli';
    }
    if (!formData.reason) newErrors.reason = 'Neden seçilmelidir';
    if (formData.reason === 'Diğer' && !formData.customReason.trim()) newErrors.customReason = 'Lütfen mazeret açıklaması girin';
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
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
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* Öğretmen Adı */}
        <div>
          <label style={S.label}>
            Öğretmen Adı <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={(e) => handleTeacherInput(e.target.value)}
            placeholder={preparedTeacherOptions.length ? 'Örn: Ayşe Yılmaz' : 'Önce ders programı yükleyin'}
            autoFocus
            list="absent-teacher-options"
            style={S.input(!!errors.name)}
          />
          <datalist id="absent-teacher-options">
            {preparedTeacherOptions.map(option => (
              <option key={option.teacherId} value={option.teacherName} />
            ))}
          </datalist>
          {errors.name && <p style={S.error}>{errors.name}</p>}
          {!errors.name && !preparedTeacherOptions.length && (
            <p style={S.hint}>Mazeret eklemek için önce ders programını sisteme yükleyin.</p>
          )}
          {selectedTeacher === null && formData.name.trim() && preparedTeacherOptions.length > 0 && !errors.name && (
            <p style={S.error}>Bu isimle eşleşen öğretmen bulunamadı. Lütfen listeden bir öğretmen seçin.</p>
          )}
        </div>

        {/* Neden */}
        <div>
          <label style={S.label}>
            Neden <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <select
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            style={S.input(!!errors.reason)}
          >
            {REASON_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {errors.reason && <p style={S.error}>{errors.reason}</p>}
          <p style={S.hint}>Öğretmenin okula gelememe nedeni</p>
        </div>

        {/* Diğer Mazeret */}
        {formData.reason === 'Diğer' && (
          <div>
            <label style={S.label}>
              Mazeret Açıklaması <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              id="customReason"
              name="customReason"
              value={formData.customReason}
              onChange={handleChange}
              placeholder="Örn: Eş Doğum İzni, Mahkeme"
              maxLength={50}
              style={S.input(!!errors.customReason)}
            />
            {errors.customReason && <p style={S.error}>{errors.customReason}</p>}
            <p style={S.hint}>Lütfen özel mazeret nedenini yazın</p>
          </div>
        )}

        {/* Mazeretli Gün */}
        <div>
          <label style={S.label}>Mazeretli Gün</label>
          <div style={S.dayBox}>{currentDayLabel}</div>
          <p style={S.hint}>
            Mazeretler yalnızca seçili gün için geçerlidir. Gün değiştiğinde otomatik temizlenir.
          </p>
        </div>

        {/* Butonlar */}
        <div style={S.actions}>
          <button type="button" onClick={handleClose} style={S.btnCancel}>
            İptal
          </button>
          <button type="submit" disabled={!preparedTeacherOptions.length} style={S.btnSubmit(!preparedTeacherOptions.length)}>
            Ekle
          </button>
        </div>

      </form>
    </Modal>
  );
}
