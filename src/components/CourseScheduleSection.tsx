// @ts-nocheck
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
      <div className="toolbar">
        <div className="input-wrapper" style={{ position: 'relative', width: '300px', maxWidth: '100%', display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', display: 'flex' }}>
            <IconComponent name="search" size={16} />
          </div>
          <input
            type="text"
            className="input"
            placeholder="Öğretmen ara..."
            style={{ paddingLeft: '36px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              title="Temizle"
              style={{
                position: 'absolute',
                right: '12px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                padding: '2px'
              }}
            >
              <IconComponent name="x" size={14} />
            </button>
          )}
        </div>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <input type="file" accept=".pdf,.xlsx,.xls" onChange={onUpload} style={{ display: 'none' }} id={uploadInputId} />
          <label htmlFor={uploadInputId} className="btn btn-primary" title="Öğretmen El Programı Yükle">
            <IconComponent name="upload" size={16} />
            <span className="btn-text">Öğretmen El Programı Yükle</span>
          </label>
          {teacherSchedulesList.length > 0 && (
            <button className="btn btn-danger" onClick={onDeleteAllSchedules} title="Tüm ders programlarını sil">
              <IconComponent name="trash" size={14} />
              <span>Tümünü Sil</span>
            </button>
          )}
        </div>
      </div>

            {teacherSchedulesList.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                   <IconComponent name="calendar" size={32} />
                </div>
                <h3>Henüz Ders Programı Eklenmedi</h3>
                <p>Excel dosyasını yükleyerek öğretmen ders programlarını oluşturabilirsiniz.</p>
              </div>
            ) : (
              <div style={{ padding: '24px' }}>
                <div className="card-grid">
                {filteredTeacherSchedules.length === 0 ? (
                  <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                    <div className="empty-state-icon">
                      <IconComponent name="search" size={32} />
                    </div>
                    <h3>Sonuç Bulunamadı</h3>
                    <p>Arama kriterlerinize uygun sonuç bulunamadı.</p>
                  </div>
                ) : (
                filteredTeacherSchedules.map(([teacherName, schedule], index) => {
                const dayStats = dayDefinitions
                  .map(({ key, label }) => {
                    const count = Object.keys(schedule?.[key] || {}).length;
                    if (!count) return null;
                    return { key, label, count };
                  })
                  .filter(Boolean) as { key: string, label: string, count: number }[];

                const totalLessons = dayStats.reduce((sum, day) => sum + day.count, 0);
                const initials = teacherName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                const tone = (index % 6) + 1;

                return (
                  <div
                    key={teacherName}
                    className="card teacher-card clickable"
                    data-tone={tone}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenTeacherSchedule(teacherName, schedule);
                    }}
                  >
                    <div className="card-header">
                      <div className="avatar">
                         {initials}
                      </div>
                      <div className="card-title">
                        {teacherName}
                      </div>
                    </div>
                    
                    <div className="card-body">
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <span className="chip"><IconComponent name="calendar" size={12} /> {dayStats.length || 0} gün</span>
                        <span className="chip"><IconComponent name="book" size={12} /> {totalLessons} ders</span>
                      </div>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {dayStats.length > 0 ? (
                          dayStats.map(({ key, label, count }) => (
                            <span key={key} style={{ fontSize: '0.78rem', padding: '2px 6px', background: 'var(--surface-2)', borderRadius: '4px', borderLeft: '3px solid var(--tone)' }}>
                              <strong style={{ color: 'var(--text)' }}>{label}</strong>: {count}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ders bilgisi yok</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }))}
                </div>
              </div>
            )}
    </div>
  );
}

