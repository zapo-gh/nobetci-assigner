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
          grid-template-columns: 24px 1fr 24px;
          gap: var(--space-2);
          align-items: start;
          padding: 10px 12px;
          border-radius: 10px;
          background: var(--bg-elevated);
          color: var(--text-primary);
          border: 1px solid var(--border-subtle);
          box-shadow: var(--shadow-md);
          pointer-events: auto;
          animation: slideIn 300ms ease-out;
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
          border-color: rgba(var(--success-rgb, 34, 197, 94), 0.35); 
          background: var(--success-bg, rgba(34, 197, 94, 0.1)); 
          color: var(--success, #22c55e); 
        }
        
        .notification-card.notification-error { 
          border-color: rgba(var(--error-rgb, 239, 68, 68), 0.35); 
          background: var(--error-bg, rgba(239, 68, 68, 0.1)); 
          color: var(--error, #ef4444); 
        }
        
        .notification-card.notification-warning { 
          border-color: rgba(var(--warning-rgb, 251, 191, 36), 0.35); 
          background: var(--warning-bg, rgba(251, 191, 36, 0.1)); 
          color: var(--warning, #fbbf24); 
        }
        
        .notification-card.notification-info { 
          border-color: rgba(var(--info-rgb, 59, 130, 246), 0.35); 
          background: var(--info-bg, rgba(59, 130, 246, 0.1)); 
          color: var(--info, #3b82f6); 
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
          font-size: 16px;
          cursor: pointer;
          opacity: 0.8;
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