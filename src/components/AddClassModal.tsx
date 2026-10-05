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

export default function AddClassModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({ className: '' });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.className.trim()) newErrors.className = 'Sınıf adı zorunludur';
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    onSubmit({ className: formData.className.trim() });
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
      <form onSubmit={handleSubmit} style={S.form}>

        <div>
          <label style={S.label}>Sınıf Adı <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            type="text" id="className" name="className"
            value={formData.className} onChange={handleChange}
            placeholder="Örn: 9/A, 10/B, 11/C" autoFocus
            style={S.input(!!errors.className)}
          />
          {errors.className && <p style={S.error}>{errors.className}</p>}
          <p style={S.hint}>Sınıfın adını veya kodunu girin</p>
        </div>

        <div style={S.actions}>
          <button type="button" onClick={handleClose} style={S.btnCancel}>İptal</button>
          <button type="submit" style={S.btnSubmit}>Ekle</button>
        </div>
      </form>
    </Modal>
  );
}
