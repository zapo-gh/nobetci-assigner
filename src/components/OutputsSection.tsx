// @ts-nocheck
import React, { useMemo, useState, useRef, useEffect } from 'react';
import PrintableDailyList from './PrintableDailyList.jsx';
import PrintableAssignmentList from './PrintableAssignmentList.jsx';
import AssignmentText from './AssignmentText.jsx';

const STORAGE_KEY_NOTES = 'nobetci_print_notes';
const STORAGE_KEY_NOTES_ENABLED = 'nobetci_print_notes_enabled';
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

  // View Mode: 'matrix' (Çizelge) | 'list' (Görevlendirme Listesi)
  const [viewMode, setViewMode] = useState('matrix');
  const [printDropdownOpen, setPrintDropdownOpen] = useState(false);
  const [jpegDropdownOpen, setJpegDropdownOpen] = useState(false);

  const printDropdownRef = useRef<HTMLDivElement | null>(null);
  const jpegDropdownRef = useRef<HTMLDivElement | null>(null);
  const printTimeoutRef = useRef<any>(null);
  const jpegTimeoutRef = useRef<any>(null);

  const handlePrintMouseEnter = () => {
    if (printTimeoutRef.current) clearTimeout(printTimeoutRef.current);
    setPrintDropdownOpen(true);
  };

  const handlePrintMouseLeave = () => {
    if (printTimeoutRef.current) clearTimeout(printTimeoutRef.current);
    printTimeoutRef.current = setTimeout(() => {
      setPrintDropdownOpen(false);
    }, 300);
  };

  const handleJpegMouseEnter = () => {
    if (jpegTimeoutRef.current) clearTimeout(jpegTimeoutRef.current);
    setJpegDropdownOpen(true);
  };

  const handleJpegMouseLeave = () => {
    if (jpegTimeoutRef.current) clearTimeout(jpegTimeoutRef.current);
    jpegTimeoutRef.current = setTimeout(() => {
      setJpegDropdownOpen(false);
    }, 300);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (printDropdownRef.current && !printDropdownRef.current.contains(e.target as Node)) {
        setPrintDropdownOpen(false);
      }
      if (jpegDropdownRef.current && !jpegDropdownRef.current.contains(e.target as Node)) {
        setJpegDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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

  const handleNotesChange = (newNotes) => {
    setNotes(newNotes);
    try {
      localStorage.setItem(STORAGE_KEY_NOTES, newNotes);
    } catch (e) {}
  };

  const handleNotesEnabledChange = (enabled) => {
    setNotesEnabled(enabled);
    try {
      localStorage.setItem(STORAGE_KEY_NOTES_ENABLED, String(enabled));
    } catch (e) {}
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

  // Calculate duty statistics
  const totalAssignedCount = useMemo(() => {
    let count = 0;
    (periods || []).forEach((p) => {
      count += (assignment?.[day]?.[p] || []).length;
    });
    return count;
  }, [assignment, day, periods]);

  // Export to CSV / Excel
  const handleExportCSV = () => {
    const rows = [
      ['T.C. MİLLÎ EĞİTİM BAKANLIĞI - NÖBETÇİ ÖĞRETMEN GÖREVLENDİRME ÇİZELGESİ'],
      ['Tarih', displayDate || ''],
      ['Gün', day || ''],
      [],
      ['Ders Saati', 'Sınıf', 'Nöbetçi Öğretmen', 'Nöbet Yeri', 'Dersi Boş Olan Öğretmen / Mazereti']
    ];

    const teacherById = Object.fromEntries((teachersForCurrentDay || []).map((t) => [t.teacherId, t]));
    const classById = Object.fromEntries((classes || []).map((c) => [c.classId, c.className]));
    const absentById = Object.fromEntries(
      (absentPeopleForCurrentDay || []).map((a) => [a.absentId, `${a.name} (${a.reason || 'Mazeretli'})`])
    );

    (periods || []).forEach((p) => {
      const arr = assignment?.[day]?.[p] || [];
      arr.forEach((a) => {
        const clsName = classById[a.classId] || a.classId;
        const teacher = teacherById[a.teacherId];
        const teacherName = teacher?.teacherName || a.teacherId;
        const systemDayMap = {
          Sun: 'sunday', Mon: 'monday', Tue: 'tuesday', Wed: 'wednesday', Thu: 'thursday', Fri: 'friday', Sat: 'saturday'
        };
        const dutyLocation = teacher?.dutyLocations?.[systemDayMap[day] || day] || '-';
        const absId = classAbsence?.[day]?.[p]?.[a.classId];
        const absText = absId ? absentById[absId] || '-' : '-';

        rows.push([`${p}. Ders`, clsName, teacherName, dutyLocation, absText]);
      });
    });

    if (notesEnabled && notes && notes.trim()) {
      rows.push([]);
      rows.push(['AÇIKLAMALAR']);
      notes.split('\n').forEach((line) => {
        if (line.trim()) {
          rows.push([line.trim()]);
        }
      });
    }

    const csvContent =
      '\uFEFF' +
      rows.map((r) => r.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Nobet_Listesi_${(displayDate || day).replace(/[\s/\\:]+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="panel-outputs" role="tabpanel" aria-labelledby="tab-outputs" style={{ width: '100%' }}>
      {/* ---------------- Modern Toolbar ---------------- */}
      <div
        className="toolbar no-print"
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              <span>•</span>
              <span>{teachersForCurrentDay.length} Nöbetçi Öğretmen</span>
            </div>
          </div>
        </div>

        {/* Center: View Mode Segmented Controls */}
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

        {/* Right Actions with Hover Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                    <span className="dropdown-action-desc">Derslik ve görev listesi</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 2. Excel / CSV Button */}
          <button
            type="button"
            className="btn"
            onClick={handleExportCSV}
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
              color: '#334155'
            }}
            title="Excel uyumlu CSV tablosu indir"
          >
            <span>📊</span>
            <span>Excel / CSV</span>
          </button>

          {/* 3. JPEG Kaydet Dropdown Container */}
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
          classAbsence={classAbsence}
          absentPeople={absentPeopleForCurrentDay}
          commonLessons={commonLessons}
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
          classAbsence={classAbsence}
          absentPeople={absentPeopleForCurrentDay}
          commonLessons={commonLessons}
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
          classAbsence={classAbsence}
          absentPeople={absentPeopleForCurrentDay}
          commonLessons={commonLessons}
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
      `}</style>
    </div>
  );
}
