// @ts-nocheck
import React, { useMemo } from 'react';
import { MANUAL_ADMIN_TEACHER_ID, MANUAL_EMPTY_TEACHER_ID } from '../utils/assignDuty.js';
import { decodeClassAbsenceValue } from '../utils/classAbsence.js';
import { normalizeClassName, compareClassNames, getClassroomName } from '../utils/classNameUtils.js';

const TR_DAYS = { Mon: 'Pazartesi', Tue: 'Salı', Wed: 'Çarşamba', Thu: 'Perşembe', Fri: 'Cuma' };
const REASON_LABELS = {
  raporlu: 'Raporlu',
  sevkli: 'Sevkli',
  izinli: 'İzinli',
  'gorevli-izinli': 'Görevli İzinli',
  'mazeret-izinli': 'Mazeret İzinli',
  diger: 'Diğer'
};

export default function PrintableAssignmentList({
  day,
  periods = [],
  classes = [],
  teachers = [],
  assignment = {},
  locked = {},
  displayDate = '',
  absentPeople = [],
  classAbsence = {},
  commonLessons = {},
  classLocations = {},
  locationZoneMapping = {},
  teacherSchedules = {},
  notes = '',
  notesEnabled = true,
  onNotesChange,
  onNotesEnabledChange,
}) {
  const classNameById = useMemo(
    () => Object.fromEntries((classes || []).map((c) => [c.classId, c.className])),
    [classes]
  );

  const teacherById = useMemo(
    () => Object.fromEntries((teachers || []).map((t) => [t.teacherId, t])),
    [teachers]
  );

  const absentInfoById = useMemo(() => {
    const map = {};
    (absentPeople || []).forEach((a) => {
      if (!a?.absentId) return;
      if (Array.isArray(a.days) && a.days.length > 0 && !a.days.includes(day)) return;
      map[a.absentId] = { name: a.name, reason: a.reason };
    });
    return map;
  }, [absentPeople, day]);

  const normalizeTeacherKey = (value = '') =>
    String(value || '').trim().toLocaleUpperCase('tr-TR');

  // Helper to extract classroom and subject from classLocations / teacherSchedules
  const resolveClassroomAndSubject = (classId, className, period, absentTeacherName) => {
    const sysDayMap = {
      Sun: 'sunday', Mon: 'monday', Tue: 'tuesday', Wed: 'wednesday', Thu: 'thursday', Fri: 'friday', Sat: 'saturday',
      Pzt: 'monday', Sal: 'tuesday', Çar: 'wednesday', Per: 'thursday', Cum: 'friday',
      Pazartesi: 'monday', Salı: 'tuesday', Çarşamba: 'wednesday', Perşembe: 'thursday', Cuma: 'friday'
    };
    const sysDay = sysDayMap[day] || day?.toLowerCase?.() || day;

    const candidates = [
      className,
      classId,
      normalizeClassName(className),
      normalizeClassName(classId)
    ].filter(Boolean);

    let cLocObj = null;
    for (const c of candidates) {
      if (classLocations?.[c]?.[sysDay]?.[period]) {
        cLocObj = classLocations[c][sysDay][period];
        break;
      }
      if (classLocations?.[c]?.[day]?.[period]) {
        cLocObj = classLocations[c][day][period];
        break;
      }
    }

    let location = '';
    let subject = '';

    if (cLocObj) {
      if (typeof cLocObj === 'string') {
        location = cLocObj;
      } else if (typeof cLocObj === 'object') {
        location = cLocObj.location || '';
        subject = cLocObj.subject || '';
      }
    }

    if (!location) {
      location =
        getClassroomName(classLocations, className, day) ||
        getClassroomName(classLocations, classId, day) ||
        '';
    }

    // Fallback: check absent teacher's schedule for subject if not found
    if (!subject && absentTeacherName && teacherSchedules) {
      const tKey = Object.keys(teacherSchedules).find(
        (k) => normalizeTeacherKey(k) === normalizeTeacherKey(absentTeacherName)
      );
      if (tKey && teacherSchedules[tKey]) {
        const pSched =
          teacherSchedules[tKey]?.[sysDay]?.[period] ||
          teacherSchedules[tKey]?.[day]?.[period];
        if (pSched) {
          subject = String(pSched).trim();
        }
      }
    }

    return {
      location: location || '-',
      subject: subject || '-'
    };
  };

  // Build rows for the list view
  const listRows = useMemo(() => {
    const rows = [];

    (periods || []).forEach((p) => {
      // 1. Nöbetçi öğretmen atamaları
      const assignmentsForPeriod = assignment?.[day]?.[p] || [];
      assignmentsForPeriod.forEach((a) => {
        const classId = a.classId;
        const teacherId = a.teacherId;
        if (!teacherId || teacherId === MANUAL_EMPTY_TEACHER_ID) return;

        const clsName = classNameById[classId] || classId;
        const dutyTeacher = teacherById[teacherId]?.teacherName || teacherId;
        if (!dutyTeacher || dutyTeacher === 'Atanmadı' || dutyTeacher === 'Boş Bırakıldı') return;

        const rawAbsValue = classAbsence?.[day]?.[p]?.[classId];
        const { absentId } = decodeClassAbsenceValue(rawAbsValue);
        const absRecord = absentId ? absentInfoById[absentId] : null;

        const { location, subject } = resolveClassroomAndSubject(
          classId,
          clsName,
          p,
          absRecord?.name
        );

        rows.push({
          key: `${p}-${classId}-duty`,
          period: p,
          classId,
          className: clsName,
          classroom: location,
          subject,
          absentTeacherName: absRecord?.name || 'Mazeretli Öğretmen',
          absentReason: absRecord?.reason
            ? REASON_LABELS[absRecord.reason] || absRecord.reason
            : '',
          dutyTeacherName: dutyTeacher,
          statusType: 'duty'
        });
      });

      // 2. Grup Birleştirilen sınıflar (Common Lessons)
      const commonLessonsForPeriod = commonLessons?.[day]?.[p] || {};
      Object.entries(commonLessonsForPeriod).forEach(([classId, teacherVal]) => {
        if (assignmentsForPeriod.some((a) => a.classId === classId)) return;
        if (!teacherVal || teacherVal === MANUAL_EMPTY_TEACHER_ID) return;

        const clsName = classNameById[classId] || classId;
        const mergeTeacher = teacherById[teacherVal]?.teacherName || teacherVal;

        const rawAbsValue = classAbsence?.[day]?.[p]?.[classId];
        const { absentId, commonLessonOwnerId } = decodeClassAbsenceValue(rawAbsValue);
        const absRecord =
          (absentId ? absentInfoById[absentId] : null) ||
          (commonLessonOwnerId ? absentInfoById[commonLessonOwnerId] : null);

        const { location, subject } = resolveClassroomAndSubject(
          classId,
          clsName,
          p,
          absRecord?.name
        );

        rows.push({
          key: `${p}-${classId}-common`,
          period: p,
          classId,
          className: clsName,
          classroom: location,
          subject,
          absentTeacherName: absRecord?.name || 'Mazeretli Öğretmen',
          absentReason: absRecord?.reason
            ? REASON_LABELS[absRecord.reason] || absRecord.reason
            : '',
          dutyTeacherName: mergeTeacher
            ? `Grup Birleştirilecek (${mergeTeacher})`
            : 'Grup Birleştirilecek',
          statusType: 'common'
        });
      });

      // 3. İdare Kontrolü veya Manuel Kilitlenenler (Locked)
      Object.entries(locked || {}).forEach(([key, lockTeacherId]) => {
        const [lDay, lPeriod, lClassId] = key.split('|');
        if (lDay !== day || Number(lPeriod) !== Number(p)) return;
        if (assignmentsForPeriod.some((a) => a.classId === lClassId)) return;
        if (commonLessonsForPeriod[lClassId]) return;

        // Boş bırakılan dersler listede kesinlikle görüntülenmez
        if (!lockTeacherId || lockTeacherId === MANUAL_EMPTY_TEACHER_ID) return;

        const clsName = classNameById[lClassId] || lClassId;
        const rawAbsValue = classAbsence?.[day]?.[p]?.[lClassId];
        const { absentId } = decodeClassAbsenceValue(rawAbsValue);
        const absRecord = absentId ? absentInfoById[absentId] : null;

        const { location, subject } = resolveClassroomAndSubject(
          lClassId,
          clsName,
          p,
          absRecord?.name
        );

        let dutyLabel = '';
        let statusType = 'duty';
        if (lockTeacherId === MANUAL_ADMIN_TEACHER_ID) {
          dutyLabel = 'İdare Kontrolü';
          statusType = 'admin';
        } else if (teacherById[lockTeacherId]) {
          dutyLabel = teacherById[lockTeacherId].teacherName;
          statusType = 'duty';
        } else {
          return;
        }

        rows.push({
          key: `${p}-${lClassId}-locked`,
          period: p,
          classId: lClassId,
          className: clsName,
          classroom: location,
          subject,
          absentTeacherName: absRecord?.name || 'Mazeretli Öğretmen',
          absentReason: absRecord?.reason
            ? REASON_LABELS[absRecord.reason] || absRecord.reason
            : '',
          dutyTeacherName: dutyLabel,
          statusType
        });
      });
    });

    // Boş bırakılan veya geçerli öğretmeni/görevi olmayan kayıtları kesin olarak filtrele
    const validRows = rows.filter((r) => {
      if (r.statusType === 'empty') return false;
      if (!r.dutyTeacherName || r.dutyTeacherName === 'Boş Bırakıldı' || r.dutyTeacherName === 'Atanmadı') return false;
      return true;
    });

    // Sıralama: Önce ders saatine, sonra sınıf adına göre
    validRows.sort((a, b) => {
      if (a.period !== b.period) return a.period - b.period;
      return compareClassNames(a.className, b.className);
    });

    return validRows;
  }, [day, periods, assignment, commonLessons, locked, classAbsence, classNameById, teacherById, absentInfoById, classLocations, teacherSchedules]);

  return (
    <div className="print-wrap">
      <h2 className="print-title">
        Tarih: {displayDate} ({TR_DAYS[day] || day}) Nöbetçi Öğretmen Boş Ders Görevlendirme Listesi
      </h2>

      <div className="assign-list-table-wrap">
        <table className="assign-list-table">
          <thead>
            <tr>
              <th style={{ width: '75px' }}>Ders Saati</th>
              <th style={{ width: '22%' }}>İzinli / Mazeretli Öğretmen</th>
              <th style={{ width: '13%' }}>Sınıfı</th>
              <th style={{ width: '14%' }}>Derslik No</th>
              <th style={{ width: '18%' }}>Ders İsmi</th>
              <th style={{ width: '22%' }}>Görevlendirilen Öğretmen</th>
              <th style={{ width: '11%' }}>İmza</th>
            </tr>
          </thead>
          <tbody>
            {listRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted p-4">
                  Bu günde görevlendirme veya mazeretli öğretmen kaydı bulunmuyor.
                </td>
              </tr>
            ) : (
              listRows.map((row, idx) => (
                <tr key={row.key || idx}>
                  <td className="text-center font-bold">
                    <span className="period-badge">{row.period}. Saat</span>
                  </td>
                  <td className="text-left">
                    <div className="font-semibold text-dark">{row.absentTeacherName}</div>
                    {row.absentReason && (
                      <div className="absent-reason-text">({row.absentReason})</div>
                    )}
                  </td>
                  <td className="text-center font-bold">
                    <span className="class-name-badge">{row.className}</span>
                  </td>
                  <td className="text-center">
                    <span className="classroom-badge">
                      {row.classroom !== '-' ? `📍 ${row.classroom}` : '-'}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className="subject-text">{row.subject}</span>
                  </td>
                  <td className="text-left font-semibold">
                    {row.statusType === 'common' ? (
                      <span className="common-merge-text">{row.dutyTeacherName}</span>
                    ) : row.statusType === 'admin' ? (
                      <span className="admin-duty-text">🛡️ {row.dutyTeacherName}</span>
                    ) : (
                      <span className="duty-teacher-text">{row.dutyTeacherName}</span>
                    )}
                  </td>
                  <td className="signature-cell">
                    <div className="signature-line" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ---------------- Çizelge Açıklamalar Bölümü ---------------- */}
      {notesEnabled && notes && notes.trim() && (
        <div className="print-notes-card">
          <div className="print-notes-title-print">AÇIKLAMALAR:</div>
          <div className="print-notes-content-print">
            {notes}
          </div>
        </div>
      )}

      {/* MEB Resmi Onay ve İmza Blokları */}
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
      </div>

      <style>{`
        .print-wrap { width: 100%; }
        .print-title { 
          text-align: center; 
          font-weight: 700; 
          margin: 0 0 16px 0;
          font-size: 1.1rem;
          color: var(--text-primary, #0f172a);
        }

        .assign-list-table-wrap {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border: 1px solid var(--border-subtle, #e2e8f0);
          border-radius: var(--radius-lg, 12px);
          background: var(--bg-elevated, #ffffff);
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
        }

        .assign-list-table {
          width: 100%;
          border-collapse: collapse;
          border-spacing: 0;
          font-size: 0.88rem;
          line-height: 1.35;
        }

        .assign-list-table thead th {
          background: var(--surface-2, #f8fafc);
          color: var(--text-primary, #0f172a);
          font-weight: 700;
          padding: 10px 12px;
          border-bottom: 2px solid var(--border-default, #cbd5e1);
          text-align: center;
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .assign-list-table tbody td {
          padding: 9px 12px;
          border-bottom: 1px solid var(--border-subtle, #f1f5f9);
          vertical-align: middle;
        }

        .assign-list-table tbody tr:hover {
          background: #f8fafc;
        }

        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .font-bold { font-weight: 700; }
        .font-semibold { font-weight: 600; }
        .text-dark { color: #0f172a; }

        .period-badge {
          display: inline-block;
          padding: 3px 8px;
          background: #e0e7ff;
          color: #3730a3;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.82rem;
        }

        .class-name-badge {
          display: inline-block;
          font-weight: 700;
          color: #0f172a;
          font-size: 0.88rem;
        }

        .classroom-badge {
          display: inline-block;
          padding: 2px 8px;
          background: #f1f5f9;
          color: #334155;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.82rem;
        }

        .subject-text {
          font-size: 0.84rem;
          color: #475569;
          font-weight: 500;
        }

        .absent-reason-text {
          font-size: 0.74rem;
          color: #64748b;
          font-weight: 500;
          margin-top: 1px;
        }

        .duty-teacher-text {
          color: #166534;
          font-weight: 700;
        }

        .common-merge-text {
          color: #4338ca;
          font-weight: 600;
        }

        .admin-duty-text {
          color: #b45309;
          font-weight: 600;
        }

        .signature-cell {
          text-align: center;
          padding: 4px 8px !important;
        }

        .signature-line {
          height: 24px;
          border-bottom: 1px dashed #cbd5e1;
          width: 80%;
          margin: 0 auto;
        }

        /* Ekran Görünümü için Açıklamalar Kartı */
        .print-notes-card {
          margin-top: 18px;
          padding: 14px 18px;
          background: var(--bg-elevated, #fff);
          border: 1px solid var(--border-subtle, #e2e8f0);
          border-radius: var(--radius-lg, 12px);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        .print-notes-title-print {
          font-weight: 700;
          font-size: 0.84rem;
          color: var(--text-primary, #0f172a);
          margin-bottom: 4px;
          text-transform: uppercase;
        }

        .print-notes-content-print {
          font-size: 0.82rem;
          line-height: 1.5;
          color: var(--text-muted, #475569);
          white-space: pre-wrap;
        }

        /* Ekran Görünümü için İmza Blokları */
        .official-signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 24px;
          padding: 16px 24px;
          background: var(--bg-elevated, #fff);
          border: 1px solid var(--border-subtle, #e2e8f0);
          border-radius: var(--radius-lg, 12px);
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
          color: var(--text-primary, #0f172a);
        }

        .sig-subrole {
          font-size: 0.85rem;
          color: var(--text-muted, #64748b);
        }

        .sig-space {
          height: 48px;
        }

        .sig-name {
          font-size: 0.85rem;
          color: var(--text-muted, #64748b);
          border-top: 1px dashed var(--border-default, #cbd5e1);
          padding-top: 6px;
          width: 100%;
        }

        /* --- YAZDIRMA (PRINT) --- */
        @media print {
          @page { size: A4 landscape; margin: 5mm; }

          .print-title {
            margin-bottom: 3.5mm !important;
            font-size: 11pt !important;
            color: #000 !important;
          }

          .assign-list-table-wrap {
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }

          .assign-list-table {
            border-collapse: collapse !important;
            width: 100% !important;
            font-size: 8.5pt !important;
            line-height: 1.15 !important;
          }

          .assign-list-table thead th,
          .assign-list-table tbody td {
            border: 0.8pt solid #000 !important;
            background: #fff !important;
            color: #000 !important;
            padding: 1.8mm 2.5mm !important;
            display: table-cell !important;
          }

          .assign-list-table thead th {
            background: #f1f5f9 !important;
            font-weight: bold !important;
            color: #000 !important;
          }

          .period-badge,
          .class-name-badge,
          .classroom-badge {
            background: transparent !important;
            color: #000 !important;
            border: none !important;
            padding: 0 !important;
          }

          .duty-teacher-text,
          .common-merge-text,
          .admin-duty-text {
            color: #000 !important;
            font-weight: bold !important;
          }

          .signature-line {
            border-bottom: 0.8pt solid #000 !important;
            height: 6mm !important;
            width: 90% !important;
          }

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

          .print-notes-title-print {
            display: block !important;
            font-weight: bold !important;
            font-size: 8.5pt !important;
            color: #000 !important;
            margin-bottom: 1.5mm !important;
            text-transform: uppercase !important;
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

          .official-signatures {
            display: flex !important;
            justify-content: space-between !important;
            margin-top: 7mm !important;
            padding: 0 15mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: none !important;
            background: transparent !important;
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
