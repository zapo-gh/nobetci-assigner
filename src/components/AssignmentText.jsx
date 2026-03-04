import React, { useMemo } from "react";
import styles from './AssignmentText.module.css';
import { MANUAL_ADMIN_TEACHER_ID } from '../utils/assignDuty.js'
import { decodeClassAbsenceValue } from '../utils/classAbsence.js'

const REASON_LABELS = {
  "raporlu": "Raporlu",
  "sevkli": "Sevkli",
  "izinli": "İzinli",
  "gorevli-izinli": "Görevli İzinli",
  "diger": "Diğer"
};

export default function AssignmentText({
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
  const absentMap = useMemo(() => {
    const m = {};
    (absentPeople || []).forEach(a => {
      if (!a || !a.absentId) return;
      if (Array.isArray(a.days) && a.days.length > 0 && !a.days.includes(day)) return;
      m[a.absentId] = { name: a.name, reason: a.reason };
    });
    return m;
  }, [absentPeople, day]);

  const text = useMemo(() => {
    const lines = [];
    // Güvenlik kontrolü: Gerekli veriler yoksa boş metin döndür
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

      // Her görevlendirmeyi ayrı satıra yaz
      arr.forEach(a => {
        const c = classes.find(x => x.classId === a.classId);
        const t = teachers.find(x => x.teacherId === a.teacherId);
        const absId = classAbsence?.[day]?.[p]?.[a.classId];
        const abs = absId ? absentMap[absId] : null;
        const reason = abs ? (REASON_LABELS[abs.reason] || abs.reason) : "";
        const suffix = abs ? ` (${abs.name} - ${reason})` : "";
        const teacherDisplayName = t?.teacherName || (a.teacherId.startsWith('auto_') ? 'Bilinmeyen Öğretmen' : a.teacherId);
        const lineText = `${p}. saat — ${c?.className || a.classId}: ${teacherDisplayName}${suffix}`;
        lines.push(lineText);
        const teacherKey = normalizeTeacherKey(teacherDisplayName);
        const mapKey = `${p}|${teacherKey}`;
        if (!periodTeacherLineIndex.has(mapKey)) {
          periodTeacherLineIndex.set(mapKey, lines.length - 1);
        }
      });

      // Common lessons for this period
      if (commonLessons?.[day]?.[p]) {
        const mergedCommonLessonsByTeacher = {};
        Object.entries(commonLessons[day][p]).forEach(([classId, teacherVal]) => {
          const c = classes.find(x => x.classId === classId);
          const teacherName = teacherById[teacherVal]?.teacherName || teacherVal;
          const rawValue = classAbsence?.[day]?.[p]?.[classId]
          const { commonLessonOwnerId } = decodeClassAbsenceValue(rawValue)
          const ownerInfo = commonLessonOwnerId ? absentMap[commonLessonOwnerId] : null
          const ownerReason = ownerInfo ? (REASON_LABELS[ownerInfo.reason] || ownerInfo.reason) : ''
          const ownerSuffix = ownerInfo ? ` (${ownerInfo.name} - ${ownerReason})` : ''
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

          lines.push(`${p}. saat — ${classLabel}: Ders Birleştirilecek - ${teacherName}`);
        });

        Object.entries(mergedCommonLessonsByTeacher).forEach(([mapKey, classLabels]) => {
          const lineIndex = periodTeacherLineIndex.get(mapKey);
          if (!Number.isInteger(lineIndex) || !lines[lineIndex]) return;
          const uniqLabels = Array.from(new Set(classLabels)).filter(Boolean);
          if (uniqLabels.length === 0) return;
          lines[lineIndex] = `${lines[lineIndex]} [Ders Birleştirilecek: ${uniqLabels.join(', ')}]`;
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
      return [`${header}`, `(Bu tarih için atanmış görev bulunmuyor)`]; // Dizi olarak döndür
    }
    return [header, ...lines]; // Dizi olarak döndür
  }, [day, periods, classes, teachers, assignment, locked, displayDate, classAbsence, commonLessons, absentMap]);

  const copy = () => {
    try {
      // Kopyalama işlemi için metni birleştir
      navigator.clipboard?.writeText(text.join("\n"));
      // Kopyalama başarılı olduğunda bir bildirim gösterilebilir.
    } catch (err) {
      console.error('Kopyalama hatası:', err);
    }
  };

  // Yazdırma için: başlık ve 1-6 / 7-10 saatlerini iki ayrı kolona böl
  const headerLine = Array.isArray(text) ? text[0] : String(text || '');
  const bodyLines = Array.isArray(text) ? text.slice(1) : [];
  const leftLines = bodyLines.filter(l => {
    const m = l.match(/^(\d+)\.\s*saat/i);
    return m ? parseInt(m[1], 10) <= 6 : true;
  });
  const rightLines = bodyLines.filter(l => {
    const m = l.match(/^(\d+)\.\s*saat/i);
    return m ? parseInt(m[1], 10) >= 7 : false;
  });

  return (
    <div className={styles.assignmentTextContainer}>
      <h3 className={styles.title}>Görevlendirme Metni</h3>

      {/* Ekran için */}
      <div className={styles.screenOnly}>
        <textarea
          readOnly
          value={text.join("\n")} // textarea için metni birleştir
          rows={Math.max(5, text.length)}
          className={styles.textarea}
        />
        <div className={styles.toolbar}>
          <button onClick={copy} className="btn">Metni Kopyala</button>
        </div>
      </div>

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
