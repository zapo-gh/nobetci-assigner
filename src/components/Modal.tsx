// @ts-nocheck
import React, { useCallback, useEffect, useRef, memo } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'xlarge' | string;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  navLabel?: string;
}

const Modal = memo(function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  navLabel,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const stopPropagation = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
  }, []);

  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
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

  // Arrow key navigation (Left/Right)
  useEffect(() => {
    if (!isOpen) return;
    const handleNavKeys = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
        return;
      }
      if (e.key === 'ArrowLeft' && onPrev && (hasPrev === undefined || hasPrev)) {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowRight' && onNext && (hasNext === undefined || hasNext)) {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', handleNavKeys);
    return () => window.removeEventListener('keydown', handleNavKeys);
  }, [isOpen, onPrev, onNext, hasPrev, hasNext]);

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
    large: styles.modalLarge,
    xlarge: styles.modalXLarge
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
          <div className={styles.modalTitleWrapper}>
            <h3 className={styles.modalTitle}>{title}</h3>
          </div>
          <div className={styles.modalHeaderActions}>
            {(onPrev || onNext) && (
              <div className={styles.modalNavGroup}>
                <button
                  className={styles.modalNavBtn}
                  onClick={onPrev}
                  disabled={hasPrev === false || !onPrev}
                  title="Önceki (← Sol Ok)"
                  aria-label="Önceki"
                  type="button"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                {navLabel && <span className={styles.modalNavLabel}>{navLabel}</span>}
                <button
                  className={styles.modalNavBtn}
                  onClick={onNext}
                  disabled={hasNext === false || !onNext}
                  title="Sonraki (→ Sağ Ok)"
                  aria-label="Sonraki"
                  type="button"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            )}
            <button
              className={styles.modalClose}
              onClick={onClose}
              aria-label="Kapat"
              type="button"
            >
              ✕
            </button>
          </div>
        </div>
        <div className={styles.modalBody}>{memoizedChildren}</div>
      </div>
    </div>
  );
});

Modal.displayName = 'Modal';

export default Modal;
