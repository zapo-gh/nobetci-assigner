// @ts-nocheck
import React, { useMemo, useState, useEffect } from "react";
import { MANUAL_ADMIN_TEACHER_ID } from '../utils/assignDuty.js'
import { decodeClassAbsenceValue } from '../utils/classAbsence.js'

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
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editingText, setEditingText] = useState(notes || '');

  useEffect(() => {
    setEditingText(notes || '');
  }, [notes]);
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
              <th className="teacher-col text-center">Öğretmen</th>
              {(periods || []).map(p => (
                <th key={p} className="period-col text-center">{p}. Saat</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeDutyTeachers.length === 0 ? (
              <tr>
                <td colSpan={periods.length + 1} className="text-center text-muted p-4">
                  Bu günde görevi olan öğretmen bulunmuyor.
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
      <div className={`print-notes-card ${!notesEnabled || !notes?.trim() ? 'notes-hidden-in-print' : ''}`}>
        {/* Yazdırmada Görünen Resmi Başlık ve İçerik */}
        <div className="print-notes-title-print">AÇIKLAMALAR:</div>
        <div className="print-notes-content-print">
          {notes && notes.trim() ? notes : ''}
        </div>

        {/* Ekran Görünümünde (no-print) Başlık ve Kontroller */}
        <div className="print-notes-header-screen no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>📝</span>
            <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary, #0f172a)' }}>
              Çizelge Açıklamaları
            </strong>
            {notesEnabled && notes?.trim() ? (
              <span className="notes-status-badge badge-active">Çıktıda Görünür</span>
            ) : (
              <span className="notes-status-badge badge-inactive">Çıktıda Gizli</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label className="notes-toggle-label">
              <input
                type="checkbox"
                checked={notesEnabled}
                onChange={(e) => onNotesEnabledChange?.(e.target.checked)}
              />
              <span>Çıktıda Göster</span>
            </label>

            {!isEditingNotes && (
              <button
                type="button"
                className="btn-edit-notes"
                onClick={() => {
                  setEditingText(notes || '');
                  setIsEditingNotes(true);
                }}
              >
                <span>✏️</span>
                <span>Düzenle</span>
              </button>
            )}
          </div>
        </div>

        {/* Ekran Görünümünde Metin Önizlemesi */}
        {!isEditingNotes && (
          <div className="print-notes-screen-preview no-print">
            {notes && notes.trim() ? (
              <div className="notes-rendered-text">
                {notes.split('\n').map((line, idx) => (
                  <div key={idx} className="notes-line">
                    {line}
                  </div>
                ))}
              </div>
            ) : (
              <div className="notes-empty-notice">
                Henüz bir açıklama eklenmedi. Çıktı çizelgesinin altında yer almasını istediğiniz not veya kuralları eklemek için "Düzenle" butonuna tıklayabilirsiniz.
              </div>
            )}
          </div>
        )}

        {/* Ekran Görünümünde Düzenleme Alanı */}
        {isEditingNotes && (
          <div className="print-notes-edit-panel no-print">
            <textarea
              className="notes-textarea"
              rows={4}
              placeholder="Çıktıda yer almasını istediğiniz açıklamaları yazın... (Her satır ayrı bir madde olarak yazdırılır)"
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              autoFocus
            />

            {/* Hızlı Şablon Butonları */}
            <div className="notes-quick-templates">
              <span className="quick-tpl-label">Hızlı Ekle:</span>
              <button
                type="button"
                className="btn-quick-tpl"
                onClick={() => {
                  const item = 'Nöbetçi öğretmenler boş geçen derslere zamanında girmekle yükümlüdür.';
                  setEditingText(prev => prev ? `${prev.trim()}\n${item}` : item);
                }}
              >
                + Boş Ders Kuralı
              </button>
              <button
                type="button"
                className="btn-quick-tpl"
                onClick={() => {
                  const item = 'Sınıf defteri ve yoklama fişleri nöbetçi öğretmen tarafından imzalanacaktır.';
                  setEditingText(prev => prev ? `${prev.trim()}\n${item}` : item);
                }}
              >
                + Defter/Yoklama İmzası
              </button>
              <button
                type="button"
                className="btn-quick-tpl"
                onClick={() => {
                  const item = 'Birleştirilen gruplar belirtilen atölye/dersliklerde derse devam edecektir.';
                  setEditingText(prev => prev ? `${prev.trim()}\n${item}` : item);
                }}
              >
                + Birleştirilen Gruplar
              </button>
              <button
                type="button"
                className="btn-quick-tpl"
                onClick={() => {
                  const item = 'Görevli öğretmenler okul idaresinin bilgisi dışında görev yerini terk edemezler.';
                  setEditingText(prev => prev ? `${prev.trim()}\n${item}` : item);
                }}
              >
                + Görev Yeri Kuralı
              </button>
            </div>

            {/* Aksiyon Butonları */}
            <div className="notes-edit-actions">
              <button
                type="button"
                className="btn-tpl-action"
                onClick={() => setEditingText('')}
              >
                Temizle
              </button>
              <button
                type="button"
                className="btn-tpl-action"
                onClick={() => {
                  setEditingText(`1. Nöbetçi öğretmenler boş geçen derslere zamanında girmekle yükümlüdür.
2. Sınıf defteri ve yoklama fişleri ilgili ders saatinde nöbetçi öğretmen tarafından doldurulup imzalanacaktır.
3. Görevli öğretmenler okul idaresinin bilgisi dışında görev yerini terk edemezler.`);
                }}
              >
                Varsayılanı Yükle
              </button>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                className="btn-cancel-notes"
                onClick={() => setIsEditingNotes(false)}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="btn-save-notes"
                onClick={() => {
                  onNotesChange?.(editingText);
                  setIsEditingNotes(false);
                }}
              >
                Kaydet
              </button>
            </div>
          </div>
        )}
      </div>

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

          /* Açıklamalar Bölümü (Yazdırma) */
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

          .print-notes-card.notes-hidden-in-print {
            display: none !important;
          }

          .print-notes-title-print {
            display: block !important;
            font-weight: bold !important;
            font-size: 8.5pt !important;
            color: #000 !important;
            margin-bottom: 1.5mm !important;
            text-transform: uppercase !important;
            letter-spacing: 0.3px !important;
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

          .print-notes-header-screen,
          .print-notes-screen-preview,
          .print-notes-edit-panel,
          .no-print {
            display: none !important;
          }

          /* Resmi İmza Blokları (Yazdırma) */
          .official-signatures {
            display: flex !important;
            justify-content: space-between !important;
            margin-top: 8mm !important;
            padding: 0 15mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
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

        /* Açıklamalar Bölümü (Ekran) */
        .print-notes-card {
          margin-top: 20px;
          padding: 16px 20px;
          background: var(--bg-elevated, #fff);
          border: 1px solid var(--border-subtle, #e2e8f0);
          border-radius: var(--radius-lg, 12px);
          box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
        }
        .print-notes-title-print,
        .print-notes-content-print {
          display: none;
        }
        .print-notes-header-screen {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-subtle, #e2e8f0);
          flex-wrap: wrap;
          gap: 10px;
        }
        .notes-status-badge {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
        }
        .badge-active {
          background: #dcfce7;
          color: #166534;
        }
        .badge-inactive {
          background: #f1f5f9;
          color: #64748b;
        }
        .notes-toggle-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-muted, #475569);
          cursor: pointer;
          user-select: none;
        }
        .btn-edit-notes {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-edit-notes:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #0f172a;
        }
        .notes-rendered-text {
          font-size: 0.88rem;
          color: var(--text-primary, #334155);
          line-height: 1.6;
        }
        .notes-line {
          padding: 2px 0;
        }
        .notes-empty-notice {
          font-size: 0.82rem;
          color: #94a3b8;
          font-style: italic;
          padding: 8px 0;
        }
        .print-notes-edit-panel {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .notes-textarea {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1.5px solid #cbd5e1;
          font-family: inherit;
          font-size: 0.85rem;
          line-height: 1.5;
          color: var(--text-primary, #0f172a);
          background: var(--bg-primary, #ffffff);
          resize: vertical;
          outline: none;
          box-sizing: border-box;
        }
        .notes-textarea:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }
        .notes-quick-templates {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }
        .quick-tpl-label {
          font-size: 0.74rem;
          font-weight: 700;
          color: #64748b;
        }
        .btn-quick-tpl {
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px dashed #cbd5e1;
          background: #f8fafc;
          color: #475569;
          font-size: 0.74rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-quick-tpl:hover {
          background: #eef2ff;
          border-color: #6366f1;
          color: #4338ca;
        }
        .notes-edit-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }
        .btn-tpl-action {
          padding: 5px 10px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
          font-size: 0.76rem;
          cursor: pointer;
        }
        .btn-tpl-action:hover {
          background: #e2e8f0;
          color: #334155;
        }
        .btn-cancel-notes {
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-save-notes {
          padding: 6px 16px;
          border-radius: 8px;
          border: none;
          background: #4f46e5;
          color: #ffffff;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-save-notes:hover {
          background: #4338ca;
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
      `}</style>
    </div>
  );
}