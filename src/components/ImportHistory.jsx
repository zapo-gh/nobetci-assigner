import React from 'react'

const TYPE_LABELS = {
  'pdf-schedule': 'PDF Ders Programı',
  'teacher-schedule': 'Öğretmen Ders Programı (Excel)',
  'duty-teacher': 'Nöbetçi Öğretmen Excel',
  unknown: 'Bilinmeyen Yükleme',
}

const STATUS_LABELS = {
  success: 'Başarılı',
  warning: 'Uyarı',
  error: 'Hata',
  info: 'Bilgi',
}

const formatDateTime = (value) => {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return '—'
  }
}

const formatFileSize = (bytes) => {
  if (bytes == null || Number.isNaN(Number(bytes))) return ''
  const size = Number(bytes)
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export default function ImportHistory({ history = [], onClear, IconComponent }) {
  const hasEntries = Array.isArray(history) && history.length > 0

  return (
    <section className="import-history-card" aria-label="Veri yükleme geçmişi">
      <header className="import-history-header">
        <div className="import-history-title">
          {IconComponent && <IconComponent name="clipboard" size={18} />}
          <h3>Geçmiş Yüklemeler</h3>
        </div>
        {hasEntries && typeof onClear === 'function' && (
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={onClear}
            aria-label="Yükleme geçmişini temizle"
          >
            Temizle
          </button>
        )}
      </header>

      {!hasEntries ? (
        <p className="import-history-empty">Henüz herhangi bir yükleme yapılmadı.</p>
      ) : (
        <ul className="import-history-list">
          {history.map((item) => {
            const typeLabel = TYPE_LABELS[item.type] || TYPE_LABELS.unknown
            const statusKey = item.status && STATUS_LABELS[item.status] ? item.status : 'info'
            const statusLabel = STATUS_LABELS[statusKey]
            const fileSizeLabel = formatFileSize(item.fileSize)

            return (
              <li key={item.id} className={`import-history-item status-${statusKey}`}>
                <div className="import-history-item-main">
                  <div className="import-history-type">
                    <span className="import-history-type-label">{typeLabel}</span>
                    <span className="import-history-status">{statusLabel}</span>
                  </div>
                  <time dateTime={new Date(item.importedAt).toISOString()}>
                    {formatDateTime(item.importedAt)}
                  </time>
                </div>
                <div className="import-history-file">
                  <span className="file-name">{item.fileName || 'Dosya adı belirtilmedi'}</span>
                  {fileSizeLabel && <span className="file-size">{fileSizeLabel}</span>}
                </div>
                {Array.isArray(item.stats) && item.stats.length > 0 && (
                  <div className="import-history-stats">
                    {item.stats.map((stat, index) => (
                      <span key={`${item.id}-stat-${index}`} className="import-history-stat">
                        <span className="label">{stat.label}</span>
                        <span className="value">{stat.value ?? '—'}</span>
                      </span>
                    ))}
                  </div>
                )}
                {item.note && <p className="import-history-note">{item.note}</p>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

