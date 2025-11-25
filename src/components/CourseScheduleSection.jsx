import React from 'react';
import EmptyState from './EmptyState.jsx';

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

  const dayDefinitions = [
    { key: 'monday', label: 'Pzt' },
    { key: 'tuesday', label: 'Sal' },
    { key: 'wednesday', label: 'Çar' },
    { key: 'thursday', label: 'Per' },
    { key: 'friday', label: 'Cum' },
  ];

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
              <button className="btn-outline btn-sm" onClick={onDeleteAllSchedules} title="Tüm ders programlarını sil">
                <IconComponent name="trash" size={14} />
                <span>Tümünü Sil</span>
              </button>
            </div>
            <div className="teacher-schedule-list">
              {teacherSchedulesList.map(([teacherName, schedule]) => {
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
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

