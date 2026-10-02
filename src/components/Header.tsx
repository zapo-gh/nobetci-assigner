// @ts-nocheck
import React from 'react';
import styles from '../components/Tabs.module.css';
import Icon from '../components/Icon.jsx';
import { DAYS } from '../constants/index.js';

function Header({
  theme,
  toggleTheme,
  day,
  handleDayChange,
}) {
  const today = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateString = today.toLocaleDateString('tr-TR', options);

  // Helper to get dates for the current week (Mon-Fri)
  const getWeekDates = () => {
    const curr = new Date();
    const first = curr.getDate() - curr.getDay() + 1; // First day is the day of the month - the day of the week
    const dates = [];
    for (let i = 0; i < 5; i++) {
      const next = new Date(curr.getTime());
      next.setDate(first + i);
      dates.push(next.getDate());
    }
    return dates;
  };
  const weekDates = getWeekDates();

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="app-logo">
          <Icon name="shield" size={24} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 className="app-title">Nöbetçi Öğretmen Görevlendirme</h1>
          <div className="app-subtitle">{dateString}</div>
        </div>
      </div>

      <div className="day-switcher">
        {DAYS.map((dayObj, i) => (
          <button
            key={dayObj.key}
            className="day-pill"
            aria-selected={day === dayObj.key}
            onClick={() => handleDayChange(dayObj.key)}
            title={dayObj.label}
          >
            {dayObj.short}
            <span className="day-num">{weekDates[i]}</span>
          </button>
        ))}
      </div>
    </header>
  );
}

// 🚀 Performance: React.memo prevents re-renders when props haven't changed
export default React.memo(Header);
