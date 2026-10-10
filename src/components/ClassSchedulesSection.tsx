import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { normalizeClassName, sortClassNames } from '../utils/classNameUtils';
import styles from './ClassSchedulesSection.module.css';

const SUBJECT_GRADIENTS = [
  'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', // Indigo
  'linear-gradient(135deg, #059669 0%, #10b981 100%)', // Emerald
  'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)', // Sky
  'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', // Amber
  'linear-gradient(135deg, #db2777 0%, #ec4899 100%)', // Pink
  'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)', // Violet
  'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', // Orange
  'linear-gradient(135deg, #0891b2 0%, #14b8a6 100%)', // Cyan
  'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', // Blue
  'linear-gradient(135deg, #4b5563 0%, #6b7280 100%)', // Slate
];

const getSubjectGradient = (subject: string) => {
  if (!subject) return SUBJECT_GRADIENTS[0];
  const hash = subject.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  return SUBJECT_GRADIENTS[Math.abs(hash) % SUBJECT_GRADIENTS.length];
};

const shortenSubjectName = (subject: string) => {
  if (!subject) return '';
  const mappings: Record<string, string> = {
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

  const words = subject.split(/[\s-]+/).filter((w: string) => w.toLowerCase() !== 've' && w.length > 0);

  if (words.length > 1) {
    return words.map((w: string) => w.charAt(0).toLocaleUpperCase('tr-TR')).join('');
  } else {
    if (subject.length <= 4) return subject;
    let firstPart = subject.substring(0, 3);
    return firstPart.charAt(0).toLocaleUpperCase('tr-TR') + firstPart.substring(1).toLocaleLowerCase('tr-TR');
  }
};

export default function ClassSchedulesSection({
  classes,
  teacherSchedules,
  IconComponent,
  onUploadSinifProgrami,
  classLocations,
  onDeleteAll,
  onDeriveFromTeachers,
}: any) {
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('Tümü');
  const [branchFilter, setBranchFilter] = useState('Tümü');

  const days = [
    { id: 'monday', label: 'Pazartesi' },
    { id: 'tuesday', label: 'Salı' },
    { id: 'wednesday', label: 'Çarşamba' },
    { id: 'thursday', label: 'Perşembe' },
    { id: 'friday', label: 'Cuma' },
  ];

  const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const classSchedulesMap = useMemo(() => {
    const map: any = {};

    // First populate from classLocations if available (PRIMARY source)
    Object.entries(classLocations || {}).forEach(([rawCName, cDays]) => {
      const classNames =
        typeof rawCName === 'string'
          ? rawCName.split(',').map((s) => s.trim()).filter(Boolean)
          : [rawCName];

      classNames.forEach((rawClassName) => {
        const cName = normalizeClassName(rawClassName);
        if (!cName) return;
        if (!map[cName]) map[cName] = {};
        Object.entries((cDays as any) || {}).forEach(([day, cPeriods]) => {
          if (!map[cName][day]) map[cName][day] = {};
          Object.entries((cPeriods as any) || {}).forEach(([period, locData]: [string, any]) => {
            const location = typeof locData === 'string' ? locData : locData?.location;
            const subject = typeof locData === 'string' ? '' : locData?.subject;
            const teacherNamesStr = typeof locData === 'string' ? '' : locData?.teacherNamesStr;

            if (!map[cName][day][period]) {
              map[cName][day][period] = {
                teachers: [],
                subject: '',
                location: '',
                _isFallback: false,
                _hasShortNames: false,
              };
            }
            if (location) map[cName][day][period].location = location;
            if (subject) map[cName][day][period].subject = subject;

            if (Array.isArray(locData?.teachers) && locData.teachers.length > 0) {
              map[cName][day][period].teachers = [...locData.teachers];
              map[cName][day][period]._hasShortNames = false;
            } else if (teacherNamesStr) {
              map[cName][day][period].teachers = teacherNamesStr
                .split(/[\/\-]/)
                .map((s: string) => s.trim())
                .filter(Boolean);
              map[cName][day][period]._hasShortNames = true;
            }
          });
        });
      });
    });

    // Then merge from teacherSchedules
    Object.entries(teacherSchedules || {}).forEach(([tName, tDays]) => {
      Object.entries((tDays as any) || {}).forEach(([day, tPeriods]) => {
        Object.entries((tPeriods as any) || {}).forEach(([period, cId]: [string, any]) => {
          if (cId && typeof cId === 'string' && cId.trim()) {
            const classNames = cId.split(',').map((s: string) => s.trim()).filter(Boolean);
            classNames.forEach((rawClassName: string) => {
              const className = normalizeClassName(rawClassName);
              if (!className) return;
              if (!map[className]?.[day]?.[period]) return;

              if (map[className][day][period]._hasShortNames) {
                map[className][day][period].teachers = [];
                map[className][day][period]._hasShortNames = false;
              }

              if (!map[className][day][period].teachers.includes(tName)) {
                map[className][day][period].teachers.push(tName);
              }
            });
          }
        });
      });
    });

    return map;
  }, [classLocations, teacherSchedules]);

  const allClassNames = useMemo(() => {
    const classSet = new Set<string>();
    classes?.forEach((c: any) => {
      if (c.className) {
        const norm = normalizeClassName(c.className);
        if (norm) classSet.add(norm);
      }
    });
    Object.keys(classSchedulesMap).forEach((cName) => {
      if (cName) classSet.add(cName);
    });
    return sortClassNames(Array.from(classSet));
  }, [classes, classSchedulesMap]);

  const filteredClasses = useMemo(() => {
    return allClassNames.filter((cName) => {
      const matchesSearch = cName
        .toLocaleLowerCase('tr-TR')
        .includes(searchTerm.toLocaleLowerCase('tr-TR').trim());
      if (!matchesSearch) return false;

      if (levelFilter !== 'Tümü') {
        const gradeMatch = cName.match(/\b(\d{1,2})\b/);
        if (!gradeMatch || gradeMatch[1] !== levelFilter) return false;
      }

      if (branchFilter !== 'Tümü') {
        if (!cName.startsWith(branchFilter)) return false;
      }

      return true;
    });
  }, [allClassNames, searchTerm, levelFilter, branchFilter]);

  const hasLocations = Object.keys(classLocations || {}).length > 0;

  // Selected class stats for modal
  const selectedClassStats = useMemo(() => {
    if (!selectedClass || !classSchedulesMap[selectedClass]) {
      return { totalLessons: 0, uniqueTeachers: 0, uniqueSubjects: 0 };
    }
    const schedule = classSchedulesMap[selectedClass];
    let total = 0;
    const teachersSet = new Set<string>();
    const subjectsSet = new Set<string>();

    Object.values(schedule).forEach((daySchedule: any) => {
      Object.values(daySchedule).forEach((lesson: any) => {
        if (lesson && (lesson.teachers?.length > 0 || lesson.subject || lesson.location)) {
          total++;
          if (lesson.subject) subjectsSet.add(lesson.subject);
          lesson.teachers?.forEach((t: string) => teachersSet.add(t));
        }
      });
    });

    return {
      totalLessons: total,
      uniqueTeachers: teachersSet.size,
      uniqueSubjects: subjectsSet.size,
    };
  }, [selectedClass, classSchedulesMap]);

  const getLevelAvatarStyle = (level: string) => {
    if (level === '9') return styles.avatar9;
    if (level === '10') return styles.avatar10;
    if (level === '11') return styles.avatar11;
    if (level === '12') return styles.avatar12;
    return styles.avatarOther;
  };

  return (
    <div className={styles.container} role="tabpanel" id="panel-classSchedules" aria-labelledby="tab-classSchedules">
      {/* ---------------- Top Toolbar & Filters ---------------- */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>
            <IconComponent name="search" size={16} />
          </span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Sınıf adına göre ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => setSearchTerm('')}
              title="Aramayı Temizle"
            >
              <IconComponent name="x" size={14} />
            </button>
          )}
        </div>

        {/* Level filter group */}
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Seviye:</span>
          {['Tümü', '9', '10', '11', '12'].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setLevelFilter(lvl)}
              className={`${styles.filterChip} ${levelFilter === lvl ? styles.filterChipActive : ''}`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Branch / Alan filter group */}
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Alan:</span>
          {['Tümü', 'AMP', 'ATP'].map((br) => (
            <button
              key={br}
              type="button"
              onClick={() => setBranchFilter(br)}
              className={`${styles.filterChip} ${branchFilter === br ? styles.filterChipActive : ''}`}
            >
              {br}
            </button>
          ))}
        </div>

        <div className={styles.countBadge}>
          <IconComponent name="users" size={13} />
          <span>
            Toplam <strong className={styles.countBadgeStrong}>{allClassNames.length}</strong> Sınıf
            {filteredClasses.length !== allClassNames.length && (
              <> (Filtrelenen: <strong>{filteredClasses.length}</strong>)</>
            )}
          </span>
        </div>

        <div className={styles.toolbarActions}>
          <input
            type="file"
            id="sinif-programi-upload"
            accept=".xls,.xlsx"
            style={{ display: 'none' }}
            onChange={onUploadSinifProgrami}
          />
          <label
            className={styles.uploadBtn}
            htmlFor="sinif-programi-upload"
            title="Sınıf El Programı Yükle"
          >
            <IconComponent name="upload" size={15} />
            <span>Sınıf El Programı Yükle</span>
          </label>

          {onDeriveFromTeachers && !hasLocations && (
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={onDeriveFromTeachers}
              title="Öğretmen ders programlarından sınıf programlarını türet"
            >
              <IconComponent name="calendar" size={14} />
              <span>Öğretmen Programından Türet</span>
            </button>
          )}

          {hasLocations && (
            <button
              type="button"
              className={styles.deleteAllBtn}
              onClick={onDeleteAll}
              title="Tüm sınıf programlarını sil"
            >
              <IconComponent name="trash" size={14} />
              <span>Tümünü Sil</span>
            </button>
          )}
        </div>
      </div>

      {/* ---------------- Cards Grid ---------------- */}
      {allClassNames.length === 0 ? (
        <div className={styles.emptyContainer}>
          <div className={styles.emptyIcon}>
            <IconComponent name="calendar" size={30} />
          </div>
          <div className={styles.emptyTitle}>Henüz Sınıf Ders Programı Yüklenmedi</div>
          <div className={styles.emptyDesc}>
            Excel dosyasını (&quot;Sınıf El Programı Yükle&quot;) yükleyerek veya öğretmen programlarından türeterek sınıfların haftalık ders programlarını oluşturabilirsiniz.
          </div>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className={styles.emptyContainer}>
          <div className={styles.emptyIcon}>
            <IconComponent name="search" size={28} />
          </div>
          <div className={styles.emptyTitle}>Sonuç Bulunamadı</div>
          <div className={styles.emptyDesc}>
            Seçilen arama veya filtre kriterlerine uygun sınıf programı bulunamadı.
          </div>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {filteredClasses.map((cName) => {
            const schedule = classSchedulesMap[cName] || {};

            const dayStats = days
              .map(({ id, label }) => {
                const count = Object.keys(schedule[id] || {}).length;
                return { key: id, label, count };
              });

            const totalLessons = dayStats.reduce((sum, day) => sum + day.count, 0);
            const activeDaysCount = dayStats.filter((d) => d.count > 0).length;
            const level = cName.match(/\b\d{1,2}\b/)?.[0] || 'other';

            return (
              <div
                key={cName}
                className={styles.card}
                onClick={() => setSelectedClass(cName)}
                title={`${cName} haftalık ders programını görüntüle`}
              >
                <div className={styles.cardTop}>
                  <div className={`${styles.avatar} ${getLevelAvatarStyle(level)}`}>
                    {level !== 'other' ? level : <IconComponent name="users" size={18} />}
                  </div>
                  <div className={styles.classInfo}>
                    <div className={styles.className}>{cName}</div>
                    <div className={styles.totalBadge}>
                      <IconComponent name="book" size={12} />
                      <span>{totalLessons} Saat Ders ({activeDaysCount} Gün)</span>
                    </div>
                  </div>
                </div>

                {/* Weekday distribution mini capsules */}
                <div className={styles.daysContainer}>
                  {dayStats.map(({ key, label, count }) => {
                    const isActive = count > 0;
                    return (
                      <div
                        key={key}
                        className={`${styles.dayCapsule} ${
                          isActive ? styles.dayCapsuleActive : styles.dayCapsuleInactive
                        }`}
                        title={`${label}: ${count > 0 ? `${count} saat ders` : 'Ders yok'}`}
                      >
                        <span className={styles.dayLabel}>{label.slice(0, 3)}</span>
                        <span className={styles.dayCount}>{count > 0 ? `${count}s` : '-'}</span>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.cardFooter}>
                  <span>Haftalık Program</span>
                  <span className={styles.viewDetailsLink}>
                    <span>İncele</span>
                    <IconComponent name="chevronRight" size={13} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- Class Schedule Modal ---------------- */}
      <Modal
        isOpen={!!selectedClass}
        onClose={() => setSelectedClass('')}
        title={`${selectedClass} - Haftalık Sınıf Ders Programı`}
        size="xlarge"
      >
        <div className={styles.modalBody}>
          {/* Top Summary Stats */}
          <div className={styles.summaryRow}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <IconComponent name="book" size={18} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Toplam Ders</span>
                <span className={styles.statValue}>{selectedClassStats.totalLessons} Saat</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <IconComponent name="users" size={18} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Görevli Öğretmen</span>
                <span className={styles.statValue}>{selectedClassStats.uniqueTeachers} Kişi</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <IconComponent name="calendar" size={18} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Farklı Ders/Branş</span>
                <span className={styles.statValue}>{selectedClassStats.uniqueSubjects} Branş</span>
              </div>
            </div>
          </div>

          {/* Schedule Table */}
          <div className={styles.modalTableContainer}>
            <table className={styles.modalTable}>
              <thead>
                <tr>
                  <th className={styles.modalDayHeader}>Günler</th>
                  {periods.map((period) => (
                    <th key={period} className={styles.modalPeriodHeader}>
                      {period}. Saat
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.id}>
                    <td className={styles.modalDayCell}>{day.label}</td>
                    {periods.map((period) => {
                      const lesson = classSchedulesMap[selectedClass]?.[day.id]?.[period];
                      const isEmpty =
                        !lesson ||
                        (lesson.teachers.length === 0 && !lesson.subject && !lesson.location);

                      return (
                        <td
                          key={period}
                          className={`${styles.modalScheduleCell} ${
                            isEmpty ? styles.modalEmptyCell : ''
                          }`}
                        >
                          {isEmpty ? (
                            <span className={styles.modalEmptyIndicator}>-</span>
                          ) : (
                            <div
                              className={styles.lessonBadge}
                              style={{
                                background: getSubjectGradient(lesson.subject || 'Ders'),
                              }}
                              title={`${lesson.subject || 'Ders'} | ${lesson.teachers.join(', ')} ${
                                lesson.location ? `(${lesson.location})` : ''
                              }`}
                            >
                              {lesson.subject && (
                                <span className={styles.subjectName}>
                                  {shortenSubjectName(lesson.subject)}
                                </span>
                              )}

                              {lesson.teachers.length > 0 && (
                                <div className={styles.teacherNameSub}>
                                  {lesson.teachers.join(', ')}
                                </div>
                              )}

                              {lesson.location && (
                                <span className={styles.locationChip}>
                                  📍 {lesson.location}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
}
