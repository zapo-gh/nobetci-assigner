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
        <div className="empty-icon empty-icon-modern">
          <IconComponent name={icon} size={size} />
        </div>
      )}
      {title && <h3 className="mt-4 text-lg font-medium">{title}</h3>}
      {description && <p className="mt-2 text-sm text-muted">{description}</p>}
      {children}
    </div>
  )
}

