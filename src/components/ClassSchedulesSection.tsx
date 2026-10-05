import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';

const COLORS = [
  'var(--bg-card)', '#f8bbd0', '#e1bee7', '#d1c4e9', '#c5cae9', '#bbdefb', '#b3e5fc',
  '#b2ebf2', '#b2dfdb', '#c8e6c9', '#dcedc8', '#f0f4c3', '#fff9c4',
  '#ffecb3', '#ffe0b2', '#ffccbc', '#d7ccc8'
];

const getSubjectColor = (subject: string) => {
  if (!subject) return '#6b7280';
  const hash = subject.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ];
  return colors[hash % colors.length];
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
    'SEÇMELİ': 'S.'
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
  teachers,
  IconComponent,
  onUploadSinifProgrami,
  classLocations,
  onDeleteAll,
}: any) {
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const days = [
    { id: 'monday', label: 'Pazartesi' },
    { id: 'tuesday', label: 'Salı' },
    { id: 'wednesday', label: 'Çarşamba' },
    { id: 'thursday', label: 'Perşembe' },
    { id: 'friday', label: 'Cuma' }
  ];
  
  const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const classSchedulesMap = React.useMemo(() => {
    const map: any = {};

    // First populate from classLocations if available (PRIMARY source)
    Object.entries(classLocations || {}).forEach(([rawCName, cDays]) => {
      const classNames = typeof rawCName === 'string' ? rawCName.split(',').map(s => s.trim()).filter(Boolean) : [rawCName];
      
      classNames.forEach(rawClassName => {
        // Try to find the exact class from the 'classes' array
        let cName = rawClassName;
        const matchedClass = classes?.find((c: any) => c.className && rawClassName.includes(c.className));
        
        if (matchedClass) {
          cName = matchedClass.className;
        } else {
          // If not found, at least strip out obvious noise like times and room parentheses
          cName = cName.replace(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/g, '')
                       .replace(/\([^)]*\)/g, '')
                       .trim();
          cName = cName.replace(/\s+-\s*$/, '').trim();
        }

        if (!map[cName]) map[cName] = {};
        Object.entries((cDays as any) || {}).forEach(([day, cPeriods]) => {
          if (!map[cName][day]) map[cName][day] = {};
          Object.entries((cPeriods as any) || {}).forEach(([period, locData]: [string, any]) => {
             const location = typeof locData === 'string' ? locData : locData?.location;
             const subject = typeof locData === 'string' ? '' : locData?.subject;
             const teacherNamesStr = typeof locData === 'string' ? '' : locData?.teacherNamesStr;
             
             if (!map[cName][day][period]) map[cName][day][period] = { teachers: [], subject: '', location: '', _isFallback: false, _hasShortNames: false };
             if (location) map[cName][day][period].location = location;
             if (subject) map[cName][day][period].subject = subject;
             
             if (teacherNamesStr) {
                 // Class locations gives a string like "S.YAĞAN" or "S. URBAY/C.PAYLAN". 
                 // We put these as temporary short names.
                 map[cName][day][period].teachers = teacherNamesStr.split(/[\/\-]/).map(s => s.trim()).filter(Boolean);
                 map[cName][day][period]._hasShortNames = true;
             }
          });
        });
      });
    });

    // Then merge from teacherSchedules (FALLBACK source for subject/location, but PRIMARY source for teacher full names)
    Object.entries(teacherSchedules || {}).forEach(([tName, tDays]) => {
      Object.entries((tDays as any) || {}).forEach(([day, tPeriods]) => {
        Object.entries((tPeriods as any) || {}).forEach(([period, cId]: [string, any]) => {
          if (cId && typeof cId === 'string' && cId.trim()) {
            const classNames = cId.split(',').map(s => s.trim()).filter(Boolean);
            classNames.forEach(rawClassName => {
              // Try to find the exact class from the 'classes' array
              let className = rawClassName;
              const matchedClass = classes?.find((c: any) => c.className && rawClassName.includes(c.className));
              
              if (matchedClass) {
                className = matchedClass.className;
              } else {
                // If not found, at least strip out obvious noise like times and room parentheses
                className = className.replace(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/g, '')
                                     .replace(/\([^)]*\)/g, '')
                                     .trim();
                // Also remove trailing hyphen if any
                className = className.replace(/\s+-\s*$/, '').trim();
              }

              if (!map[className]) map[className] = {};
              if (!map[className][day]) map[className][day] = {};
              
              if (!map[className][day][period]) {
                  // It was NOT in classLocations! So it's a fallback
                  map[className][day][period] = { teachers: [], subject: '', location: '', _isFallback: true, _hasShortNames: false };
              }
              
              // If the cell currently only has short names from the Excel cell, let's clear them 
              // the FIRST time we add a real full name from teacherSchedules!
              if (map[className][day][period]._hasShortNames) {
                  map[className][day][period].teachers = [];
                  map[className][day][period]._hasShortNames = false;
              }
              
              // Add the teacher from teacherSchedules (it's the exact full name)
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

  const allClassNames = React.useMemo(() => {
    const classSet = new Set<string>();
    classes.forEach((c: any) => {
      if (c.className) classSet.add(c.className);
    });
    Object.keys(classSchedulesMap).forEach(cName => classSet.add(cName));
    return Array.from(classSet).sort();
  }, [classes, classSchedulesMap]);

  const [levelFilter, setLevelFilter] = useState('Tümü');
  const [branchFilter, setBranchFilter] = useState('Tümü');

  const filteredClasses = allClassNames.filter(cName => {
    const matchesSearch = cName.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (levelFilter !== 'Tümü') {
      if (!cName.includes(levelFilter)) return false;
    }

    if (branchFilter !== 'Tümü') {
      if (!cName.toUpperCase().includes(branchFilter)) return false;
    }

    return true;
  });

  const getSubjectColor = (subject: string) => {
    if (!subject) return 'transparent';
    const hash = subject.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    // return color, skipping index 0 (which is default card bg)
    return COLORS[(hash % (COLORS.length - 1)) + 1];
  };

  const hasLocations = Object.keys(classLocations || {}).length > 0;



  return (
    <div role="tabpanel">
      <div className="toolbar" style={{ flexWrap: 'wrap' }}>
        <div className="input-wrapper" style={{ position: 'relative', width: '300px', maxWidth: '100%', display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', display: 'flex' }}>
            <IconComponent name="search" size={16} />
            </div>
            <input
              type="text"
              className="input"
              placeholder="Sınıf ara..."
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
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Seviye:</span>
            {['Tümü', '9', '10', '11', '12'].map(level => (
              <button 
                key={level}
                onClick={() => setLevelFilter(level)}
                className={`chip ${levelFilter === level ? 'active' : ''}`}
                style={levelFilter === level ? { 
                  backgroundColor: level === 'Tümü' ? 'var(--primary)' : `var(--level-${level})`, 
                  color: 'white', 
                  border: 'none' 
                } : {}}
              >
                {level}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Alan:</span>
            {['Tümü', 'AMP', 'ATP'].map(branch => (
              <button 
                key={branch}
                onClick={() => setBranchFilter(branch)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '16px',
                  border: `1px solid ${branchFilter === branch ? 'var(--primary)' : 'var(--border-default)'}`,
                  background: branchFilter === branch ? 'var(--primary-light)' : 'transparent',
                  color: branchFilter === branch ? 'var(--primary-active)' : 'var(--text-secondary)',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {branch}
              </button>
            ))}
          </div>
          
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <input
              type="file"
              id="sinif-programi-upload"
              accept=".xls,.xlsx"
              style={{ display: 'none' }}
              onChange={onUploadSinifProgrami}
            />
            <label 
              className="btn btn-primary" 
              htmlFor="sinif-programi-upload"
              title="Sınıf El Programı Yükle"
            >
              <IconComponent name="upload" size={16} />
              <span className="btn-text">Sınıf El Programı Yükle</span>
            </label>
            {hasLocations && (
              <button className="btn btn-danger" onClick={onDeleteAll} title="Tüm sınıf programlarını sil">
                <IconComponent name="trash" size={14} />
                <span>Tümünü Sil</span>
              </button>
            )}
          </div>
        </div>

        {allClassNames.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
               <IconComponent name="calendar" size={32} />
            </div>
            <h3>Henüz Ders Programı Eklenmedi</h3>
            <p>Excel dosyasını yükleyerek sınıf ders programlarını oluşturabilirsiniz.</p>
          </div>
        ) : (
        <div style={{ padding: '24px' }}>
          <div className="card-grid">
            {filteredClasses.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                <div className="empty-state-icon">
                  <IconComponent name="search" size={32} />
                </div>
                <h3>Sonuç Bulunamadı</h3>
                <p>Arama kriterlerinize uygun sonuç bulunamadı.</p>
              </div>
            ) : (
            filteredClasses.map(cName => {
              const schedule = classSchedulesMap[cName] || {};
              
              const dayStats = days.map(({ id, label }) => {
                const count = Object.keys(schedule[id] || {}).length;
                if (!count) return null;
                return { key: id, label, count };
              }).filter(Boolean) as { key: string, label: string, count: number }[];

              const totalLessons = dayStats.reduce((sum, day) => sum + day.count, 0);
              const level = cName.match(/\d+/)?.[0] || 'other';
              const avatarContent = level !== 'other' ? level : <IconComponent name="users" size={20} />;

              return (
                <div
                  key={cName}
                  className="card class-card clickable"
                  data-level={level}
                  onClick={() => setSelectedClass(cName)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-header">
                    <div className="avatar">
                      {avatarContent}
                    </div>
                    <div className="card-title">
                      {cName}
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
            })
          )}
          </div>
        </div>
        )}

      <Modal
        isOpen={!!selectedClass}
        onClose={() => setSelectedClass('')}
        title={`${selectedClass} - Haftalık Sınıf Ders Programı`}
        size="xlarge"
      >
        <div className="schedule-table-container">
          <table className="schedule-table">
            <thead>
              <tr>
                <th className="day-header">Günler</th>
                {periods.map(period => (
                  <th key={period} className="period-header">
                    {period}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map(day => (
                <tr key={day.id}>
                  <td className="day-cell">{day.label}</td>
                  {periods.map(period => {
                    const lesson = classSchedulesMap[selectedClass]?.[day.id]?.[period];
                    
                    const isEmpty = !lesson || (lesson.teachers.length === 0 && !lesson.subject && !lesson.location);
                    
                    return (
                      <td key={period} className={`schedule-cell ${isEmpty ? 'empty-period' : ''}`}>
                        {isEmpty ? (
                          <span className="empty-indicator">-</span>
                        ) : (
                          <div 
                            className="class-badge"
                            style={{ 
                              backgroundColor: getSubjectColor(lesson.subject || 'Ders'), 
                              display: 'inline-flex', 
                              flexDirection: 'column',
                              alignItems: 'center',
                              whiteSpace: 'nowrap',
                              padding: '6px 8px',
                              minWidth: '70px'
                            }}
                          >
                            {lesson.subject && (
                              <span style={{ fontWeight: 'bold', marginBottom: '2px' }}>{shortenSubjectName(lesson.subject)}</span>
                            )}
                            
                            {lesson.teachers.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85em', opacity: 0.9 }}>
                                {lesson.teachers.map((tName: string, i: number) => (
                                  <span key={i}>{tName}</span>
                                ))}
                              </div>
                            )}
                            
                            {lesson.location && (
                              <span style={{
                                fontSize: '0.8em',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                padding: '2px 4px',
                                borderRadius: '4px',
                                marginTop: '4px'
                              }}>
                                {lesson.location}
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
      </Modal>
    </div>
  );
}
