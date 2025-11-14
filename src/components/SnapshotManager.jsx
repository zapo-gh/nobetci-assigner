import React, { useRef } from 'react'

export default function SnapshotManager({
  snapshots = [],
  onCreate,
  onRestore,
  onDelete,
  onDeleteAll,
  onExport,
  onImport,
  IconComponent,
}) {
  const fileInputRef = useRef(null)

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (file && typeof onImport === 'function') {
      onImport(file)
    }
    event.target.value = ''
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    try {
      return new Intl.DateTimeFormat('tr-TR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(timestamp))
    } catch {
      return ''
    }
  }

  return (
    <div className="snapshot-manager">
      <div className="snapshot-actions">
        <button
          type="button"
          className="btn-tertiary"
          onClick={onCreate}
          title="Mevcut durumu kaydet"
        >
          {IconComponent && <IconComponent name="pin" size={16} />}
          <span className="btn-text">Anlık Kaydet</span>
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={handleImportClick}
          title="Daha önce dışa aktarılan anlık görüntüleri içe aktar"
        >
          {IconComponent && <IconComponent name="upload" size={14} />}
          <span>Anlık İçeri Al</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        {snapshots.length > 0 && (
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={onDeleteAll}
            title="Tüm anlık görüntüleri sil"
          >
            {IconComponent && <IconComponent name="trash" size={14} />}
          </button>
        )}
      </div>

      {snapshots.length === 0 ? (
        <p className="snapshot-empty">Henüz kaydedilmiş bir anlık görüntü yok.</p>
      ) : (
        <ul className="snapshot-list" aria-label="Kaydedilmiş anlık görüntüler">
          {snapshots.map((snapshot) => (
            <li key={snapshot.id} className="snapshot-item">
              <div className="snapshot-item-main">
                <div className="snapshot-item-title">
                  {IconComponent && <IconComponent name="clipboard" size={14} />}
                  <span className="snapshot-item-name">{snapshot.name}</span>
                </div>
                <span className="snapshot-item-date">
                  {formatDate(snapshot.ts)}
                </span>
              </div>

              <div className="snapshot-item-stats">
                {Array.isArray(snapshot.data?.teachers) && (
                  <span className="snapshot-badge">
                    Öğretmen: {snapshot.data.teachers.length}
                  </span>
                )}
                {Array.isArray(snapshot.data?.classes) && (
                  <span className="snapshot-badge">
                    Sınıf: {snapshot.data.classes.length}
                  </span>
                )}
                {Array.isArray(snapshot.data?.absentPeople) && (
                  <span className="snapshot-badge">
                    Mazeret: {snapshot.data.absentPeople.length}
                  </span>
                )}
              </div>

              <div className="snapshot-item-actions">
                <button
                  type="button"
                  className="btn-tertiary btn-sm"
                  onClick={() => onRestore?.(snapshot.id)}
                >
                  {IconComponent && <IconComponent name="download" size={14} />}
                  <span>Geri Yükle</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => onExport?.(snapshot.id)}
                >
                  {IconComponent && <IconComponent name="save" size={14} />}
                  <span>Dışa Aktar</span>
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => onDelete?.(snapshot.id)}
                  title="Anlık görüntüyü sil"
                >
                  {IconComponent && <IconComponent name="trash" size={14} />}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

