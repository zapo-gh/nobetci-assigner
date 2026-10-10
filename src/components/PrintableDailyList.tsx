// @ts-nocheck
import React, { useMemo } from "react";
import { MANUAL_ADMIN_TEACHER_ID } from '../utils/assignDuty.js';
import { decodeClassAbsenceValue } from '../utils/classAbsence.js';
import PrintNotesCard from './PrintNotesCard';
import OfficialSignatures from './OfficialSignatures';

const TR_DAYS = { Mon: "Pazartesi", Tue: "Salı", Wed: "Çarşamba", Thu: "Perşembe", Fri: "Cuma" };
const REASON_LABELS = {
  "raporlu": "Raporlu",
  "sevkli": "Sevkli",
  "izinli": "İzinli",
  "gorevli-izinli": "Görevli İzinli",
  "mazeret-izinli": "Mazeret İzinli",
  "diger": "Diğer"
};

export default function PrintableDailyList({
  day,
  periods = [],
  classes = [],
  teachers = [],
  assignment = {},
  locked = {},
  displayDate = "",
  absentPeople = [],
  classAbsence = {},
  commonLessons = {},
  notes = "",
  notesEnabled = true,
  onNotesChange,
  onNotesEnabledChange
}) {
  const classNameById = useMemo(
    () => Object.fromEntries((classes || []).map(c => [c.classId, c.className])),
    [classes]
  );

  const absentInfoById = useMemo(() => {
    const map = {};
    (absentPeople || []).forEach(a => {
      if (!a?.absentId) return;
      if (Array.isArray(a.days) && a.days.length > 0 && !a.days.includes(day)) return;
      map[a.absentId] = { name: a.name, reason: a.reason };
    });
    return map;
  }, [absentPeople, day]);

  const normalizeTeacherKey = (value = '') => String(value || '').trim().toLocaleUpperCase('tr-TR');

  const commonLessonTeacherData = useMemo(() => {
    const teacherById = Object.fromEntries((teachers || []).map(t => [t.teacherId, t]));
    const dutyTeacherNameKeys = new Set((teachers || []).map(t => normalizeTeacherKey(t.teacherName)));
    const dataByTeacher = {};

    (periods || []).forEach((p) => {
      const commonLessonsForPeriod = commonLessons?.[day]?.[p] || {};
      Object.entries(commonLessonsForPeriod).forEach(([classId, teacherVal]) => {
        const teacherName = teacherById[teacherVal]?.teacherName || teacherVal;
        const teacherKey = normalizeTeacherKey(teacherName);
        if (!teacherName || !teacherKey) return;

        if (!dataByTeacher[teacherKey]) {
          dataByTeacher[teacherKey] = {
            teacherName,
            byPeriod: {},
            isDutyTeacher: dutyTeacherNameKeys.has(teacherKey),
          };
        }

        if (!dataByTeacher[teacherKey].byPeriod[p]) {
          dataByTeacher[teacherKey].byPeriod[p] = [];
        }
        dataByTeacher[teacherKey].byPeriod[p].push(classId);
      });
    });

    return dataByTeacher;
  }, [teachers, periods, commonLessons, day]);

  const adminLessonsByPeriod = useMemo(() => {
    const map = {};
    Object.entries(locked || {}).forEach(([key, teacherId]) => {
      if (teacherId !== MANUAL_ADMIN_TEACHER_ID) return;
      const [lockDay, lockPeriod, classId] = key.split('|');
      if (lockDay !== day) return;
      const period = Number(lockPeriod);
      if (!map[period]) map[period] = [];
      map[period].push(classId);
    });
    return map;
  }, [locked, day]);

  const hasAdminLessons = useMemo(
    () => Object.values(adminLessonsByPeriod).some((list) => Array.isArray(list) && list.length > 0),
    [adminLessonsByPeriod]
  );

  // Çıktılar sekmesinde özet gösterilmiyor (planlama sekmesinde var)

  const activeDutyTeachers = useMemo(() => {
    return (teachers || []).filter(t => {
      const hasAssignment = (periods || []).some(p =>
        (assignment?.[day]?.[p] || []).some(a => a.teacherId === t.teacherId)
      );
      const teacherKey = normalizeTeacherKey(t.teacherName);
      const hasCommonLesson = (periods || []).some(p =>
        (commonLessonTeacherData?.[teacherKey]?.byPeriod?.[p] || []).length > 0
      );
      return hasAssignment || hasCommonLesson;
    });
  }, [teachers, periods, assignment, day, commonLessonTeacherData]);

  return (
    <div className="print-wrap">
      <h2 className="print-title">
        Tarih: {displayDate} ({TR_DAYS[day]}) Nöbetçi Öğretmen Boş Ders Görevlendirme Listesi
      </h2>

      <div className="assign-table-wrap">
        <table className="assign-table">
          <thead>
            <tr>
              <th className="teacher-col text-center">ÖĞRETMEN</th>
              {(periods || []).map(p => (
                <th key={p} className="period-col text-center">{p}. SAAT</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeDutyTeachers.length === 0 ? (
              <tr>
                <td colSpan={periods.length + 1} className="empty-table-cell">
                  <div className="empty-state-inner">
                    <span className="empty-state-icon">📋</span>
                    <span>Bu günde görevi olan öğretmen bulunmuyor.</span>
                  </div>
                </td>
              </tr>
            ) : (
              activeDutyTeachers.map(t => {
                const systemDayMap = { 'Sun': 'sunday', 'Mon': 'monday', 'Tue': 'tuesday', 'Wed': 'wednesday', 'Thu': 'thursday', 'Fri': 'friday', 'Sat': 'saturday' };
                const systemDay = systemDayMap[day] || day;
                const dutyLocation = t.dutyLocations?.[systemDay];
                return (
                <tr key={t.teacherId}>
                  <td className="teacher-name">
                    <strong className="nowrap">{t.teacherName}</strong>
                    {dutyLocation && (
                      <div style={{ fontSize: '10px', color: 'var(--text-muted, gray)', marginTop: '2px', lineHeight: '1.2' }}>
                        {dutyLocation}
                      </div>
                    )}
                  </td>

                  {(periods || []).map(p => {
                    const arr = assignment?.[day]?.[p] || [];
                    const teacherKey = normalizeTeacherKey(t.teacherName);
                    const mine = arr
                      .filter(a => a.teacherId === t.teacherId)
                      .map(a => {
                        const cls = classNameById[a.classId] || a.classId;
                        const absId = classAbsence?.[day]?.[p]?.[a.classId];
                        const info = absId ? absentInfoById[absId] : null;
                        return { cls, info };
                      });

                    const commonLessonClassIds = commonLessonTeacherData?.[teacherKey]?.byPeriod?.[p] || [];
                    const commonLessonItems = commonLessonClassIds.map((classId) => ({
                      cls: classNameById[classId] || classId,
                      isCommonLesson: true,
                      ownerInfo: (() => {
                        const rawValue = classAbsence?.[day]?.[p]?.[classId]
                        const { commonLessonOwnerId } = decodeClassAbsenceValue(rawValue)
                        return commonLessonOwnerId ? absentInfoById[commonLessonOwnerId] : null
                      })(),
                    }));

                    const mergedItems = [...mine, ...commonLessonItems];

                    return (
                      <td key={p} className="cell text-center">
                        {mergedItems.length ? (
                          <ul className="cell-list">
                            {mergedItems.map((item, idx) => (
                              <li key={idx} className="cell-item">
                                <div className="class nowrap">{item.cls}</div>
                                {item.isCommonLesson ? (
                                  <div className="abs">
                                    <small className="absline common-lesson">
                                      Grup Birleştirilecek
                                    </small>
                                    {item.ownerInfo && (
                                      <>
                                        <small className="absline">{item.ownerInfo.name} —</small>
                                        <small className="absline">{REASON_LABELS[item.ownerInfo.reason] || item.ownerInfo.reason}</small>
                                      </>
                                    )}
                                  </div>
                                ) : item.info && (
                                  <div className="abs">
                                    <small className="absline">{item.info.name} —</small>
                                    <small className="absline">{REASON_LABELS[item.info.reason] || item.info.reason}</small>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : <span className="muted">—</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}

            {/* Common Lesson Teachers (nöbetçi listesinde olmayanlar) */}
            {(() => {
              const extraCommonLessonTeachers = Object.values(commonLessonTeacherData).filter(
                (item) => !item.isDutyTeacher
              );

              return extraCommonLessonTeachers.map((item) => (
                <tr key={item.teacherName} className="common-lesson-teacher-row">
                  <td className="teacher-name">
                    <strong className="nowrap">{item.teacherName}</strong>
                  </td>
                  {periods.map(p => {
                    const classesForTeacher = item.byPeriod?.[p] || [];

                    return (
                      <td key={p} className="cell text-center">
                        {classesForTeacher.length > 0 ? (
                          <ul className="cell-list">
                            {classesForTeacher.map((classId, idx) => {
                              const rawValue = classAbsence?.[day]?.[p]?.[classId]
                              const { commonLessonOwnerId } = decodeClassAbsenceValue(rawValue)
                              const ownerInfo = commonLessonOwnerId ? absentInfoById[commonLessonOwnerId] : null
                              return (
                                <li key={idx} className="cell-item">
                                  <div className="class nowrap">{classNameById[classId] || classId}</div>
                                  <div className="abs">
                                    <small className="absline common-lesson">
                                      Grup Birleştirilecek
                                    </small>
                                    {ownerInfo && (
                                      <>
                                        <small className="absline">{ownerInfo.name} —</small>
                                        <small className="absline">{REASON_LABELS[ownerInfo.reason] || ownerInfo.reason}</small>
                                      </>
                                    )}
                                  </div>
                                </li>
                              )
                            })}
                          </ul>
                        ) : <span className="muted">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ));
            })()}

            {hasAdminLessons && (
              <tr className="admin-control-row">
                <td className="teacher-name">
                  <strong className="nowrap">İdare</strong>
                </td>
                {periods.map((p) => {
                  const classesForAdmin = adminLessonsByPeriod[p] || [];
                  return (
                    <td key={`admin-${p}`} className="cell text-center">
                      {classesForAdmin.length > 0 ? (
                        <ul className="cell-list">
                          {classesForAdmin.map((classId, idx) => {
                            const rawValue = classAbsence?.[day]?.[p]?.[classId]
                            const { commonLessonOwnerId } = decodeClassAbsenceValue(rawValue)
                            const ownerInfo = commonLessonOwnerId ? absentInfoById[commonLessonOwnerId] : null
                            return (
                              <li key={`${classId}-${idx}`} className="cell-item">
                                <div className="class nowrap">{classNameById[classId] || classId}</div>
                                <div className="abs">
                                  <small className="absline admin-control">
                                    İdare kontrolünde
                                  </small>
                                  {ownerInfo && (
                                    <>
                                      <small className="absline">{ownerInfo.name} —</small>
                                      <small className="absline">{REASON_LABELS[ownerInfo.reason] || ownerInfo.reason}</small>
                                    </>
                                  )}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      ) : <span className="muted">—</span>}
                    </td>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---------------- Çizelge Açıklamalar Bölümü ---------------- */}
      <PrintNotesCard
        notes={notes}
        notesEnabled={notesEnabled}
        onNotesChange={onNotesChange}
        onNotesEnabledChange={onNotesEnabledChange}
        titlePrefix="Çizelge Açıklamaları"
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
        }
        .print-title {
          text-align: center;
          font-weight: 700;
          margin: 0 0 18px 0;
          font-size: 1.15rem;
          color: var(--text-primary, #0f172a);
          letter-spacing: -0.2px;
        }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .muted { color: var(--text-muted, #94a3b8); }
        .nowrap { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .empty-table-cell {
          padding: 32px 16px !important;
          text-align: center !important;
          background: #f8fafc !important;
        }
        .empty-state-inner {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #64748b;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .empty-state-icon {
          font-size: 1.1rem;
          opacity: 0.85;
        }

        .assign-table-wrap {
          overflow: auto;
          -webkit-overflow-scrolling: touch;
          border: 1px solid var(--border-subtle, #e2e8f0);
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
        }
        .assign-table {
          width: 100%;
          border-collapse: collapse;
          border-spacing: 0;
          table-layout: fixed;
          min-width: 840px;
          font-size: 14px;
          line-height: 1.25;
        }
        .assign-table tbody tr {
          height: auto;
        }
        .assign-table tbody tr:hover {
          background: #f8fafc;
        }
        .assign-table thead th,
        .assign-table tbody td { 
          border: 1px solid var(--border-subtle, #e2e8f0);
          padding: var(--space-2, 8px);
          vertical-align: middle;
          text-align: center;
          display: table-cell;
        }
        .assign-table thead th {
          background: #f8fafc;
          color: #0f172a;
          font-weight: 700;
          padding: 10px 8px;
          border-bottom: 2px solid #cbd5e1;
          position: sticky; 
          top: 0; 
          z-index: 2;
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .teacher-col { width: 220px; }
        .teacher-name { 
          vertical-align: middle;
        }
        .teacher-name strong,
        .teacher-name small {
          display: inline;
          line-height: inherit;
        }

        /* Sütun sabitleme */
        .assign-table thead th:first-child {
          position: sticky;
          left: 0;
          background: #f8fafc;
          z-index: 4;
        }
        .assign-table tbody td:first-child {
          position: sticky;
          left: 0;
          background: #ffffff;
          z-index: 3;
        }
        .assign-table tbody tr:hover td:first-child {
          background: #f8fafc;
        }

        td.cell { }
        .cell-list {
          display: grid;
          gap: var(--space-1, 4px);
          justify-items: center;
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .cell-item {
          display: grid;
          gap: 2px;
          justify-items: center;
          padding: var(--space-1, 4px) var(--space-2, 8px);
          background: var(--bg-primary, #f8fafc);
          border: 1px solid var(--border-subtle, #e2e8f0);
          border-radius: var(--radius-md, 6px);
          max-width: 100%;
        }
        .class { font-weight: var(--font-weight-bold, 700); }
        .abs { font-size: .86em; opacity: .95; line-height: 1.18; text-align: center; }
        .absline {
          white-space: normal;
          word-break: keep-all;
          overflow-wrap: break-word;
          hyphens: none;
          display: block;
          max-width: 100%;
        }

        .common-lesson-teacher-row {
          background: var(--bg-secondary, #f8fafc);
          border-top: 1px solid var(--primary, #4f46e5);
        }
        .common-lesson-teacher-row .teacher-name {
          background: var(--bg-secondary, #f8fafc);
        }

        .admin-control-row {
          background: var(--bg-secondary, #f8fafc);
          border-top: 1px solid var(--border-default, #cbd5e1);
        }
        .admin-control-row .teacher-name {
          background: var(--bg-secondary, #f8fafc);
        }

        .common-lesson {
          color: var(--primary, #4f46e5);
          font-weight: 500;
        }
        .admin-control {
          color: var(--warning, #d97706);
          font-weight: 600;
        }

        @media (max-width: 900px) {
          .print-wrap { padding: 16px; }
          .teacher-col { width: 180px; }
          .assign-table { min-width: 720px; }
          .cell-item { padding: 4px 5px; }
        }

        /* --- YAZDIRMA (PRINT) --- */
        @media print {
          @page { size: A4 landscape; margin: 5mm; }

          .print-wrap {
            margin-top: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
          }

          .print-title { margin-bottom: 3mm !important; font-size: 11pt !important; color: #000 !important; }

          .assign-table-wrap {
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }

          .assign-table {
            border-collapse: collapse !important;
            width: 100% !important;
            font-size: 9.3pt !important;
            line-height: 1.1 !important;
            min-width: auto !important;
          }
          .assign-table tbody tr {
            height: auto !important;
          }
          .assign-table thead th,
          .assign-table tbody td {
            border: 0.8pt solid #000 !important;
            background: #fff !important;
            color: #000 !important;
            padding: 1px 2px !important;
            vertical-align: middle !important;
            text-align: center !important;
            display: table-cell !important;
          }
          .assign-table thead th {
            position: static !important;
            background: #f1f5f9 !important;
            font-weight: bold !important;
          }
          .teacher-col { width: 170px !important; }
          .teacher-name { 
            vertical-align: middle !important;
          }
          .teacher-name .nowrap {
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
            display: inline-block !important;
            max-width: 100% !important;
            line-height: 1.15 !important;
          }
          .teacher-name .teacher-id { display: none !important; }

          .assign-table thead th:first-child,
          .assign-table tbody td:first-child {
            position: static !important;
            background: #fff !important;
            z-index: auto !important;
          }

          .empty-table-cell {
            padding: 6mm 2mm !important;
            background: transparent !important;
            color: #000 !important;
            border: 0.8pt solid #000 !important;
          }
          .empty-state-inner {
            color: #000 !important;
            font-size: 9pt !important;
          }
          .empty-state-icon {
            display: none !important;
          }

          td.cell { }
          .cell-list { gap: 2px !important; }
          .cell-item {
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
            border-radius: 0 !important;
          }
          .class { font-weight: var(--font-weight-bold, 700) !important; }
          .abs  { font-size: 8.5pt !important; }

          .assign-table, .assign-table-wrap { break-inside: avoid !important; page-break-inside: avoid !important; }
        }
      `}</style>
    </div>
  );
}