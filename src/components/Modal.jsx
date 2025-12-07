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
    if (!isOpen) {
      return undefined;
    }

    if (typeof window === 'undefined') {
      return undefined;
    }

    const currentScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    requestAnimationFrame(() => {
      window.scrollTo({ top: currentScroll, left: 0, behavior: 'auto' });
    });

    return undefined;
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
      // Modal açıldığında modal'a focus ver (scroll yapmadan)
      // Body zaten scroll lock ile kilitlendi, bu yüzden focus scroll yapmayacak
      // Ancak yine de preventScroll ile koruma sağlayalım
      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      
      setTimeout(() => {
        if (modalRef.current) {
          // Focus işlemi (preventScroll desteklenirse kullan)
          try {
            modalRef.current.focus({ preventScroll: true });
          } catch {
            // preventScroll desteklenmiyorsa normal focus
            modalRef.current.focus();
          }
          
          // Focus sonrası scroll pozisyonunu kontrol et ve gerekirse düzelt
          requestAnimationFrame(() => {
            const afterFocus = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
            if (Math.abs(afterFocus - scrollY) > 1) {
              // Scroll pozisyonu değiştiyse geri yükle
              window.scrollTo({
                top: scrollY,
                left: 0,
                behavior: 'auto'
              });
            }
          });
        }
      }, 50);

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
