import React from 'react';

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

  const getIcon = () => {
    if (!Icon) return null;
    switch (type) {
      case 'danger':
        return <Icon name="alert-triangle" size={24} />;
      case 'info':
        return <Icon name="info" size={24} />;
      default:
        return <Icon name="help-circle" size={24} />;
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'btn-danger';
      case 'info':
        return 'btn-primary';
      default:
        return 'btn-secondary';
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            {getIcon()}
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'var(--font-weight-semibold)' }}>{title}</h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{message}</p>
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <button className="btn-tertiary" onClick={onClose}>
            {cancelText}
          </button>
          <button className={getButtonClass()} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
