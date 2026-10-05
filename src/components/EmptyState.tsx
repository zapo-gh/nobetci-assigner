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
      {IconComponent && (
        <div className="empty-state-icon">
          <IconComponent name={icon} size={size} />
        </div>
      )}
      {title && <h3>{title}</h3>}
      {description && <p>{description}</p>}
      {children}
    </div>
  )
}

