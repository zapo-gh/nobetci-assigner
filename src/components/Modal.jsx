import React, { useEffect, useRef } from 'react';
import styles from './Modal.module.css';

const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  if (typeof navigator !== 'undefined') {
    if (navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0) return true;
  }
  return (
    'ontouchstart' in window ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches)
  );
};

export default function Modal({ isOpen, onClose, title, children, size = 'medium' }) {
  const modalRef = useRef(null);
  const touchDeviceRef = useRef(isTouchDevice());

  useEffect(() => {
    if (!isOpen) return undefined;

    const body = document.body;
    const isTouch = touchDeviceRef.current;
    const previousOverflow = body.style.overflow;
    if (!isTouch) {
      body.style.overflow = 'hidden';
    }

    if (!isTouch) {
      modalRef.current?.focus();
    }

    return () => {
      if (!isTouch) {
        body.style.overflow = previousOverflow;
      }
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
