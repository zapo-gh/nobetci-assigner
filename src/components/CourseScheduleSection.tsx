// @ts-nocheck
import React, { useState, useMemo } from 'react';
import styles from './CourseScheduleSection.module.css';

/**
 * Türkçe karakterleri normalize eder (arama için)
 */
function normalizeForSearch(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/Ç/g, 'c');
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

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] || '').slice(0, 2).toUpperCase();
  const first = parts[0] || '';
  const last = parts[parts.length - 1] || '';
  return ((first[0] || '') + (last[0] || '')).toUpperCase();
}

export default function CourseScheduleSection({
  uploadInputId = 'teacher-schedule-upload',
  onUpload,
  teacherSchedulesList = [],
  onDeleteAllSchedules,
  onOpenTeacherSchedule,
  IconComponent,
}) {
  if (!IconComponent) {
    throw new Error('CourseScheduleSection requires IconComponent prop');
  }

  const [searchTerm, setSearchTerm] = useState('');

  const dayDefinitions = [
    { key: 'monday', label: 'Pzt' },
    { key: 'tuesday', label: 'Sal' },
    { key: 'wednesday', label: 'Çar' },
    { key: 'thursday', label: 'Per' },
    { key: 'friday', label: 'Cum' },
  ];

  // Arama filtresi (anında filtreleme)
  const filteredTeacherSchedules = useMemo(() => {
    if (!searchTerm.trim()) {
      return teacherSchedulesList;
    }

    const normalizedSearch = normalizeForSearch(searchTerm);
    return teacherSchedulesList.filter(([teacherName]) => {
      const normalizedName = normalizeForSearch(teacherName);
      return normalizedName.includes(normalizedSearch);
    });
  }, [teacherSchedulesList, searchTerm]);

  return (
    <div className={styles.container} role="tabpanel" id="panel-courseSchedule" aria-labelledby="tab-courseSchedule">
      {/* ---------------- Top Toolbar ---------------- */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>
            <IconComponent name="search" size={16} />
          </span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Öğretmen adına göre ara..."
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

        <div className={styles.toolbarStats}>
          <span className={styles.countBadge}>
            <IconComponent name="users" size={13} />
            <span>
              Toplam <strong className={styles.countBadgeStrong}>{teacherSchedulesList.length}</strong> Öğretmen
              {searchTerm && filteredTeacherSchedules.length !== teacherSchedulesList.length && (
                <> (Filtrelenen: <strong>{filteredTeacherSchedules.length}</strong>)</>
              )}
            </span>
          </span>
        </div>

        <div className={styles.toolbarActions}>
          <input
            type="file"
            accept=".pdf,.xlsx,.xls"
            onChange={onUpload}
            style={{ display: 'none' }}
            id={uploadInputId}
          />
          <label htmlFor={uploadInputId} className={styles.uploadBtn} title="Öğretmen El Programı Yükle">
            <IconComponent name="upload" size={15} />
            <span>Öğretmen El Programı Yükle</span>
          </label>

          {teacherSchedulesList.length > 0 && (
            <button
              type="button"
              className={styles.deleteAllBtn}
              onClick={onDeleteAllSchedules}
              title="Tüm ders programlarını sil"
            >
              <IconComponent name="trash" size={14} />
              <span>Tümünü Sil</span>
            </button>
          )}
        </div>
      </div>

      {/* ---------------- Content / Cards Grid ---------------- */}
      {teacherSchedulesList.length === 0 ? (
        <div className={styles.emptyContainer}>
          <div className={styles.emptyIcon}>
            <IconComponent name="calendar" size={30} />
          </div>
          <div className={styles.emptyTitle}>Henüz Öğretmen Ders Programı Yüklenmedi</div>
          <div className={styles.emptyDesc}>
            Excel dosyasını (&quot;Öğretmen El Programı Yükle&quot;) yükleyerek tüm öğretmenlerin haftalık ders programlarını sisteme aktarabilirsiniz.
          </div>
        </div>
      ) : filteredTeacherSchedules.length === 0 ? (
        <div className={styles.emptyContainer}>
          <div className={styles.emptyIcon}>
            <IconComponent name="search" size={28} />
          </div>
          <div className={styles.emptyTitle}>Sonuç Bulunamadı</div>
          <div className={styles.emptyDesc}>
            &quot;{searchTerm}&quot; aramasına uygun öğretmen ders programı bulunamadı.
          </div>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {filteredTeacherSchedules.map(([teacherName, schedule]) => {
            const dayStats = dayDefinitions
              .map(({ key, label }) => {
                const count = Object.keys(schedule?.[key] || {}).length;
                return { key, label, count };
              });

            const totalLessons = dayStats.reduce((sum, day) => sum + day.count, 0);
            const activeDaysCount = dayStats.filter((d) => d.count > 0).length;

            return (
              <div
                key={teacherName}
                className={styles.card}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenTeacherSchedule(teacherName, schedule);
                }}
                title={`${teacherName} adlı öğretmenin haftalık ders programını görüntüle`}
              >
                <div className={styles.cardTop}>
                  <div
                    className={styles.avatar}
                    style={{ background: getAvatarGradient(teacherName) }}
                  >
                    {getInitials(teacherName)}
                  </div>
                  <div className={styles.teacherInfo}>
                    <div className={styles.teacherName}>{teacherName}</div>
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
                        <span className={styles.dayLabel}>{label}</span>
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
    </div>
  );
}
