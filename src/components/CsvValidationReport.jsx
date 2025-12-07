import React, { memo } from 'react'

function CsvValidationReport({ title, messages, onClose }) {
  if (!messages || messages.length === 0) return null
  return (
    <div className="card" role="alert" aria-live="polite">
      <div className="flex items-center justify-between">
        <h3 className="m-0">{title || 'CSV Doğrulama Raporu'}</h3>
        <button className="btn-ghost" onClick={onClose} aria-label="Kapat">✕</button>
      </div>
      <div className="mt-4">
        <ul style={{ paddingLeft: 18 }}>
          {messages.map((m, i) => (
            <li key={i} className="text-secondary" style={{ marginBottom: 6 }}>{m}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default memo(CsvValidationReport)






