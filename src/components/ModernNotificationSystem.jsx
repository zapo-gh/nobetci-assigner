import React from 'react';

export default function ModernNotificationSystem({ notifications, onRemove, onAction }) {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="notification-container" role="status" aria-live="polite">
      <div className="notification-list">
        {notifications.map(notification => (
          <div 
            key={notification.id}
            className={`notification-card notification-${notification.type}`}
          >
            <div className="notification-icon">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="notification-content">
              <div className="notification-body">
                <p className="notification-message">{notification.message}</p>
                {notification.actionLabel && notification.onAction && (
                  <button
                    className="notification-action"
                    onClick={() => onAction(notification.id)}
                  >
                    {notification.actionLabel}
                  </button>
                )}
              </div>
            </div>
            <button className="notification-close" onClick={() => onRemove(notification.id)} title="Bildirimi kapat">✕</button>
          </div>
        ))}
      </div>

      <style>{`
        .notification-container {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 9999;
          max-width: 24rem;
          pointer-events: none;
        }

        .notification-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .notification-card {
          display: grid;
          grid-template-columns: 26px 1fr 22px;
          gap: var(--space-2);
          align-items: start;
          padding: 14px 16px;
          border-radius: 14px;
          background: color-mix(in srgb, var(--bg-elevated, #0b1120) 85%, #000 15%);
          color: var(--text-primary);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 20px 45px rgba(2, 4, 11, 0.65);
          backdrop-filter: blur(14px);
          pointer-events: auto;
          animation: slideIn 260ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(16px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        .notification-card .notification-icon { 
          font-size: 16px; 
          line-height: 1; 
        }
        
        .notification-card .notification-content { 
          font-size: 0.875rem; 
        }

        .notification-card .notification-message {
          margin: 0;
          color: inherit;
        }

        .notification-card.notification-success { 
          border-color: rgba(34, 197, 94, 0.45); 
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.18), rgba(13, 19, 9, 0.65)); 
          color: #bbf7d0; 
        }
        
        .notification-card.notification-error { 
          border-color: rgba(239, 68, 68, 0.5); 
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(24, 5, 8, 0.75)); 
          color: #fecdd3; 
        }
        
        .notification-card.notification-warning { 
          border-color: rgba(251, 191, 36, 0.45); 
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(32, 24, 5, 0.75)); 
          color: #fde68a; 
        }
        
        .notification-card.notification-info { 
          border-color: rgba(59, 130, 246, 0.5); 
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.22), rgba(9, 12, 25, 0.8)); 
          color: #bfdbfe; 
        }

        .notification-action {
          margin-top: 6px;
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid currentColor;
          border-radius: 4px;
          color: inherit;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 120ms ease;
        }

        .notification-action:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }

        .notification-close {
          background: transparent;
          border: none;
          color: inherit;
          font-size: 15px;
          cursor: pointer;
          opacity: 0.75;
          transition: transform 120ms ease, opacity 120ms ease;
          padding: 0;
          line-height: 1;
        }
        
        .notification-close:hover { 
          opacity: 1; 
          transform: scale(1.05); 
        }

        @media (prefers-reduced-motion: reduce) {
          .notification-card {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}

function getNotificationIcon(type) {
  switch (type) {
    case 'success': return '✅'
    case 'error':   return '⛔'
    case 'warning': return '⚠️'
    case 'info':
    default:        return 'ℹ️'
  }
}