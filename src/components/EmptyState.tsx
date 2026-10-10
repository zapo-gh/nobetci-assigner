// @ts-nocheck
import React from 'react'

export default function EmptyState({
  IconComponent,
  icon = 'info',
  title = '',
  description = '',
  children = null,
  size = 48,
  className = '',
}) {
  const classes = ['empty-state text-center', className].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      {(IconComponent || icon) && (
        <div className="empty-state-icon">
          {IconComponent ? (
            <IconComponent name={icon} size={size} />
          ) : (
            <span style={{ fontSize: `${Math.round(size * 0.75)}px`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
              {icon === 'clipboard' ? '📋' : icon === 'users' ? '👥' : 'ℹ️'}
            </span>
          )}
        </div>
      )}
      {title && <h3>{title}</h3>}
      {description && <p>{description}</p>}
      {children}
    </div>
  )
}

