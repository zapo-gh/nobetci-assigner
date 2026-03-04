import React, { useMemo } from "react";
import { MANUAL_ADMIN_TEACHER_ID } from '../utils/assignDuty.js'
import { decodeClassAbsenceValue } from '../utils/classAbsence.js'

const TR_DAYS = { Mon: "Pazartesi", Tue: "Salı", Wed: "Çarşamba", Thu: "Perşembe", Fri: "Cuma" };
const REASON_LABELS = {
  "raporlu": "Raporlu",
  "sevkli": "Sevkli",
  "izinli": "İzinli",
  "gorevli-izinli": "Görevli İzinli",
  "diger": "Diğer"
};

export default function PrintableDailyList({
  day,
  periods = [],
  classes = [],
  teachers = [],
  assignment = {},
  locked = {},
  displayDate = "", // Prop adı 'displayDateStr'den 'displayDate'e düzeltildi
  absentPeople = [],
  classAbsence = {},
  commonLessons = {}
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

  return (
    <div className="print-wrap">
      <h2 className="print-title">
        Tarih: {displayDate} ({TR_DAYS[day]}) Nöbetçi Öğretmen Boş Ders Görevlendirme Listesi
      </h2>

      <div className="assign-table-wrap">
        <table className="assign-table">
          <thead>
            <tr>
              <th className="teacher-col text-center">Öğretmen</th>
              {(periods || []).map(p => (
                <th key={p} className="period-col text-center">{p}. Saat</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teachers.length === 0 ? (
              <tr>
                <td colSpan={periods.length + 1} className="text-center text-muted p-4">
                  Henüz öğretmen eklenmedi.
                </td>
              </tr>
            ) : (
              (teachers || []).map(t => (
                <tr key={t.teacherId}>
                  <td className="teacher-name">
                    <strong className="nowrap">{t.teacherName}</strong>
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
                                      Ders Birleştirilecek
                                    </small>
                                    {item.ownerInfo && (
                                      <small className="absline">
                                        {item.ownerInfo.name} — {REASON_LABELS[item.ownerInfo.reason] || item.ownerInfo.reason}
                                      </small>
                                    )}
                                  </div>
                                ) : item.info && (
                                  <div className="abs">
                                    <small className="absline">
                                      {item.info.name} — {REASON_LABELS[item.info.reason] || item.info.reason}
                                    </small>
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
              ))
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
                                      Ders Birleştirilecek
                                    </small>
                                    {ownerInfo && (
                                      <small className="absline">
                                        {ownerInfo.name} — {REASON_LABELS[ownerInfo.reason] || ownerInfo.reason}
                                      </small>
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
                                    <small className="absline">
                                      {ownerInfo.name} — {REASON_LABELS[ownerInfo.reason] || ownerInfo.reason}
                                    </small>
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


      <style>{`
        .print-wrap { width: 100%; }
        .print-title { text-align: center; font-weight: var(--font-weight-bold); margin: 0 0 var(--space-2) 0; } /* Değiştirildi */
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .muted { color: var(--text-muted); }
        .nowrap { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .p-4 { padding: var(--space-4); } /* Yeni */

        .assign-table-wrap {
          overflow: auto;
          -webkit-overflow-scrolling: touch;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg); /* Değiştirildi */
          background: var(--bg-elevated);
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
        /* Tüm satırlar aynı yükseklikte olmalı - border-collapse ile otomatik */
        .assign-table tbody tr {
          height: auto;
        }
        /* Tüm hücreler için TEK VE AYNI border ve padding tanımı */
        thead th, tbody td { 
          border: 1px solid var(--border-subtle);
          padding: var(--space-2);
          vertical-align: middle;
          text-align: center;
          display: table-cell;
        }
        thead th {
          background: var(--bg-elevated);
          position: sticky; 
          top: 0; 
          z-index: 2;
        }

        .teacher-col { width: 220px; }
        .teacher-name { 
          /* border-collapse: collapse ile satırdaki en yüksek hücreye göre yükseklik ayarlanır */
          vertical-align: middle;
        }
        /* Öğretmen hücresindeki içeriği tek satır haline getir */
        .teacher-name strong,
        .teacher-name small {
          display: inline;
          line-height: inherit;
        }

        /* Sütun sabitleme - sadece positioning */
        .assign-table thead th:first-child,
        .assign-table tbody td:first-child {
          position: sticky;
          left: 0;
          background: var(--bg-elevated);
          z-index: 3;
        }
        .assign-table thead th:first-child {
          z-index: 4;
        }

        td.cell { 
          /* Özel stil yok, tüm hücreler aynı */
        }
        .cell-list {
          display: grid;
          gap: var(--space-1); /* Değiştirildi */
          justify-items: center;
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .cell-item {
          display: grid;
          gap: 2px;
          justify-items: center;
          padding: var(--space-1) var(--space-2); /* Değiştirildi */
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md); /* Değiştirildi */
          max-width: 100%;
        }
        .class { font-weight: var(--font-weight-bold); } /* Değiştirildi */
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
          background: var(--bg-secondary);
          border-top: 1px solid var(--primary);
        }

        .common-lesson-teacher-row .teacher-name {
          background: var(--bg-secondary);
        }

        .admin-control-row {
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-default);
        }

        .admin-control-row .teacher-name {
          background: var(--bg-secondary);
        }

        .common-lesson {
          color: var(--primary);
          font-weight: 500;
        }

        .admin-control {
          color: var(--warning, #d97706);
          font-weight: 600;
        }

        @media (max-width: 900px) {
          .teacher-col { width: 180px; }
          .assign-table { min-width: 720px; }
          .cell-item { padding: 4px 5px; }
        }

        

        /* --- YAZDIRMA --- */
        @media print {
          @page { size: A4 landscape; margin: 5mm; }

          .print-title { margin-bottom: 3mm; font-size: 11pt; }

          .assign-table {
            border-collapse: collapse;
            width: 100%;
            font-size: 9.3pt;
            line-height: 1.1;
            min-width: auto;
          }
          /* Tüm satırlar aynı yükseklikte olmalı - border-collapse ile otomatik */
          .assign-table tbody tr {
            height: auto;
          }
          thead th, tbody td {
            border: 0.8pt solid #000 !important;
            background: #fff !important;
            color: #000 !important;
            padding: 1px 2px !important;
            vertical-align: middle !important;
            text-align: center !important;
            display: table-cell !important;
          }
          thead th { position: static !important; }
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

          /* Yazdırma için sabitlenmiş sütunları devre dışı bırak */
          .assign-table thead th:first-child,
          .assign-table tbody td:first-child {
            position: static !important;
            background: #fff !important;
            z-index: auto !important;
          }

          td.cell { 
            /* Özel stil yok, tüm hücreler aynı */
          }
          .cell-list { gap: 2px; }
          .cell-item {
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
            border-radius: 0 !important;
          }
          .class { font-weight: var(--font-weight-bold); }
          .abs  { font-size: 8.5pt; }

          .assign-table, .assign-table-wrap { break-inside: avoid; page-break-inside: avoid; }
          
        }
      `}</style>
    </div>
  );
}