// @ts-nocheck
import React, { useEffect } from 'react';

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Evet", 
  cancelText = "Hayır",
  type = "warning", // warning, danger, info
  IconComponent: Icon = null
}) => {
  if (!isOpen) return null;

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isDestructive = 
    type === 'danger' || 
    (typeof title === 'string' && /sil|temizle|kaldır/i.test(title)) || 
    (typeof message === 'string' && /silinecek|temizleyecek/i.test(message)) ||
    (typeof confirmText === 'string' && /sil/i.test(confirmText));

  const effectiveType = isDestructive ? 'danger' : type;

  const renderIcon = () => {
    if (Icon) {
      if (effectiveType === 'danger') {
        return <Icon name="alert-triangle" size={24} />;
      } else if (effectiveType === 'warning') {
        return <Icon name="alertCircle" size={24} />;
      } else {
        return <Icon name="info" size={24} />;
      }
    }

    // High quality fallback SVGs if Icon is not provided
    if (effectiveType === 'danger') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    }
    if (effectiveType === 'warning') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    }
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    );
  };

  return (
    <div 
      className="confirm-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="confirm-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-modal-header">
          <div className={`confirm-modal-icon-badge confirm-modal-badge-${effectiveType}`}>
            {renderIcon()}
          </div>
          <div className="confirm-modal-header-text">
            <h3 className="confirm-modal-title">{title}</h3>
          </div>
          <button 
            type="button" 
            className="confirm-modal-close-btn" 
            onClick={onClose}
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="confirm-modal-body">
          <p className="confirm-modal-message">{message}</p>
        </div>
        
        <div className="confirm-modal-actions">
          <button 
            type="button" 
            className="confirm-modal-btn confirm-modal-btn-cancel" 
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            className={`confirm-modal-btn confirm-modal-btn-confirm confirm-modal-confirm-${effectiveType}`} 
            onClick={onConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        .confirm-modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 16px;
          animation: confirmFadeIn 0.15s ease-out;
        }

        @keyframes confirmFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .confirm-modal-container {
          background-color: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          max-width: 440px;
          width: 100%;
          padding: 24px;
          box-sizing: border-box;
          animation: confirmScaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes confirmScaleUp {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .confirm-modal-header {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 12px;
          position: relative;
        }

        .confirm-modal-icon-badge {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .confirm-modal-badge-danger {
          background-color: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .confirm-modal-badge-warning {
          background-color: #fef3c7;
          color: #d97706;
          border: 1px solid #fde68a;
        }

        .confirm-modal-badge-info {
          background-color: #e0e7ff;
          color: #4338ca;
          border: 1px solid #c7d2fe;
        }

        .confirm-modal-header-text {
          flex: 1;
          padding-top: 2px;
        }

        .confirm-modal-title {
          margin: 0;
          font-size: 1.2rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.35;
          letter-spacing: -0.01em;
        }

        .confirm-modal-close-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 15px;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          padding: 0;
          margin-top: -2px;
          margin-right: -4px;
        }

        .confirm-modal-close-btn:hover {
          background-color: #f1f5f9;
          color: #334155;
        }

        .confirm-modal-body {
          margin-bottom: 22px;
          padding-left: 58px;
        }

        @media (max-width: 480px) {
          .confirm-modal-body {
            padding-left: 0;
          }
        }

        .confirm-modal-message {
          margin: 0;
          color: #475569;
          font-size: 0.93rem;
          line-height: 1.55;
          white-space: pre-line;
        }

        .confirm-modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding-top: 18px;
          border-top: 1px solid #f1f5f9;
        }

        .confirm-modal-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 22px;
          min-width: 92px;
          border-radius: 10px;
          font-size: 0.92rem;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s ease;
          outline: none;
          user-select: none;
        }

        .confirm-modal-btn:focus-visible {
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.35);
        }

        /* Cancel Button ("Hayır" / "İptal") */
        .confirm-modal-btn-cancel {
          background-color: #ffffff;
          color: #374151;
          border: 1.5px solid #d1d5db;
        }

        .confirm-modal-btn-cancel:hover {
          background-color: #f8fafc;
          border-color: #9ca3af;
          color: #111827;
        }

        .confirm-modal-btn-cancel:active {
          transform: scale(0.98);
          background-color: #f1f5f9;
        }

        /* Confirm Buttons ("Evet" / "Sil" / "Değiştir") */
        .confirm-modal-confirm-danger {
          background-color: #dc2626;
          color: #ffffff;
          border: 1.5px solid #dc2626;
          box-shadow: 0 2px 6px rgba(220, 38, 38, 0.28);
        }

        .confirm-modal-confirm-danger:hover {
          background-color: #b91c1c;
          border-color: #b91c1c;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.36);
          transform: translateY(-1px);
        }

        .confirm-modal-confirm-danger:active {
          transform: translateY(0) scale(0.98);
        }

        .confirm-modal-confirm-warning {
          background-color: #ea580c;
          color: #ffffff;
          border: 1.5px solid #ea580c;
          box-shadow: 0 2px 6px rgba(234, 88, 12, 0.28);
        }

        .confirm-modal-confirm-warning:hover {
          background-color: #c2410c;
          border-color: #c2410c;
          box-shadow: 0 4px 12px rgba(234, 88, 12, 0.36);
          transform: translateY(-1px);
        }

        .confirm-modal-confirm-warning:active {
          transform: translateY(0) scale(0.98);
        }

        .confirm-modal-confirm-info {
          background-color: #4338ca;
          color: #ffffff;
          border: 1.5px solid #4338ca;
          box-shadow: 0 2px 6px rgba(67, 56, 202, 0.28);
        }

        .confirm-modal-confirm-info:hover {
          background-color: #3730a3;
          border-color: #3730a3;
          box-shadow: 0 4px 12px rgba(67, 56, 202, 0.36);
          transform: translateY(-1px);
        }

        .confirm-modal-confirm-info:active {
          transform: translateY(0) scale(0.98);
        }
      `}</style>
    </div>
  );
};

export default ConfirmationModal;
