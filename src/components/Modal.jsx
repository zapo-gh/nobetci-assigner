import React, { useCallback, useEffect, useRef, memo } from 'react';
import styles from './Modal.module.css';

const Modal = memo(function Modal({ isOpen, onClose, title, children, size = 'medium' }) {
  const modalRef = useRef(null);

  const stopPropagation = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const handleOverlayClick = useCallback((event) => {
    if (event.target !== event.currentTarget) return;
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

  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Scroll pozisyonunu koru
      const scrollY = window.scrollY;
      
      // Modal açıldığında modal'a focus ver (scroll yapmadan)
      setTimeout(() => {
        if (modalRef.current) {
          // Scroll pozisyonunu koru
          const currentScrollY = window.scrollY;
          modalRef.current.focus();
          // Eğer scroll değiştiyse geri yükle
          if (window.scrollY !== currentScrollY) {
            window.scrollTo(0, scrollY);
          }
        }
      }, 100); // Kısa bir gecikme ile focus'u garanti et

      // Focus trapping için event listener ekle
      const handleFocusTrap = (e) => {
        if (!modalRef.current.contains(e.target)) {
          e.preventDefault();
          modalRef.current.focus();
        }
      };

      // Modal dışına tıklandığında focus'u modal'a geri getir
      const handleDocumentClick = (e) => {
        if (!modalRef.current.contains(e.target)) {
          modalRef.current.focus();
        }
      };

      document.addEventListener('focusin', handleFocusTrap);
      document.addEventListener('click', handleDocumentClick);

      return () => {
        document.removeEventListener('focusin', handleFocusTrap);
        document.removeEventListener('click', handleDocumentClick);
      };
    }
  }, [isOpen]);

  // Modal içeriğinin stabil kalması için children'ı memoize et
  const memoizedChildren = React.useMemo(() => children, [children]);

  if (!isOpen) return null;

  const sizeClasses = {
    small: styles.modalSmall,
    medium: styles.modalMedium,
    large: styles.modalLarge
  };

  return (
    <div className={styles.modalOverlay}>
      <div
        className={styles.modalBackdrop}
        onClick={handleOverlayClick}
      ></div>
      <div
        ref={modalRef}
        className={`${styles.modalContent} ${sizeClasses[size]}`}
        onClick={stopPropagation}
        tabIndex={0}
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
        <div className={styles.modalBody}>{memoizedChildren}</div>
      </div>
    </div>
  );
});

Modal.displayName = 'Modal';

export default Modal;
