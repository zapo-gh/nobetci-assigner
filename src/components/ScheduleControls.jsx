import React from 'react';

export default function ScheduleControls({
  days,
  selectedDay,
  onDayChange,
  options,
  onOptionChange,
  IconComponent
}) {
  const handleOption = (e) => {
    const { name, type, checked, value } = e.target;
    onOptionChange(name, type === 'checkbox' ? checked : value);
  };

  return (
    <div className="schedule-controls">
      {/* Gün Seçimi */}
      <div className="control-group">
        <label className="control-label">
          {IconComponent && <IconComponent name="calendar" size={16} />}
          <span>Haftanın Günü</span>
        </label>
        <div className="day-selector">
          {days.map(day => (
            <button
              key={day.key}
              className={`day-btn ${selectedDay === day.key ? 'active' : ''}`}
              onClick={() => onDayChange(day.key)}
              title={day.label}
            >
              {day.short}
            </button>
          ))}
        </div>
      </div>

      {/* Atama Seçenekleri */}
      <div className="control-group">
        <label className="control-label">
          {IconComponent && <IconComponent name="zap" size={16} />}
          <span>Atama Kuralları</span>
        </label>
        <div className="options-grid">
          <div className="option-item">
            <label htmlFor="preventConsecutive" className="option-label">
              <input
                type="checkbox"
                id="preventConsecutive"
                name="preventConsecutive"
                checked={options.preventConsecutive}
                onChange={handleOption}
              />
              <span>Ardışık Görevi Engelle</span>
            </label>
            <small>Öğretmene art arda saatlerde görev verilmesini önler.</small>
          </div>
          <div className="option-item">
            <label htmlFor="maxClassesPerSlot" className="option-label">
              <span>Aynı Saatte Max Görev</span>
              <input
                type="number"
                id="maxClassesPerSlot"
                name="maxClassesPerSlot"
                value={options.maxClassesPerSlot}
                onChange={handleOption}
                className="option-input"
                min="1"
                max="5"
              />
            </label>
            <small>Bir öğretmene aynı saatte en fazla kaç görev verilebileceği.</small>
          </div>
        </div>
      </div>
      <style>{`
        .schedule-controls {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-6);
          padding: var(--space-4);
          background-color: var(--bg-elevated);
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-4);
          border: 1px solid var(--border-default);
        }
        .control-group {
          flex: 1 1 300px;
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .control-label {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-weight: var(--font-weight-medium);
          font-size: 0.95rem;
          color: var(--text-secondary);
        }
        .day-selector {
          display: flex;
          gap: var(--space-2);
          background-color: var(--bg-default);
          border-radius: var(--radius-md);
          padding: var(--space-1);
        }
        .day-btn {
          flex: 1;
          padding: var(--space-2) var(--space-3);
          border: none;
          background-color: transparent;
          color: var(--text-secondary);
          font-weight: var(--font-weight-medium);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-default);
        }
        .day-btn:hover {
          background-color: var(--bg-hover);
          color: var(--text-primary);
        }
        .day-btn.active {
          background-color: var(--primary);
          color: var(--text-on-primary);
          box-shadow: var(--shadow-sm);
        }
        .options-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-4);
        }
        @media (min-width: 768px) {
          .options-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .option-item {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        .option-label {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          cursor: pointer;
        }
        .option-label span {
          font-weight: var(--font-weight-medium);
        }
        .option-input {
          width: 60px;
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-default);
          background-color: var(--bg-default);
          color: var(--text-primary);
          text-align: center;
        }
        .option-item small {
          font-size: 0.8rem;
          color: var(--text-muted);
          padding-left: 28px; /* checkbox hizası */
        }
      `}</style>
    </div>
  );
}
