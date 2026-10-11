// @ts-nocheck
import React, { useMemo, useState } from "react";
import styles from './AssignmentText.module.css';
import { MANUAL_ADMIN_TEACHER_ID } from '../utils/assignDuty.js'
import { decodeClassAbsenceValue } from '../utils/classAbsence.js'

const REASON_LABELS = {
  "raporlu": "Raporlu",
  "sevkli": "Sevkli",
  "izinli": "İzinli",
  "gorevli-izinli": "Görevli İzinli",
  "mazeret-izinli": "Mazeret İzinli",
  "diger": "Diğer"
};

export default function AssignmentText({
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
  classLocations = {},
  teacherSchedules = {},
}) {
  const [formatMode, setFormatMode] = useState<'whatsapp' | 'plain' | 'merged'>('whatsapp');
  const [copied, setCopied] = useState(false);
  const [copiedMergedTeacher, setCopiedMergedTeacher] = useState<string | null>(null);
  const [copiedAllMerged, setCopiedAllMerged] = useState(false);

  const absentMap = useMemo(() => {
    const m = {};
    (absentPeople || []).forEach(a => {
      if (!a || !a.absentId) return;
      if (Array.isArray(a.days) && a.days.length > 0 && !a.days.includes(day)) return;
      m[a.absentId] = { name: a.name, reason: a.reason };
    });
    return m;
  }, [absentPeople, day]);

  // Dersi Birleştirilen Öğretmenler İçin Özel WhatsApp Bildirimleri
  const mergedTeacherNotifications = useMemo(() => {
    if (!commonLessons?.[day]) return [];

    const teacherById = Object.fromEntries((teachers || []).map((t) => [t.teacherId, t]));
    const classNameById = Object.fromEntries((classes || []).map((c) => [c.classId, c.className || c.classId]));
    const teacherMap = new Map();

    const resolveSubject = (classId, clsName, period, absName, mergeName) => {
      const cLocObj = classLocations?.[classId]?.[day]?.[period] || classLocations?.[clsName]?.[day]?.[period];
      if (cLocObj && typeof cLocObj === 'object' && cLocObj.subject) {
        return cLocObj.subject;
      }
      const systemDayMap = {
        Sun: 'sunday', Mon: 'monday', Tue: 'tuesday', Wed: 'wednesday', Thu: 'thursday', Fri: 'friday', Sat: 'saturday'
      };
      const sysDay = systemDayMap[day] || day;
      const normalize = (s) => String(s || '').trim().toLocaleLowerCase('tr-TR');

      if (absName && teacherSchedules) {
        const tKey = Object.keys(teacherSchedules).find((k) => normalize(k) === normalize(absName));
        if (tKey && teacherSchedules[tKey]) {
          const sched = teacherSchedules[tKey]?.[sysDay]?.[period] || teacherSchedules[tKey]?.[day]?.[period];
          if (sched) return String(sched).trim();
        }
      }
      if (mergeName && teacherSchedules) {
        const tKey = Object.keys(teacherSchedules).find((k) => normalize(k) === normalize(mergeName));
        if (tKey && teacherSchedules[tKey]) {
          const sched = teacherSchedules[tKey]?.[sysDay]?.[period] || teacherSchedules[tKey]?.[day]?.[period];
          if (sched) return String(sched).trim();
        }
      }
      return '';
    };

    (periods || []).forEach((p) => {
      const periodCommon = commonLessons[day]?.[p];
      if (!periodCommon) return;

      Object.entries(periodCommon).forEach(([classId, teacherVal]) => {
        if (!teacherVal || teacherVal === '__MANUAL_EMPTY__') return;

        const mergeTeacherName = teacherById[teacherVal]?.teacherName || teacherVal;
        const clsName = classNameById[classId] || classId;
        const rawAbsValue = classAbsence?.[day]?.[p]?.[classId];
        const { absentId, commonLessonOwnerId } = decodeClassAbsenceValue(rawAbsValue);
        const absRecord = (absentId ? absentMap[absentId] : null) || (commonLessonOwnerId ? absentMap[commonLessonOwnerId] : null);
        const absentTeacherName = absRecord?.name || 'Diğer grup öğretmeni';
        const absentReason = absRecord?.reason ? (REASON_LABELS[absRecord.reason] || absRecord.reason) : 'izinli/mazeretli';
        const subject = resolveSubject(classId, clsName, p, absRecord?.name, mergeTeacherName);

        const teacherKey = mergeTeacherName.trim();
        if (!teacherMap.has(teacherKey)) {
          teacherMap.set(teacherKey, {
            teacherName: mergeTeacherName,
            lessons: [],
          });
        }
        teacherMap.get(teacherKey).lessons.push({
          period: p,
          classId,
          className: clsName,
          subject,
          absentTeacherName,
          absentReason,
        });
      });
    });

    const dateLabel = displayDate || day;
    const result = [];

    teacherMap.forEach((entry) => {
      const { teacherName, lessons } = entry;
      lessons.sort((a, b) => Number(a.period) - Number(b.period));

      let message = '';
      if (lessons.length === 1) {
        const item = lessons[0];
        const subjectText = item.subject ? `${item.subject} dersinde` : 'dersinizde';
        const colleagueText = `${item.absentTeacherName} Hocamız ${item.absentReason.toLocaleLowerCase('tr-TR')} olduğu için`;
        message = `Sayın ${teacherName} Hocam,\n\n${dateLabel} günü ${item.period}. ders ${item.className} sınıfı ${subjectText}, ${colleagueText} bu derste gruplar birleştirilecektir.\n\nBilgilerinize sunar, iyi dersler dileriz.`;
      } else {
        message = `Sayın ${teacherName} Hocam,\n\n${dateLabel} günü aşağıdaki derslerinizde diğer grup öğretmeninin izinli/mazeretli olması sebebiyle gruplar birleştirilecektir:\n\n`;
        lessons.forEach((item) => {
          const subjectText = item.subject ? ` (${item.subject})` : '';
          const colleagueText = ` [${item.absentTeacherName} - ${item.absentReason}]`;
          message += `• ${item.period}. Ders: ${item.className}${subjectText}${colleagueText}\n`;
        });
        message += `\nBilgilerinize sunar, iyi dersler dileriz.`;
      }

      result.push({
        teacherName,
        lessons,
        message,
      });
    });

    return result;
  }, [commonLessons, day, periods, teachers, classes, classAbsence, absentMap, classLocations, teacherSchedules, displayDate]);

  // Standard Plain Text
  const plainTextArray = useMemo(() => {
    const lines = [];
    if (!assignment || !assignment[day] || !periods || !classes || !teachers) {
      return [
        `Tarih: ${displayDate}`,
        `(Görevlendirme verisi bulunmuyor)`
      ];
    }

    const teacherById = Object.fromEntries((teachers || []).map(t => [t.teacherId, t]));
    const normalizeTeacherKey = (value = '') => String(value || '').trim().toLocaleUpperCase('tr-TR');

    for (const p of periods) {
      const arr = assignment[day]?.[p] || [];
      const periodTeacherLineIndex = new Map();

      arr.forEach(a => {
        const c = classes.find(x => x.classId === a.classId);
        const t = teachers.find(x => x.teacherId === a.teacherId);
        const absId = classAbsence?.[day]?.[p]?.[a.classId];
        const abs = absId ? absentMap[absId] : null;
        const reason = abs ? (REASON_LABELS[abs.reason] || abs.reason) : "";
        const suffix = abs ? ` (${abs.name} - ${reason})` : "";
        const teacherDisplayName = t?.teacherName || (a.teacherId.startsWith('auto_') ? 'Bilinmeyen Öğretmen' : a.teacherId);
        const systemDayMap = { 'Sun': 'sunday', 'Mon': 'monday', 'Tue': 'tuesday', 'Wed': 'wednesday', 'Thu': 'thursday', 'Fri': 'friday', 'Sat': 'saturday' };
        const systemDay = systemDayMap[day] || day;
        const dutyLocation = t?.dutyLocations?.[systemDay] ? ` [${t.dutyLocations[systemDay]}]` : '';
        const lineText = `${p}. saat — ${c?.className || a.classId}: ${teacherDisplayName}${dutyLocation}${suffix}`;
        lines.push(lineText);
        const teacherKey = normalizeTeacherKey(teacherDisplayName);
        const mapKey = `${p}|${teacherKey}`;
        if (!periodTeacherLineIndex.has(mapKey)) {
          periodTeacherLineIndex.set(mapKey, lines.length - 1);
        }
      });

      if (commonLessons?.[day]?.[p]) {
        const mergedCommonLessonsByTeacher = {};
        Object.entries(commonLessons[day][p]).forEach(([classId, teacherVal]) => {
          const c = classes.find(x => x.classId === classId);
          const teacherName = teacherById[teacherVal]?.teacherName || teacherVal;
          const rawValue = classAbsence?.[day]?.[p]?.[classId];
          const { commonLessonOwnerId } = decodeClassAbsenceValue(rawValue);
          const ownerInfo = commonLessonOwnerId ? absentMap[commonLessonOwnerId] : null;
          const ownerReason = ownerInfo ? (REASON_LABELS[ownerInfo.reason] || ownerInfo.reason) : '';
          const ownerSuffix = ownerInfo ? ` (${ownerInfo.name} - ${ownerReason})` : '';
          const classLabel = `${c?.className || classId}${ownerSuffix}`;
          const teacherKey = normalizeTeacherKey(teacherName);
          const mapKey = `${p}|${teacherKey}`;
          const existingLineIndex = periodTeacherLineIndex.get(mapKey);

          if (Number.isInteger(existingLineIndex)) {
            if (!mergedCommonLessonsByTeacher[mapKey]) {
              mergedCommonLessonsByTeacher[mapKey] = [];
            }
            mergedCommonLessonsByTeacher[mapKey].push(classLabel);
            return;
          }

          lines.push(`${p}. saat — ${classLabel}: Grup Birleştirilecek - ${teacherName}`);
        });

        Object.entries(mergedCommonLessonsByTeacher).forEach(([mapKey, classLabels]) => {
          const lineIndex = periodTeacherLineIndex.get(mapKey);
          if (!Number.isInteger(lineIndex) || !lines[lineIndex]) return;
          const uniqLabels = Array.from(new Set(classLabels)).filter(Boolean);
          if (uniqLabels.length === 0) return;
          lines[lineIndex] = `${lines[lineIndex]} [Grup Birleştirilecek: ${uniqLabels.join(', ')}]`;
        });
      }

      Object.entries(locked || {}).forEach(([key, teacherId]) => {
        if (teacherId !== MANUAL_ADMIN_TEACHER_ID) return;
        const [lockDay, lockPeriod, classId] = key.split('|');
        if (lockDay !== day || Number(lockPeriod) !== Number(p)) return;
        const c = classes.find(x => x.classId === classId);
        lines.push(`${p}. saat — ${c?.className || classId}: İdare kontrolünde`);
      });
    }

    const header = `Tarih: ${displayDate}`;
    if (lines.length === 0) {
      return [`${header}`, `(Bu tarih için atanmış görev bulunmuyor)`];
    }
    return [header, ...lines];
  }, [day, periods, classes, teachers, assignment, locked, displayDate, classAbsence, commonLessons, absentMap]);

  // Emojili & WhatsApp Odaklı Biçim
  const whatsAppText = useMemo(() => {
    if (!assignment || !assignment[day] || !periods || !classes || !teachers) {
      return `📋 *NÖBETÇİ ÖĞRETMEN GÖREVLENDİRME LİSTESİ*\n📅 *Tarih:* ${displayDate}\n\n(Görevlendirme verisi bulunmuyor)`;
    }

    const lines = [
      `📋 *NÖBETÇİ ÖĞRETMEN GÖREVLENDİRME LİSTESİ*`,
      `📅 *Tarih:* ${displayDate}`,
      ``
    ];

    let totalDuties = 0;

    for (const p of periods) {
      const arr = assignment[day]?.[p] || [];
      const commonEntries = Object.entries(commonLessons?.[day]?.[p] || {});
      const adminLocked = Object.entries(locked || {}).filter(([key, teacherId]) => {
        if (teacherId !== MANUAL_ADMIN_TEACHER_ID) return false;
        const [lockDay, lockPeriod] = key.split('|');
        return lockDay === day && Number(lockPeriod) === Number(p);
      });

      if (arr.length === 0 && commonEntries.length === 0 && adminLocked.length === 0) {
        continue;
      }

      lines.push(`🕒 *${p}. DERS*`);

      // Görevlendirmeler
      arr.forEach(a => {
        totalDuties++;
        const c = classes.find(x => x.classId === a.classId);
        const t = teachers.find(x => x.teacherId === a.teacherId);
        const absId = classAbsence?.[day]?.[p]?.[a.classId];
        const abs = absId ? absentMap[absId] : null;
        const reason = abs ? (REASON_LABELS[abs.reason] || abs.reason) : "";
        const suffix = abs ? ` _(${abs.name} - ${reason})_` : "";
        const teacherDisplayName = t?.teacherName || (a.teacherId.startsWith('auto_') ? 'Bilinmeyen Öğretmen' : a.teacherId);
        const systemDayMap = { 'Sun': 'sunday', 'Mon': 'monday', 'Tue': 'tuesday', 'Wed': 'wednesday', 'Thu': 'thursday', 'Fri': 'friday', 'Sat': 'saturday' };
        const systemDay = systemDayMap[day] || day;
        const dutyLocation = t?.dutyLocations?.[systemDay] ? ` [${t.dutyLocations[systemDay]}]` : '';

        lines.push(`• *${c?.className || a.classId}*: ${teacherDisplayName}${dutyLocation}${suffix}`);
      });

      // Ortak Dersler
      if (commonEntries.length > 0) {
        commonEntries.forEach(([classId, teacherVal]) => {
          totalDuties++;
          const c = classes.find(x => x.classId === classId);
          const t = teachers.find(x => x.teacherId === teacherVal);
          const teacherName = t?.teacherName || teacherVal;
          lines.push(`• *${c?.className || classId}*: Grup Birleştirilecek - ${teacherName}`);
        });
      }

      // İdare Kontrolü
      if (adminLocked.length > 0) {
        adminLocked.forEach(([key]) => {
          totalDuties++;
          const [, , classId] = key.split('|');
          const c = classes.find(x => x.classId === classId);
          lines.push(`• *${c?.className || classId}*: İdare kontrolünde`);
        });
      }

      lines.push(``);
    }

    if (totalDuties === 0) {
      lines.push(`(Bu tarih için atanmış görev bulunmuyor)`);
    } else {
      lines.push(`📌 _Tüm nöbetçi öğretmenlerimize iyi çalışmalar dileriz._`);
    }

    return lines.join('\n');
  }, [day, periods, classes, teachers, assignment, locked, displayDate, classAbsence, commonLessons, absentMap]);

  const activeDisplayContent = formatMode === 'whatsapp' ? whatsAppText : plainTextArray.join('\n');

  const copy = () => {
    try {
      navigator.clipboard?.writeText(activeDisplayContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error('Kopyalama hatası:', err);
    }
  };

  const shareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsAppText)}`;
    window.open(url, '_blank');
  };

  const handleCopyMerged = (teacherName, message) => {
    try {
      navigator.clipboard?.writeText(message);
      setCopiedMergedTeacher(teacherName);
      setTimeout(() => setCopiedMergedTeacher(null), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleShareMerged = (message) => {
    const text = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleCopyAllMerged = () => {
    if (mergedTeacherNotifications.length === 0) return;
    const allText = mergedTeacherNotifications
      .map((item) => item.message)
      .join('\n\n' + '━'.repeat(25) + '\n\n');
    try {
      navigator.clipboard?.writeText(allText);
      setCopiedAllMerged(true);
      setTimeout(() => setCopiedAllMerged(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  // Yazdırma (İki Kolon) - JPG Export için
  const headerLine = plainTextArray[0] || '';
  const bodyLines = plainTextArray.slice(1);
  const _n = bodyLines.length;
  const _mid = _n / 2;
  const _linePeriods = bodyLines.map(line => {
    const m = line.match(/^(\d+)\.\s*saat/i);
    return m ? parseInt(m[1], 10) : null;
  });
  const _naturalBreaks = [];
  for (let i = 0; i < _n - 1; i++) {
    const p1 = _linePeriods[i];
    const p2 = _linePeriods[i + 1];
    if (p1 !== null && p2 !== null && p2 - p1 > 1) {
      _naturalBreaks.push(i + 1);
    }
  }
  const _splitAt = _naturalBreaks.length > 0
    ? _naturalBreaks.reduce((best, pos) => Math.abs(pos - _mid) < Math.abs(best - _mid) ? pos : best)
    : Math.ceil(_n / 2);
  const leftLines = bodyLines.slice(0, _splitAt);
  const rightLines = bodyLines.slice(_splitAt);

  return (
    <div className={`${styles.assignmentTextContainer} no-print`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.25rem' }}>📱</span>
          <h3 className={styles.title} style={{ margin: 0 }}>Görevlendirme Metni & WhatsApp Paylaşımı</h3>
        </div>

        {/* Biçim Seçici Butonlar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setFormatMode('whatsapp')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: formatMode === 'whatsapp' ? '2px solid #22c55e' : '1.5px solid #cbd5e1',
              background: formatMode === 'whatsapp' ? '#f0fdf4' : '#fff',
              color: formatMode === 'whatsapp' ? '#166534' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>💬</span>
            <span>Nöbetçi WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setFormatMode('plain')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: formatMode === 'plain' ? '2px solid #4f46e5' : '1.5px solid #cbd5e1',
              background: formatMode === 'plain' ? '#eef2ff' : '#fff',
              color: formatMode === 'plain' ? '#4338ca' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>📄</span>
            <span>Düz Metin Formatı</span>
          </button>

          <button
            type="button"
            onClick={() => setFormatMode('merged')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: formatMode === 'merged' ? '2px solid #0284c7' : '1.5px solid #cbd5e1',
              background: formatMode === 'merged' ? '#f0f9ff' : '#fff',
              color: formatMode === 'merged' ? '#0369a1' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>👥</span>
            <span>Dersi Birleştirilenler</span>
            {mergedTeacherNotifications.length > 0 && (
              <span
                style={{
                  background: formatMode === 'merged' ? '#0284c7' : '#e0f2fe',
                  color: formatMode === 'merged' ? '#ffffff' : '#0369a1',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  marginLeft: '2px'
                }}
              >
                {mergedTeacherNotifications.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* MOD 1 & 2: Normal Nöbetçi Çizelgesi Metni (WhatsApp / Düz Metin) */}
      {formatMode !== 'merged' ? (
        <div className={styles.screenOnly}>
          <textarea
            readOnly
            value={activeDisplayContent}
            rows={Math.max(8, activeDisplayContent.split('\n').length)}
            className={styles.textarea}
            style={{
              fontFamily: formatMode === 'whatsapp' ? 'system-ui, -apple-system, sans-serif' : 'monospace',
              lineHeight: 1.5,
              fontSize: '0.92rem',
              background: formatMode === 'whatsapp' ? '#fdfdfd' : '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 16px'
            }}
          />

          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={shareWhatsApp}
              className="btn"
              style={{
                background: '#22c55e',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                padding: '9px 18px',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.25)',
                cursor: 'pointer'
              }}
            >
              <span>💬</span>
              <span>WhatsApp ile Gönder</span>
            </button>

            <button
              type="button"
              onClick={copy}
              className="btn btn-primary"
              style={{
                fontWeight: 700,
                padding: '9px 20px',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <span>{copied ? '✅' : '📋'}</span>
              <span>{copied ? 'Panoya Kopyalandı!' : 'Metni Kopyala'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* MOD 3: Dersi Birleştirilen Öğretmenlere Özel Mesajlar */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              padding: '12px 16px',
              background: '#eff6ff',
              border: '1.5px solid #bfdbfe',
              borderRadius: '12px',
              color: '#1e40af',
              fontSize: '0.86rem',
              lineHeight: 1.5,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>ℹ️</span>
            <div>
              <strong>Dersi Birleştirilen Öğretmenler Bilgilendirme Servisi:</strong>
              <div style={{ marginTop: '2px', color: '#1e3a8a' }}>
                Bu öğretmenlerimiz o gün nöbetçi olmayabilecekleri için genel nöbetçi listesini almayabilirler. Aşağıdaki hazır WhatsApp mesajlarını tek tıkla kopyalayabilir veya doğrudan WhatsApp üzerinden öğretmenlerimize gönderebilirsiniz.
              </div>
            </div>
          </div>

          {mergedTeacherNotifications.length === 0 ? (
            <div
              style={{
                padding: '36px 20px',
                textAlign: 'center',
                background: '#f8fafc',
                border: '1.5px dashed #cbd5e1',
                borderRadius: '12px',
                color: '#64748b'
              }}
            >
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🎉</span>
              <strong style={{ fontSize: '1rem', color: '#334155' }}>Grup Birleştirmesi Bulunmuyor</strong>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
                Bu gün için dersi/grubu birleştirilen herhangi bir öğretmen bulunmamaktadır.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>
                  {mergedTeacherNotifications.length} Öğretmen İçin Özel Mesaj Hazırlandı
                </span>
                <button
                  type="button"
                  onClick={handleCopyAllMerged}
                  style={{
                    background: copiedAllMerged ? '#ecfdf5' : '#f8fafc',
                    color: copiedAllMerged ? '#047857' : '#334155',
                    border: copiedAllMerged ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    padding: '6px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{copiedAllMerged ? '✅' : '📋'}</span>
                  <span>{copiedAllMerged ? 'Tüm Mesajlar Kopyalandı' : 'Tümünü Toplu Kopyala'}</span>
                </button>
              </div>

              {mergedTeacherNotifications.map((item, idx) => (
                <div
                  key={item.teacherName + idx}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.88rem'
                        }}
                      >
                        {item.teacherName.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.96rem' }}>
                          {item.teacherName}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {item.lessons
                            .map((l) => `${l.className} (${l.period}. saat${l.subject ? ` - ${l.subject}` : ''})`)
                            .join(' • ')}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleShareMerged(item.message)}
                        style={{
                          background: '#22c55e',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 1px 4px rgba(34, 197, 94, 0.2)'
                        }}
                      >
                        <span>💬</span>
                        <span>WhatsApp ile Gönder</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyMerged(item.teacherName, item.message)}
                        style={{
                          background: copiedMergedTeacher === item.teacherName ? '#e0e7ff' : '#f8fafc',
                          color: copiedMergedTeacher === item.teacherName ? '#4338ca' : '#334155',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>{copiedMergedTeacher === item.teacherName ? '✅' : '📋'}</span>
                        <span>{copiedMergedTeacher === item.teacherName ? 'Kopyalandı!' : 'Kopyala'}</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    readOnly
                    value={item.message}
                    rows={item.lessons.length > 1 ? 6 : 4}
                    style={{
                      width: '100%',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      fontSize: '0.88rem',
                      lineHeight: 1.5,
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#1e293b',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Yazıcı için: iki kolon - html2canvas için optimize edilmiş yapı */}
      <div className={styles.printOnly} style={{ width: '100%', fontFamily: 'Times New Roman, serif', fontSize: '8.5pt', color: '#000' }}>
        <div style={{ display: 'block', margin: '0 0 2px 0', padding: 0, fontSize: '8.5pt', lineHeight: '1.15' }}>{headerLine}</div>
        <div style={{ display: 'block', width: '100%', position: 'relative' }}>
          <div style={{ display: 'inline-block', width: '48%', verticalAlign: 'top', paddingRight: '2%', boxSizing: 'border-box' }}>
            {leftLines.map((line, index) => (
              <div key={`L${index}`} style={{ display: 'block', width: '100%', margin: 0, padding: 0, fontSize: '8.5pt', lineHeight: '1.15', whiteSpace: 'normal', wordWrap: 'break-word' }}>{line}</div>
            ))}
          </div>
          <div style={{ display: 'inline-block', width: '48%', verticalAlign: 'top', boxSizing: 'border-box' }}>
            {rightLines.map((line, index) => (
              <div key={`R${index}`} style={{ display: 'block', width: '100%', margin: 0, padding: 0, fontSize: '8.5pt', lineHeight: '1.15', whiteSpace: 'normal', wordWrap: 'break-word' }}>{line}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
