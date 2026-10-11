// @ts-nocheck
import React, { useState, useMemo, memo } from 'react';
import styles from './ModernAbsenteeList.module.css';
import EmptyState from './EmptyState';
import Modal from './Modal';
import { normalizeClassName, isImesLesson } from '../utils/classNameUtils';
import { normalizeForComparison } from '../utils/nameNormalization';

const DAY_LABELS = {
  monday: 'Pazartesi',
  tuesday: 'Salı',
  wednesday: 'Çarşamba',
  thursday: 'Perşembe',
  friday: 'Cuma',
  Mon: 'Pazartesi',
  Tue: 'Salı',
  Wed: 'Çarşamba',
  Thu: 'Perşembe',
  Fri: 'Cuma'
};

const normalizeDayKey = (day) => {
  const d = String(day || '').trim().toLowerCase();
  if (d.startsWith('mon') || d.startsWith('paz')) return 'monday';
  if (d.startsWith('tue') || d.startsWith('sal')) return 'tuesday';
  if (d.startsWith('wed') || d.startsWith('car') || d.startsWith('çar')) return 'wednesday';
  if (d.startsWith('thu') || d.startsWith('per')) return 'thursday';
  if (d.startsWith('fri') || d.startsWith('cum')) return 'friday';
  return d;
};

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] || '').slice(0, 2).toUpperCase();
  const first = parts[0] || '';
  const last = parts[parts.length - 1] || '';
  return ((first[0] || '') + (last[0] || '')).toUpperCase();
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', // Indigo - Violet
  'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', // Sky - Blue
  'linear-gradient(135deg, #059669 0%, #0d9488 100%)', // Emerald - Teal
  'linear-gradient(135deg, #d97706 0%, #ea580c 100%)', // Amber - Orange
  'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)', // Pink - Purple
  'linear-gradient(135deg, #0891b2 0%, #0284c7 100%)', // Cyan - Blue
  'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)', // Rose - Red
];

function getAvatarGradient(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index] || AVATAR_GRADIENTS[0];
}

function getReasonBadgeClass(reason = '') {
  const r = (reason || '').toLowerCase().trim();
  if (r.includes('rapor')) return styles.reasonRaporlu;
  if (r.includes('sevk')) return styles.reasonSevkli;
  if (r.includes('görevli') || r.includes('gorevli')) return styles.reasonGorevliIzinli;
  if (r.includes('mazeret')) return styles.reasonMazeretIzinli;
  if (r.includes('izin')) return styles.reasonIzinli;
  return styles.reasonDiger;
}

function formatDateDisplay(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return `${d} ${months[m - 1]} ${y}`;
  } catch {
    return dateStr;
  }
}

/**
 * Calculates affected lessons and classes for an absent teacher based on days and timeSlot
 */
function getTeacherDayInfos(person, teacherSchedules, classLocations) {
  if (!person || !teacherSchedules) return [];

  const targetNorm = normalizeForComparison(person.name || person.teacherName || '');
  if (!targetNorm) return [];

  const matchedTeacherKey = Object.keys(teacherSchedules).find(
    k => normalizeForComparison(k) === targetNorm
  );

  if (!matchedTeacherKey) return [];

  const teacherSchedule = teacherSchedules[matchedTeacherKey] || {};

  const rawDays = Array.isArray(person.days) && person.days.length > 0
    ? person.days
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  const timeSlot = person.timeSlot || 'full';
  const isPeriodInSlot = (period) => {
    if (timeSlot === 'morning') return period >= 1 && period <= 5;
    if (timeSlot === 'afternoon') return period >= 6;
    return true;
  };

  return rawDays.map(d => {
    const dayKey = normalizeDayKey(d);
    const dayLabel = DAY_LABELS[d] || DAY_LABELS[dayKey] || d;
    const daySchedule = teacherSchedule[dayKey] || {};

    const lessons = [];
    const distinctClassesSet = new Set();
    const scheduleByPeriod = {};

    for (let period = 1; period <= 10; period++) {
      const rawClass = daySchedule[period] || daySchedule[String(period)];
      if (rawClass && typeof rawClass === 'string' && rawClass.trim() && rawClass.trim() !== '-') {
        const className = normalizeClassName(rawClass);
        if (className) {
          const inSlot = isPeriodInSlot(period);
          let subject = '';
          let location = '';
          if (classLocations) {
            const locEntry = classLocations[className]?.[dayKey]?.[period] ||
                             classLocations[rawClass]?.[dayKey]?.[period];
            if (locEntry) {
              subject = typeof locEntry === 'string' ? '' : (locEntry.subject || '');
              location = typeof locEntry === 'string' ? locEntry : (locEntry.location || '');
            }
          }

          const isImes = isImesLesson(className) || isImesLesson(rawClass) || isImesLesson(subject);

          const lessonObj = {
            period,
            className,
            subject,
            location,
            inSlot,
            isImes
          };

          scheduleByPeriod[period] = lessonObj;

          // İMES (İşletmede Mesleki Eğitim / Koordinatörlük) okul dışı görev olduğu için nöbetçi atanmaz.
          // Yalnızca okul içindeki gerçek dersler boşta kalan ders olarak sayılır.
          if (inSlot && !isImes) {
            distinctClassesSet.add(className);
            lessons.push(lessonObj);
          }
        }
      }
    }

    return {
      dayKey,
      dayLabel,
      totalLessons: lessons.length,
      distinctClasses: Array.from(distinctClassesSet),
      lessons,
      scheduleByPeriod,
      isFreeDay: lessons.length === 0,
      timeSlot
    };
  });
}

function AbsenteeList({
  absentPeople = [],
  onDelete,
  IconComponent,
  teacherSchedules,
  classLocations,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterReason, setFilterReason] = useState('all');
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [selectedModalData, setSelectedModalData] = useState(null);

  // Parse information for all absent teachers
  const parsedTeachers = useMemo(() => {
    return (absentPeople || []).map(person => {
      const dayInfos = getTeacherDayInfos(person, teacherSchedules, classLocations);
      const totalLessons = dayInfos.reduce((sum, info) => sum + info.totalLessons, 0);
      const allDistinctClasses = Array.from(
        new Set(dayInfos.flatMap(info => info.distinctClasses || []))
      );
      return {
        person,
        dayInfos,
        totalLessons,
        allDistinctClasses,
        hasSchedule: dayInfos.length > 0
      };
    });
  }, [absentPeople, teacherSchedules, classLocations]);

  // Metrics summary
  const metrics = useMemo(() => {
    const totalTeachers = parsedTeachers.length;
    const totalLessons = parsedTeachers.reduce((acc, t) => acc + t.totalLessons, 0);
    const affectedClasses = new Set(parsedTeachers.flatMap(t => t.allDistinctClasses)).size;
    return { totalTeachers, totalLessons, affectedClasses };
  }, [parsedTeachers]);

  // Filter counts
  const filterCounts = useMemo(() => {
    const counts = {
      all: parsedTeachers.length,
      raporlu: 0,
      sevkli: 0,
      izinli: 0,
      hasLessons: 0,
      freeDay: 0,
    };
    parsedTeachers.forEach(({ person, totalLessons }) => {
      const r = (person.reason || '').toLowerCase();
      if (r.includes('rapor')) counts.raporlu++;
      else if (r.includes('sevk')) counts.sevkli++;
      else if (r.includes('izin')) counts.izinli++;

      if (totalLessons > 0) counts.hasLessons++;
      else counts.freeDay++;
    });
    return counts;
  }, [parsedTeachers]);

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return parsedTeachers.filter(({ person, allDistinctClasses, totalLessons }) => {
      // Reason filter
      if (filterReason === 'raporlu' && !person.reason?.toLowerCase().includes('rapor')) return false;
      if (filterReason === 'sevkli' && !person.reason?.toLowerCase().includes('sevk')) return false;
      if (filterReason === 'izinli' && !person.reason?.toLowerCase().includes('izin')) return false;
      if (filterReason === 'hasLessons' && totalLessons === 0) return false;
      if (filterReason === 'freeDay' && totalLessons > 0) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = (person.name || '').toLowerCase().includes(query);
        const reasonMatch = (person.reason || '').toLowerCase().includes(query);
        const classMatch = allDistinctClasses.some(c => c.toLowerCase().includes(query));
        if (!nameMatch && !reasonMatch && !classMatch) return false;
      }

      return true;
    });
  }, [parsedTeachers, filterReason, searchQuery]);

  const toggleExpand = (absentId) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(absentId)) {
        next.delete(absentId);
      } else {
        next.add(absentId);
      }
      return next;
    });
  };

  if (!absentPeople || absentPeople.length === 0) {
    return (
      <EmptyState
        IconComponent={IconComponent}
        icon="userX"
        title="Henüz Mazeret Eklenmedi"
        description="Bugün için sisteme girilmiş herhangi bir öğretmen mazereti bulunmuyor."
      />
    );
  }

  return (
    <div className={styles.container}>
      {/* ---------------- Toolbar ---------------- */}
      <div className={styles.toolbar}>
        {/* Search */}
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>
            {IconComponent ? <IconComponent name="search" size={16} /> : '🔍'}
          </span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Öğretmen, mazeret veya sınıf ara (örn. 9-A)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => setSearchQuery('')}
              title="Aramayı temizle"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className={styles.filterChips}>
          <button
            type="button"
            className={`${styles.filterChip} ${filterReason === 'all' ? styles.active : ''}`}
            onClick={() => setFilterReason('all')}
          >
            Tümü
            <span className={styles.filterBadge}>{filterCounts.all}</span>
          </button>

          {filterCounts.raporlu > 0 && (
            <button
              type="button"
              className={`${styles.filterChip} ${filterReason === 'raporlu' ? styles.active : ''}`}
              onClick={() => setFilterReason('raporlu')}
            >
              🔴 Raporlu
              <span className={styles.filterBadge}>{filterCounts.raporlu}</span>
            </button>
          )}

          {filterCounts.sevkli > 0 && (
            <button
              type="button"
              className={`${styles.filterChip} ${filterReason === 'sevkli' ? styles.active : ''}`}
              onClick={() => setFilterReason('sevkli')}
            >
              🟡 Sevkli
              <span className={styles.filterBadge}>{filterCounts.sevkli}</span>
            </button>
          )}

          {filterCounts.izinli > 0 && (
            <button
              type="button"
              className={`${styles.filterChip} ${filterReason === 'izinli' ? styles.active : ''}`}
              onClick={() => setFilterReason('izinli')}
            >
              🔵 İzinli
              <span className={styles.filterBadge}>{filterCounts.izinli}</span>
            </button>
          )}

          <button
            type="button"
            className={`${styles.filterChip} ${filterReason === 'hasLessons' ? styles.active : ''}`}
            onClick={() => setFilterReason('hasLessons')}
          >
            ⚠️ Dersi Olanlar
            <span className={styles.filterBadge}>{filterCounts.hasLessons}</span>
          </button>

          {filterCounts.freeDay > 0 && (
            <button
              type="button"
              className={`${styles.filterChip} ${filterReason === 'freeDay' ? styles.active : ''}`}
              onClick={() => setFilterReason('freeDay')}
            >
              💤 Boş Günler
              <span className={styles.filterBadge}>{filterCounts.freeDay}</span>
            </button>
          )}
        </div>
      </div>

      {/* ---------------- Metrics Summary Bar ---------------- */}
      <div className={styles.metricsBar}>
        <div className={styles.metricsPills}>
          <div className={styles.metricPill}>
            <span>Mazeretli Öğretmen:</span>
            <strong>{metrics.totalTeachers}</strong>
          </div>
          <span>•</span>
          <div className={styles.metricPill}>
            <span>Boşta Kalan Ders:</span>
            <span className={metrics.totalLessons > 0 ? styles.metricBadgeDanger : ''}>
              {metrics.totalLessons} Ders Saati
            </span>
          </div>
          <span>•</span>
          <div className={styles.metricPill}>
            <span>Etkilenen Sınıf:</span>
            <strong>{metrics.affectedClasses} Sınıf</strong>
          </div>
        </div>

        {searchQuery && (
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Bulunan: <strong>{filteredTeachers.length}</strong> / {parsedTeachers.length}
          </span>
        )}
      </div>

      {/* ---------------- Card List ---------------- */}
      {filteredTeachers.length === 0 ? (
        <div className={styles.noResultsBox}>
          <div style={{ fontSize: '2rem' }}>🔍</div>
          <div className={styles.noResultsTitle}>Aramaya uygun mazeret kaydı bulunamadı</div>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Filtreleri temizleyerek veya farklı bir arama yaparak tekrar deneyin.</p>
          <button
            type="button"
            className="btn"
            style={{ marginTop: '8px' }}
            onClick={() => { setSearchQuery(''); setFilterReason('all'); }}
          >
            Filtreleri Temizle
          </button>
        </div>
      ) : (
        <div className={styles.cardsList}>
          {filteredTeachers.map(({ person, dayInfos, totalLessons, allDistinctClasses, hasSchedule }) => {
            const isExpanded = expandedCards.has(person.absentId);
            const initials = getInitials(person.name || '');
            const avatarBg = getAvatarGradient(person.name || '');
            const reasonClass = getReasonBadgeClass(person.reason);
            const primaryDayInfo = dayInfos[0] || null;

            return (
              <div
                key={person.absentId}
                className={`${styles.card} ${totalLessons > 0 ? styles.cardHasLessons : styles.cardFreeDay}`}
              >
                {/* Top Row: Identity + Badges + Actions */}
                <div className={styles.cardHeader}>
                  <div className={styles.teacherIdentity}>
                    {/* Initials Avatar */}
                    <div className={styles.avatar} style={{ background: avatarBg }}>
                      {initials}
                    </div>

                    {/* Name and Badges */}
                    <div className={styles.nameBlock}>
                      <div className={styles.teacherName}>
                        <span>{person.name}</span>
                      </div>

                      <div className={styles.badgeRow}>
                        {/* Tarih Rozeti */}
                        {person.date && (
                          <span
                            style={{
                              background: '#f8fafc',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              padding: '2px 8px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title={`Mazeret Tarihi: ${person.date}`}
                          >
                            📅 {formatDateDisplay(person.date)}
                          </span>
                        )}

                        {/* Reason badge */}
                        <span className={`${styles.reasonBadge} ${reasonClass}`}>
                          {person.reason || 'Mazeretli'}
                        </span>

                        {/* Time slot badge */}
                        <span
                          className={`${styles.slotBadge} ${
                            person.timeSlot === 'morning'
                              ? styles.slotMorning
                              : person.timeSlot === 'afternoon'
                              ? styles.slotAfternoon
                              : styles.slotFull
                          }`}
                        >
                          {person.timeSlot === 'morning'
                            ? '🌅 1-5. Ders (Öğleden Önce)'
                            : person.timeSlot === 'afternoon'
                            ? '🌇 6-10. Ders (Öğleden Sonra)'
                            : 'Tam Gün (1-10)'}
                        </span>

                        {/* Impact badge */}
                        {hasSchedule ? (
                          totalLessons > 0 ? (
                            <span className={styles.impactBadgeDanger}>
                              ⚠️ {totalLessons} Ders Boşta
                              {allDistinctClasses.length > 0 && ` (${allDistinctClasses.join(', ')})`}
                            </span>
                          ) : (
                            <span className={styles.impactBadgeMuted}>
                              💤 Boş Gün (Ders Yok)
                            </span>
                          )
                        ) : (
                          <span className={styles.impactBadgeMuted}>
                            Program Yüklenmemiş
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions (Details + Delete) */}
                  <div className={styles.cardActions}>
                    {hasSchedule && totalLessons > 0 && (
                      <button
                        type="button"
                        className={`${styles.toggleDetailsBtn} ${isExpanded ? styles.toggleDetailsBtnActive : ''}`}
                        onClick={() => toggleExpand(person.absentId)}
                        title="Ders programı detaylarını aç/kapat"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
                          {isExpanded ? (
                            <polyline points="18 15 12 9 6 15" />
                          ) : (
                            <polyline points="6 9 12 15 18 9" />
                          )}
                        </svg>
                        <span>{isExpanded ? 'Detayları Gizle' : `Dersleri Gör (${totalLessons})`}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => onDelete(person.absentId)}
                      title={`${person.name} adlı öğretmenin mazeretini sil`}
                      aria-label="Mazereti Sil"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0, pointerEvents: 'none' }}>
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Middle Row: Timeline 1-10 Period Capsules */}
                {primaryDayInfo && (
                  <div className={styles.timelineContainer}>
                    <div className={styles.timelineLabel}>Ders Saatleri Dağılımı (1 - 10)</div>
                    <div className={styles.capsulesRow}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => {
                        const lesson = primaryDayInfo.scheduleByPeriod?.[p];
                        const isImes = !!lesson && lesson.isImes;
                        const isAffected = !!lesson && lesson.inSlot && !isImes;
                        const isOutOfSlot = !!lesson && !lesson.inSlot;

                        let capsuleClass = styles.capsuleFree;
                        if (isImes) capsuleClass = styles.capsuleImes;
                        else if (isAffected) capsuleClass = styles.capsuleAffected;
                        else if (isOutOfSlot) capsuleClass = styles.capsuleOutOfScope;

                        return (
                          <div
                            key={p}
                            className={`${styles.capsule} ${capsuleClass}`}
                            title={
                              isImes
                                ? `${p}. Saat: ${lesson.className} (İşletmede Mesleki Eğitim / Okul Dışı Görev - Nöbetçi Atanmaz)`
                                : isAffected
                                ? `${p}. Saat: ${lesson.className} (${lesson.subject || 'Ders'} - ${lesson.location || 'Derslik'})`
                                : isOutOfSlot
                                ? `${p}. Saat: ${lesson.className} (Mazeret Saat Aralığı Dışında)`
                                : `${p}. Saat: Boş Ders`
                            }
                          >
                            <span className={styles.capsulePeriodNum}>{p}. Saat</span>
                            <span className={styles.capsuleClassLabel}>
                              {lesson ? (
                                <>
                                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {lesson.className}
                                  </span>
                                  {isImes && (
                                    <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 600, color: '#64748b', marginTop: '1px' }}>
                                      (Okul Dışı)
                                    </span>
                                  )}
                                </>
                              ) : (
                                '—'
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bottom Row: Expandable Accordion Lesson List */}
                {isExpanded && primaryDayInfo && primaryDayInfo.lessons.length > 0 && (
                  <div className={styles.accordionPanel}>
                    <table className={styles.detailTable}>
                      <thead>
                        <tr>
                          <th style={{ width: '90px' }}>Saat</th>
                          <th style={{ width: '120px' }}>Sınıf</th>
                          <th>Ders Adı</th>
                          <th style={{ width: '130px' }}>Derslik / Yer</th>
                          <th style={{ width: '160px' }}>Durum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {primaryDayInfo.lessons.map(lesson => (
                          <tr key={lesson.period}>
                            <td style={{ fontWeight: 700 }}>{lesson.period}. Ders</td>
                            <td>
                              <span className={styles.classChip}>{lesson.className}</span>
                            </td>
                            <td style={{ fontWeight: 500 }}>
                              {lesson.subject || <span style={{ color: '#94a3b8' }}>Ders Adı Yok</span>}
                            </td>
                            <td>
                              {lesson.location ? (
                                <span className={styles.locationChip}>
                                  📍 {lesson.location}
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>-</span>
                              )}
                            </td>
                            <td>
                              <span className={styles.statusChipWarning}>
                                ⚠️ Nöbetçi Bekliyor
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal fallback if opened */}
      {selectedModalData && (
        <Modal
          isOpen={!!selectedModalData}
          onClose={() => setSelectedModalData(null)}
          title={`${selectedModalData.person.name} — Mazeretli Gün Dersleri`}
          size="large"
        >
          {/* Modal content */}
          <div style={{ padding: '8px' }}>
            <p>Mazeretli ders detayları görüntülendi.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default memo(AbsenteeList);
