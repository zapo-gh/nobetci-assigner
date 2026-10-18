// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Modal from './Modal';
import { normalizeClassName, isPboLesson } from '../utils/classNameUtils.js';
import { normalizeForComparison } from '../utils/nameNormalization.js';

const DAY_LABELS = {
  Mon: 'Pazartesi',
  Tue: 'Salı',
  Wed: 'Çarşamba',
  Thu: 'Perşembe',
  Fri: 'Cuma',
  monday: 'Pazartesi',
  tuesday: 'Salı',
  wednesday: 'Çarşamba',
  thursday: 'Perşembe',
  friday: 'Cuma',
};

const S = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '4px 0',
  },
  contextBanner: {
    background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
    border: '1.5px solid #ddd6fe',
    borderRadius: '12px',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 2px 4px rgba(124, 58, 237, 0.05)',
  },
  iconBox: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: '#7c3aed',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
    flexShrink: 0,
    boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)',
  },
  classTitle: {
    fontWeight: 700,
    fontSize: '1rem',
    color: '#4c1d95',
    lineHeight: 1.2,
  },
  slotSubtitle: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#6d28d9',
    marginTop: '3px',
  },
  detectedCard: {
    background: '#f0fdf4',
    border: '1.5px solid #86efac',
    borderRadius: '12px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    boxShadow: '0 1px 3px rgba(22, 101, 52, 0.06)',
  },
  detectedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#166534',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  detectedTeacherName: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#14532d',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  detectedDesc: {
    fontSize: '0.78rem',
    color: '#15803d',
    lineHeight: 1.4,
  },
  changeLink: {
    background: 'none',
    border: 'none',
    color: '#4f46e5',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    textAlign: 'left',
    textDecoration: 'underline',
    alignSelf: 'flex-start',
    marginTop: '2px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    display: 'block',
    fontWeight: 600,
    fontSize: '0.875rem',
    color: '#1e293b',
  },
  select: (hasError) => ({
    width: '100%',
    padding: '10px 14px',
    fontSize: '0.92rem',
    border: hasError ? '2px solid #ef4444' : '1.5px solid #cbd5e1',
    borderRadius: '10px',
    outline: 'none',
    background: '#fff',
    color: '#0f172a',
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  }),
  infoNote: {
    fontSize: '0.78rem',
    color: '#64748b',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '8px 12px',
    lineHeight: 1.45,
  },
  errorMessage: {
    color: '#ef4444',
    fontSize: '0.78rem',
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
    marginTop: '6px',
  },
  btnCancel: {
    padding: '10px 20px',
    borderRadius: '10px',
    border: '1.5px solid #d1d5db',
    background: '#fff',
    color: '#374151',
    fontWeight: 600,
    fontSize: '0.88rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  btnSubmit: (disabled) => ({
    padding: '10px 22px',
    borderRadius: '10px',
    border: 'none',
    background: disabled ? '#94a3b8' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.88rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : '0 2px 6px rgba(79, 70, 229, 0.28)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s ease',
  }),
};

function getDayKeys(day) {
  if (!day) return [];
  const d = String(day).trim().toLowerCase();
  const map = {
    mon: ['monday', 'mon', 'pazartesi', 'pzt'],
    monday: ['monday', 'mon', 'pazartesi', 'pzt'],
    pazartesi: ['monday', 'mon', 'pazartesi', 'pzt'],
    pzt: ['monday', 'mon', 'pazartesi', 'pzt'],

    tue: ['tuesday', 'tue', 'salı', 'sali', 'sal'],
    tuesday: ['tuesday', 'tue', 'salı', 'sali', 'sal'],
    salı: ['tuesday', 'tue', 'salı', 'sali', 'sal'],
    sali: ['tuesday', 'tue', 'salı', 'sali', 'sal'],
    sal: ['tuesday', 'tue', 'salı', 'sali', 'sal'],

    wed: ['wednesday', 'wed', 'çarşamba', 'carsamba', 'çar', 'car'],
    wednesday: ['wednesday', 'wed', 'çarşamba', 'carsamba', 'çar', 'car'],
    çarşamba: ['wednesday', 'wed', 'çarşamba', 'carsamba', 'çar', 'car'],
    carsamba: ['wednesday', 'wed', 'çarşamba', 'carsamba', 'çar', 'car'],
    çar: ['wednesday', 'wed', 'çarşamba', 'carsamba', 'çar', 'car'],

    thu: ['thursday', 'thu', 'perşembe', 'persembe', 'per'],
    thursday: ['thursday', 'thu', 'perşembe', 'persembe', 'per'],
    perşembe: ['thursday', 'thu', 'perşembe', 'persembe', 'per'],
    persembe: ['thursday', 'thu', 'perşembe', 'persembe', 'per'],
    per: ['thursday', 'thu', 'perşembe', 'persembe', 'per'],

    fri: ['friday', 'fri', 'cuma', 'cum'],
    friday: ['friday', 'fri', 'cuma', 'cum'],
    cuma: ['friday', 'fri', 'cuma', 'cum'],
    cum: ['friday', 'fri', 'cuma', 'cum'],
  };
  return map[d] || [d, String(day)];
}

export default function CommonLessonModal({
  isOpen,
  onClose,
  onSubmit,
  currentTeacherName = '',
  classInfo = null,
  day = '',
  period = null,
  teachers = [],
  teacherSchedules = {},
  classLocations = {},
  absentPeople = [],
}) {
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [showManualSelect, setShowManualSelect] = useState(false);
  const [error, setError] = useState('');

  // 1. Detect candidate co-teachers from schedule
  const detectedCandidates = useMemo(() => {
    const candidates = new Set();
    const className = classInfo?.className || '';
    const classId = classInfo?.classId || '';
    if (!className && !classId) return [];
    if (isPboLesson(className)) return [];

    const normTarget = normalizeClassName(className);
    const absentTeacherNames = new Set(
      (absentPeople || []).map((a) => normalizeForComparison(a.name || ''))
    );
    const dayKeys = getDayKeys(day);

    // From classLocations
    if (classLocations) {
      let locEntry = null;
      const dayKeySet = new Set(dayKeys.map((k) => String(k).toLowerCase()));
      for (const [locClassKey, daysMap] of Object.entries(classLocations)) {
        if (!daysMap || typeof daysMap !== 'object') continue;
        const normLocClass = normalizeClassName(locClassKey);
        if (normLocClass === normTarget || locClassKey === className || locClassKey === classId) {
          for (const [dKey, pMap] of Object.entries(daysMap)) {
            if (!pMap || typeof pMap !== 'object') continue;
            if (dayKeySet.has(String(dKey).toLowerCase())) {
              const entry = pMap[period] || pMap[Number(period)] || pMap[String(period)];
              if (entry) {
                locEntry = entry;
                break;
              }
            }
          }
          if (locEntry) break;
        }
      }

      if (locEntry) {
        if (Array.isArray(locEntry.teachers)) {
          locEntry.teachers.forEach((tName) => {
            if (tName && typeof tName === 'string') {
              const trimmed = tName.trim();
              if (trimmed && !absentTeacherNames.has(normalizeForComparison(trimmed))) {
                candidates.add(trimmed);
              }
            }
          });
        }
        if (locEntry.teacherNamesStr && typeof locEntry.teacherNamesStr === 'string') {
          const parts = locEntry.teacherNamesStr.split(/[\/\-,\\\s]+/).map((s) => s.trim()).filter(Boolean);
          parts.forEach((part) => {
            const partNorm = normalizeForComparison(part);
            const matchedTeacher = (teachers || []).find((t) => {
              const tNameNorm = normalizeForComparison(t.teacherName || t.name || '');
              return tNameNorm.includes(partNorm) || partNorm.includes(tNameNorm);
            });
            if (matchedTeacher) {
              const name = matchedTeacher.teacherName || matchedTeacher.name;
              if (name && !absentTeacherNames.has(normalizeForComparison(name))) {
                candidates.add(name);
              }
            }
          });
        }
      }
    }

    // From teacherSchedules
    if (teacherSchedules && normTarget) {
      const dayKeySet = new Set(dayKeys.map((k) => String(k).toLowerCase()));
      Object.entries(teacherSchedules).forEach(([tKey, tDays]) => {
        if (!tDays || typeof tDays !== 'object') return;
        let daySched = null;
        for (const [dKey, val] of Object.entries(tDays)) {
          if (dayKeySet.has(String(dKey).toLowerCase())) {
            daySched = val;
            break;
          }
        }
        if (!daySched || typeof daySched !== 'object') return;
        const lessonRaw = daySched[period] || daySched[Number(period)] || daySched[String(period)];
        if (!lessonRaw || typeof lessonRaw !== 'string') return;
        if (isPboLesson(lessonRaw)) return;

        const classParts = lessonRaw.split(',').map((s) => normalizeClassName(s.trim()));
        if (classParts.includes(normTarget)) {
          const teacherObj = (teachers || []).find(
            (t) =>
              t.teacherId === tKey ||
              normalizeForComparison(t.teacherName || t.name || '') === normalizeForComparison(tKey)
          );
          const resolvedName = teacherObj ? (teacherObj.teacherName || teacherObj.name) : tKey;
          if (resolvedName && !absentTeacherNames.has(normalizeForComparison(resolvedName))) {
            candidates.add(resolvedName.trim());
          }
        }
      });
    }

    return Array.from(candidates);
  }, [classInfo, day, period, classLocations, teacherSchedules, absentPeople, teachers]);

  const prevIsOpenRef = useRef(false);

  // Synchronize initial selection when modal opens
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setError('');
      setShowManualSelect(false);
      if (currentTeacherName) {
        setSelectedTeacher(currentTeacherName);
      } else if (detectedCandidates.length > 0) {
        setSelectedTeacher(detectedCandidates[0]);
      } else {
        setSelectedTeacher('');
      }
    } else if (!isOpen) {
      setSelectedTeacher('');
      setError('');
      setShowManualSelect(false);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, currentTeacherName, detectedCandidates]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalTeacher = selectedTeacher.trim();
    if (!finalTeacher) {
      setError('Lütfen birleştirilecek öğretmeni seçin.');
      return;
    }
    onSubmit(finalTeacher);
    setError('');
  };

  const handleClose = () => {
    setError('');
    setSelectedTeacher('');
    setShowManualSelect(false);
    onClose();
  };

  const dayLabel = DAY_LABELS[day] || day || 'Seçilen Gün';
  const isDetected = detectedCandidates.length > 0;
  const detectedName = detectedCandidates[0] || '';

  // Sort available teachers for dropdown
  const sortedTeachers = useMemo(() => {
    return [...(teachers || [])]
      .map((t) => t.teacherName || t.name || '')
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'tr'));
  }, [teachers]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Ders / Grup Birleştirme" size="small">
      <form onSubmit={handleSubmit} style={S.container}>
        {/* Context Banner */}
        <div style={S.contextBanner}>
          <div style={S.iconBox}>📚</div>
          <div>
            <div style={S.classTitle}>{classInfo?.className || 'Sınıf'}</div>
            <div style={S.slotSubtitle}>
              {dayLabel} {period ? `• ${period}. Saat` : ''}
            </div>
          </div>
        </div>

        {/* Teacher Selection or Fixed Co-Teacher Display */}
        {isPboLesson(classInfo?.className) ? (
          <div style={{
            padding: '12px 14px',
            background: '#fffbeb',
            border: '1.5px solid #fde68a',
            borderRadius: '10px',
            color: '#92400e',
            fontSize: '0.84rem',
            lineHeight: 1.45,
            marginBottom: '12px'
          }}>
            ⚠️ <strong>İstisnai Durum:</strong> PBO (Planlama Bakım Onarım) dersi her öğretmenin kendine ait bireysel bir derstir. Ortak ders birleştirmesi yapılamaz.
          </div>
        ) : isDetected && !showManualSelect ? (
          <div style={S.detectedCard}>
            <div style={S.detectedBadge}>
              <span>✓</span>
              <span>DİĞER GRUBUN ÖĞRETMENİ (SABİT DERS)</span>
            </div>
            <div style={S.detectedTeacherName}>
              <span>👨‍🏫</span>
              <span>{selectedTeacher || detectedName}</span>
            </div>
            <div style={S.detectedDesc}>
              Bu ders saatinde diğer grubu okutan öğretmen programdan tespit edildi. İki grup tek öğretmenle derse devam edecektir.
            </div>
            <button
              type="button"
              style={S.changeLink}
              onClick={() => setShowManualSelect(true)}
            >
              Farklı bir öğretmen seçmek istiyorum
            </button>
          </div>
        ) : (
          <div style={S.formGroup}>
            <label htmlFor="commonTeacherSelect" style={S.label}>
              Dersi Birleştirecek Öğretmen <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              id="commonTeacherSelect"
              value={selectedTeacher}
              onChange={(e) => {
                setSelectedTeacher(e.target.value);
                if (error) setError('');
              }}
              style={S.select(!!error)}
              autoFocus
            >
              <option value="">— Öğretmen Seçin —</option>
              {detectedCandidates.length > 0 && (
                <optgroup label="Ders Programından Tespit Edilenler">
                  {detectedCandidates.map((cand) => (
                    <option key={`cand-${cand}`} value={cand}>
                      ⭐ {cand} (Diğer Grup Öğretmeni)
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Tüm Öğretmenler">
                {sortedTeachers.map((tName) => (
                  <option key={`all-${tName}`} value={tName}>
                    {tName}
                  </option>
                ))}
              </optgroup>
            </select>
            {isDetected && showManualSelect && (
              <button
                type="button"
                style={S.changeLink}
                onClick={() => {
                  setSelectedTeacher(detectedName);
                  setShowManualSelect(false);
                }}
              >
                ← Otomatik tespit edilen öğretmene dön ({detectedName})
              </button>
            )}
          </div>
        )}

        {error && <div style={S.errorMessage}>{error}</div>}

        {/* Explanation Note */}
        <div style={S.infoNote}>
          ℹ️ Ders birleştirildiğinde bu sınıf için nöbetçi öğretmen görevlendirilmez, gruplar ortak derste birleştirilir.
        </div>

        {/* Action Buttons */}
        <div style={S.actions}>
          <button type="button" onClick={handleClose} style={S.btnCancel}>
            İptal
          </button>
          <button
            type="submit"
            disabled={!selectedTeacher.trim() || isPboLesson(classInfo?.className)}
            style={S.btnSubmit(!selectedTeacher.trim() || isPboLesson(classInfo?.className))}
          >
            <span>✓</span>
            <span>Grubu Birleştir</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
