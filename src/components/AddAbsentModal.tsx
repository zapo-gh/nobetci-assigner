// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { normalizeForComparison } from '../utils/nameNormalization.js';

const REASON_OPTIONS = [
  { value: 'Raporlu', label: 'Raporlu', color: '#ef4444', emoji: '🔴' },
  { value: 'Sevkli', label: 'Sevkli', color: '#f59e0b', emoji: '🟡' },
  { value: 'İzinli', label: 'İzinli', color: '#0284c7', emoji: '🔵' },
  { value: 'Görevli İzinli', label: 'Görevli İzinli', color: '#10b981', emoji: '🟢' },
  { value: 'Mazeret İzinli', label: 'Mazeret İzinli', color: '#6366f1', emoji: '🟣' },
  { value: 'Diğer', label: 'Diğer', color: '#64748b', emoji: '⚪' }
];

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] || '').slice(0, 2).toUpperCase();
  const first = parts[0] || '';
  const last = parts[parts.length - 1] || '';
  return ((first[0] || '') + (last[0] || '')).toUpperCase();
}

const S = {
  label: {
    display: 'block',
    marginBottom: '6px',
    fontWeight: 600,
    fontSize: '0.875rem',
    color: '#1e293b',
  } as React.CSSProperties,
  input: (hasError: boolean) => ({
    width: '100%',
    padding: '10px 14px',
    fontSize: '0.95rem',
    border: hasError ? '2px solid #ef4444' : '1.5px solid #cbd5e1',
    borderRadius: '10px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    background: '#fff',
    color: '#0f172a',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
  }),
  hint: {
    margin: '5px 0 0',
    fontSize: '0.78rem',
    color: '#64748b',
    lineHeight: 1.4,
  } as React.CSSProperties,
  error: {
    margin: '5px 0 0',
    fontSize: '0.78rem',
    color: '#ef4444',
  } as React.CSSProperties,
  dayBox: {
    padding: '10px 14px',
    background: '#f8fafc',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    color: '#334155',
    fontWeight: 600,
    fontSize: '0.92rem',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,
  actions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
    marginTop: '6px',
  } as React.CSSProperties,
  btnCancel: {
    padding: '10px 20px',
    borderRadius: '10px',
    border: '1.5px solid #cbd5e1',
    background: '#fff',
    color: '#475569',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  btnSubmit: (disabled: boolean) => ({
    padding: '10px 24px',
    borderRadius: '10px',
    border: 'none',
    background: disabled ? '#c7d2fe' : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    boxShadow: disabled ? 'none' : '0 2px 8px rgba(79, 70, 229, 0.25)',
    transition: 'all 0.15s ease',
  }),
};

export default function AddAbsentModal({
  isOpen,
  onClose,
  onSubmit,
  currentDayKey,
  currentDayLabel,
  currentDateKey,
  currentWeekKey,
  teacherOptions = [],
  blockedTeacherNames = new Set(),
}) {
  const [formData, setFormData] = useState({ name: '', reason: 'Raporlu', customReason: '', timeSlot: 'full' });
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
    setFormData({ name: '', reason: 'Raporlu', customReason: '', timeSlot: 'full' });
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
      date: currentDateKey || null,
      weekKey: currentWeekKey || null,
      timeSlot: formData.timeSlot || 'full',
    });
    handleClose();
  };

  const handleClose = () => {
    setFormData({ name: '', reason: 'Raporlu', customReason: '', timeSlot: 'full' });
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

          {/* Seçili Öğretmen Onay Rozeti */}
          {selectedTeacher && (
            <div
              style={{
                marginTop: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                fontSize: '0.82rem',
                color: '#166534',
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '6px',
                  background: '#22c55e',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                }}
              >
                {getInitials(selectedTeacher.teacherName)}
              </span>
              <span>{selectedTeacher.teacherName} seçildi</span>
            </div>
          )}

          {errors.name && <p style={S.error}>{errors.name}</p>}
          {!errors.name && !preparedTeacherOptions.length && (
            <p style={S.hint}>Mazeret eklemek için önce ders programını sisteme yükleyin.</p>
          )}
          {selectedTeacher === null && formData.name.trim() && preparedTeacherOptions.length > 0 && !errors.name && (
            <p style={S.error}>Bu isimle eşleşen öğretmen bulunamadı. Lütfen listeden bir öğretmen seçin.</p>
          )}
        </div>

        {/* Neden Seçimi - Hızlı Hap Butonlar */}
        <div>
          <label style={S.label}>
            Mazeret Nedeni <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {REASON_OPTIONS.map(opt => {
              const isSelected = formData.reason === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, reason: opt.value }));
                    if (errors.reason) setErrors(prev => ({ ...prev, reason: '' }));
                  }}
                  style={{
                    padding: '8px 6px',
                    borderRadius: '10px',
                    border: isSelected ? '2px solid #4f46e5' : '1.5px solid #cbd5e1',
                    background: isSelected ? '#eef2ff' : '#ffffff',
                    color: isSelected ? '#4338ca' : '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    fontSize: '0.82rem',
                    fontWeight: isSelected ? 700 : 600,
                    fontFamily: 'inherit',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
          {errors.reason && <p style={S.error}>{errors.reason}</p>}
        </div>

        {/* Diğer Mazeret Girişi */}
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
              placeholder="Örn: Eş Doğum İzni, Mahkeme vb."
              maxLength={50}
              style={S.input(!!errors.customReason)}
            />
            {errors.customReason && <p style={S.error}>{errors.customReason}</p>}
            <p style={S.hint}>Lütfen özel mazeret nedenini yazın</p>
          </div>
        )}

        {/* Mazeret Kapsamı / Zamanı */}
        <div>
          <label style={S.label}>Mazeret Kapsamı</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {[
              { value: 'full', label: 'Tam Gün', sub: 'Tüm Gün (1-10)' },
              { value: 'morning', label: 'Öğleden Önce', sub: '1 - 5. Dersler' },
              { value: 'afternoon', label: 'Öğleden Sonra', sub: '6 - 10. Dersler' },
            ].map(opt => {
              const isSelected = formData.timeSlot === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, timeSlot: opt.value }))}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '10px',
                    border: isSelected ? '2px solid #4f46e5' : '1.5px solid #cbd5e1',
                    background: isSelected ? '#eef2ff' : '#fff',
                    color: isSelected ? '#4338ca' : '#374151',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{opt.label}</span>
                  <span style={{ fontSize: '0.72rem', color: isSelected ? '#6366f1' : '#6b7280' }}>{opt.sub}</span>
                </button>
              );
            })}
          </div>
          <p style={S.hint}>
            {formData.timeSlot === 'full' && 'Öğretmen gün boyu mazeretli sayılır.'}
            {formData.timeSlot === 'morning' && 'Yalnızca ilk 5 ders (öğleden önce) için mazeret işlenir.'}
            {formData.timeSlot === 'afternoon' && '5. dersten sonraki (öğleden sonra) dersler için mazeret işlenir.'}
          </p>
        </div>

        {/* Mazeretli Gün */}
        <div>
          <label style={S.label}>Mazeretli Gün</label>
          <div style={S.dayBox}>
            <span>📅</span>
            <span>{currentDayLabel}</span>
          </div>
          <p style={S.hint}>
            Mazeretler seçili gün için işlenir ve sınıf çizelgesinde otomatik olarak kırmızıyla işaretlenir.
          </p>
        </div>

        {/* Butonlar */}
        <div style={S.actions}>
          <button type="button" onClick={handleClose} style={S.btnCancel}>
            İptal
          </button>
          <button type="submit" disabled={!preparedTeacherOptions.length} style={S.btnSubmit(!preparedTeacherOptions.length)}>
            Mazereti Kaydet
          </button>
        </div>

      </form>
    </Modal>
  );
}
