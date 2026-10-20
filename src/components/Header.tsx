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
  onLockSession,
  onOpenChangePassword,
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
      <div className="app-brand">
        <div className="app-logo">
          <img src="/logo.png" alt="Logo" />
        </div>
        <div className="app-title-group">
          <h1 className="app-title">Nöbetçi Öğretmen Görevlendirme</h1>
          <div className="app-subtitle">{dateString}</div>
        </div>
      </div>

      {/* Güvenlik & Oturum Yönetimi Butonları */}
      {(onOpenChangePassword || onLockSession) && (
        <div className="header-auth-controls">
          {onOpenChangePassword && (
            <button
              type="button"
              className="btn-header-auth"
              onClick={onOpenChangePassword}
              title="Yönetici Şifresini Değiştir"
              aria-label="Yönetici Şifresini Değiştir"
            >
              <span aria-hidden="true">⚙️</span>
              <span className="btn-header-auth-text">Şifre</span>
            </button>
          )}
          {onLockSession && (
            <button
              type="button"
              className="btn-header-auth btn-header-lock"
              onClick={onLockSession}
              title="Oturumu Kapat ve Ekranı Kilitle"
              aria-label="Oturumu Kapat ve Ekranı Kilitle"
            >
              <span aria-hidden="true">🔒</span>
              <span className="btn-header-auth-text">Kilitle</span>
            </button>
          )}
        </div>
      )}

      {/* Sade & Bütünleşik Gün ve Hafta Seçici */}
      <div className="day-switcher-wrapper">
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
                <span className="day-name">{dayObj.short}</span>
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
      </div>

      <style>{`
        .btn-header-auth {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 10px;
          border-radius: 9px;
          border: 1px solid var(--border-subtle, #e2e8f0);
          background: #ffffff;
          color: #475569;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          min-height: 36px;
        }
        .btn-header-auth:hover {
          color: #0f172a;
          border-color: #cbd5e1;
          background: #f8fafc;
        }
        .btn-header-lock:hover {
          color: #b91c1c;
          border-color: #fecaca;
          background: #fef2f2;
        }
        @media (max-width: 768px) {
          .btn-header-auth-text { display: none; }
          .btn-header-auth {
            padding: 6px 9px;
            font-size: 0.95rem;
          }
        }
      `}</style>
    </header>
  );
}

// 🚀 Performance: React.memo prevents re-renders when props haven't changed
export default React.memo(Header);
