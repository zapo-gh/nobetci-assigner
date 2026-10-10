// @ts-nocheck
import React from 'react';

function SuccessIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function getNotificationIcon(type) {
  switch (type) {
    case 'success': return <SuccessIcon />;
    case 'error':   return <ErrorIcon />;
    case 'warning': return <WarningIcon />;
    case 'info':
    default:        return <InfoIcon />;
  }
}

export default function ModernNotificationSystem({ notifications, onRemove, onAction }) {
  if (!notifications || notifications.length === 0) return null;

  return (
    <aside className="notification-container" role="status" aria-live="polite" aria-label="Bildirimler">
      <div className="notification-list">
        {notifications.map(notification => (
          <div 
            key={notification.id}
            className={`notification-card notification-${notification.type || 'info'}`}
          >
            <div className="notification-icon-wrapper">
              <span className="notification-icon-badge">
                {getNotificationIcon(notification.type)}
              </span>
            </div>
            
            <div className="notification-content">
              <p className="notification-message">{notification.message}</p>
              {notification.actionLabel && notification.onAction && (
                <button
                  className="notification-action"
                  onClick={() => onAction ? onAction(notification.id) : null}
                >
                  {notification.actionLabel}
                </button>
              )}
            </div>

            <button 
              className="notification-close" 
              onClick={() => onRemove ? onRemove(notification.id) : null} 
              title="Bildirimi kapat"
              aria-label="Kapat"
            >
              <CloseIcon />
            </button>
          </div>
        ))}
      </div>

      <style>{`
        .notification-container {
          position: fixed;
          top: 1.25rem;
          right: 1.25rem;
          z-index: 10000;
          max-width: 25rem;
          width: calc(100vw - 2.5rem);
          pointer-events: none;
        }

        .notification-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .notification-card {
          display: grid;
          grid-template-columns: 32px 1fr 28px;
          gap: 12px;
          align-items: center;
          padding: 12px 14px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.94);
          color: #0f172a;
          border: 1px solid rgba(226, 232, 240, 0.95);
          box-shadow: 
            0 12px 28px -6px rgba(15, 23, 42, 0.12),
            0 4px 10px -2px rgba(15, 23, 42, 0.05),
            0 0 0 1px rgba(241, 245, 249, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          pointer-events: auto;
          animation: toastSlideIn 280ms cubic-bezier(0.16, 1, 0.3, 1);
          transition: transform 180ms ease, box-shadow 180ms ease;
          position: relative;
          overflow: hidden;
        }

        .notification-card:hover {
          transform: translateY(-2px);
          box-shadow: 
            0 16px 36px -6px rgba(15, 23, 42, 0.16),
            0 6px 14px -2px rgba(15, 23, 42, 0.08);
        }

        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Type borders and badge colors */
        .notification-card.notification-success {
          border-left: 4px solid #10b981;
        }
        .notification-card.notification-success .notification-icon-badge {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          box-shadow: 0 3px 8px rgba(16, 185, 129, 0.32);
          color: #ffffff;
        }

        .notification-card.notification-error {
          border-left: 4px solid #f43f5e;
        }
        .notification-card.notification-error .notification-icon-badge {
          background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
          box-shadow: 0 3px 8px rgba(244, 63, 94, 0.32);
          color: #ffffff;
        }

        .notification-card.notification-warning {
          border-left: 4px solid #f59e0b;
        }
        .notification-card.notification-warning .notification-icon-badge {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          box-shadow: 0 3px 8px rgba(245, 158, 11, 0.32);
          color: #ffffff;
        }

        .notification-card.notification-info {
          border-left: 4px solid #6366f1;
        }
        .notification-card.notification-info .notification-icon-badge {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          box-shadow: 0 3px 8px rgba(99, 102, 241, 0.32);
          color: #ffffff;
        }

        .notification-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notification-icon-badge {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .notification-content {
          font-size: 0.875rem;
          line-height: 1.4;
          min-width: 0;
        }

        .notification-message {
          margin: 0;
          color: #0f172a;
          font-weight: 600;
          word-break: break-word;
          letter-spacing: -0.01em;
        }

        .notification-action {
          margin-top: 6px;
          padding: 5px 12px;
          background: #4f46e5;
          border: none;
          border-radius: 7px;
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 140ms ease;
          display: inline-block;
          box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
        }

        .notification-action:hover {
          background: #4338ca;
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(79, 70, 229, 0.35);
        }

        .notification-close {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          background: transparent;
          border: none;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0.75;
          transition: all 140ms ease;
          padding: 0;
          margin-left: auto;
        }

        .notification-close:hover {
          opacity: 1;
          color: #0f172a;
          background: rgba(15, 23, 42, 0.06);
          transform: scale(1.06);
        }

        @media (prefers-reduced-motion: reduce) {
          .notification-card {
            animation: none;
            transition: none;
          }
        }
      `}</style>
    </aside>
  );
}