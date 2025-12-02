import React, { useState, useMemo } from 'react';
import EmptyState from './EmptyState.jsx';

/**
 * Türkçe karakterleri normalize eder (arama için)
 * @param {string} text - Normalize edilecek metin
 * @returns {string} Normalize edilmiş metin
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

export default function CourseScheduleSection({
  uploadInputId = 'teacher-schedule-upload',
  onUpload,
  teacherSchedulesList,
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

  // 3. harften sonra filtreleme yap
  const filteredTeacherSchedules = useMemo(() => {
    if (!searchTerm || searchTerm.length < 3) {
      return teacherSchedulesList;
    }

    const normalizedSearch = normalizeForSearch(searchTerm);
    
    return teacherSchedulesList.filter(([teacherName]) => {
      const normalizedName = normalizeForSearch(teacherName);
      return normalizedName.includes(normalizedSearch);
    });
  }, [teacherSchedulesList, searchTerm]);

  return (
    <div role="tabpanel" id="panel-courseSchedule" aria-labelledby="tab-courseSchedule">
      <div className="section-toolbar">
        <div className="toolbar-actions">
          <input type="file" accept=".pdf,.xlsx,.xls" onChange={onUpload} style={{ display: 'none' }} id={uploadInputId} />
          <label htmlFor={uploadInputId} className="btn-tertiary" title="Excel'den Ders Programı Yükle">
            <IconComponent name="upload" size={16} />
            <span className="btn-text">Excel Yükle</span>
          </label>
        </div>
      </div>

      <div className="course-schedule-content">
        {teacherSchedulesList.length === 0 && (
          <EmptyState
            IconComponent={IconComponent}
            icon="calendar"
            title="Henüz Ders Programı Eklenmedi"
            size={44}
            className="empty-state-card"
          />
        )}

        {teacherSchedulesList.length > 0 && (
          <div className="schedule-preview">
            <div className="schedule-preview-header">
              <h3>Yüklenen Ders Programları</h3>
              <div className="schedule-preview-header-actions">
                <div className="search-input-wrapper">
                  <IconComponent name="search" size={16} />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Öğretmen ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      className="search-clear-btn"
                      onClick={() => setSearchTerm('')}
                      title="Temizle"
                    >
                      <IconComponent name="x" size={14} />
                    </button>
                  )}
                </div>
                <button className="btn-outline btn-sm" onClick={onDeleteAllSchedules} title="Tüm ders programlarını sil">
                  <IconComponent name="trash" size={14} />
                  <span>Tümünü Sil</span>
                </button>
              </div>
            </div>
            <div className="teacher-schedule-list">
              {filteredTeacherSchedules.length === 0 ? (
                <div className="no-results">
                  <IconComponent name="search" size={20} />
                  <span>Sonuç bulunamadı</span>
                </div>
              ) : (
                filteredTeacherSchedules.map(([teacherName, schedule]) => {
                const dayStats = dayDefinitions
                  .map(({ key, label }) => {
                    const count = Object.keys(schedule?.[key] || {}).length;
                    if (!count) return null;
                    return { key, label, count };
                  })
                  .filter(Boolean);

                const totalLessons = dayStats.reduce((sum, day) => sum + day.count, 0);

                return (
                  <div
                    key={teacherName}
                    className="teacher-schedule-item clickable"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenTeacherSchedule(teacherName, schedule);
                    }}
                  >
                    <div className="teacher-card-header">
                      <div className="teacher-name">
                        <IconComponent name="user" size={16} />
                        <span>{teacherName}</span>
                      </div>
                      <div className="teacher-card-meta">
                        <span className="meta-chip">
                          <IconComponent name="calendar" size={12} />
                          {dayStats.length || 0} gün
                        </span>
                        <span className="meta-chip">
                          <IconComponent name="book" size={12} />
                          {totalLessons} ders
                        </span>
                      </div>
                    </div>
                    <div className="teacher-card-body">
                      {dayStats.length > 0 ? (
                        dayStats.map(({ key, label, count }) => (
                          <div key={key} className="teacher-day-row">
                            <span className="day-label">{label}</span>
                            <span className="day-count">{count} ders</span>
                          </div>
                        ))
                      ) : (
                        <div className="teacher-card-empty">
                          <IconComponent name="info" size={12} />
                          <span>Günlük ders bilgisi yok</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

