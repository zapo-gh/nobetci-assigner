// @ts-nocheck
import React, { memo, useState, useMemo } from 'react';
import styles from './ModernAvailabilityGrid.module.css';
import EmptyState from './EmptyState.jsx';

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

const SYSTEM_DAY_MAP = {
  Sun: 'sunday',
  Mon: 'monday',
  Tue: 'tuesday',
  Wed: 'wednesday',
  Thu: 'thursday',
  Fri: 'friday',
  Sat: 'saturday',
};

function ModernAvailabilityGrid({
  rows = [],
  rowKey = 'teacherId',
  rowNameKey = 'teacherName',
  periods = [],
  selectedMap = {},
  onToggle,
  onToggleAll,
  onSetTeacherPeriodsFree,
  onDelete,
  onEdit,
  extraCol,
  IconComponent,
  day,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'full' | 'partial' | 'zero'

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

  // Per-period counts across all rows
  const getSelectedCount = (period) => {
    const set = selectedMap?.[period] || new Set();
    return set.size;
  };

  const getProgressBarColor = (percentage) => {
    if (percentage < 30) return styles.bgError;
    if (percentage < 70) return styles.bgWarning;
    return styles.bgSuccess;
  };

  // Drag-and-drop for teacher roster
  const handleDragStart = (event, row) => {
    if (!event || !row) return;
    const payload = {
      type: 'teacher-roster',
      teacherId: row[rowKey],
      teacherName: row[rowNameKey],
    };
    try {
      event.dataTransfer.setData('text/plain', JSON.stringify(payload));
      event.dataTransfer.effectAllowed = 'copyMove';
    } catch {
      event.dataTransfer.setData('text', JSON.stringify(payload));
    }
  };

  // Global batch: All duty teachers all day
  const handleSelectAllAllDay = () => {
    periods.forEach((p) => {
      onToggleAll?.(p, true);
    });
  };

  // Global batch: Clear all duty teachers
  const handleClearAllAllDay = () => {
    periods.forEach((p) => {
      onToggleAll?.(p, false);
    });
  };

  // Extract location label for a teacher
  const getTeacherLocation = (row) => {
    if (row.dutyLocations && day) {
      const systemDay = SYSTEM_DAY_MAP[day] || day;
      const loc = row.dutyLocations[systemDay];
      if (loc && typeof loc === 'string') return loc;
    }
    return null;
  };

  // Calculate teacher's selected count
  const getRowSelectedCount = (rowId) => {
    return periods.reduce((count, p) => {
      const set = selectedMap?.[p] || new Set();
      return count + (set.has(rowId) ? 1 : 0);
    }, 0);
  };

  // Filter rows based on search and status
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const rowId = row[rowKey];
      const rowName = String(row[rowNameKey] || '');
      const location = getTeacherLocation(row) || '';

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = rowName.toLowerCase().includes(q);
        const matchLoc = location.toLowerCase().includes(q);
        if (!matchName && !matchLoc) return false;
      }

      // Status filter
      if (filterStatus !== 'all') {
        const count = getRowSelectedCount(rowId);
        if (filterStatus === 'full' && count !== periods.length) return false;
        if (filterStatus === 'partial' && (count === 0 || count === periods.length)) return false;
        if (filterStatus === 'zero' && count !== 0) return false;
      }

      return true;
    });
  }, [rows, rowKey, rowNameKey, searchQuery, filterStatus, periods, selectedMap, day]);

  // Statistics for filter chips
  const stats = useMemo(() => {
    let full = 0;
    let partial = 0;
    let zero = 0;
    rows.forEach((row) => {
      const count = getRowSelectedCount(row[rowKey]);
      if (count === periods.length && periods.length > 0) full++;
      else if (count === 0) zero++;
      else partial++;
    });
    return { total: rows.length, full, partial, zero };
  }, [rows, rowKey, periods, selectedMap]);

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
            placeholder="Öğretmen adı veya nöbet yeri ile ara..."
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

        {/* Status Filter Chips */}
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
            className={`${styles.filterChip} ${filterStatus === 'full' ? styles.filterChipActive : ''}`}
            onClick={() => setFilterStatus('full')}
            title="Tüm gün (10/10) uygun olanlar"
          >
            Tam Gün ({stats.full})
          </button>
          <button
            type="button"
            className={`${styles.filterChip} ${filterStatus === 'partial' ? styles.filterChipActive : ''}`}
            onClick={() => setFilterStatus('partial')}
            title="Kısmi saatlerde uygun olanlar"
          >
            Kısmi ({stats.partial})
          </button>
          <button
            type="button"
            className={`${styles.filterChip} ${filterStatus === 'zero' ? styles.filterChipActive : ''}`}
            onClick={() => setFilterStatus('zero')}
            title="Hiç saati seçilmemiş olanlar"
          >
            Seçilmemiş ({stats.zero})
          </button>
        </div>

        {/* Global Batch Action Buttons */}
        <div className={styles.toolbarActions}>
          <button
            type="button"
            className={`${styles.batchBtn} ${styles.batchBtnPrimary}`}
            onClick={handleSelectAllAllDay}
            title="Tüm nöbetçi öğretmenleri tüm gün (1-10) uygun yap"
          >
            {IconComponent && <IconComponent name="check" size={14} />}
            <span>Tümünü Tam Gün Yap</span>
          </button>
          <button
            type="button"
            className={styles.batchBtn}
            onClick={handleClearAllAllDay}
            title="Tüm nöbetçi öğretmenlerin seçimlerini temizle"
          >
            {IconComponent && <IconComponent name="refreshCw" size={13} />}
            <span>Tümünü Temizle</span>
          </button>
        </div>
      </div>

      {/* ---------------- Table Container ---------------- */}
      <div className={styles.tableContainer}>
        <table className={styles.gridTable}>
          <thead>
            <tr className={styles.superHeaderRow}>
              <th className={`${styles.stickyCol} ${styles.stuckShadow}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Nöbetçi Öğretmen</span>
                  <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                    {filteredRows.length} {filteredRows.length !== rows.length ? `/ ${rows.length}` : ''}
                  </span>
                </div>
              </th>

              <th colSpan={periods.length} className={styles.unifiedPeriodHeader}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {IconComponent ? <IconComponent name="calendar" size={14} /> : '📅'}
                  <strong>Ders Saatleri (1 - {periods[periods.length - 1] || periods.length}. Saat)</strong>
                </span>
              </th>
            </tr>

            {/* Level 2 Sub-Header: Individual period columns with quick toggle */}
            <tr className={styles.subHeaderRow}>
              <th className={`${styles.stickyCol} ${styles.stuckShadow}`}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-faint, #64748b)', fontWeight: '500' }}>
                  İsim &amp; Nöbet Yeri
                </span>
              </th>

              {periods.map((p) => {
                const selectedCount = getSelectedCount(p);
                const totalCount = rows.length;
                const isAllSelected = totalCount > 0 && selectedCount === totalCount;

                return (
                  <th
                    key={p}
                    style={{ textAlign: 'center', minWidth: '48px', padding: '6px 2px' }}
                  >
                    <button
                      type="button"
                      className={styles.periodHeaderBtn}
                      onClick={() => onToggleAll?.(p, !isAllSelected)}
                      title={`${p}. saat için tüm öğretmenleri ${isAllSelected ? 'kaldır' : 'seç'}`}
                    >
                      <span className={styles.periodHeaderNum}>{p}</span>
                      <span className={styles.periodHeaderCount}>
                        {selectedCount}/{totalCount}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={periods.length + 1}>
                  {rows.length === 0 ? (
                    <div className={styles.emptyStateContainer}>
                      <EmptyState
                        IconComponent={IconComponent}
                        icon="users"
                        title="Henüz Nöbetçi Öğretmen Eklenmedi"
                        description="Nöbetçi öğretmen eklemek için yukarıdaki butonları kullanabilirsiniz."
                      />
                    </div>
                  ) : (
                    <div className={styles.emptyStateContainer}>
                      <div className={styles.emptyStateTitle}>Aramaya Uygun Öğretmen Bulunamadı</div>
                      <div className={styles.emptyStateDesc}>
                        &quot;{searchQuery}&quot; aramasına veya seçili filtreye uygun nöbetçi öğretmen bulunmuyor.
                      </div>
                      <button
                        type="button"
                        className={styles.batchBtn}
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
              filteredRows.map((row) => {
                const rowId = row[rowKey];
                const rowName = row[rowNameKey];
                const location = getTeacherLocation(row);

                return (
                  <tr key={rowId}>
                    {/* Sticky Teacher Profile Column */}
                    <td className={`${styles.stickyCol} ${styles.stuckShadow}`}>
                      <div className={styles.teacherCard}>
                        <div className={styles.teacherMain}>
                          {/* Colorful dynamic avatar */}
                          <div
                            className={styles.avatar}
                            style={{ background: getAvatarGradient(rowName) }}
                            title={rowName}
                          >
                            {getInitials(rowName)}
                          </div>

                          <div className={styles.teacherMeta}>
                            <span
                              className={`${styles.teacherName} draggable-teacher`}
                              draggable
                              onDragStart={(event) => handleDragStart(event, row)}
                              title="Planlama tablosuna sürükleyip bırakabilirsiniz"
                            >
                              <span className={styles.dragHandle} title="Sürükle">⋮⋮</span>
                              {rowName}
                            </span>

                            {location ? (
                              <span className={styles.dutyChip} title={`Nöbet Yeri: ${location}`}>
                                {IconComponent ? <IconComponent name="mapPin" size={11} /> : '📍'}
                                <span>{location}</span>
                              </span>
                            ) : extraCol ? (
                              <div style={{ marginTop: '1px' }}>{extraCol(row)}</div>
                            ) : null}
                          </div>
                        </div>

                        {/* Edit & Delete actions */}
                        <div className={styles.teacherActions}>
                          {onEdit && (
                            <button
                              type="button"
                              className={styles.editBtn}
                              onClick={() => onEdit(row)}
                              title={`${rowName} adlı nöbetçi öğretmeni düzenle`}
                              aria-label={`${rowName} adlı öğretmeni düzenle`}
                            >
                              {IconComponent ? <IconComponent name="edit" size={13} /> : '✏️'}
                            </button>
                          )}

                          {onDelete && (
                            <button
                              type="button"
                              className={styles.deleteBtn}
                              onClick={() => onDelete(rowId)}
                              title={`${rowName} adlı nöbetçi öğretmeni sil`}
                              aria-label={`${rowName} adlı öğretmeni sil`}
                            >
                              {IconComponent && <IconComponent name="trash" size={14} />}
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Interactive Time Capsules */}
                    {periods.map((p) => {
                      const set = selectedMap?.[p] || new Set();
                      const isSelected = set.has(rowId);

                      return (
                        <td
                          key={p}
                          className={styles.timeCapsuleCell}
                        >
                          <button
                            type="button"
                            className={`${styles.timeCapsule} ${
                              isSelected ? styles.capsuleActive : styles.capsuleInactive
                            }`}
                            onClick={() => onToggle?.(p, rowId)}
                            title={`${rowName} - ${p}. saat (${isSelected ? 'Müsait / Göreve Hazır' : 'Müsait Değil'})`}
                            aria-pressed={isSelected}
                            aria-label={`${rowName} ${p}. saat ${isSelected ? 'seçili' : 'seçilmemiş'}`}
                          >
                            <span className={styles.capsuleNumber}>{p}</span>
                            {isSelected ? (
                              <span className={styles.capsuleStatusIcon}>✓</span>
                            ) : (
                              <span className={styles.capsuleStatusDash}>-</span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Table Footer: Column Summary */}
          {filteredRows.length > 0 && (
            <tfoot>
              <tr className={styles.footerRow}>
                <td className={`${styles.stickyCol} ${styles.stuckShadow}`}>
                  <span>Ders Başına Müsait Öğretmen</span>
                </td>

                {periods.map((p) => {
                  const selectedCount = getSelectedCount(p);
                  const totalCount = rows.length;
                  const percentage = totalCount > 0 ? Math.round((selectedCount / totalCount) * 100) : 0;
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
                          {selectedCount}/{totalCount}
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
    </div>
  );
}

export default memo(ModernAvailabilityGrid);