// @ts-nocheck
import React, { useMemo } from 'react';
import Modal from './Modal.jsx';
import styles from './TeacherScheduleModal.module.css';
import { getPeriodTimes, getCurrentPeriodInfo } from '../utils/periodTimes.js';

const CLASS_PALETTES = [
  'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', // Indigo
  'linear-gradient(135deg, #059669 0%, #10b981 100%)', // Emerald
  'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)', // Sky
  'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', // Amber
  'linear-gradient(135deg, #db2777 0%, #ec4899 100%)', // Pink
  'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)', // Violet
  'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', // Orange
  'linear-gradient(135deg, #0891b2 0%, #14b8a6 100%)', // Cyan
];

const CLASS_DOT_COLORS = [
  '#4f46e5',
  '#059669',
  '#0284c7',
  '#d97706',
  '#db2777',
  '#7c3aed',
  '#ea580c',
  '#0891b2',
];

const TeacherScheduleModal = ({
  isOpen,
  onClose,
  teacherName,
  schedule,
  IconComponent: Icon = null,
  teacherSchedulesList = [],
  onSelectTeacher,
}) => {
  if (!schedule || !teacherName) return null;

  const dayLabels = {
    monday: 'Pazartesi',
    tuesday: 'Salı',
    wednesday: 'Çarşamba',
    thursday: 'Perşembe',
    friday: 'Cuma',
  };

  const periodTimes = useMemo(() => getPeriodTimes(), []);
  const currentInfo = useMemo(() => getCurrentPeriodInfo(periodTimes), [periodTimes]);

  const periods = useMemo(() => {
    let maxP = 10;
    Object.values(schedule || {}).forEach((daySchedule) => {
      Object.keys(daySchedule || {}).forEach((p) => {
        const pNum = Number(p);
        if (pNum > maxP) maxP = pNum;
      });
    });
    const list = [];
    for (let i = 1; i <= Math.max(maxP, 10); i++) list.push(i);
    return list;
  }, [schedule]);

  const extractClassCode = (fullClassName) => {
    if (!fullClassName || !fullClassName.trim()) return '';
    const text = String(fullClassName).trim();
    const match = text.match(/^(?:(?:AMP|ATP|MESEM)\s+)?([0-9]+(?:-[.A-ZÇĞIİÖŞÜ]+)+)/i);
    if (match) return match[0];
    return text;
  };

  const uniqueClasses = useMemo(() => {
    const classes = new Set();
    Object.values(schedule).forEach((daySchedule) => {
      Object.values(daySchedule).forEach((className) => {
        if (className && className.trim()) {
          const classCode = extractClassCode(className);
          if (classCode) {
            classes.add(classCode);
          }
        }
      });
    });
    return Array.from(classes);
  }, [schedule]);

  const getClassGradient = (fullClassName) => {
    if (!fullClassName) return 'transparent';
    const classCode = extractClassCode(fullClassName);
    const index = uniqueClasses.indexOf(classCode);
    if (index === -1) return CLASS_PALETTES[0];
    return CLASS_PALETTES[index % CLASS_PALETTES.length];
  };

  const getClassDotColor = (classCode) => {
    const index = uniqueClasses.indexOf(classCode);
    if (index === -1) return CLASS_DOT_COLORS[0];
    return CLASS_DOT_COLORS[index % CLASS_DOT_COLORS.length];
  };

  const shortenSubjectName = (subject) => {
    if (!subject) return '';
    const mappings = {
      'TÜRK DİLİ VE EDEBİYATI': 'TDE',
      'MESLEKİ GELİŞİM ATÖLYESİ': 'MGA',
      'TARİH': 'Trh',
      'KİMYA': 'Kmy',
      'COĞRAFYA': 'Coğr',
      'BİYOLOJİ': 'Biy',
      'MATEMATİK': 'Mat',
      'FİZİK': 'Fiz',
      'İNGİLİZCE': 'İng',
      'BEDEN EĞİTİMİ VE SPOR': 'BES',
      'DİN KÜLTÜRÜ VE AHLAK BİLGİSİ': 'DKAB',
      'FELSEFE': 'Fel',
      'GÖRSEL SANATLAR': 'GS',
      'MÜZİK': 'Müz',
      'REHBERLİK': 'Reh',
      'SAĞLIK BİLGİSİ VE TRAFİK KÜLTÜRÜ': 'SBTK',
      'BİLİŞİM TEKNOLOJİLERİNİN TEMELLERİ': 'BTT',
      'PROGRAMLAMA TEMELLERİ': 'PT',
      'BİLGİSAYARLI TASARIM UYGULAMALARI': 'BTU',
      'SEÇMELİ': 'S.',
    };

    let upperSubject = subject.toLocaleUpperCase('tr-TR').trim();
    for (const [key, value] of Object.entries(mappings)) {
      if (upperSubject.includes(key) && key !== 'SEÇMELİ') {
        if (upperSubject.includes('SEÇMELİ')) {
          return 'S.' + value;
        }
        return value;
      }
    }

    const words = subject.split(/[\s-]+/).filter((w) => w.toLowerCase('tr-TR') !== 've' && w.length > 0);
    if (words.length > 1) {
      return words.map((w) => w.charAt(0).toLocaleUpperCase('tr-TR')).join('');
    } else {
      if (subject.length <= 4) return subject;
      let firstPart = subject.substring(0, 3);
      return firstPart.charAt(0).toLocaleUpperCase('tr-TR') + firstPart.substring(1).toLocaleLowerCase('tr-TR');
    }
  };

  const extractSubjectName = (fullClassName) => {
    if (!fullClassName || !fullClassName.trim()) return '';
    const text = String(fullClassName).trim();
    const classCode = extractClassCode(text);
    if (!classCode) return '';
    let subject = text.substring(classCode.length).trim();
    subject = subject.replace(/^[\s\-\/\:]+/, '').trim();
    return subject;
  };

  const totalLessons = useMemo(() => {
    return Object.values(schedule).reduce((total, day) => total + Object.keys(day).length, 0);
  }, [schedule]);

  const activeDaysCount = useMemo(() => {
    return Object.values(schedule).filter((day) => Object.keys(day).length > 0).length;
  }, [schedule]);

  const currentTeacherIndex = useMemo(() => {
    if (!teacherName || !Array.isArray(teacherSchedulesList) || teacherSchedulesList.length === 0) {
      return -1;
    }
    return teacherSchedulesList.findIndex(([name]) => name === teacherName);
  }, [teacherName, teacherSchedulesList]);

  const hasPrevTeacher = currentTeacherIndex > 0;
  const hasNextTeacher = currentTeacherIndex >= 0 && currentTeacherIndex < teacherSchedulesList.length - 1;

  const handlePrevTeacher = () => {
    if (hasPrevTeacher && onSelectTeacher) {
      const [prevName, prevSchedule] = teacherSchedulesList[currentTeacherIndex - 1];
      onSelectTeacher(prevName, prevSchedule);
    }
  };

  const handleNextTeacher = () => {
    if (hasNextTeacher && onSelectTeacher) {
      const [nextName, nextSchedule] = teacherSchedulesList[currentTeacherIndex + 1];
      onSelectTeacher(nextName, nextSchedule);
    }
  };

  const teacherNavLabel = currentTeacherIndex >= 0 ? `${currentTeacherIndex + 1} / ${teacherSchedulesList.length}` : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${teacherName} - Haftalık Ders Programı`}
      size="large"
      onPrev={hasPrevTeacher ? handlePrevTeacher : undefined}
      onNext={hasNextTeacher ? handleNextTeacher : undefined}
      hasPrev={hasPrevTeacher}
      hasNext={hasNextTeacher}
      navLabel={teacherNavLabel}
    >
      <div className={styles.modalBody}>
        {/* Top Summary Stats */}
        <div className={styles.summaryRow}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              {Icon ? <Icon name="book" size={18} /> : '📚'}
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Toplam Ders</span>
              <span className={styles.statValue}>{totalLessons} Saat</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              {Icon ? <Icon name="users" size={18} /> : '👥'}
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Farklı Sınıf</span>
              <span className={styles.statValue}>{uniqueClasses.length} Sınıf</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              {Icon ? <Icon name="calendar" size={18} /> : '📅'}
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Aktif Gün</span>
              <span className={styles.statValue}>{activeDaysCount} Gün</span>
            </div>
          </div>
        </div>

        {/* Active Now Banner (shows if current time matches a school period) */}
        {currentInfo.isWeekday && currentInfo.currentPeriod && (
          <div className={styles.activeNowBanner}>
            <span style={{ fontSize: '1rem' }}>🕒</span>
            <span>
              Şu An: <strong>{currentInfo.dayLabel}</strong>,{' '}
              <strong>{currentInfo.currentPeriod}. Ders</strong>{' '}
              {currentInfo.timeRange ? `(${currentInfo.timeRange})` : ''}
              {currentInfo.isExact ? ' — Ders Devam Ediyor' : ' — Teneffüs / Sıradaki Ders'}
            </span>
          </div>
        )}

        {/* Schedule Table */}
        <div className={styles.tableContainer}>
          <table className={styles.scheduleTable}>
            <thead>
              <tr>
                <th className={styles.dayHeader}>Günler</th>
                {periods.map((period) => {
                  const isCurrentPeriodCol = currentInfo.isWeekday && currentInfo.currentPeriod === period;
                  return (
                    <th
                      key={period}
                      className={`${styles.periodHeader} ${isCurrentPeriodCol ? styles.currentPeriodHeader : ''}`}
                    >
                      <div>{period}. Saat</div>
                      {periodTimes[period] && (
                        <div className={styles.periodHeaderTime}>{periodTimes[period]}</div>
                      )}
                      {isCurrentPeriodCol && (
                        <span className={styles.currentPeriodBadge}>Şu An</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Object.entries(dayLabels).map(([dayKey, dayLabel]) => {
                const isToday = currentInfo.isWeekday && currentInfo.dayKey === dayKey;

                return (
                  <tr key={dayKey}>
                    <td className={`${styles.dayCell} ${isToday ? styles.todayDayCell : ''}`}>
                      <div>{dayLabel}</div>
                      {isToday && <span className={styles.todayBadge}>Bugün</span>}
                    </td>
                    {periods.map((period) => {
                      const fullClassName = schedule[dayKey]?.[period];
                      const classCode = extractClassCode(fullClassName);
                      const subjectText = extractSubjectName(fullClassName);
                      const shortSubject = shortenSubjectName(subjectText);
                      const isEmpty = !classCode || classCode.trim() === '';
                      const isCurrentLesson = isToday && currentInfo.currentPeriod === period;

                      return (
                        <td
                          key={period}
                          className={`${styles.scheduleCell} ${isEmpty ? styles.emptyCell : ''} ${
                            isCurrentLesson ? styles.currentLessonCell : ''
                          }`}
                        >
                          {isEmpty ? (
                            isCurrentLesson ? (
                              <div className={styles.emptyCurrentCell}>
                                <span className={styles.emptyIndicator}>-</span>
                                <span className={styles.emptyCurrentTag}>Boş Ders</span>
                              </div>
                            ) : (
                              <span className={styles.emptyIndicator}>-</span>
                            )
                          ) : (
                            <div
                              className={`${styles.classBadge} ${isCurrentLesson ? styles.currentLessonBadge : ''}`}
                              style={{ background: getClassGradient(fullClassName) }}
                              title={`${classCode} ${subjectText ? `- ${subjectText}` : ''}${
                                isCurrentLesson ? ' (Şu Anki Ders)' : ''
                              }`}
                            >
                              {isCurrentLesson && (
                                <div className={styles.currentLessonIndicator}>
                                  <span className={styles.currentLessonDot} />
                                  <span className={styles.currentLessonTag}>ŞU AN</span>
                                </div>
                              )}
                              <span className={styles.classCode}>{classCode}</span>
                              {shortSubject && (
                                <span className={styles.subjectText}>{shortSubject}</span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Classes Legend */}
        {uniqueClasses.length > 0 && (
          <div className={styles.legendContainer}>
            <div className={styles.legendTitle}>Ders Verilen Sınıflar</div>
            <div className={styles.legendItems}>
              {uniqueClasses.map((classCode) => (
                <div key={classCode} className={styles.legendItem}>
                  <span
                    className={styles.legendDot}
                    style={{ backgroundColor: getClassDotColor(classCode) }}
                  />
                  <span>{classCode}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TeacherScheduleModal;
