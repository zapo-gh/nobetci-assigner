// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { MANUAL_ADMIN_TEACHER_ID, MANUAL_EMPTY_TEACHER_ID } from '../utils/assignDuty.js';
import { decodeClassAbsenceValue, COMMON_LESSON_LABEL, resolveAllAbsentTeachers, resolveCommonLessonOwners, cleanSubjectName, isAbsentOnDay } from '../utils/classAbsence.js';
import { normalizeClassName, compareClassNames, getClassroomName } from '../utils/classNameUtils.js';
import { getPeriodTimes } from '../utils/periodTimes.js';
import PrintNotesCard from './PrintNotesCard';
import OfficialSignatures from './OfficialSignatures';
import EmptyState from './EmptyState';

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
  showMergedLessons = true,
  classLocations = {},
  locationZoneMapping = {},
  teacherSchedules = {},
  notes = '',
  notesEnabled = true,
  onNotesChange,
  onNotesEnabledChange,
  IconComponent,
  defaultOrientation = 'portrait',
}) {
  const periodTimes = useMemo(() => getPeriodTimes(), []);
  const [pageOrientation, setPageOrientation] = useState(defaultOrientation);

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
      if (!isAbsentOnDay(a, day)) return;
      map[a.absentId] = { name: a.name, reason: a.reason };
    });
    return map;
  }, [absentPeople, day]);

  const formatAbsentReasons = (records, single) => {
    if (records.length > 1) {
      return records
        .map((r) => `${r.name}: ${REASON_LABELS[r.reason] || r.reason}`)
        .join('\n');
    }
    return single?.reason ? REASON_LABELS[single.reason] || single.reason : '';
  };

  const normalizeTeacherKey = (value = '') =>
    String(value || '').trim().toLocaleUpperCase('tr-TR');

  const sysDayMap = {
    Sun: 'sunday', Mon: 'monday', Tue: 'tuesday', Wed: 'wednesday', Thu: 'thursday', Fri: 'friday', Sat: 'saturday',
    Pzt: 'monday', Sal: 'tuesday', Çar: 'wednesday', Per: 'thursday', Cum: 'friday',
    Pazartesi: 'monday', Salı: 'tuesday', Çarşamba: 'wednesday', Perşembe: 'thursday', Cuma: 'friday'
  };
  const sysDay = sysDayMap[day] || day?.toLowerCase?.() || day;

  // Helper to extract classroom and subject from classLocations / teacherSchedules
  const resolveClassroomAndSubject = (classId, className, period, absentTeacherName) => {

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

    if (!location || location === '-' || location === '---') {
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

    const cleanedSubj = cleanSubjectName(subject, className);
    const cleanedLocation = (location && location !== '-' && location !== '---') ? String(location).trim() : '-';
    return {
      location: cleanedLocation,
      subject: cleanedSubj || '-'
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
        const absRecords = resolveAllAbsentTeachers({
          day,
          period: p,
          classId,
          className: clsName,
          rawAbsValue,
          absentPeople,
          teacherSchedules,
          absentInfoById,
        });
        const absRecord = absRecords[0] || null;

        const { location, subject } = resolveClassroomAndSubject(
          classId,
          clsName,
          p,
          absRecord?.name
        );

        const absentTeacherName = absRecords.length > 1
          ? absRecords.map((r) => r.name).join(', ')
          : absRecord?.name || 'Mazeretli Öğretmen';

        const absentReason = formatAbsentReasons(absRecords, absRecord);

        rows.push({
          key: `${p}-${classId}-duty`,
          period: p,
          classId,
          className: clsName,
          classroom: location,
          subject,
          absentTeacherName,
          absentReason,
          dutyTeacherName: dutyTeacher,
          statusType: 'duty'
        });
      });

      const commonLessonsForPeriod = commonLessons?.[day]?.[p] || {};

      // 2. Grup Birleştirilen sınıflar (Common Lessons)
      if (showMergedLessons) {
        Object.entries(commonLessonsForPeriod).forEach(([classId, teacherVal]) => {
          if (assignmentsForPeriod.some((a) => a.classId === classId)) return;
          if (!teacherVal || teacherVal === MANUAL_EMPTY_TEACHER_ID) return;

          const rawAbsValue = classAbsence?.[day]?.[p]?.[classId];
          const { absentId } = decodeClassAbsenceValue(rawAbsValue || '');
          // Ortak ders sahipleri virgülle ayrılmış birden çok kimlik içerebilir
          const owners = resolveCommonLessonOwners(rawAbsValue, absentInfoById);
          const ownerRecords = owners.records;
          const commonLessonOwnerId = owners.hasOwner;
          const absRecord =
            (absentId && absentId !== COMMON_LESSON_LABEL ? absentInfoById[absentId] : null) ||
            ownerRecords[0] ||
            null;

          // Ortak ders belirli mazeretlilere bağlıysa ve hiçbiri bugün izinli değilse listeye ekleme
          if (commonLessonOwnerId && ownerRecords.length === 0) return;

          const clsName = classNameById[classId] || classId;
          const mergeTeacher = teacherById[teacherVal]?.teacherName || teacherVal;

          // Derse ortak giren öğretmen de bugün izinliyse, gruplar birleştirilemez
          const isMergeTeacherAbsent = Boolean(
            absentInfoById[teacherVal] ||
            (absentPeople || []).some((a) => {
              if (!a) return false;
              if (!isAbsentOnDay(a, day)) return false;
              const aNorm = String(a.name || a.teacherName || '').trim().toLocaleLowerCase('tr-TR');
              const mNorm = String(mergeTeacher || '').trim().toLocaleLowerCase('tr-TR');
              return aNorm && mNorm && aNorm === mNorm;
            })
          );
          if (isMergeTeacherAbsent) return;

          let absentTeacherName = ownerRecords.length > 1
            ? ownerRecords.map((r) => r.name).join(', ')
            : absRecord?.name || '';
          let absentReason = ownerRecords.length > 1
            ? formatAbsentReasons(ownerRecords, null)
            : absRecord?.reason
              ? REASON_LABELS[absRecord.reason] || absRecord.reason
              : '';

          // Kayıtlı sahip bulunamadıysa ders programından bu sınıfa o saatte giren mazeretli öğretmenleri çöz
          if (!absentTeacherName) {
            const scheduled = resolveAllAbsentTeachers({
              day,
              period: p,
              classId,
              className: clsName,
              rawAbsValue,
              absentPeople,
              teacherSchedules,
              absentInfoById,
            });
            if (scheduled.length > 0) {
              absentTeacherName = scheduled.map((r) => r.name).join(', ');
              absentReason = formatAbsentReasons(scheduled, scheduled[0]);
            }
          }

          const { location, subject } = resolveClassroomAndSubject(
            classId,
            clsName,
            p,
            absentTeacherName || mergeTeacher
          );

          rows.push({
            key: `${p}-${classId}-common`,
            period: p,
            classId,
            className: clsName,
            classroom: location,
            subject,
            absentTeacherName: absentTeacherName || '—',
            absentReason,
            dutyTeacherName: mergeTeacher
              ? `Grup Birleştirilecek (${mergeTeacher})`
              : 'Grup Birleştirilecek',
            statusType: 'common'
          });
        });
      }

      // 3. İdare Kontrolü (Locked with MANUAL_ADMIN_TEACHER_ID)
      Object.entries(locked || {}).forEach(([key, lockTeacherId]) => {
        const [lDay, lPeriod, lClassId] = key.split('|');
        if (lDay !== day || Number(lPeriod) !== Number(p)) return;
        if (assignmentsForPeriod.some((a) => a.classId === lClassId)) return;
        if (commonLessonsForPeriod[lClassId]) return;

        // Yalnızca İdare Kontrolü olan kayıtlar işlenir
        // (Normal nöbetçi öğretmen kilitleri zaten geçerli bir boş ders ise assignment içerisine dahil edilmiştir;
        // ders boş değilse veya eski/geçersiz kilit ise listeye hayalet görevlendirme olarak yansıtılmaz)
        if (lockTeacherId !== MANUAL_ADMIN_TEACHER_ID) return;

        const rawAbsValue = classAbsence?.[day]?.[p]?.[lClassId];
        if (!rawAbsValue) return;

        const { allowDuty } = decodeClassAbsenceValue(rawAbsValue);
        if (!allowDuty) return;

        const clsName = classNameById[lClassId] || lClassId;
        const absRecords = resolveAllAbsentTeachers({
          day,
          period: p,
          classId: lClassId,
          className: clsName,
          rawAbsValue,
          absentPeople,
          teacherSchedules,
          absentInfoById,
        });
        const absRecord = absRecords[0] || null;

        const { location, subject } = resolveClassroomAndSubject(
          lClassId,
          clsName,
          p,
          absRecord?.name
        );

        const absentTeacherName = absRecords.length > 1
          ? absRecords.map((r) => r.name).join(', ')
          : absRecord?.name || 'Mazeretli Öğretmen';

        const absentReason = formatAbsentReasons(absRecords, absRecord);

        rows.push({
          key: `${p}-${lClassId}-admin`,
          period: p,
          classId: lClassId,
          className: clsName,
          classroom: location,
          subject,
          absentTeacherName,
          absentReason,
          dutyTeacherName: 'İdare Kontrolü',
          statusType: 'admin'
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
  }, [day, periods, assignment, commonLessons, showMergedLessons, locked, classAbsence, classNameById, teacherById, absentInfoById, classLocations, teacherSchedules]);

  return (
    <div className={`print-wrap ${pageOrientation === 'landscape' ? 'orientation-landscape' : 'orientation-portrait'}`}>
      {/* ---------------- Sayfa Yönü Seçimi (Sadece Ekranda Görünür) ---------------- */}
      <div className="print-orientation-bar no-print">
        <span className="print-orientation-label">Sayfa Yönü:</span>
        <div className="print-orientation-toggle">
          <button
            type="button"
            className={`btn-orientation ${pageOrientation === 'portrait' ? 'active' : ''}`}
            onClick={() => setPageOrientation('portrait')}
            title="Dikey A4 Sayfa Düzeni (Önerilen)"
          >
            <span>📄</span> Dikey (A4)
          </button>
          <button
            type="button"
            className={`btn-orientation ${pageOrientation === 'landscape' ? 'active' : ''}`}
            onClick={() => setPageOrientation('landscape')}
            title="Yatay A4 Sayfa Düzeni"
          >
            <span>📑</span> Yatay (A4)
          </button>
        </div>
      </div>

      <h2 className="print-title">
        Tarih: {displayDate} ({TR_DAYS[day] || day}) Nöbetçi Öğretmen Boş Ders Görevlendirme Listesi
      </h2>

      <div className="assign-list-table-wrap">
        <table className="assign-list-table">
          <thead>
            <tr>
              <th className="col-period" style={{ width: '8.5%' }}>Ders Saati</th>
              <th className="col-absent" style={{ width: '20%' }}>İzinli / Mazeretli Öğretmen</th>
              <th className="col-class" style={{ width: '10.5%' }}>Sınıfı</th>
              <th className="col-room" style={{ width: '13.5%' }}>Derslik No</th>
              <th className="col-subject" style={{ width: '17.5%' }}>Ders İsmi</th>
              <th className="col-duty" style={{ width: '20%' }}>Görevlendirilen Öğretmen</th>
              <th className="col-sign" style={{ width: '10%' }}>İmza</th>
            </tr>
          </thead>
          <tbody>
            {listRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-table-cell">
                  <div className="table-empty-state-screen no-print">
                    <EmptyState
                      IconComponent={IconComponent}
                      icon="clipboard"
                      title="Bu günde görevlendirme veya mazeretli öğretmen kaydı bulunmuyor."
                      description="Seçili gün için atanmış nöbetçi öğretmen veya mazeretli öğretmen kaydı bulunmamaktadır."
                    />
                  </div>
                  <div className="table-empty-state-print print-only">
                    Bu günde görevlendirme veya mazeretli öğretmen kaydı bulunmuyor.
                  </div>
                </td>
              </tr>
            ) : (
              listRows.map((row, idx) => (
                <tr key={row.key || idx}>
                  <td className="text-center font-bold col-period">
                    <span className="period-badge">{row.period}. Saat</span>
                    {periodTimes[row.period] && (
                      <div className="period-time-sub">{periodTimes[row.period]}</div>
                    )}
                  </td>
                  <td className="text-left col-absent">
                    {row.absentReason && row.absentReason.includes('\n') ? (
                      row.absentReason.split('\n').map((line, i) => {
                        const sep = line.lastIndexOf(': ');
                        const name = sep > -1 ? line.slice(0, sep) : line;
                        const reason = sep > -1 ? line.slice(sep + 2) : '';
                        return (
                          <div key={i} style={i > 0 ? { marginTop: '4px' } : undefined}>
                            <div className="font-semibold text-dark">{name}</div>
                            {reason && <div className="absent-reason-text">({reason})</div>}
                          </div>
                        );
                      })
                    ) : (
                      <>
                        <div className="font-semibold text-dark">{row.absentTeacherName}</div>
                        {row.absentReason && (
                          <div className="absent-reason-text">({row.absentReason})</div>
                        )}
                      </>
                    )}
                  </td>
                  <td className="text-center font-bold col-class">
                    <span className="class-name-badge">{row.className}</span>
                  </td>
                  <td className="text-center col-room">
                    {row.classroom && row.classroom !== '-' ? (
                      <span className="classroom-badge">
                        <span className="room-pin">📍</span>
                        <span className="room-text">
                          {row.classroom.includes('/') ? (
                            row.classroom.split('/').map((part, pIdx, arr) => (
                              <React.Fragment key={pIdx}>
                                <span>{part.trim()}</span>
                                {pIdx < arr.length - 1 && (
                                  <>
                                    <span className="room-sep"> / </span>
                                    <wbr />
                                  </>
                                )}
                              </React.Fragment>
                            ))
                          ) : (
                            row.classroom
                          )}
                        </span>
                      </span>
                    ) : (
                      <span className="room-empty">-</span>
                    )}
                  </td>
                  <td className="text-center col-subject">
                    <span className="subject-text">{row.subject}</span>
                  </td>
                  <td className="text-left font-semibold col-duty">
                    {row.statusType === 'common' ? (
                      <span className="common-merge-text">{row.dutyTeacherName}</span>
                    ) : row.statusType === 'admin' ? (
                      <span className="admin-duty-text">🛡️ {row.dutyTeacherName}</span>
                    ) : (
                      <span className="duty-teacher-text">{row.dutyTeacherName}</span>
                    )}
                  </td>
                  <td className="signature-cell col-sign">
                    <div className="signature-line" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ---------------- Görev Listesi Açıklamalar Bölümü ---------------- */}
      <PrintNotesCard
        notes={notes}
        notesEnabled={notesEnabled}
        onNotesChange={onNotesChange}
        onNotesEnabledChange={onNotesEnabledChange}
        titlePrefix="Görev Listesi Açıklamaları"
      />

      {/* ---------------- MEB Resmi Onay ve İmza Blokları ---------------- */}
      <OfficialSignatures />

      <style>{`
        .print-wrap {
          width: 100%;
          margin-top: 16px;
          background: #ffffff;
          border: 1px solid var(--border-subtle, #e2e8f0);
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
          padding: 24px 28px;
          box-sizing: border-box;
          transition: max-width 0.2s ease;
        }

        .print-wrap.orientation-portrait {
          max-width: 920px;
          margin-left: auto;
          margin-right: auto;
        }

        .print-wrap.orientation-landscape {
          max-width: 100%;
        }

        .print-orientation-bar {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          margin-bottom: 14px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--border-subtle, #f1f5f9);
        }

        .print-orientation-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
        }

        .print-orientation-toggle {
          display: inline-flex;
          background: #f1f5f9;
          padding: 3px;
          border-radius: 8px;
          gap: 3px;
        }

        .btn-orientation {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: #64748b;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-orientation:hover {
          color: #0f172a;
        }

        .btn-orientation.active {
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        }

        .print-title { 
          text-align: center; 
          font-weight: 700; 
          margin: 0 0 18px 0;
          font-size: 1.15rem;
          color: var(--text-primary, #0f172a);
          letter-spacing: -0.2px;
        }

        .empty-table-cell {
          padding: 16px !important;
          text-align: center !important;
          background: #ffffff !important;
        }
        .table-empty-state-screen {
          display: block;
        }
        .table-empty-state-screen .empty-state {
          padding: 32px 16px !important;
          margin: 0 auto !important;
        }
        .table-empty-state-screen .empty-state-icon {
          width: 76px;
          height: 76px;
          margin: 0 auto 16px;
          display: grid;
          place-items: center;
        }
        .table-empty-state-screen .empty-state h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 6px 0;
        }
        .table-empty-state-screen .empty-state p {
          font-size: 0.88rem;
          color: #64748b;
          margin: 0 auto;
          max-width: 460px;
        }
        .table-empty-state-print {
          display: none;
        }

        .assign-list-table-wrap {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border: 1px solid var(--border-subtle, #e2e8f0);
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
        }

        .assign-list-table {
          width: 100%;
          border-collapse: collapse;
          border-spacing: 0;
          font-size: 0.88rem;
          line-height: 1.35;
        }

        .assign-list-table thead th {
          background: #f8fafc;
          color: #0f172a;
          font-weight: 700;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-bottom: 2px solid #cbd5e1;
          text-align: center;
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .assign-list-table tbody td {
          padding: 9px 12px;
          border: 1px solid #e2e8f0;
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

        .period-time-sub {
          font-size: 0.72rem;
          font-weight: 500;
          color: #64748b;
          margin-top: 2px;
          white-space: nowrap;
        }

        .class-name-badge {
          display: inline-block;
          font-weight: 700;
          color: #0f172a;
          font-size: 0.88rem;
        }

        .col-room {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .classroom-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 2px 6px;
          background: #f1f5f9;
          color: #334155;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.8rem;
          line-height: 1.25;
          white-space: normal;
          word-break: break-word;
          overflow-wrap: anywhere;
          max-width: 100%;
          box-sizing: border-box;
          text-align: center;
        }

        .classroom-badge .room-pin {
          flex-shrink: 0;
          font-size: 0.72rem;
          line-height: 1;
        }

        .classroom-badge .room-text {
          word-break: break-word;
          overflow-wrap: anywhere;
          white-space: normal;
          text-align: center;
        }

        .classroom-badge .room-sep {
          color: #94a3b8;
          font-weight: 400;
        }

        .room-empty {
          color: #94a3b8;
          font-weight: 500;
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

        @media (max-width: 900px) {
          .print-wrap { padding: 16px; }
        }

        /* --- YAZDIRMA (PRINT) --- */
        @media print {
          @page {
            size: ${pageOrientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
            margin: ${pageOrientation === 'landscape' ? '5mm' : '8mm 8mm 10mm 8mm'};
          }

          .print-orientation-bar {
            display: none !important;
          }

          .print-wrap {
            margin-top: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: none !important;
          }

          .print-title {
            margin-bottom: 3.5mm !important;
            font-size: 11pt !important;
            color: #000 !important;
            text-align: center !important;
          }

          .assign-list-table-wrap {
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }

          .assign-list-table {
            border-collapse: collapse !important;
            width: 100% !important;
            table-layout: fixed !important;
            font-size: ${pageOrientation === 'landscape' ? '8.5pt' : '8pt'} !important;
            line-height: 1.15 !important;
          }

          .assign-list-table thead th,
          .assign-list-table tbody td {
            border: 0.8pt solid #000 !important;
            background: #fff !important;
            color: #000 !important;
            padding: ${pageOrientation === 'landscape' ? '1.8mm 2.5mm' : '1.8mm 1.6mm'} !important;
            display: table-cell !important;
            box-sizing: border-box !important;
          }

          .assign-list-table thead th {
            background: #f1f5f9 !important;
            font-weight: bold !important;
            color: #000 !important;
            font-size: 7.8pt !important;
            text-align: center !important;
          }

          .col-period { width: 8.5% !important; text-align: center !important; }
          .col-absent { width: 20% !important; text-align: left !important; word-break: break-word !important; }
          .col-class { width: 10.5% !important; text-align: center !important; word-break: break-word !important; }
          .col-room { width: 13.5% !important; text-align: center !important; word-break: break-word !important; overflow-wrap: anywhere !important; }
          .col-subject { width: 17.5% !important; text-align: center !important; word-break: break-word !important; }
          .col-duty { width: 20% !important; text-align: left !important; word-break: break-word !important; }
          .col-sign { width: 10% !important; text-align: center !important; }

          .table-empty-state-screen {
            display: none !important;
          }
          .table-empty-state-print {
            display: block !important;
            color: #000 !important;
            font-size: 9pt !important;
            margin: 0 !important;
            text-align: center !important;
          }
          .empty-table-cell {
            padding: 5mm 2mm !important;
            background: transparent !important;
            color: #000 !important;
            border: 0.8pt solid #000 !important;
          }

          .period-badge,
          .class-name-badge {
            background: transparent !important;
            color: #000 !important;
            border: none !important;
            padding: 0 !important;
            font-weight: bold !important;
          }

          .classroom-badge {
            background: transparent !important;
            color: #000 !important;
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

          .classroom-badge .room-pin {
            display: inline-block !important;
            font-size: 6.8pt !important;
            margin-right: 1px !important;
          }

          .classroom-badge .room-text {
            display: inline !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
          }

          .classroom-badge .room-sep {
            color: #000 !important;
            font-weight: normal !important;
          }

          .period-time-sub {
            display: block !important;
            font-size: 6.2pt !important;
            font-weight: normal !important;
            color: #333 !important;
            margin-top: 1px !important;
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

          .print-wrap .official-signatures {
            padding: ${pageOrientation === 'landscape' ? '0 15mm' : '0 6mm'} !important;
            margin-top: 7mm !important;
          }

          .assign-list-table, .assign-list-table-wrap { break-inside: avoid !important; page-break-inside: avoid !important; }
        }
      `}</style>
    </div>
  );
}
