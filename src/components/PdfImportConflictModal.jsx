import React, { useState } from 'react';
import styles from './Modal.module.css';

const PdfImportConflictModal = ({ 
  isOpen, 
  onClose, 
  conflicts = [], 
  onResolve,
  IconComponent: Icon = null 
}) => {
  const [resolutions, setResolutions] = useState({});
  const [applyToAll, setApplyToAll] = useState('');

  if (!isOpen) return null;

  const handleResolutionChange = (conflictIndex, resolution) => {
    setResolutions(prev => ({
      ...prev,
      [conflictIndex]: resolution
    }));
  };

  const handleApplyToAllChange = (resolution) => {
    setApplyToAll(resolution);
    // Tüm çakışmalara aynı çözümü uygula
    const newResolutions = {};
    conflicts.forEach((_, index) => {
      newResolutions[index] = resolution;
    });
    setResolutions(newResolutions);
  };

  const handleResolve = () => {
    const finalResolutions = {};
    
    conflicts.forEach((conflict, index) => {
      if (applyToAll) {
        finalResolutions[index] = applyToAll;
      } else {
        finalResolutions[index] = resolutions[index] || 'keep_existing';
      }
    });

    onResolve(finalResolutions);
    onClose();
  };

  const getConflictDescription = (conflict) => {
    const { day, period, classId } = conflict;
    
    const dayNames = {
      monday: 'Pazartesi',
      tuesday: 'Salı', 
      wednesday: 'Çarşamba',
      thursday: 'Perşembe',
      friday: 'Cuma'
    };

    const periodNames = {
      '1': '1. Kat',
      '2': '2. Kat',
      '3': 'Zemin ve Bahçe'
    };

    return `${dayNames[day]} - ${periodNames[period]} - ${classId}`;
  };

  const getTeacherDisplayName = (teacher) => {
    if (!teacher) return 'Atanmamış';
    return teacher.teacherName || teacher.name || 'Bilinmeyen';
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ maxWidth: '800px', maxHeight: '80vh' }}>
        <div className={styles.modalHeader}>
          <h2>Çakışma Yönetimi</h2>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Kapat"
          >
            {Icon ? <Icon name="x" size={20} /> : <span aria-hidden="true">×</span>}
          </button>
        </div>

        <div className={styles.modalBody} style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <div className={styles.conflictInfo}>
            <p>
              {Icon && <Icon name="alert-triangle" size={16} style={{ color: '#f59e0b', marginRight: '8px' }} />}
              <strong>{conflicts.length}</strong> çakışma tespit edildi. Her çakışma için karar verin:
            </p>
          </div>

          {/* Toplu İşlem */}
          <div className={styles.bulkAction}>
            <label>
              <strong>Tümü için:</strong>
              <select 
                value={applyToAll} 
                onChange={(e) => handleApplyToAllChange(e.target.value)}
                className={styles.select}
              >
                <option value="">Seçin...</option>
                <option value="use_pdf">PDF'deki atamayı kullan</option>
                <option value="keep_existing">Mevcut atamayı koru</option>
                <option value="skip">Bu atamayı atla</option>
              </select>
            </label>
          </div>

          {/* Çakışma Listesi */}
          <div className={styles.conflictsList}>
            {conflicts.map((conflict, index) => (
              <div key={index} className={styles.conflictItem}>
                <div className={styles.conflictHeader}>
                  <h4>{getConflictDescription(conflict)}</h4>
                </div>
                
                <div className={styles.conflictDetails}>
                  <div className={styles.existingAssignment}>
                    <strong>Mevcut Atama:</strong>
                    <span className={styles.teacherName}>
                      {getTeacherDisplayName(conflict.existingTeacher)}
                    </span>
                  </div>
                  
                  <div className={styles.pdfAssignment}>
                    <strong>PDF'deki Atama:</strong>
                    <span className={styles.teacherName}>
                      {getTeacherDisplayName(conflict.pdfTeacher)}
                    </span>
                  </div>
                </div>

                <div className={styles.resolutionOptions}>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name={`conflict_${index}`}
                      value="use_pdf"
                      checked={resolutions[index] === 'use_pdf'}
                      onChange={() => handleResolutionChange(index, 'use_pdf')}
                    />
                    <span>PDF'deki atamayı kullan</span>
                  </label>
                  
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name={`conflict_${index}`}
                      value="keep_existing"
                      checked={resolutions[index] === 'keep_existing'}
                      onChange={() => handleResolutionChange(index, 'keep_existing')}
                    />
                    <span>Mevcut atamayı koru</span>
                  </label>
                  
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name={`conflict_${index}`}
                      value="skip"
                      checked={resolutions[index] === 'skip'}
                      onChange={() => handleResolutionChange(index, 'skip')}
                    />
                    <span>Bu atamayı atla</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button 
            className={styles.btnSecondary}
            onClick={onClose}
          >
            İptal
          </button>
          <button 
            className={styles.btnPrimary}
            onClick={handleResolve}
            disabled={conflicts.length === 0}
          >
            Çakışmaları Çöz
          </button>
        </div>
      </div>
    </div>
  );
};

export default PdfImportConflictModal;
