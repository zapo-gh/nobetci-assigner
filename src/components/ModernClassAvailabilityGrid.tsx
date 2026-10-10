// @ts-nocheck
import React, { memo, useState, useMemo } from 'react';
import styles from './ModernClassAvailabilityGrid.module.css';
import EmptyState from './EmptyState.jsx';
import { normalizeClassName, compareClassNames, getClassroomName, isImesLesson } from '../utils/classNameUtils.js';

function getClassBadgeColor(className = '') {
  const match = className.match(/(\d+)/);
  if (match) {
    const grade = match[1];
    if (grade === '9') return 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)';
    if (grade === '10') return 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)';
    if (grade === '11') return 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)';
    if (grade === '12') return 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)';
  }
  return 'linear-gradient(135deg, #334155 0%, #64748b 100%)';
}

function getClassAvatarLabel(className = '') {
  const trimmed = className.trim();
  const match = trimmed.match(/(\d+)\s*[-/]?\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)/i);
  if (match) {
    const grade = match[1];
    const branch = match[2] ? match[2].charAt(0).toUpperCase() : '';
    return `${grade}${branch}`;
  }
  const numOnly = trimmed.match(/(\d+)/);
  if (numOnly) return numOnly[1];
  return trimmed.slice(0, 3).toUpperCase();
}

function ModernClassAvailabilityGrid({
  classes = [],
  periods = [],
  classFree = {},
  onToggleClassFree,
  onSetAllClassesFree,
  absentPeople = [],
  classAbsence = {},
  onSelectAbsence,
  commonLessons = {},
  onOpenCommonLessonModal,
  onDelete,
  day = 'Mon',
  IconComponent,
  teachers = [],
  classLocations = {},
  onDropdownStateChange,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'free' | 'full' | 'missing'

  // Split periods into Morning (<= 5) and Afternoon (> 5)
  const morningPeriods = useMemo(
    () => periods.filter((p) => Number(p) <= 5),
    [periods]
  );
  const afternoonPeriods = useMemo(
    () => periods.filter((p) => Number(p) > 5),
    [periods]
  );

  const dividerPeriod = useMemo(() => {
    if (morningPeriods.length > 0) {
      return morningPeriods[morningPeriods.length - 1];
    }
    return 5;
  }, [morningPeriods]);

  // Classroom mappings by class ID
  const classroomByClassId = useMemo(() => {
    const map = new Map();
    (classes || []).forEach((cls) => {
      const cName = cls?.className || '';
      if (!cName) return;
      const room = getClassroomName(classLocations, cName, day);
      if (room) {
        map.set(cls.classId, room);
      }
    });
    return map;
  }, [classes, classLocations, day]);

  const teacherMap = useMemo(() => {
    if (!Array.isArray(teachers)) return new Map();
    return new Map(teachers.map((t) => [t.teacherId, t]));
  }, [teachers]);

  const getAbsentInfo = (absentId) => {
    return absentPeople.find((a) => a.absentId === absentId);
  };

  const getCommonLessonInfo = (dayKey, period, classId) => {
    const teacherVal = commonLessons?.[dayKey]?.[period]?.[classId];
    if (!teacherVal) return null;
    const teacher = teacherMap.get(teacherVal);
    return teacher?.teacherName || teacherVal;
  };

  const normalizeWhiteSpace = (value = '') => value.trim().replace(/\s+/g, ' ');
  const removeTrailingHyphen = (value = '') => value.replace(/[-\s]+$/, '');

  const formatTeacherName = (name = '', teacherId) => {
    const fromTeacher = teacherId ? teacherMap.get(teacherId)?.teacherName : '';
    const base = removeTrailingHyphen(normalizeWhiteSpace(fromTeacher || name));
    if (!base) return '';

    const parts = base.split(' ');
    if (parts.length === 0) return '';

    const first = parts[0];
    const last = parts.length > 1 ? parts[parts.length - 1] : '';

    const firstInitial = first.charAt(0) ? first.charAt(0).toLocaleUpperCase('tr-TR') : '';
    const lastFormatted = last ? last.toLocaleUpperCase('tr-TR') : '';

    if (!lastFormatted) {
      return `${firstInitial}.`;
    }

    return `${firstInitial}. ${lastFormatted}`;
  };

  const getAbsentBadgeClass = (reason) => {
    const r = (reason || '').toLowerCase();
    if (r.includes('rapor')) return styles.badgeRapor;
    if (r.includes('sevk')) return styles.badgeSevk;
    if (r.includes('izin')) return styles.badgeIzin;
    if (r.includes('gorev') || r.includes('görev')) return styles.badgeGorev;
    if (r.includes('mazeret')) return styles.badgeMazeret;
    return styles.badgeMuted;
  };

  const getProgressBarColor = (percentage) => {
    if (percentage < 30) return styles.bgSuccess;
    if (percentage < 70) return styles.bgWarning;
    return styles.bgError;
  };

  // Sort classes naturally (9-A, 9-B, 10-A...)
  const sortedClasses = useMemo(() => {
    return [...(classes || [])].sort((a, b) => {
      const nameA = normalizeClassName(a.className || '') || a.className || '';
      const nameB = normalizeClassName(b.className || '') || b.className || '';
      return compareClassNames(nameA, nameB);
    });
  }, [classes]);

  // Calculate free periods count for a class
  const getClassFreeCount = (classId) => {
    return periods.reduce((count, p) => {
      const s = classFree?.[day]?.[p] || new Set();
      const selectedAbsent = classAbsence?.[day]?.[p]?.[classId];
      const isSelected = s.has(classId) || !!selectedAbsent;
      return count + (isSelected ? 1 : 0);
    }, 0);
  };

  // Check if class has missing absent assignments
  const hasMissingAbsentSelection = (classId) => {
    return periods.some((p) => {
      const s = classFree?.[day]?.[p] || new Set();
      const selectedAbsent = classAbsence?.[day]?.[p]?.[classId] ?? '';
      const isSelected = s.has(classId) || Boolean(selectedAbsent);
      const isCommon = selectedAbsent === 'COMMON_LESSON';
      return isSelected && !selectedAbsent && !isCommon;
    });
  };

  // Per-period free count across all classes
  const getPeriodFreeCount = (period) => {
    return classes.reduce((count, cls) => {
      const s = classFree?.[day]?.[period] || new Set();
      const selectedAbsent = classAbsence?.[day]?.[period]?.[cls.classId];
      const isSelected = s.has(cls.classId) || !!selectedAbsent;
      return count + (isSelected ? 1 : 0);
    }, 0);
  };

  // Filter classes based on search query and status chip
  const filteredClasses = useMemo(() => {
    return sortedClasses.filter((cls) => {
      const displayName = normalizeClassName(cls.className) || cls.className || '';
      const room = classroomByClassId.get(cls.classId) || '';

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = displayName.toLowerCase().includes(q);
        const matchRoom = room.toLowerCase().includes(q);
        if (!matchName && !matchRoom) return false;
      }

      if (filterStatus !== 'all') {
        const freeCount = getClassFreeCount(cls.classId);
        if (filterStatus === 'free' && freeCount === 0) return false;
        if (filterStatus === 'full' && freeCount > 0) return false;
        if (filterStatus === 'missing' && !hasMissingAbsentSelection(cls.classId)) return false;
      }

      return true;
    });
  }, [sortedClasses, searchQuery, filterStatus, classFree, classAbsence, day, periods, classroomByClassId]);

  // Statistics for top filter chips
  const stats = useMemo(() => {
    let free = 0;
    let full = 0;
    let missing = 0;

    classes.forEach((cls) => {
      const count = getClassFreeCount(cls.classId);
      if (count > 0) free++;
      else full++;
      if (hasMissingAbsentSelection(cls.classId)) missing++;
    });

    return { total: classes.length, free, full, missing };
  }, [classes, classFree, classAbsence, day, periods]);

  return (
    <div className={styles.container}>
      {/* ---------------- Top Toolbar / Filters ---------------- */}
      <div className={styles.toolbar}>
        {/* Search input */}
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>
            {IconComponent ? <IconComponent name="search" size={16} /> : '🔍'}
          </span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Sınıf veya derslik ara (örn: 9-A, B-05)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => setSearchQuery('')}
              title="Aramayı Temizle"
            >
              {IconComponent ? <IconComponent name="x" size={14} /> : '×'}
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className={styles.filterChips}>
          <button
            type="button"
            className={`${styles.filterChip} ${filterStatus === 'all' ? styles.filterChipActive : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            Tümü ({stats.total})
          </button>
          <button
            type="button"
            className={`${styles.filterChip} ${filterStatus === 'free' ? styles.filterChipActive : ''}`}
            onClick={() => setFilterStatus('free')}
            title="Boş dersi olan sınıflar"
          >
            Boş Dersi Olanlar ({stats.free})
          </button>
          <button
            type="button"
            className={`${styles.filterChip} ${filterStatus === 'full' ? styles.filterChipActive : ''}`}
            onClick={() => setFilterStatus('full')}
            title="Tüm saatleri dolu olan sınıflar"
          >
            Dolu Sınıflar ({stats.full})
          </button>
          {stats.missing > 0 && (
            <button
              type="button"
              className={`${styles.filterChip} ${styles.filterChipWarning} ${
                filterStatus === 'missing' ? styles.filterChipWarningActive : ''
              }`}
              onClick={() => setFilterStatus('missing')}
              title="Boş dersi olup gelmeyen öğretmeni seçilmeyen sınıflar"
            >
              ⚠️ Öğretmen Seçilmeyen ({stats.missing})
            </button>
          )}
        </div>
      </div>

      {/* ---------------- Table Container ---------------- */}
      <div className={styles.tableContainer}>
        <table className={styles.gridTable}>
          <thead>
            {/* Level 1 Group Header: Sabah vs Öğle distinction */}
            <tr className={styles.superHeaderRow}>
              <th className={`${styles.stickyCol} ${styles.stuckShadow}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Sınıf Bilgisi &amp; Derslik</span>
                  <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                    {filteredClasses.length} {filteredClasses.length !== classes.length ? `/ ${classes.length}` : ''}
                  </span>
                </div>
              </th>

              {morningPeriods.length > 0 && (
                <th
                  colSpan={morningPeriods.length}
                  className={`${styles.morningGroupHeader} ${styles.dividerRight}`}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {IconComponent ? <IconComponent name="sun" size={14} /> : '☀️'}
                    <strong>Sabah Grubu (1 - {dividerPeriod}. Saat)</strong>
                  </span>
                </th>
              )}

              {afternoonPeriods.length > 0 && (
                <th colSpan={afternoonPeriods.length} className={styles.afternoonGroupHeader}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {IconComponent ? <IconComponent name="sun" size={14} /> : '🌤️'}
                    <strong>
                      Öğleden Sonra ({Number(dividerPeriod) + 1} - {periods[periods.length - 1]}. Saat)
                    </strong>
                  </span>
                </th>
              )}
            </tr>

            {/* Level 2 Sub-Header: Individual period columns with quick toggle */}
            <tr className={styles.subHeaderRow}>
              <th className={`${styles.stickyCol} ${styles.stuckShadow}`}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-faint, #64748b)', fontWeight: '500' }}>
                  Sınıf &amp; Konum
                </span>
              </th>

              {periods.map((p) => {
                const freeCount = getPeriodFreeCount(p);
                const totalCount = classes.length;
                const isAllFree = totalCount > 0 && freeCount === totalCount;
                const isDivider = p === dividerPeriod;

                return (
                  <th
                    key={p}
                    className={`${isDivider ? styles.dividerRight : ''}`}
                    style={{ textAlign: 'center', minWidth: '70px', padding: '6px 2px' }}
                  >
                    <button
                      type="button"
                      className={styles.periodHeaderBtn}
                      onClick={() => onSetAllClassesFree?.(day, p, !isAllFree)}
                      title={`${p}. saat için tüm sınıfları ${isAllFree ? 'dolu yap' : 'boş ders yap'}`}
                    >
                      <span className={styles.periodHeaderNum}>{p}</span>
                      <span className={styles.periodHeaderCount}>
                        {freeCount} boş
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {filteredClasses.length === 0 ? (
              <tr>
                <td colSpan={periods.length + 1}>
                  {classes.length === 0 ? (
                    <div className={styles.emptyStateContainer}>
                      <EmptyState
                        IconComponent={IconComponent}
                        icon="home"
                        title="Henüz Sınıf Eklenmedi"
                        description='Yeni bir sınıf eklemek için yukarıdaki "Yeni Sınıf Ekle" butonunu kullanabilirsiniz.'
                      />
                    </div>
                  ) : (
                    <div className={styles.emptyStateContainer}>
                      <div className={styles.emptyStateTitle}>Aramaya Uygun Sınıf Bulunamadı</div>
                      <div className={styles.emptyStateDesc}>
                        &quot;{searchQuery}&quot; aramasına veya seçili filtreye uygun sınıf bulunmuyor.
                      </div>
                      <button
                        type="button"
                        className={styles.filterChip}
                        style={{ marginTop: '8px' }}
                        onClick={() => {
                          setSearchQuery('');
                          setFilterStatus('all');
                        }}
                      >
                        Filtreleri Temizle
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              filteredClasses.map((cls) => {
                const displayName = normalizeClassName(cls.className) || cls.className || '';
                const classroom = classroomByClassId.get(cls.classId);
                const freeCount = getClassFreeCount(cls.classId);
                const isFree = freeCount > 0;

                return (
                  <tr key={cls.classId}>
                    {/* Sticky Class Profile Column */}
                    <td className={`${styles.stickyCol} ${styles.stuckShadow}`}>
                      <div className={styles.classCard}>
                        <div className={styles.classMain}>
                          {/* Grade-level colored avatar */}
                          <div
                            className={styles.classAvatar}
                            style={{ background: getClassBadgeColor(displayName) }}
                            title={displayName}
                          >
                            {getClassAvatarLabel(displayName)}
                          </div>

                          <div className={styles.classMeta}>
                            <span className={styles.className} title={displayName}>
                              {displayName}
                            </span>

                            {isImesLesson(displayName) ? (
                              <span
                                className={styles.classroomChip}
                                style={{
                                  background: 'rgba(245, 158, 11, 0.12)',
                                  color: '#b45309',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  fontWeight: 600,
                                }}
                                title="İşletmelerde Mesleki Eğitim (Okul dışı görev - Nöbetçi atanmaz)"
                              >
                                <span>🏢</span>
                                <span>Okul Dışı (İMES)</span>
                              </span>
                            ) : classroom ? (
                              <span className={styles.classroomChip} title={`Derslik / Konum: ${classroom}`}>
                                <span>📍</span>
                                <span>{classroom}</span>
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Free count badge & Delete button */}
                        <div className={styles.classActions}>
                          <span
                            className={`${styles.freeCountBadge} ${
                              isFree ? styles.freeCountActive : styles.freeCountZero
                            }`}
                            title={`${freeCount} boş ders`}
                          >
                            {isFree ? `${freeCount} boş` : 'Dolu'}
                          </span>

                          {onDelete && (
                            <button
                              type="button"
                              className={styles.deleteBtn}
                              onClick={() => onDelete(cls.classId)}
                              title={`${displayName} sınıfını sil`}
                              aria-label={`${displayName} sınıfını sil`}
                            >
                              {IconComponent && <IconComponent name="trash" size={14} />}
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Interactive Time Capsules & Absentee Dropdowns */}
                    {periods.map((p) => {
                      const set = classFree?.[day]?.[p] || new Set();
                      const selectedAbsent = classAbsence?.[day]?.[p]?.[cls.classId] ?? '';
                      const isSelected = set.has(cls.classId) || Boolean(selectedAbsent);
                      const isCommonLesson = selectedAbsent === 'COMMON_LESSON';
                      const needsAbsentSelection = isSelected && !selectedAbsent && !isCommonLesson;
                      const absentInfo = selectedAbsent && !isCommonLesson ? getAbsentInfo(selectedAbsent) : null;
                      const commonTeacherName = isCommonLesson ? getCommonLessonInfo(day, p, cls.classId) : null;
                      const isDivider = p === dividerPeriod;

                      return (
                        <td
                          key={p}
                          className={`${styles.timeCapsuleCell} ${isDivider ? styles.dividerRight : ''} dnd-target`}
                        >
                          <div className={styles.cellContentWrapper}>
                            {/* Interactive Time Capsule */}
                            <button
                              type="button"
                              className={`${styles.timeCapsule} ${
                                isSelected ? styles.capsuleActive : styles.capsuleInactive
                              }`}
                              onClick={() => onToggleClassFree?.(day, p, cls.classId)}
                              title={`${displayName} - ${p}. saat (${
                                isSelected ? 'Boş Ders / Mazeretli' : 'Ders Var / Dolu'
                              })`}
                              aria-pressed={isSelected}
                              aria-label={`${displayName} ${p}. saat ${isSelected ? 'boş ders' : 'dolu'}`}
                            >
                              <span className={styles.capsuleNumber}>{p}</span>
                              {isSelected ? (
                                <span className={styles.capsuleStatusIcon}>✓</span>
                              ) : (
                                <span className={styles.capsuleStatusDash}>-</span>
                              )}
                            </button>

                            {/* Dropdown & Absent Info under Capsule when selected */}
                            {isSelected && (
                              <div className={styles.dropdownContainer}>
                                <select
                                  value={selectedAbsent}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === 'COMMON_LESSON') {
                                      onOpenCommonLessonModal?.(day, p, cls.classId);
                                    } else {
                                      onSelectAbsence?.(day, p, cls.classId, value);
                                    }
                                    onDropdownStateChange?.(false);
                                  }}
                                  className={`${styles.modernSelect} ${
                                    needsAbsentSelection ? styles.selectError : ''
                                  }`}
                                  title={needsAbsentSelection ? 'Gelmeyen öğretmen seçimi zorunlu!' : ''}
                                  onFocus={() => onDropdownStateChange?.(true)}
                                  onBlur={() => {
                                    setTimeout(() => onDropdownStateChange?.(false), 50);
                                  }}
                                >
                                  <option value="">— Mazeret Seç —</option>
                                  {!isImesLesson(cls.className) && (
                                    <option value="COMMON_LESSON">📚 Birleştir</option>
                                  )}
                                  {absentPeople.map((absent) => (
                                    <option key={absent.absentId} value={absent.absentId}>
                                      {formatTeacherName(absent.name, absent.teacherId)} ({absent.reason})
                                    </option>
                                  ))}
                                </select>
                                <div className={styles.selectArrow} />

                                {/* Selected Absent Reason Badge */}
                                {absentInfo && (
                                  <span
                                    className={`${styles.absentBadgeChip} ${getAbsentBadgeClass(absentInfo.reason)}`}
                                    title={`Mazeret: ${absentInfo.reason}`}
                                  >
                                    {absentInfo.reason.charAt(0).toUpperCase() + absentInfo.reason.slice(1).toLowerCase()}
                                  </span>
                                )}

                                {/* Fallback absent badge */}
                                {selectedAbsent && !isCommonLesson && !absentInfo && (
                                  <span
                                    className={`${styles.absentBadgeChip} ${styles.badgeMuted}`}
                                    title={selectedAbsent}
                                  >
                                    {selectedAbsent}
                                  </span>
                                )}

                                {/* Common Lesson Badge */}
                                {isCommonLesson && (
                                  <span
                                    className={`${styles.absentBadgeChip} ${styles.badgeCommon}`}
                                    title={`Ders Birleştirildi: ${commonTeacherName || ''}`}
                                  >
                                    📚 {commonTeacherName ? formatTeacherName(commonTeacherName) : 'Birleştir'}
                                  </span>
                                )}

                                {/* Warning for Missing Selection */}
                                {needsAbsentSelection && (
                                  <span className={styles.warningMissingBadge} title="Lütfen mazeretli öğretmeni seçin">
                                    ⚠️ Seçin
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Table Footer: Column Summary */}
          {filteredClasses.length > 0 && (
            <tfoot>
              <tr className={styles.footerRow}>
                <td className={`${styles.stickyCol} ${styles.stuckShadow}`}>
                  <span>Ders Başına Boş Sınıf</span>
                </td>

                {periods.map((p) => {
                  const freeCount = getPeriodFreeCount(p);
                  const totalCount = classes.length;
                  const percentage = totalCount > 0 ? Math.round((freeCount / totalCount) * 100) : 0;
                  const progressBarColor = getProgressBarColor(percentage);
                  const isDivider = p === dividerPeriod;

                  return (
                    <td
                      key={p}
                      className={`${isDivider ? styles.dividerRight : ''}`}
                      style={{ textAlign: 'center', padding: '8px 2px' }}
                    >
                      <div className={styles.footerPeriodStat}>
                        <span className={styles.footerCount}>
                          {freeCount}/{totalCount}
                        </span>
                        <div className={styles.progressBarTrack}>
                          <div
                            className={`${styles.progressBarFill} ${progressBarColor}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className={styles.footerPercent}>%{percentage}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Guide Card at Bottom */}
      <div className={styles.guideCard}>
        <div className={styles.guideTitle}>
          <span>💡</span>
          <span>Sınıf Boş Ders Kullanım Rehberi</span>
        </div>
        <ul className={styles.guideList}>
          <li className={styles.guideItem}>
            <span>•</span>
            <span>Boş ders saatini açıp kapatmak için <strong>zaman kapsüllerine</strong> tıklayın.</span>
          </li>
          <li className={styles.guideItem}>
            <span>•</span>
            <span>Boş ders işaretlenen saatler için altındaki menüden <strong>gelmeyen öğretmeni</strong> seçin.</span>
          </li>
          <li className={styles.guideItem}>
            <span>•</span>
            <span>İki sınıf aynı saatte birleşiyorsa <strong>&quot;📚 Birleştir&quot;</strong> seçeneğini kullanın.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default memo(ModernClassAvailabilityGrid);