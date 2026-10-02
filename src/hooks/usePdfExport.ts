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
    const originalTheme = document.documentElement.getAttribute('data-theme');
    let printStyle = null;

    try {
      // 1. Light tema uygula
      document.documentElement.setAttribute('data-theme', 'light');

      // 2. Toolbar / buton / no-print elementlerini gizle
      outputSection.querySelectorAll('.toolbar, .btn, .no-print').forEach(el => {
        const prev = el.style.display;
        el.style.display = 'none';
        restoreList.push(() => { el.style.display = prev; });
      });

      // 3. AssignmentText: screenOnly gizle, printOnly göster
      outputSection.querySelectorAll('[class*="screenOnly"]').forEach(el => {
        const prev = { val: el.style.getPropertyValue('display'), pri: el.style.getPropertyPriority('display') };
        el.style.setProperty('display', 'none', 'important');
        restoreList.push(() => el.style.setProperty('display', prev.val, prev.pri));
      });
      outputSection.querySelectorAll('[class*="printOnly"]').forEach(el => {
        const prev = { val: el.style.getPropertyValue('display'), pri: el.style.getPropertyPriority('display') };
        el.style.setProperty('display', 'block', 'important');
        restoreList.push(() => el.style.setProperty('display', prev.val, prev.pri));
      });

      // 4. assign-table-wrap: overflow kaldır (html2canvas tüm tabloyu yakalasın)
      outputSection.querySelectorAll('.assign-table-wrap').forEach(el => {
        const prev = el.style.overflow;
        el.style.overflow = 'visible';
        restoreList.push(() => { el.style.overflow = prev; });
      });

      // 5. Print stilleri — @media print kurallarını doğrudan uygula
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
        #panel-outputs .cell-list { gap: 2px !important; }
        #panel-outputs .cell-item {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          border-radius: 0 !important;
        }
        #panel-outputs .abs { font-size: 8.5pt !important; }
        #panel-outputs .print-title { font-size: 11pt !important; margin-bottom: 3mm !important; }
        #panel-outputs [class*="assignmentTextContainer"] {
          background: #ffffff !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin-top: 8px !important;
        }
        #panel-outputs [class*="title"] { font-size: 11pt !important; }
      `;
      document.head.appendChild(printStyle);

      // 6. DOM güncellemesini bekle
      await new Promise(resolve => setTimeout(resolve, 300));

      // 7. html2canvas ile yakala
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
          cloned.querySelectorAll('[class*="screenOnly"]').forEach(el =>
            el.style.setProperty('display', 'none', 'important'));
          cloned.querySelectorAll('[class*="printOnly"]').forEach(el =>
            el.style.setProperty('display', 'block', 'important'));
          cloned.querySelectorAll('.toolbar, .btn, .no-print').forEach(el =>
            el.style.setProperty('display', 'none', 'important'));
          cloned.querySelectorAll('.assign-table-wrap').forEach(el => {
            el.style.overflow = 'visible';
          });
        }
      });

      // 8. Geri yükle
      document.head.removeChild(printStyle);
      printStyle = null;
      document.documentElement.setAttribute('data-theme', originalTheme);
      restoreList.forEach(fn => fn());

      // 9. JPEG olarak indir — toBlob Promise'e sarıldı (gerçek async)
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
      restoreList.forEach(fn => {
        try { fn(); } catch (restoreErr) { logger.warn('restore error', restoreErr); }
      });
    }
  }, [day, displayDate, addNotification]);

  return { exportJPG };
}
