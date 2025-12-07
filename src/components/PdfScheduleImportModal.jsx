import React, { useState, useCallback } from 'react';
import { extractTextFromPDF, parseScheduleTable, validateScheduleData } from '../utils/pdfParser.js';
import { batchMatchNames, getMatchingSuggestions, summarizeMatchingResults } from '../utils/fuzzyMatch.js';
import PdfImportConflictModal from './PdfImportConflictModal.jsx';
import styles from './Modal.module.css';

const PdfScheduleImportModal = ({ 
  isOpen, 
  onClose, 
  onImport,
  teachers = [],
  classes = [],
  locked = {},
  IconComponent 
}) => {
  const [currentStep, setCurrentStep] = useState('file-select');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [matchingResults, setMatchingResults] = useState(null);
  const [manualMappings, setManualMappings] = useState({});
  const [conflicts, setConflicts] = useState([]);
  const [showConflictModal, setShowConflictModal] = useState(false);

  const resetModal = useCallback(() => {
    setCurrentStep('file-select');
    setSelectedFile(null);
    setLoading(false);
    setError(null);
    setScheduleData(null);
    setMatchingResults(null);
    setManualMappings({});
    setConflicts([]);
    setShowConflictModal(false);
  }, []);

  const handleClose = useCallback(() => {
    resetModal();
    onClose();
  }, [resetModal, onClose]);

  const handleFileSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('Lütfen geçerli bir PDF dosyası seçin.');
    }
  }, []);

  const detectConflicts = useCallback((schedule, results, lockedMap) => {
    const conflicts = [];
    const matchedTeachers = new Map();

    // Başarılı eşleşmeleri map'e ekle
    if (results.results && results.results.matched) {
      results.results.matched.forEach(match => {
        matchedTeachers.set(match.pdfName, match.teacher);
      });
    }

    // Manuel eşleştirmeleri de ekle
    Object.entries(manualMappings).forEach(([pdfName, teacherId]) => {
      const teacher = teachers.find(t => t.teacherId === teacherId);
      if (teacher) {
        matchedTeachers.set(pdfName, teacher);
      }
    });

    // Her gün ve periyot için çakışma kontrolü
    Object.entries(schedule).forEach(([day, dayData]) => {
      Object.entries(dayData).forEach(([period, pdfNames]) => {
        pdfNames.forEach(pdfName => {
          const teacher = matchedTeachers.get(pdfName);
          if (teacher) {
            // Bu gün/periyot için sınıf bul
            const availableClasses = classes.filter(c => 
              !lockedMap[`${day}|${period}|${c.classId}`]
            );

            if (availableClasses.length > 0) {
              const classId = availableClasses[0].classId;
              const existingTeacherId = lockedMap[`${day}|${period}|${classId}`];
              
              if (existingTeacherId && existingTeacherId !== teacher.teacherId) {
                const existingTeacher = teachers.find(t => t.teacherId === existingTeacherId);
                conflicts.push({
                  day,
                  period,
                  classId,
                  existingTeacher,
                  pdfTeacher: teacher,
                  pdfName
                });
              }
            }
          }
        });
      });
    });

    return conflicts;
  }, [classes, manualMappings, teachers]);

  const processPDF = useCallback(async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      // 1. PDF'den metin çıkar
      setCurrentStep('extracting');
      const text = await extractTextFromPDF(selectedFile);

      // 2. Tabloyu parse et
      setCurrentStep('parsing');
      const schedule = parseScheduleTable(text);
      const validation = validateScheduleData(schedule);

      if (!validation.isValid) {
        throw new Error(`Çizelge doğrulama hatası: ${validation.errors.join(', ')}`);
      }

      setScheduleData(schedule);

      // 3. Öğretmenleri eşleştir
      setCurrentStep('matching');
      const allPdfNames = [];
      Object.values(schedule).forEach(dayData => {
        Object.values(dayData).forEach(periodNames => {
          allPdfNames.push(...periodNames);
        });
      });

      const uniquePdfNames = [...new Set(allPdfNames)];
      
      const results = batchMatchNames(uniquePdfNames, teachers, 0.7);
      const summary = summarizeMatchingResults(results);

      // Eşleşmeyen öğretmenleri otomatik olarak sisteme ekle
      const autoAddedTeachers = [];
      results.unmatched.forEach(unmatched => {
        if (unmatched.pdfName && unmatched.pdfName.length > 3) {
          // Yeni öğretmen oluştur (manuel giriş formatına uygun)
          const newTeacher = {
            teacherId: `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            teacherName: unmatched.pdfName,
            maxDutyPerDay: 6 // Varsayılan günlük görev limiti
          };
          autoAddedTeachers.push(newTeacher);
        }
      });

      // Otomatik eklenen öğretmenleri sisteme ekle
      if (autoAddedTeachers.length > 0) {
        // Bu öğretmenleri ana uygulamaya gönder
        onImport({
          schedule,
          matchingResults: { results, summary },
          manualMappings: {},
          conflicts: [],
          autoAddedTeachers,
          fileMeta: selectedFile
            ? {
                name: selectedFile.name,
                size: selectedFile.size,
                lastModified: selectedFile.lastModified,
                type: selectedFile.type,
              }
            : null,
        });
        // Modal'ı kapat
        handleClose();
        return;
      }

      setMatchingResults({ results, summary });

      // 4. Çakışmaları tespit et
      setCurrentStep('conflict-check');
      const detectedConflicts = detectConflicts(schedule, results, locked);
      setConflicts(detectedConflicts);

      if (detectedConflicts.length > 0) {
        setShowConflictModal(true);
      } else {
        setCurrentStep('ready');
      }

    } catch (err) {
      setError(err.message || 'PDF işleme hatası');
      setCurrentStep('file-select');
    } finally {
      setLoading(false);
    }
  }, [selectedFile, teachers, locked, detectConflicts, onImport, handleClose]);

  const handleManualMapping = useCallback((pdfName, teacherId) => {
    setManualMappings(prev => ({
      ...prev,
      [pdfName]: teacherId
    }));
  }, []);

  const handleConflictResolve = useCallback((resolutions) => {
    setConflicts(prev => prev.map((conflict, index) => ({
      ...conflict,
      resolution: resolutions[index]
    })));
    setShowConflictModal(false);
    setCurrentStep('ready');
  }, []);

  const handleImport = useCallback(() => {
    if (!scheduleData || !matchingResults || !matchingResults.results) return;

    const importData = {
      schedule: scheduleData,
      matchingResults: matchingResults.results,
      manualMappings,
      conflicts: conflicts.filter(c => c.resolution === 'use_pdf'),
      fileMeta: selectedFile
        ? {
            name: selectedFile.name,
            size: selectedFile.size,
            lastModified: selectedFile.lastModified,
            type: selectedFile.type,
          }
        : null,
    };


    onImport(importData);
    handleClose();
  }, [scheduleData, matchingResults, manualMappings, conflicts, onImport, handleClose, selectedFile]);

  const getStepMessage = () => {
    switch (currentStep) {
      case 'extracting': return 'PDF okunuyor...';
      case 'parsing': return 'Tablo parse ediliyor...';
      case 'matching': return 'Öğretmenler eşleştiriliyor...';
      case 'conflict-check': return 'Çakışmalar kontrol ediliyor...';
      default: return '';
    }
  };

  const renderFileSelect = () => (
    <div className={styles.stepContent}>
      <div className={styles.fileUploadArea}>
        <IconComponent name="upload" size={48} style={{ color: '#6b7280', marginBottom: '16px' }} />
        <h3>PDF Çizelgesi Yükle</h3>
        <p>Haftalık nöbetçi öğretmen çizelgesini içeren PDF dosyasını seçin.</p>
        
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className={styles.fileInput}
          id="pdf-file-input"
        />
        <label htmlFor="pdf-file-input" className={styles.fileInputLabel}>
          PDF Dosyası Seç
        </label>
        
        {selectedFile && (
          <div className={styles.selectedFile}>
            <IconComponent name="file" size={16} />
            <span>{selectedFile.name}</span>
            <button 
              className={styles.btnPrimary}
              onClick={processPDF}
              disabled={loading}
            >
              İşle
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderMatchingResults = () => {
    if (!matchingResults || !matchingResults.results || !matchingResults.summary) return null;

    const { results, summary } = matchingResults;

    return (
      <div className={styles.stepContent}>
        <h3>Eşleştirme Sonuçları</h3>
        
        <div className={styles.summaryStats}>
          <div className={styles.statItem}>
            <span className={styles.statNumber} style={{ color: '#10b981' }}>
              {summary.matched}
            </span>
            <span className={styles.statLabel}>Başarılı</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber} style={{ color: '#f59e0b' }}>
              {summary.uncertain}
            </span>
            <span className={styles.statLabel}>Belirsiz</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber} style={{ color: '#ef4444' }}>
              {summary.unmatched}
            </span>
            <span className={styles.statLabel}>Eşleşmeyen</span>
          </div>
        </div>

        {/* Belirsiz eşleşmeler */}
        {results.uncertain && results.uncertain.length > 0 && (
          <div className={styles.matchingSection}>
            <h4>Belirsiz Eşleşmeler</h4>
            {results.uncertain.map((match, index) => (
              <div key={index} className={styles.matchingItem}>
                <div className={styles.pdfName}>{match.pdfName}</div>
                <div className={styles.suggestions}>
                  <select
                    value={manualMappings[match.pdfName] || ''}
                    onChange={(e) => handleManualMapping(match.pdfName, e.target.value)}
                    className={styles.select}
                  >
                    <option value="">Seçin...</option>
                    <option value={match.teacher.teacherId}>
                      {match.systemName} (Güven: %{Math.round(match.confidence * 100)})
                    </option>
                    {getMatchingSuggestions(match.pdfName, teachers, 5).map((suggestion, idx) => (
                      <option key={idx} value={suggestion.teacher.teacherId}>
                        {suggestion.systemName} (Güven: %{Math.round(suggestion.score * 100)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Eşleşmeyenler */}
        {results.unmatched && results.unmatched.length > 0 && (
          <div className={styles.matchingSection}>
            <h4>Eşleşmeyen İsimler</h4>
            {results.unmatched.map((unmatched, index) => (
              <div key={index} className={styles.matchingItem}>
                <div className={styles.pdfName}>{unmatched.pdfName}</div>
                <div className={styles.suggestions}>
                  <select
                    value={manualMappings[unmatched.pdfName] || ''}
                    onChange={(e) => handleManualMapping(unmatched.pdfName, e.target.value)}
                    className={styles.select}
                  >
                    <option value="">Manuel seçim yapın...</option>
                    {teachers.map(teacher => (
                      <option key={teacher.teacherId} value={teacher.teacherId}>
                        {teacher.teacherName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderReady = () => (
    <div className={styles.stepContent}>
      <div className={styles.readyContent}>
        <IconComponent name="check-circle" size={48} style={{ color: '#10b981', marginBottom: '16px' }} />
        <h3>Hazır!</h3>
        <p>PDF çizelgesi başarıyla işlendi ve hazır.</p>
        
        {conflicts.length > 0 && (
          <div className={styles.conflictWarning}>
            <IconComponent name="alert-triangle" size={16} />
            <span>{conflicts.length} çakışma çözüldü</span>
          </div>
        )}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent} style={{ maxWidth: '900px', maxHeight: '90vh' }}>
          <div className={styles.modalHeader}>
            <h2>PDF Çizelgesi Yükle</h2>
            <button 
              className={styles.closeButton}
              onClick={handleClose}
              aria-label="Kapat"
            >
              <IconComponent name="x" size={20} />
            </button>
          </div>

          <div className={styles.modalBody}>
            {error && (
              <div className={styles.errorMessage}>
                <IconComponent name="alert-circle" size={16} />
                <span>{error}</span>
              </div>
            )}

            {loading && (
              <div className={styles.loadingMessage}>
                <div className={styles.spinner}></div>
                <span>{getStepMessage()}</span>
              </div>
            )}

            {!loading && currentStep === 'file-select' && renderFileSelect()}
            {!loading && (currentStep === 'matching' || currentStep === 'conflict-check') && renderMatchingResults()}
            {!loading && currentStep === 'ready' && renderReady()}
          </div>

          <div className={styles.modalFooter}>
            <button 
              className={styles.btnSecondary}
              onClick={handleClose}
            >
              İptal
            </button>
            {currentStep === 'ready' && (
              <button 
                className={styles.btnPrimary}
                onClick={handleImport}
              >
                Yükle
              </button>
            )}
          </div>
        </div>
      </div>

      <PdfImportConflictModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        conflicts={conflicts}
        onResolve={handleConflictResolve}
        IconComponent={IconComponent}
      />
    </>
  );
};

export default PdfScheduleImportModal;
