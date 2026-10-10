// @ts-nocheck
import React, { useState, useMemo } from 'react';
import styles from './AssignmentInsights.module.css';

const getInitials = (name = '') => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] || '').slice(0, 2).toLocaleUpperCase('tr-TR');
  const first = parts[0] || '';
  const last = parts[parts.length - 1] || '';
  return ((first[0] || '') + (last[0] || '')).toLocaleUpperCase('tr-TR');
};

export default function AssignmentInsights({ insights, IconComponent }) {
  if (!insights) return null;

  const { teacherSummaries = [] } = insights;
  const [filter, setFilter] = useState<'all' | 'assigned' | 'idle'>('all');

  const activeTeachers = useMemo(() => {
    return teacherSummaries.filter((summary) => {
      const assignmentCount = Array.isArray(summary.assignments) ? summary.assignments.length : 0;
      const dutyHints = Array.isArray(summary.unassignedReasons) ? summary.unassignedReasons.length : 0;
      return assignmentCount > 0 || dutyHints > 0;
    });
  }, [teacherSummaries]);

  const totalDuties = useMemo(() => {
    return activeTeachers.reduce((sum, item) => sum + (item.assignments?.length || 0), 0);
  }, [activeTeachers]);

  const assignedTeacherCount = useMemo(() => {
    return activeTeachers.filter((item) => (item.assignments?.length || 0) > 0).length;
  }, [activeTeachers]);

  const idleTeacherCount = activeTeachers.length - assignedTeacherCount;

  const displayedTeachers = useMemo(() => {
    let list = [...activeTeachers];
    if (filter === 'assigned') {
      list = list.filter((item) => (item.assignments?.length || 0) > 0);
    } else if (filter === 'idle') {
      list = list.filter((item) => (item.assignments?.length || 0) === 0);
    }
    // Teachers with assignments first, then alphabetical by name
    return list.sort((a, b) => {
      const diff = (b.assignments?.length || 0) - (a.assignments?.length || 0);
      if (diff !== 0) return diff;
      return (a.teacher?.teacherName || '').localeCompare(b.teacher?.teacherName || '', 'tr');
    });
  }, [activeTeachers, filter]);

  if (activeTeachers.length === 0) {
    return null;
  }

  return (
    <section className={styles.container} aria-label="Planlama analizleri">
      {/* Header with Title, Stats & Filter */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            {IconComponent ? (
              <IconComponent name="info" size={17} />
            ) : (
              <span>📊</span>
            )}
          </div>
          <h3 className={styles.title}>Planlama Analizi</h3>

          <div className={styles.statPills}>
            <span
              className={`${styles.statPill} ${
                totalDuties > 0 ? styles.statPillActive : styles.statPillMuted
              }`}
            >
              {totalDuties} Görev Atandı
            </span>
            <span className={`${styles.statPill} ${styles.statPillMuted}`}>
              {assignedTeacherCount} / {activeTeachers.length} Görevde
            </span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className={styles.headerRight}>
          <div className={styles.filterGroup}>
            <button
              type="button"
              className={`${styles.filterBtn} ${
                filter === 'all' ? styles.filterBtnActive : ''
              }`}
              onClick={() => setFilter('all')}
            >
              Tümü ({activeTeachers.length})
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${
                filter === 'assigned' ? styles.filterBtnActive : ''
              }`}
              onClick={() => setFilter('assigned')}
            >
              Görevliler ({assignedTeacherCount})
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${
                filter === 'idle' ? styles.filterBtnActive : ''
              }`}
              onClick={() => setFilter('idle')}
            >
              Boştakiler ({idleTeacherCount})
            </button>
          </div>
        </div>
      </div>

      {/* Body Grid */}
      <div className={styles.body}>
        {displayedTeachers.length === 0 ? (
          <div className={styles.emptyFilter}>
            Bu filtreye uygun öğretmen bulunamadı.
          </div>
        ) : (
          <div className={styles.grid}>
            {displayedTeachers.map(({ teacher, assignments = [] }) => {
              const count = assignments.length;
              const hasDuty = count > 0;
              const initials = getInitials(teacher.teacherName);

              return (
                <div
                  key={teacher.teacherId}
                  className={`${styles.card} ${hasDuty ? styles.cardActive : ''}`}
                >
                  <div className={styles.cardRow}>
                    <div className={styles.teacherInfo} title={teacher.teacherName}>
                      <div
                        className={`${styles.avatar} ${
                          hasDuty ? styles.avatarActive : styles.avatarIdle
                        }`}
                      >
                        {initials}
                      </div>
                      <span className={styles.teacherName}>{teacher.teacherName}</span>
                    </div>

                    <span
                      className={`${styles.dutyBadge} ${
                        hasDuty ? styles.dutyBadgeActive : styles.dutyBadgeIdle
                      }`}
                    >
                      {count} {count === 1 ? 'Görev' : 'Görev'}
                    </span>
                  </div>

                  {/* Compact Period Chips (WITHOUT class/lesson names) */}
                  {hasDuty && (
                    <div className={styles.periodList}>
                      {assignments
                        .slice()
                        .sort((a, b) => Number(a.period) - Number(b.period))
                        .map((assignment, idx) => (
                          <span
                            key={`${assignment.period}-${assignment.classId || idx}`}
                            className={styles.periodChip}
                            title={`${assignment.period}. Saat${
                              assignment.className ? ` (${assignment.className})` : ''
                            }`}
                          >
                            {assignment.period}. Saat
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
