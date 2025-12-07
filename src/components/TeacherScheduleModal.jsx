import React from 'react';
import Modal from './Modal.jsx';

const TeacherScheduleModal = ({ isOpen, onClose, teacherName, schedule, IconComponent: Icon = null }) => {
  if (!schedule || !teacherName) return null;


  // Day mapping for display
  const dayLabels = {
    monday: 'Pazartesi',
    tuesday: 'Salı',
    wednesday: 'Çarşamba',
    thursday: 'Perşembe',
    friday: 'Cuma'
  };

  // Periods 1-10
  const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Extract class code from full class description (e.g., "11-A SİSTHAS" -> "11-A")
  const extractClassCode = (fullClassName) => {
    if (!fullClassName || !fullClassName.trim()) return '';
    
    const trimmed = fullClassName.trim();
    
    // Match patterns like "11-A", "9-D", "12-.C", etc.
    const classCodeMatch = trimmed.match(/^([0-9]+(?:-[.A-ZÇĞIİÖŞÜ]+)+)/);
    
    if (classCodeMatch) {
      return classCodeMatch[1];
    }
    
    // If no match, return the original (fallback)
    return trimmed;
  };

  // Get unique class codes for color coding
  const getUniqueClasses = () => {
    const classes = new Set();
    Object.values(schedule).forEach(daySchedule => {
      Object.values(daySchedule).forEach(className => {
        if (className && className.trim()) {
          const classCode = extractClassCode(className);
          if (classCode) {
            classes.add(classCode);
          }
        }
      });
    });
    return Array.from(classes);
  };

  const uniqueClasses = getUniqueClasses();

  // Generate color for class badge
  const getClassColor = (fullClassName) => {
    if (!fullClassName) return '#6b7280'; // gray for empty
    
    const classCode = extractClassCode(fullClassName);
    const index = uniqueClasses.indexOf(classCode);
    const colors = [
      '#3b82f6', // blue
      '#ef4444', // red
      '#10b981', // green
      '#f59e0b', // yellow
      '#8b5cf6', // purple
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f97316', // orange
      '#ec4899', // pink
      '#6366f1', // indigo
    ];
    
    return colors[index % colors.length] || '#6b7280';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${teacherName} - Ders Programı`} size="large">
      <div className="teacher-schedule-modal">
        {/* Schedule Table */}
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
              {Object.entries(dayLabels).map(([dayKey, dayLabel]) => (
                <tr key={dayKey}>
                  <td className="day-cell">{dayLabel}</td>
                  {periods.map(period => {
                    const fullClassName = schedule[dayKey]?.[period];
                    const classCode = extractClassCode(fullClassName);
                    const isEmpty = !classCode || classCode.trim() === '';
                    
                    return (
                      <td key={period} className={`schedule-cell ${isEmpty ? 'empty-period' : ''}`}>
                        {isEmpty ? (
                          <span className="empty-indicator">-</span>
                        ) : (
                          <span 
                            className="class-badge"
                            style={{ backgroundColor: getClassColor(fullClassName) }}
                          >
                            {classCode}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        {uniqueClasses.length > 0 && (
          <div className="schedule-legend">
            <h4>Sınıflar:</h4>
            <div className="legend-items">
              {uniqueClasses.map(classCode => (
                <div key={classCode} className="legend-item">
                  <span 
                    className="legend-color"
                    style={{ backgroundColor: getClassColor(classCode) }}
                  ></span>
                  <span className="legend-text">{classCode}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="schedule-summary">
          <div className="summary-stats">
            <div className="stat-item">
              {Icon && <Icon name="calendar" size={16} />}
              <span>Toplam Ders: {Object.values(schedule).reduce((total, day) => total + Object.keys(day).length, 0)}</span>
            </div>
            <div className="stat-item">
              {Icon && <Icon name="users" size={16} />}
              <span>Farklı Sınıf: {uniqueClasses.length}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TeacherScheduleModal;
