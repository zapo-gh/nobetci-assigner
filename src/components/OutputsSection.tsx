// @ts-nocheck
import React, { useMemo, useState, useRef, useEffect } from 'react';
import PrintableDailyList from './PrintableDailyList.jsx';
import PrintableAssignmentList from './PrintableAssignmentList.jsx';
import AssignmentText from './AssignmentText.jsx';
import { decodeClassAbsenceValue, COMMON_LESSON_LABEL } from '../utils/classAbsence.js';
import { MANUAL_EMPTY_TEACHER_ID, MANUAL_ADMIN_TEACHER_ID } from '../utils/assignDuty.js';
import { loadPrintNotesConfig, savePrintNotesConfig } from '../services/firebaseDataService.js';
import { logger } from '../utils/logger.js';

const STORAGE_KEY_NOTES = 'nobetci_print_notes';
const STORAGE_KEY_NOTES_ENABLED = 'nobetci_print_notes_enabled';
const STORAGE_KEY_SHOW_MERGED = 'nobetci_show_merged_in_outputs';
const DEFAULT_NOTES = `1. Nöbetçi öğretmenler boş geçen derslere zamanında girmekle yükümlüdür.
2. Sınıf defteri ve yoklama fişleri ilgili ders saatinde nöbetçi öğretmen tarafından doldurulup imzalanacaktır.
3. Görevli öğretmenler okul idaresinin bilgisi dışında görev yerini terk edemezler.`;

export default function OutputsSection({
  day,
  displayDate,
  periods = [],
  assignment = {},
  locked = {},
  teachersForCurrentDay = [],
  classes = [],
  classAbsence = {},
  filteredClassAbsence,
  absentPeopleForCurrentDay = [],
  commonLessons = {},
  classLocations = {},
  locationZoneMapping = {},
  teacherSchedules = {},
  onPrint,
  onExportJPG,
  IconComponent,
}) {
  if (!IconComponent) {
    throw new Error('OutputsSection requires IconComponent prop');
  }

  const effectiveClassAbsence = filteredClassAbsence || classAbsence;

  // View Mode: 'matrix' (Çizelge) | 'list' (Görevlendirme Listesi)
  const [viewMode, setViewMode] = useState('matrix');
  const [printDropdownOpen, setPrintDropdownOpen] = useState(false);
  const [jpegDropdownOpen, setJpegDropdownOpen] = useState(false);

  const printDropdownRef = useRef<HTMLDivElement | null>(null);
  const jpegDropdownRef = useRef<HTMLDivElement | null>(null);
  const printTimeoutRef = useRef<any>(null);
  const jpegTimeoutRef = useRef<any>(null);

  const handlePrintMouseEnter = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) return;
    if (printTimeoutRef.current) clearTimeout(printTimeoutRef.current);
    setPrintDropdownOpen(true);
  };

  const handlePrintMouseLeave = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) return;
    if (printTimeoutRef.current) clearTimeout(printTimeoutRef.current);
    printTimeoutRef.current = setTimeout(() => {
      setPrintDropdownOpen(false);
    }, 300);
  };

  const handleJpegMouseEnter = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) return;
    if (jpegTimeoutRef.current) clearTimeout(jpegTimeoutRef.current);
    setJpegDropdownOpen(true);
  };

  const handleJpegMouseLeave = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) return;
    if (jpegTimeoutRef.current) clearTimeout(jpegTimeoutRef.current);
    jpegTimeoutRef.current = setTimeout(() => {
      setJpegDropdownOpen(false);
    }, 300);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (printDropdownRef.current && !printDropdownRef.current.contains(e.target as Node)) {
        setPrintDropdownOpen(false);
      }
      if (jpegDropdownRef.current && !jpegDropdownRef.current.contains(e.target as Node)) {
        setJpegDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      if (printTimeoutRef.current) clearTimeout(printTimeoutRef.current);
      if (jpegTimeoutRef.current) clearTimeout(jpegTimeoutRef.current);
    };
  }, []);

  // Print Notes State with Persistence
  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTES);
      if (saved !== null) return saved;
    } catch (e) {}
    return DEFAULT_NOTES;
  });

  const [notesEnabled, setNotesEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTES_ENABLED);
      if (saved !== null) return saved === 'true';
    } catch (e) {}
    return true;
  });

  // Dersi Birleştirilenlerin Gösterilip Gösterilmeyeceği State'i
  const [showMergedLessons, setShowMergedLessons] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHOW_MERGED);
      if (saved !== null) return saved === 'true';
    } catch (e) {}
    return true;
  });

  // Firestore'dan kayıtlı çizelge açıklamalarını yükle ve senkronize et
  useEffect(() => {
    let isMounted = true;
    loadPrintNotesConfig()
      .then((cfg) => {
        if (!isMounted) return;
        if (cfg) {
          if (typeof cfg.notes === 'string') {
            setNotes(cfg.notes);
            try { localStorage.setItem(STORAGE_KEY_NOTES, cfg.notes); } catch (e) {}
          }
          if (typeof cfg.enabled === 'boolean') {
            setNotesEnabled(cfg.enabled);
            try { localStorage.setItem(STORAGE_KEY_NOTES_ENABLED, String(cfg.enabled)); } catch (e) {}
          }
          if (typeof cfg.showMerged === 'boolean') {
            setShowMergedLessons(cfg.showMerged);
            try { localStorage.setItem(STORAGE_KEY_SHOW_MERGED, String(cfg.showMerged)); } catch (e) {}
          }
        } else {
          // Firestore'da henüz kayıt yoksa, mevcut yerel değeri ilk kez Firestore'a yaz
          savePrintNotesConfig({
            notes,
            enabled: notesEnabled,
            showMerged: showMergedLessons,
          }).catch((err) => {
            logger.warn('[OutputsSection] İlk print_notes Firestore kaydı yapılamadı:', err);
          });
        }
      })
      .catch((err) => {
        logger.warn('[OutputsSection] print_notes Firestore\'dan yüklenemedi:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleNotesChange = (newNotes) => {
    setNotes(newNotes);
    try {
      localStorage.setItem(STORAGE_KEY_NOTES, newNotes);
    } catch (e) {}
    savePrintNotesConfig({
      notes: newNotes,
      enabled: notesEnabled,
      showMerged: showMergedLessons,
    }).catch((err) => {
      logger.error('[OutputsSection] Çizelge açıklamaları Firestore\'a kaydedilemedi:', err);
    });
  };

  const handleNotesEnabledChange = (enabled) => {
    setNotesEnabled(enabled);
    try {
      localStorage.setItem(STORAGE_KEY_NOTES_ENABLED, String(enabled));
    } catch (e) {}
    savePrintNotesConfig({
      notes,
      enabled,
      showMerged: showMergedLessons,
    }).catch((err) => {
      logger.error('[OutputsSection] Çizelge açıklama durumu Firestore\'a kaydedilemedi:', err);
    });
  };

  const handleShowMergedLessonsChange = (enabled) => {
    setShowMergedLessons(enabled);
    try {
      localStorage.setItem(STORAGE_KEY_SHOW_MERGED, String(enabled));
    } catch (e) {}
    savePrintNotesConfig({
      notes,
      enabled: notesEnabled,
      showMerged: enabled,
    }).catch((err) => {
      logger.error('[OutputsSection] Birleştirilen dersler görünümü Firestore\'a kaydedilemedi:', err);
    });
  };

  // Trigger print with optional viewMode switch
  const handlePrint = (targetView) => {
    setPrintDropdownOpen(false);
    if (targetView && targetView !== viewMode) {
      setViewMode(targetView);
      setTimeout(() => {
        if (onPrint) onPrint();
        else window.print();
      }, 100);
    } else {
      if (onPrint) onPrint();
      else window.print();
    }
  };

  // Trigger JPEG export with optional viewMode switch
  const handleExportJpeg = async (targetView) => {
    setJpegDropdownOpen(false);
    if (targetView && targetView !== viewMode) {
      setViewMode(targetView);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    onExportJPG?.();
  };

  // Calculate duty and merge statistics (respecting showMergedLessons)
  const { totalAssignedCount, totalMergedCount } = useMemo(() => {
    let duties = 0;
    (periods || []).forEach((p) => {
      duties += (assignment?.[day]?.[p] || []).length;
    });

    let merged = 0;
    if (showMergedLessons && commonLessons?.[day]) {
      (periods || []).forEach((p) => {
        const commonMap = commonLessons[day]?.[p] || {};
        Object.entries(commonMap).forEach(([classId, teacherVal]) => {
          if ((assignment?.[day]?.[p] || []).some(a => a.classId === classId)) return;
          if (!teacherVal || teacherVal === MANUAL_EMPTY_TEACHER_ID) return;
          const rawAbs = effectiveClassAbsence?.[day]?.[p]?.[classId];
          const { commonLessonOwnerId } = decodeClassAbsenceValue(rawAbs || '');
          if (commonLessonOwnerId && !absentPeopleForCurrentDay.some(a => a.absentId === commonLessonOwnerId)) return;
          merged++;
        });
      });
    }
    return { totalAssignedCount: duties, totalMergedCount: merged };
  }, [assignment, day, periods, showMergedLessons, commonLessons, effectiveClassAbsence, absentPeopleForCurrentDay]);

  return (
    <div id="panel-outputs" role="tabpanel" aria-labelledby="tab-outputs" style={{ width: '100%' }}>
      {/* ---------------- Modern Toolbar ---------------- */}
      <div
        className="toolbar no-print outputs-toolbar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
          padding: '12px 18px',
          background: 'var(--surface, #ffffff)',
          borderRadius: '14px',
          border: '1px solid var(--border, #e2e8f0)',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)'
        }}
      >
        {/* Left Info */}
        <div className="outputs-toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
            }}
          >
            <IconComponent name="printer" size={18} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              Görevlendirme Çıktıları & Paylaşım
            </h2>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '2px',
                fontSize: '0.8rem',
                color: '#64748b'
              }}
            >
              <span>📅 {displayDate}</span>
              <span>•</span>
              <strong style={{ color: totalAssignedCount > 0 ? '#166534' : 'inherit' }}>
                {totalAssignedCount} Görevlendirme
              </strong>
              {showMergedLessons && totalMergedCount > 0 ? (
                <>
                  <span>•</span>
                  <strong style={{ color: '#4338ca' }}>
                    {totalMergedCount} Birleştirildi
                  </strong>
                </>
              ) : null}
              <span>•</span>
              <span>{teachersForCurrentDay.length} Nöbetçi Öğretmen</span>
            </div>
          </div>
        </div>

        {/* Center: View Mode Segmented Controls & Merged Toggle */}
        <div className="outputs-toolbar-center" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            className="view-mode-toggle no-print"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0'
            }}
          >
            <button
              type="button"
              className="view-mode-tab"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'matrix' ? '#ffffff' : 'transparent',
                color: viewMode === 'matrix' ? '#0f172a' : '#64748b',
                fontWeight: viewMode === 'matrix' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'matrix' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
              onClick={() => setViewMode('matrix')}
            >
              <span>📊</span>
              <span>Çizelge</span>
            </button>
            <button
              type="button"
              className="view-mode-tab"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'list' ? '#ffffff' : 'transparent',
                color: viewMode === 'list' ? '#0f172a' : '#64748b',
                fontWeight: viewMode === 'list' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
              onClick={() => setViewMode('list')}
            >
              <span>📋</span>
              <span>Görev Listesi</span>
            </button>
          </div>

          {/* Dersi Birleştirilenleri Göster / Gizle Toggle */}
          <label
            className="merged-lessons-toggle no-print"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '6px 12px',
              borderRadius: '10px',
              background: showMergedLessons ? '#eff6ff' : '#f8fafc',
              border: showMergedLessons ? '1.5px solid #93c5fd' : '1.5px solid #e2e8f0',
              color: showMergedLessons ? '#1d4ed8' : '#64748b',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'all 0.15s ease'
            }}
            title="Dersi birleştirilenlerin (ortak ders) liste ve çizelgede yer alıp almayacağını belirler"
          >
            <input
              type="checkbox"
              checked={showMergedLessons}
              onChange={(e) => handleShowMergedLessonsChange(e.target.checked)}
              style={{ accentColor: '#2563eb', cursor: 'pointer', width: '15px', height: '15px' }}
            />
            <span>🔗 Birleştirilenleri Göster</span>
          </label>
        </div>

        {/* Right Actions with Hover Dropdowns */}
        <div className="outputs-toolbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* 1. Yazdır (A4) Dropdown Container */}
          <div
            ref={printDropdownRef}
            className="dropdown-container"
            onMouseEnter={handlePrintMouseEnter}
            onMouseLeave={handlePrintMouseLeave}
            style={{ position: 'relative' }}
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={(e) => {
                e.stopPropagation();
                if (printTimeoutRef.current) clearTimeout(printTimeoutRef.current);
                setPrintDropdownOpen((prev) => !prev);
              }}
              aria-expanded={printDropdownOpen}
              aria-haspopup="true"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              <IconComponent name="printer" size={16} />
              <span>Yazdır (A4)</span>
              <span
                style={{
                  fontSize: '0.72rem',
                  opacity: 0.85,
                  marginLeft: '2px',
                  display: 'inline-block',
                  transition: 'transform 0.2s ease',
                  transform: printDropdownOpen ? 'rotate(180deg)' : 'none'
                }}
              >
                ▼
              </span>
            </button>

            {printDropdownOpen && (
              <div
                className="dropdown-menu-popover"
                onMouseEnter={handlePrintMouseEnter}
                onMouseLeave={handlePrintMouseLeave}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  zIndex: 1000,
                  minWidth: '220px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(15, 23, 42, 0.05)',
                  padding: '6px'
                }}
              >
                <button
                  type="button"
                  className="dropdown-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrint('matrix');
                  }}
                >
                  <span className="dropdown-action-icon">📊</span>
                  <div className="dropdown-action-text">
                    <span className="dropdown-action-title">Çizelge Yazdır</span>
                    <span className="dropdown-action-desc">Nöbetçi matris tablosu</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="dropdown-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrint('list');
                  }}
                >
                  <span className="dropdown-action-icon">📋</span>
                  <div className="dropdown-action-text">
                    <span className="dropdown-action-title">Görev Listesi Yazdır</span>
                    <span className="dropdown-action-desc">Derslik ve görev listesi (Dikey A4)</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 2. JPEG Kaydet Dropdown Container */}
          {onExportJPG && (
            <div
              ref={jpegDropdownRef}
              className="dropdown-container"
              onMouseEnter={handleJpegMouseEnter}
              onMouseLeave={handleJpegMouseLeave}
              style={{ position: 'relative' }}
            >
              <button
                type="button"
                className="btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (jpegTimeoutRef.current) clearTimeout(jpegTimeoutRef.current);
                  setJpegDropdownOpen((prev) => !prev);
                }}
                aria-expanded={jpegDropdownOpen}
                aria-haspopup="true"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                <IconComponent name="image" size={16} />
                <span>JPEG Kaydet</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    opacity: 0.7,
                    marginLeft: '2px',
                    display: 'inline-block',
                    transition: 'transform 0.2s ease',
                    transform: jpegDropdownOpen ? 'rotate(180deg)' : 'none'
                  }}
                >
                  ▼
                </span>
              </button>

              {jpegDropdownOpen && (
                <div
                  className="dropdown-menu-popover"
                  onMouseEnter={handleJpegMouseEnter}
                  onMouseLeave={handleJpegMouseLeave}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    zIndex: 1000,
                    minWidth: '220px',
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(15, 23, 42, 0.05)',
                    padding: '6px'
                  }}
                >
                  <button
                    type="button"
                    className="dropdown-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportJpeg('matrix');
                    }}
                  >
                    <span className="dropdown-action-icon">📊</span>
                    <div className="dropdown-action-text">
                      <span className="dropdown-action-title">Çizelge (JPEG)</span>
                      <span className="dropdown-action-desc">Matris çizelgesini indir</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="dropdown-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportJpeg('list');
                    }}
                  >
                    <span className="dropdown-action-icon">📋</span>
                    <div className="dropdown-action-text">
                      <span className="dropdown-action-title">Görev Listesi (JPEG)</span>
                      <span className="dropdown-action-desc">Görev listesini resim olarak indir</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---------------- Printable Component (Matrix or List) ---------------- */}
      {viewMode === 'matrix' ? (
        <PrintableDailyList
          day={day}
          displayDate={displayDate}
          periods={periods}
          assignment={assignment}
          locked={locked}
          teachers={teachersForCurrentDay}
          classes={classes}
          classAbsence={effectiveClassAbsence}
          absentPeople={absentPeopleForCurrentDay}
          commonLessons={commonLessons}
          showMergedLessons={showMergedLessons}
          teacherSchedules={teacherSchedules}
          notes={notes}
          notesEnabled={notesEnabled}
          onNotesChange={handleNotesChange}
          onNotesEnabledChange={handleNotesEnabledChange}
          IconComponent={IconComponent}
        />
      ) : (
        <PrintableAssignmentList
          day={day}
          displayDate={displayDate}
          periods={periods}
          assignment={assignment}
          locked={locked}
          teachers={teachersForCurrentDay}
          classes={classes}
          classAbsence={effectiveClassAbsence}
          absentPeople={absentPeopleForCurrentDay}
          commonLessons={commonLessons}
          showMergedLessons={showMergedLessons}
          classLocations={classLocations}
          locationZoneMapping={locationZoneMapping}
          teacherSchedules={teacherSchedules}
          notes={notes}
          notesEnabled={notesEnabled}
          onNotesChange={handleNotesChange}
          onNotesEnabledChange={handleNotesEnabledChange}
          IconComponent={IconComponent}
        />
      )}

      {/* ---------------- WhatsApp & Plain Text Section (Sadece Ekran İçin - Çıktıda Gizlenir) ---------------- */}
      <div className="no-print">
        <AssignmentText
          day={day}
          displayDate={displayDate}
          periods={periods}
          assignment={assignment}
          locked={locked}
          teachers={teachersForCurrentDay}
          classes={classes}
          classAbsence={effectiveClassAbsence}
          absentPeople={absentPeopleForCurrentDay}
          commonLessons={commonLessons}
          showMergedLessons={showMergedLessons}
          classLocations={classLocations}
          teacherSchedules={teacherSchedules}
        />
      </div>

      <style>{`
        .dropdown-menu-popover {
          animation: popoverFadeIn 0.15s ease-out;
        }
        .dropdown-menu-popover::before {
          content: '';
          position: absolute;
          top: -14px;
          left: 0;
          right: 0;
          height: 14px;
          background: transparent;
        }
        @keyframes popoverFadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .dropdown-action-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border: none;
          background: transparent;
          border-radius: 8px;
          text-align: left;
          cursor: pointer;
          transition: all 0.12s ease;
          font-family: inherit;
        }
        .dropdown-action-btn:hover {
          background: #f1f5f9;
        }
        .dropdown-action-icon {
          font-size: 1.15rem;
          flex-shrink: 0;
        }
        .dropdown-action-text {
          display: flex;
          flex-direction: column;
        }
        .dropdown-action-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.2;
        }
        .dropdown-action-desc {
          font-size: 0.72rem;
          color: #64748b;
          margin-top: 1px;
        }

        @media (max-width: 768px) {
          .outputs-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 12px 14px !important;
            gap: 12px !important;
          }
          .outputs-toolbar-left {
            width: 100%;
          }
          .outputs-toolbar-center {
            width: 100%;
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
          }
          .outputs-toolbar-center .view-mode-toggle {
            width: 100%;
            display: flex !important;
          }
          .outputs-toolbar-center .view-mode-tab {
            flex: 1;
            justify-content: center;
            min-height: 42px;
            font-size: 0.88rem !important;
          }
          .outputs-toolbar-center .merged-lessons-toggle {
            width: 100%;
            justify-content: center;
            min-height: 42px;
          }
          .outputs-toolbar-actions {
            width: 100%;
            display: flex !important;
            gap: 8px !important;
          }
          .outputs-toolbar-actions .dropdown-container {
            flex: 1;
          }
          .outputs-toolbar-actions .dropdown-container > button {
            width: 100%;
            justify-content: center;
            min-height: 44px !important;
          }
          .dropdown-menu-popover {
            position: absolute;
            top: calc(100% + 6px);
            right: 0;
            left: 0;
            min-width: 100% !important;
            max-width: calc(100vw - 32px) !important;
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18) !important;
          }
          .dropdown-action-btn {
            min-height: 44px;
            padding: 10px 12px !important;
          }
        }
      `}</style>
    </div>
  );
}
