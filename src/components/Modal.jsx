import React, { useCallback, useEffect, useRef } from 'react';
import styles from './Modal.module.css';

export default function Modal({ isOpen, onClose, title, children, size = 'medium' }) {
  const modalRef = useRef(null);

  const stopPropagation = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const handleOverlayClick = useCallback((event) => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const body = document.body;
    const previousOverflow = body.style.overflow;

    return () => {
      body.style.overflow = previousOverflow;
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
    <div
      className={styles.modalOverlay}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className={`${styles.modalContent} ${sizeClasses[size]}`}
        onClick={stopPropagation}
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
