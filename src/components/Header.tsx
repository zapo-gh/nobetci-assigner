// @ts-nocheck
import React, { useMemo } from 'react';
import styles from '../components/Tabs.module.css';
import Icon from '../components/Icon.jsx';
import { DAYS } from '../constants/index.js';
import { getWeekDatesForOffset } from '../utils/helpers.js';

function Header({
  theme,
  toggleTheme,
  day,
  handleDayChange,
  weekOffset = 0,
  goToNextWeek,
  goToPrevWeek,
}) {
  const today = useMemo(() => new Date(), []);
  const weekDates = useMemo(() => getWeekDatesForOffset(weekOffset, today), [weekOffset, today]);

  // Seçili günün Türkçe tam tarihi
  const selectedDayIdx = DAYS.findIndex(d => d.key === day);
  const selectedDate = weekDates[selectedDayIdx >= 0 ? selectedDayIdx : 0] || today;
  const dateString = selectedDate.toLocaleDateString('tr-TR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="app-logo">
          <img src="/logo.png" alt="Logo" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '64px', padding: '2px 0' }}>
          <h1 className="app-title">Nöbetçi Öğretmen Görevlendirme</h1>
          <div className="app-subtitle">{dateString}</div>
        </div>
      </div>

      {/* Sade & Bütünleşik Gün ve Hafta Seçici */}
      <div className="day-switcher">
        <button 
          type="button"
          className="day-nav-btn" 
          onClick={goToPrevWeek} 
          title="Önceki Hafta"
          aria-label="Önceki Hafta"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {DAYS.map((dayObj, i) => {
          const dateObj = weekDates[i];
          const isToday = dateObj && dateObj.toDateString() === today.toDateString();
          return (
            <button
              key={dayObj.key}
              type="button"
              className={`day-pill ${isToday ? 'is-today' : ''}`}
              aria-selected={day === dayObj.key}
              onClick={() => handleDayChange(dayObj.key)}
              title={`${dayObj.label} (${dateObj?.getDate()} ${dateObj?.toLocaleDateString('tr-TR', { month: 'long' })})`}
            >
              {dayObj.short}
              <span className="day-num">{dateObj?.getDate()}</span>
            </button>
          );
        })}

        <button 
          type="button"
          className="day-nav-btn" 
          onClick={goToNextWeek} 
          title="Sonraki Hafta"
          aria-label="Sonraki Hafta"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </header>
  );
}

// 🚀 Performance: React.memo prevents re-renders when props haven't changed
export default React.memo(Header);
