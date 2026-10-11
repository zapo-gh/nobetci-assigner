// @ts-nocheck
import React, { useState } from 'react';
import Modal from './Modal';

const S = {
  form: { display: 'flex', flexDirection: 'column', gap: '18px' } as React.CSSProperties,
  label: { display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.875rem', color: '#374151' } as React.CSSProperties,
  input: (hasError: boolean) => ({
    width: '100%', padding: '10px 14px', fontSize: '0.95rem',
    border: hasError ? '2px solid #ef4444' : '1.5px solid #d1d5db',
    borderRadius: '10px', outline: 'none', boxSizing: 'border-box' as const,
    background: '#fff', color: '#111827', fontFamily: 'inherit',
  }),
  hint: { margin: '5px 0 0', fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.4 } as React.CSSProperties,
  error: { margin: '5px 0 0', fontSize: '0.78rem', color: '#ef4444' } as React.CSSProperties,
  actions: { display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #e5e7eb', marginTop: '4px' } as React.CSSProperties,
  btnCancel: { padding: '10px 22px', borderRadius: '10px', border: '1.5px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' } as React.CSSProperties,
  btnSubmit: { padding: '10px 22px', borderRadius: '10px', border: 'none', background: '#4338ca', color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' } as React.CSSProperties,
};

export default function AddZoneModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({ name: '', requiredTeachers: '1' });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Nöbet yeri adı zorunludur';
    const req = parseInt(formData.requiredTeachers, 10);
    if (!Number.isFinite(req) || req < 1) newErrors.requiredTeachers = 'En az 1 öğretmen gereklidir';
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    onSubmit({
      zoneId: `zone_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: formData.name.trim(),
      requiredTeacherCount: parseInt(formData.requiredTeachers, 10),
    });
    setFormData({ name: '', requiredTeachers: '1' });
    setErrors({});
    onClose();
  };

  const handleClose = () => {
    setFormData({ name: '', requiredTeachers: '1' });
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nöbet Yeri Ekle" size="small">
      <form onSubmit={handleSubmit} style={S.form}>

        <div>
          <label style={S.label}>Nöbet Yeri Adı <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            type="text" id="zoneName" name="name"
            value={formData.name} onChange={handleChange}
            placeholder="Örn: Bahçe, Koridor, Kantin" autoFocus
            style={S.input(!!errors.name)}
          />
          {errors.name && <p style={S.error}>{errors.name}</p>}
          <p style={S.hint}>Nöbet yerinin adını girin</p>
        </div>

        <div>
          <label style={S.label}>Gerekli Öğretmen Sayısı <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            type="number" inputMode="numeric" pattern="[0-9]*"
            id="requiredTeachers" name="requiredTeachers"
            value={formData.requiredTeachers} onChange={handleChange}
            min="1" max="20" style={S.input(!!errors.requiredTeachers)}
          />
          {errors.requiredTeachers && <p style={S.error}>{errors.requiredTeachers}</p>}
          <p style={S.hint}>Bu nöbet yeri için atanması gereken öğretmen sayısı</p>
        </div>

        <div style={S.actions}>
          <button type="button" onClick={handleClose} style={S.btnCancel}>İptal</button>
          <button type="submit" style={S.btnSubmit}>Ekle</button>
        </div>
      </form>
    </Modal>
  );
}
