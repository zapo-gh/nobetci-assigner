import React, { useState, useEffect } from 'react';

const DEFAULT_NOTES = `1. Nöbetçi öğretmenler boş geçen derslere zamanında girmekle yükümlüdür.
2. Sınıf defteri ve yoklama fişleri ilgili ders saatinde nöbetçi öğretmen tarafından doldurulup imzalanacaktır.
3. Görevli öğretmenler okul idaresinin bilgisi dışında görev yerini terk edemezler.`;

interface PrintNotesCardProps {
  notes?: string;
  notesEnabled?: boolean;
  onNotesChange?: (notes: string) => void;
  onNotesEnabledChange?: (enabled: boolean) => void;
  titlePrefix?: string;
}

export default function PrintNotesCard({
  notes = '',
  notesEnabled = true,
  onNotesChange,
  onNotesEnabledChange,
  titlePrefix = 'Açıklamalar',
}: PrintNotesCardProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editingText, setEditingText] = useState(notes || '');

  useEffect(() => {
    setEditingText(notes || '');
  }, [notes]);

  const hasContent = Boolean(notes && notes.trim());

  return (
    <div className={`print-notes-card ${!notesEnabled || !hasContent ? 'notes-hidden-in-print' : ''}`}>
      {/* ---------------- Yazdırmada Görünen Resmi Başlık ve İçerik ---------------- */}
      <div className="print-notes-title-print">AÇIKLAMALAR:</div>
      <div className="print-notes-content-print">
        {hasContent ? notes : ''}
      </div>

      {/* ---------------- Ekran Görünümünde (no-print) Başlık ve Kontroller ---------------- */}
      <div className="print-notes-header-screen no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.1rem' }}>📝</span>
          <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
            {titlePrefix}
          </strong>
          {notesEnabled && hasContent ? (
            <span className="notes-status-badge badge-active">Çıktıda Görünür</span>
          ) : (
            <span className="notes-status-badge badge-inactive">Çıktıda Gizli</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label className="notes-toggle-label">
            <input
              type="checkbox"
              checked={notesEnabled}
              onChange={(e) => onNotesEnabledChange?.(e.target.checked)}
            />
            <span>Çıktıda Göster</span>
          </label>

          {!isEditingNotes && (
            <button
              type="button"
              className="btn-edit-notes"
              onClick={() => {
                setEditingText(notes || '');
                setIsEditingNotes(true);
              }}
            >
              ✏️ Düzenle
            </button>
          )}
        </div>
      </div>

      {/* ---------------- Ekran Önizlemesi veya Düzenleme Alanı ---------------- */}
      <div className="no-print" style={{ marginTop: '8px' }}>
        {isEditingNotes ? (
          <div className="print-notes-edit-panel">
            <textarea
              className="notes-textarea"
              rows={3}
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              placeholder="Çıktının altında görünecek açıklamaları yazın..."
            />
            <div className="notes-quick-templates">
              <span className="quick-tpl-label">Hızlı Ekle:</span>
              <button
                type="button"
                className="btn-quick-tpl"
                onClick={() => {
                  const item = 'Nöbetçi öğretmenler boş geçen derslere zamanında girmekle yükümlüdür.';
                  setEditingText(prev => prev ? `${prev.trim()}\n${item}` : item);
                }}
              >
                + Boş Ders Kuralı
              </button>
              <button
                type="button"
                className="btn-quick-tpl"
                onClick={() => {
                  const item = 'Sınıf defteri ve yoklama fişleri nöbetçi öğretmen tarafından imzalanacaktır.';
                  setEditingText(prev => prev ? `${prev.trim()}\n${item}` : item);
                }}
              >
                + Defter/Yoklama İmzası
              </button>
              <button
                type="button"
                className="btn-quick-tpl"
                onClick={() => {
                  const item = 'Birleştirilen gruplar belirtilen atölye/dersliklerde derse devam edecektir.';
                  setEditingText(prev => prev ? `${prev.trim()}\n${item}` : item);
                }}
              >
                + Birleştirilen Gruplar
              </button>
              <button
                type="button"
                className="btn-quick-tpl"
                onClick={() => {
                  const item = 'Görevli öğretmenler okul idaresinin bilgisi dışında görev yerini terk edemezler.';
                  setEditingText(prev => prev ? `${prev.trim()}\n${item}` : item);
                }}
              >
                + Görev Yeri Kuralı
              </button>
              <button
                type="button"
                className="btn-quick-tpl"
                onClick={() => setEditingText(DEFAULT_NOTES)}
              >
                Standart 3 Madde
              </button>
              <button
                type="button"
                className="btn-quick-tpl"
                onClick={() => setEditingText('')}
              >
                Temizle
              </button>
            </div>

            <div className="notes-edit-actions">
              <button
                type="button"
                className="btn-cancel-notes"
                onClick={() => setIsEditingNotes(false)}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="btn-save-notes"
                onClick={() => {
                  onNotesChange?.(editingText);
                  setIsEditingNotes(false);
                }}
              >
                Kaydet
              </button>
            </div>
          </div>
        ) : (
          <div className="print-notes-screen-preview">
            {hasContent ? (
              <div className="notes-rendered-text">
                {notes.split('\n').map((line, i) => (
                  <div key={i} className="notes-line">
                    {line}
                  </div>
                ))}
              </div>
            ) : (
              <div className="notes-empty-notice">
                Açıklama metni boş. Çıktıda açıklama eklemek için &quot;Düzenle&quot; butonuna tıklayabilirsiniz.
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .print-notes-card {
          margin-top: 18px;
          padding: 16px 20px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
        }
        .print-notes-title-print,
        .print-notes-content-print {
          display: none;
        }
        .print-notes-header-screen {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid #f1f5f9;
          flex-wrap: wrap;
          gap: 10px;
        }
        .notes-status-badge {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
        }
        .badge-active {
          background: #dcfce7;
          color: #166534;
        }
        .badge-inactive {
          background: #f1f5f9;
          color: #64748b;
        }
        .notes-toggle-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          user-select: none;
        }
        .btn-edit-notes {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-edit-notes:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #0f172a;
        }
        .notes-rendered-text {
          font-size: 0.88rem;
          color: #334155;
          line-height: 1.6;
        }
        .notes-line {
          padding: 2px 0;
        }
        .notes-empty-notice {
          font-size: 0.82rem;
          color: #94a3b8;
          font-style: italic;
          padding: 6px 0;
        }
        .print-notes-edit-panel {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .notes-textarea {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1.5px solid #cbd5e1;
          font-family: inherit;
          font-size: 0.85rem;
          line-height: 1.5;
          color: #0f172a;
          background: #ffffff;
          resize: vertical;
          outline: none;
          box-sizing: border-box;
        }
        .notes-textarea:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }
        .notes-quick-templates {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }
        .quick-tpl-label {
          font-size: 0.74rem;
          font-weight: 700;
          color: #64748b;
        }
        .btn-quick-tpl {
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px dashed #cbd5e1;
          background: #f8fafc;
          color: #475569;
          font-size: 0.74rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-quick-tpl:hover {
          background: #eef2ff;
          border-color: #6366f1;
          color: #4338ca;
        }
        .notes-edit-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }
        .btn-cancel-notes {
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-save-notes {
          padding: 6px 16px;
          border-radius: 8px;
          border: none;
          background: #4f46e5;
          color: #ffffff;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-save-notes:hover {
          background: #4338ca;
        }

        @media print {
          .print-notes-card {
            display: block !important;
            margin-top: 3.5mm !important;
            margin-bottom: 2mm !important;
            padding: 2.2mm 3.5mm !important;
            border: 0.8pt solid #000 !important;
            border-radius: 0 !important;
            background: #fff !important;
            color: #000 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-shadow: none !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .print-notes-card.notes-hidden-in-print {
            display: none !important;
          }
          .print-notes-title-print {
            display: block !important;
            font-weight: bold !important;
            font-size: 8.5pt !important;
            color: #000 !important;
            margin-bottom: 1.5mm !important;
            text-transform: uppercase !important;
            letter-spacing: 0.3px !important;
          }
          .print-notes-content-print {
            display: block !important;
            font-size: 8pt !important;
            line-height: 1.35 !important;
            color: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
            white-space: pre-wrap !important;
          }
          .print-notes-header-screen,
          .print-notes-screen-preview,
          .print-notes-edit-panel,
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
