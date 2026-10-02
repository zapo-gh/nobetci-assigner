import React, { useState } from 'react';
import Modal from './Modal';

const COLORS = [
  'var(--bg-card)', '#f8bbd0', '#e1bee7', '#d1c4e9', '#c5cae9', '#bbdefb', '#b3e5fc',
  '#b2ebf2', '#b2dfdb', '#c8e6c9', '#dcedc8', '#f0f4c3', '#fff9c4',
  '#ffecb3', '#ffe0b2', '#ffccbc', '#d7ccc8'
];

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
    Object.entries(classLocations || {}).forEach(([cName, cDays]) => {
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

    // Then merge from teacherSchedules (FALLBACK source for subject/location, but PRIMARY source for teacher full names)
    Object.entries(teacherSchedules || {}).forEach(([tName, tDays]) => {
      Object.entries((tDays as any) || {}).forEach(([day, tPeriods]) => {
        Object.entries((tPeriods as any) || {}).forEach(([period, cId]: [string, string]) => {
          if (cId && typeof cId === 'string' && cId.trim()) {
            const className = cId.trim();
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

  const filteredClasses = allClassNames.filter(cName => 
    cName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSubjectColor = (subject: string) => {
    if (!subject) return 'transparent';
    const hash = subject.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    // return color, skipping index 0 (which is default card bg)
    return COLORS[(hash % (COLORS.length - 1)) + 1];
  };

  const hasLocations = Object.keys(classLocations || {}).length > 0;

  return (
    <div role="tabpanel">
      <div className="section-toolbar">
        <div className="toolbar-actions" style={{ marginLeft: 'auto' }}>
          {hasLocations && (
            <button className="btn-outline btn-sm" onClick={onDeleteAll} title="Tüm sınıf programlarını sil">
              <IconComponent name="trash" size={14} />
              <span>Tümünü Sil</span>
            </button>
          )}
          <input
            type="file"
            id="sinif-programi-upload"
            accept=".xls,.xlsx"
            style={{ display: 'none' }}
            onChange={onUploadSinifProgrami}
          />
          <label 
            className="btn-tertiary" 
            htmlFor="sinif-programi-upload"
            title="Sınıf El Programı Yükle"
            style={{ cursor: 'pointer' }}
          >
            <IconComponent name="upload" size={16} />
            <span className="btn-text">Sınıf El Programı Yükle</span>
          </label>
        </div>
      </div>
      
      <div style={{ padding: '0 24px', marginBottom: '16px' }}>
        <h2 className="text-xl font-bold">Sınıf Programları</h2>
        <p className="text-sm text-secondary">
          Sınıfların haftalık ders programlarını ve ders işlenen sınıf yerlerini buradan görüntüleyebilirsiniz.
        </p>
      </div>
      
      {hasLocations && (
        <div style={{ padding: '0 24px' }}>
          <div className="badge badge-success" style={{ marginBottom: '20px', display: 'inline-flex' }}>
            <IconComponent name="check" size={14} style={{ marginRight: '4px' }} />
            <span>Sınıf yerleri sisteme yüklendi ve haritalandırıldı.</span>
          </div>
        </div>
      )}

      <div className="card" style={{ margin: '0 24px' }}>
        <div className="section-toolbar" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="search-box">
            <IconComponent name="search" size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Sınıf ara..."
              className="search-input"
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
        </div>

        <div className="teacher-schedule-list" style={{ padding: '20px' }}>
          {filteredClasses.length === 0 ? (
            <div className="no-results" style={{ gridColumn: '1 / -1' }}>
              <IconComponent name="search" size={20} />
              <span>Sonuç bulunamadı</span>
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

              return (
                <div
                  key={cName}
                  className="teacher-schedule-item clickable"
                  onClick={() => setSelectedClass(cName)}
                >
                  <div className="teacher-card-header">
                    <div className="teacher-name">
                      <IconComponent name="users" size={16} />
                      <span>{cName}</span>
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
            })
          )}
        </div>
      </div>

      <Modal
        isOpen={!!selectedClass}
        onClose={() => setSelectedClass('')}
        title={`${selectedClass} - Haftalık Sınıf Ders Programı`}
        size="xlarge"
      >
        <div style={{ padding: '0', overflowX: 'auto' }}>
          <table className="tbl w-full text-sm" style={{ tableLayout: 'fixed', minWidth: '900px' }}>
            <thead>
              <tr>
                <th className="text-left" style={{ width: '100px' }}>Gün</th>
                {periods.map(p => (
                  <th key={p} className="text-center">{p}. Ders</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map(day => (
                <tr key={day.id}>
                  <td className="font-medium text-left">{day.label}</td>
                  {periods.map(p => {
                    const lesson = classSchedulesMap[selectedClass]?.[day.id]?.[p];
                    
                    if (!lesson || (lesson.teachers.length === 0 && !lesson.subject && !lesson.location)) {
                       return (
                         <td key={p} className="text-center p-2 border">
                           <span className="text-gray-300">-</span>
                         </td>
                       );
                    }

                    const bgColor = getSubjectColor(lesson.subject || '');
                    
                    return (
                      <td 
                        key={p} 
                        className="p-1"
                        style={{ verticalAlign: 'top', minWidth: '100px' }}
                      >
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: bgColor !== 'transparent' ? bgColor : 'var(--bg-elevated)',
                          border: bgColor !== 'transparent' ? '1px solid rgba(0,0,0,0.1)' : '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          padding: '4px',
                          minHeight: '60px',
                          height: '100%',
                          gap: '2px',
                          boxShadow: bgColor !== 'transparent' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                        }}>
                          {lesson.subject && (
                            <span style={{ 
                              fontWeight: 'bold', 
                              fontSize: '11px', 
                              color: '#1a1a1a',
                              textAlign: 'center',
                              lineHeight: '1.2'
                            }}>
                              {lesson.subject}
                            </span>
                          )}
                          
                          {lesson.teachers.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', width: '100%', alignItems: 'center' }}>
                              {lesson.teachers.map((tName: string, i: number) => (
                                <span key={i} style={{ 
                                  fontSize: '9px', 
                                  fontWeight: 500, 
                                  color: '#333', 
                                  textAlign: 'center', 
                                  lineHeight: '1.1' 
                                }} title={tName}>
                                  {tName}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {lesson.location && (
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 'bold',
                              backgroundColor: 'rgba(0,0,0,0.6)',
                              color: 'white',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              marginTop: '2px'
                            }}>
                              {lesson.location}
                            </span>
                          )}
                        </div>
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
