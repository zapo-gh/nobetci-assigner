import React from 'react';

export default function OfficialSignatures() {
  return (
    <div className="official-signatures">
      <div className="sig-block">
        <div className="sig-role">Nöbetçi Müdür Yardımcısı</div>
        <div className="sig-space"></div>
        <div className="sig-name">Adı Soyadı / İmza</div>
      </div>
      <div className="sig-block">
        <div className="sig-role">UYGUNDUR</div>
        <div className="sig-subrole">Okul Müdürü</div>
        <div className="sig-space"></div>
        <div className="sig-name">Mühür / İmza</div>
      </div>

      <style>{`
        .official-signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
          padding: 16px 28px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
        }
        .sig-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 200px;
          text-align: center;
        }
        .sig-role {
          font-weight: 700;
          font-size: 0.95rem;
          color: #0f172a;
        }
        .sig-subrole {
          font-size: 0.85rem;
          color: #64748b;
        }
        .sig-space {
          height: 48px;
        }
        .sig-name {
          font-size: 0.85rem;
          color: #64748b;
          border-top: 1px dashed #cbd5e1;
          padding-top: 6px;
          width: 100%;
        }

        @media print {
          .official-signatures {
            display: flex !important;
            justify-content: space-between !important;
            margin-top: 8mm !important;
            padding: 0 15mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
          .sig-block {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            min-width: 55mm !important;
            text-align: center !important;
          }
          .sig-role {
            font-weight: bold !important;
            font-size: 9.5pt !important;
            color: #000 !important;
          }
          .sig-subrole {
            font-size: 8.5pt !important;
            color: #000 !important;
          }
          .sig-space {
            height: 14mm !important;
          }
          .sig-name {
            font-size: 8.5pt !important;
            color: #000 !important;
            border-top: 0.8pt solid #000 !important;
            padding-top: 2mm !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
