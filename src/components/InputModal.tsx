// @ts-nocheck
import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const S = {
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  message: { margin: '0 0 12px', fontSize: '0.93rem', color: '#475569', lineHeight: 1.5 },
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: '0.95rem',
    border: '1.5px solid #d1d5db',
    borderRadius: '10px',
    outline: 'none',
    boxSizing: 'border-box',
    background: '#fff',
    color: '#111827',
    fontFamily: 'inherit',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
    marginTop: '8px',
  },
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
    transition: 'all 0.15s ease',
  },
  btnSubmit: (disabled) => ({
    padding: '10px 22px',
    borderRadius: '10px',
    border: 'none',
    background: disabled ? '#c7d2fe' : '#4338ca',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    boxShadow: disabled ? 'none' : '0 2px 6px rgba(67, 56, 202, 0.25)',
    transition: 'all 0.15s ease',
  }),
};

const InputModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  placeholder = "",
  defaultValue = "",
  type = "text",
  confirmText = "Tamam", 
  cancelText = "İptal",
  required = false
}) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (required && !value.trim()) return;
    onConfirm(value.trim());
    onClose();
  };

  if (!isOpen) return null;

  const isSubmitDisabled = Boolean(required && !value.trim());

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="small">
      <form onSubmit={handleSubmit} style={S.form}>
        {message && <p style={S.message}>{message}</p>}
        <input
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          style={S.input}
          autoFocus
          required={required}
        />
        <div style={S.actions}>
          <button type="button" onClick={onClose} style={S.btnCancel}>
            {cancelText}
          </button>
          <button 
            type="submit" 
            disabled={isSubmitDisabled}
            style={S.btnSubmit(isSubmitDisabled)}
          >
            {confirmText}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default InputModal;
