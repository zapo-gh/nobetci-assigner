import React, { useState, useEffect } from 'react';
import styles from './Modal.module.css';

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
  required = false,
  IconComponent: Icon = null
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.closeButton} onClick={onClose}>
            {Icon ? <Icon name="x" size={20} /> : <span aria-hidden="true">×</span>}
          </button>
        </div>
        
        <div className={styles.content}>
          {message && <p className="text-secondary mb-3">{message}</p>}
          <form onSubmit={handleSubmit}>
            <input
              type={type}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              className="input-field"
              autoFocus
              required={required}
            />
          </form>
        </div>
        
        <div className={styles.footer}>
          <button className="btn-tertiary" onClick={onClose}>
            {cancelText}
          </button>
          <button 
            className="btn-primary" 
            onClick={handleSubmit}
            disabled={required && !value.trim()}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputModal;
