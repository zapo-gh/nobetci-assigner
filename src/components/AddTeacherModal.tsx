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
  select: (hasError: boolean) => ({
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
    cursor: 'pointer',
  }),
  hint: { margin: '5px 0 0', fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.4 } as React.CSSProperties,
  error: { margin: '5px 0 0', fontSize: '0.78rem', color: '#ef4444' } as React.CSSProperties,
  actions: { display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #e5e7eb', marginTop: '4px' } as React.CSSProperties,
  btnCancel: { padding: '10px 22px', borderRadius: '10px', border: '1.5px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' } as React.CSSProperties,
  btnSubmit: { padding: '10px 22px', borderRadius: '10px', border: 'none', background: '#4338ca', color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' } as React.CSSProperties,
};

const systemDayMap: Record<string, string> = {
  Sun: 'sunday',
  Mon: 'monday',
  Tue: 'tuesday',
  Wed: 'wednesday',
  Thu: 'thursday',
  Fri: 'friday',
  Sat: 'saturday',
};

export default function AddTeacherModal({ isOpen, onClose, onSubmit, dutyZones = [], day = 'Mon' }) {
  const [formData, setFormData] = useState({ teacherName: '', dutyLocation: '', maxDutyPerDay: '6' });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.teacherName.trim()) newErrors.teacherName = 'Öğretmen adı zorunludur';
    if (!formData.dutyLocation.trim()) newErrors.dutyLocation = 'Nöbet yeri seçimi zorunludur';
    const max = parseInt(formData.maxDutyPerDay, 10);
    if (!Number.isFinite(max) || max < 1 || max > 9) newErrors.maxDutyPerDay = 'Günlük görev limiti 1-9 arasında olmalıdır';
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    const sysDay = systemDayMap[day] || (typeof day === 'string' ? day.toLowerCase() : 'monday');
    onSubmit({
      teacherName: formData.teacherName.trim(),
      maxDutyPerDay: parseInt(formData.maxDutyPerDay, 10),
      dutyLocation: formData.dutyLocation.trim(),
      dutyLocations: {
        [sysDay]: formData.dutyLocation.trim(),
        [day]: formData.dutyLocation.trim(),
      },
    });
    setFormData({ teacherName: '', dutyLocation: '', maxDutyPerDay: '6' });
    setErrors({});
    onClose();
  };

  const handleClose = () => {
    setFormData({ teacherName: '', dutyLocation: '', maxDutyPerDay: '6' });
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Yeni Öğretmen Ekle" size="small">
      <form onSubmit={handleSubmit} style={S.form}>

        <div>
          <label style={S.label}>Öğretmen Adı <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            type="text" id="teacherName" name="teacherName"
            value={formData.teacherName} onChange={handleChange}
            placeholder="Örn: Ahmet Yılmaz" autoFocus
            style={S.input(!!errors.teacherName)}
          />
          {errors.teacherName && <p style={S.error}>{errors.teacherName}</p>}
        </div>

        <div>
          <label style={S.label}>Nöbet Yeri <span style={{ color: '#ef4444' }}>*</span></label>
          <select
            id="dutyLocation" name="dutyLocation"
            value={formData.dutyLocation} onChange={handleChange}
            style={S.select(!!errors.dutyLocation)}
          >
            <option value="">-- Nöbet Yeri Seçin --</option>
            {dutyZones.map((z) => (
              <option key={z.zoneId || z.name} value={z.name}>
                {z.name}
              </option>
            ))}
          </select>
          {errors.dutyLocation && <p style={S.error}>{errors.dutyLocation}</p>}
          <p style={S.hint}>Bu öğretmenin görev yapacağı nöbet bölgesini seçin</p>
        </div>

        <div>
          <label style={S.label}>Günlük Görev Limiti <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            type="number" inputMode="numeric" pattern="[0-9]*"
            id="maxDutyPerDay" name="maxDutyPerDay"
            value={formData.maxDutyPerDay} onChange={handleChange}
            min="1" max="9" style={S.input(!!errors.maxDutyPerDay)}
          />
          {errors.maxDutyPerDay && <p style={S.error}>{errors.maxDutyPerDay}</p>}
          <p style={S.hint}>Bir günde bu öğretmene verilebilecek maksimum görev sayısı (1–9)</p>
        </div>

        <div style={S.actions}>
          <button type="button" onClick={handleClose} style={S.btnCancel}>İptal</button>
          <button type="submit" style={S.btnSubmit}>Ekle</button>
        </div>
      </form>
    </Modal>
  );
}
