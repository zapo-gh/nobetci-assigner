import React, { useEffect, useRef } from 'react';
import styles from './Modal.module.css';

export default function Modal({ isOpen, onClose, title, children, size = 'medium' }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      modalRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    small: styles.modalSmall,
    medium: styles.modalMedium,
    large: styles.modalLarge
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        ref={modalRef}
        className={`${styles.modalContent} ${sizeClasses[size]}`}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Kapat"
            type="button"
          >
            ✕
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}
