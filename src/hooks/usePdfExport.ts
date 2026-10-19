// @ts-nocheck
/**
 * usePdfExport — JPEG export hook'u
 *
 * Faz 3 Refactor: App.jsx'teki exportJPG fonksiyonu bu hook'a taşındı.
 * html2canvas ile çıktı panelini JPEG olarak dışa aktarır.
 */
import { useCallback } from 'react';
import { logger } from '../utils/logger.js';

/**
 * @param {object} params
 * @param {string}   params.day         - Seçili gün kodu (Mon, Tue, ...)
 * @param {string}   params.displayDate - Formatlı tarih string'i
 * @param {Function} params.addNotification
 * @returns {{ exportJPG: Function }}
 */
export function usePdfExport({ day, displayDate, addNotification }) {
  const exportJPG = useCallback(async () => {
    const outputSection = document.getElementById('panel-outputs');
    if (!outputSection) {
      addNotification('Çıktılar bölümü bulunamadı', 'error');
      return;
    }

    addNotification('JPEG oluşturuluyor...', 'info');

    const restoreList = [];
    const originalStyles = new Map();
    const originalTheme = document.documentElement.getAttribute('data-theme');
    let printStyle = null;

    try {
      // 1. Light tema uygula
      document.documentElement.setAttribute('data-theme', 'light');

      // 2. Toolbar, buton ve no-print elementlerini gizle (Açıklamalar kartı hariç)
      outputSection.querySelectorAll('.toolbar, .btn, .no-print, [class*="assignmentTextContainer"]').forEach(el => {
        if (el.closest('.print-notes-card')) {
          return;
        }
        if (!originalStyles.has(el)) {
          originalStyles.set(el, el.style.display);
          el.style.display = 'none';
        }
      });

      // Açıklamalar kartındaki düzenleme ve başlık kontrollerini gizle
      outputSection.querySelectorAll('.print-notes-header-screen, .print-notes-edit-panel, .print-notes-screen-preview').forEach(el => {
        if (!originalStyles.has(el)) {
          originalStyles.set(el, el.style.display);
          el.style.display = 'none';
        }
      });

      // Açıklamalar kartının resmi yazdırma içeriğini görünür yap (eğer gizli değilse)
      outputSection.querySelectorAll('.print-notes-card:not(.notes-hidden-in-print) .print-notes-title-print, .print-notes-card:not(.notes-hidden-in-print) .print-notes-content-print').forEach(el => {
        if (!originalStyles.has(el)) {
          originalStyles.set(el, el.style.display);
          el.style.display = 'block';
        }
      });

      // 3. assign-table-wrap / assign-list-table-wrap: overflow kaldır (html2canvas tüm tabloyu yakalasın)
      outputSection.querySelectorAll('.assign-table-wrap, .assign-list-table-wrap').forEach(el => {
        const prev = el.style.overflow;
        el.style.overflow = 'visible';
        restoreList.push(() => { el.style.overflow = prev; });
      });

      // 4. Print stilleri — @media print kurallarını doğrudan uygula
      printStyle = document.createElement('style');
      printStyle.textContent = `
        #panel-outputs {
          background: #ffffff !important;
          color: #000000 !important;
          padding: 20px !important;
          box-shadow: none !important;
          border: none !important;
        }
        #panel-outputs * {
          color: #000000 !important;
          font-family: 'Times New Roman', serif !important;
        }
        #panel-outputs table, #panel-outputs thead,
        #panel-outputs tbody, #panel-outputs tr,
        #panel-outputs th, #panel-outputs td {
          background: #ffffff !important;
        }
        #panel-outputs .assign-table-wrap {
          overflow: visible !important;
          border: none !important;
          border-radius: 0 !important;
          background: #ffffff !important;
          box-shadow: none !important;
        }
        #panel-outputs .assign-table {
          border-collapse: collapse !important;
          width: 100% !important;
          font-size: 9.3pt !important;
          line-height: 1.1 !important;
          min-width: auto !important;
        }
        #panel-outputs .assign-table thead th,
        #panel-outputs .assign-table tbody td {
          border: 0.8pt solid #000000 !important;
          background: #ffffff !important;
          color: #000000 !important;
          padding: 1px 2px !important;
          vertical-align: middle !important;
          text-align: center !important;
          display: table-cell !important;
          position: static !important;
          z-index: auto !important;
        }
        #panel-outputs .teacher-col { width: 170px !important; }
        #panel-outputs .teacher-name .nowrap {
          white-space: normal !important;
          overflow: visible !important;
          text-overflow: clip !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
          display: inline-block !important;
          max-width: 100% !important;
          line-height: 1.15 !important;
        }
        #panel-outputs .cell-list { gap: 2px !important; width: 100% !important; }
        #panel-outputs .cell-item {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          border-radius: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          overflow: hidden !important;
        }
        #panel-outputs .class {
          font-weight: 700 !important;
          font-size: 8.5pt !important;
          width: 100% !important;
          max-width: 100% !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        #panel-outputs .abs { font-size: 8.5pt !important; }
        #panel-outputs .assign-list-table {
          border-collapse: collapse !important;
          width: 100% !important;
          font-size: 8.5pt !important;
          line-height: 1.2 !important;
        }
        #panel-outputs .assign-list-table thead th,
        #panel-outputs .assign-list-table tbody td {
          border: 0.8pt solid #000000 !important;
          background: #ffffff !important;
          color: #000000 !important;
          padding: 3px 4px !important;
          display: table-cell !important;
        }
        #panel-outputs .assign-list-table thead th {
          background: #f1f5f9 !important;
          font-weight: bold !important;
        }
        #panel-outputs .col-period { width: 8.5% !important; text-align: center !important; }
        #panel-outputs .col-absent { width: 20% !important; text-align: left !important; word-break: break-word !important; }
        #panel-outputs .col-class { width: 10.5% !important; text-align: center !important; word-break: break-word !important; }
        #panel-outputs .col-room { width: 13.5% !important; text-align: center !important; word-break: break-word !important; overflow-wrap: anywhere !important; }
        #panel-outputs .col-subject { width: 17.5% !important; text-align: center !important; word-break: break-word !important; }
        #panel-outputs .col-duty { width: 20% !important; text-align: left !important; word-break: break-word !important; }
        #panel-outputs .col-sign { width: 10% !important; text-align: center !important; }

        #panel-outputs .classroom-badge {
          background: transparent !important;
          color: #000000 !important;
          border: none !important;
          padding: 0 !important;
          font-weight: bold !important;
          display: inline-block !important;
          white-space: normal !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
          max-width: 100% !important;
          font-size: 7.2pt !important;
          line-height: 1.15 !important;
          text-align: center !important;
        }
        #panel-outputs .classroom-badge .room-pin {
          display: inline-block !important;
          font-size: 6.8pt !important;
          margin-right: 1px !important;
        }
        #panel-outputs .classroom-badge .room-text {
          display: inline !important;
          white-space: normal !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
        }
        #panel-outputs .classroom-badge .room-sep {
          color: #000000 !important;
          font-weight: normal !important;
        }
        #panel-outputs .print-title { font-size: 11pt !important; margin-bottom: 3mm !important; }
        #panel-outputs .print-orientation-bar { display: none !important; }
        #panel-outputs [class*="assignmentTextContainer"] {
          display: none !important;
        }
        #panel-outputs .print-notes-card {
          display: block !important;
          margin-top: 14px !important;
          margin-bottom: 8px !important;
          padding: 8px 12px !important;
          border: 0.8pt solid #000000 !important;
          border-radius: 0 !important;
          background: #ffffff !important;
          color: #000000 !important;
          box-shadow: none !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        #panel-outputs .print-notes-card.notes-hidden-in-print {
          display: none !important;
        }
        #panel-outputs .print-notes-title-print {
          display: block !important;
          font-weight: bold !important;
          font-size: 8.5pt !important;
          color: #000000 !important;
          margin-bottom: 4px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.3px !important;
        }
        #panel-outputs .print-notes-content-print {
          display: block !important;
          font-size: 8pt !important;
          line-height: 1.35 !important;
          color: #000000 !important;
          margin: 0 !important;
          padding: 0 !important;
          white-space: pre-wrap !important;
        }
        #panel-outputs .print-notes-header-screen,
        #panel-outputs .print-notes-edit-panel,
        #panel-outputs .print-notes-screen-preview {
          display: none !important;
        }
        #panel-outputs .official-signatures {
          display: flex !important;
          justify-content: space-between !important;
          margin-top: 18px !important;
          padding: 0 30px !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        #panel-outputs .sig-block {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          min-width: 150px !important;
          text-align: center !important;
        }
        #panel-outputs .sig-role {
          font-weight: bold !important;
          font-size: 9pt !important;
          color: #000000 !important;
        }
        #panel-outputs .sig-subrole {
          font-size: 8pt !important;
          color: #000000 !important;
        }
        #panel-outputs .sig-space {
          height: 38px !important;
        }
        #panel-outputs .sig-name {
          font-size: 8pt !important;
          color: #000000 !important;
          border-top: 0.8pt solid #000000 !important;
          padding-top: 4px !important;
          width: 100% !important;
        }
      `;
      document.head.appendChild(printStyle);

      // 5. DOM güncellemesini bekle
      await new Promise(resolve => setTimeout(resolve, 300));

      // 6. html2canvas ile yakala
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(outputSection, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 1400,
        width: outputSection.scrollWidth || 1400,
        onclone: (clonedDoc) => {
          clonedDoc.documentElement.setAttribute('data-theme', 'light');
          const cloned = clonedDoc.getElementById('panel-outputs');
          if (!cloned) return;
          cloned.querySelectorAll('[class*="assignmentTextContainer"]').forEach(el =>
            el.style.setProperty('display', 'none', 'important'));
          cloned.querySelectorAll('.toolbar, .btn, .no-print').forEach(el => {
            if (!el.closest('.print-notes-card')) {
              el.style.setProperty('display', 'none', 'important');
            }
          });
          cloned.querySelectorAll('.print-notes-header-screen, .print-notes-edit-panel, .print-notes-screen-preview').forEach(el => {
            el.style.setProperty('display', 'none', 'important');
          });
          cloned.querySelectorAll('.print-notes-card:not(.notes-hidden-in-print) .print-notes-title-print, .print-notes-card:not(.notes-hidden-in-print) .print-notes-content-print').forEach(el => {
            el.style.setProperty('display', 'block', 'important');
          });
          cloned.querySelectorAll('.assign-table-wrap, .assign-list-table-wrap').forEach(el => {
            el.style.overflow = 'visible';
          });
        }
      });

      // 7. Geri yükle
      if (printStyle && printStyle.parentNode) {
        document.head.removeChild(printStyle);
        printStyle = null;
      }
      document.documentElement.setAttribute('data-theme', originalTheme);
      originalStyles.forEach((displayVal, el) => {
        el.style.display = displayVal;
      });
      restoreList.forEach(fn => fn());

      // 8. JPEG olarak indir — toBlob Promise'e sarıldı (gerçek async)
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('toBlob null döndürdü — canvas boş olabilir'));
        }, 'image/jpeg', 0.95);
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gorevlendirme_${day}_${displayDate.replace(/\./g, '-')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addNotification('JPEG başarıyla kaydedildi', 'success');

    } catch (e) {
      logger.error(e);
      addNotification('JPEG oluşturma hatası', 'error');
      if (printStyle && printStyle.parentNode) document.head.removeChild(printStyle);
      document.documentElement.setAttribute('data-theme', originalTheme);
      originalStyles.forEach((displayVal, el) => {
        try { el.style.display = displayVal; } catch {}
      });
      restoreList.forEach(fn => {
        try { fn(); } catch (restoreErr) { logger.warn('restore error', restoreErr); }
      });
    }
  }, [day, displayDate, addNotification]);

  return { exportJPG };
}
