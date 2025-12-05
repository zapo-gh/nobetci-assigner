import React from 'react';
import styles from '../components/Tabs.module.css';

const DAYS = [
    { key: "Mon", label: "Pazartesi", short: "Pzt" },
    { key: "Tue", label: "Salı", short: "Sal" },
    { key: "Wed", label: "Çarşamba", short: "Çar" },
    { key: "Thu", label: "Perşembe", short: "Per" },
    { key: "Fri", label: "Cuma", short: "Cum" }
];

function Icon({ name, size = 20 }) {
    const icons = {
        sun: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
        ),
        moon: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
        ),
    };
    return icons[name] || null;
}

export default function Header({
    toolbarExpanded,
    toggleToolbar,
    theme,
    toggleTheme,
    day,
    handleDayChange,
}) {
    return (
        <header className="topbar">
            <div className="flex justify-between items-center mb-4 w-full">
                <div className="flex items-center gap-3">
                    {/* Menü Toggle Butonu */}
                    <button
                        className="header-menu-toggle"
                        onClick={toggleToolbar}
                        title={toolbarExpanded ? "Menüyü Kapat" : "Menüyü Aç"}
                    >
                        <div className="menu-icon">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </button>
                    <h1 className="app-title" style={{ margin: '0' }}>Nöbetçi Öğretmen Görevlendirme</h1>
                </div>

                {/* Sağ üst köşeye tema butonu ve gün seçici */}
                <div className="flex items-center gap-3">
                    <div className="day-selector-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)' }}>
                        {/* Tema Butonu */}
                        <button
                            className={styles.themeToggleBtn}
                            style={{ flexShrink: 0 }}
                            onClick={toggleTheme}
                            title={theme === "dark" ? "Açık tema" : "Koyu tema"}
                            aria-label={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
                        >
                            {theme === "dark"
                                ? <Icon name="sun" size={18} />
                                : <Icon name="moon" size={18} />}
                        </button>
                        {/* Gün Seçici */}
                        <div className="day-selector">
                            {DAYS.map(dayObj => (
                                <button
                                    key={dayObj.key}
                                    className={`day-btn ${day === dayObj.key ? 'active' : ''}`}
                                    onClick={() => handleDayChange(dayObj.key)}
                                    title={dayObj.label}
                                >
                                    {dayObj.short}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        .day-selector-header .day-selector {
          display: flex;
          gap: var(--space-1);
          background-color: var(--bg-elevated);
          border-radius: var(--radius-md);
          padding: var(--space-1);
          border: 1px solid var(--border-default);
          height: 40px;
          align-items: center;
        }
        .day-selector-header .day-btn {
          padding: var(--space-1) var(--space-2);
          border: none;
          background-color: transparent;
          color: var(--text-secondary);
          font-weight: var(--font-weight-medium);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-default);
          font-size: 0.85rem;
          min-width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .day-selector-header .day-btn:hover {
          background-color: var(--bg-hover);
          color: var(--text-primary);
        }
        .day-selector-header .day-btn.active {
          background-color: var(--primary);
          color: var(--text-on-primary);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          font-weight: var(--font-weight-bold);
          transform: none;
          border: 1px solid var(--primary);
        }
      `}</style>
            <style>{`
        @media (max-width: 768px) {
          .day-selector-header .day-selector {
            height: 36px;
          }
          .day-selector-header .day-btn {
            padding: var(--space-1);
            font-size: 0.75rem;
            min-width: 28px;
            height: 28px;
          }
        }
        @media (max-width: 640px) {
          .day-selector-header h1 {
            font-size: 1.25rem;
          }
          .day-selector-header p {
            font-size: 0.8rem;
          }
        }
      `}</style>
            <style>{`
        @media (max-width: 480px) {
          .day-selector-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-2);
          }
          .day-selector-header h1 {
            font-size: 1rem;
          }
          .day-selector-header p {
            font-size: 0.65rem;
          }
          .day-selector-header .day-selector {
            width: 100%;
            flex-wrap: nowrap;
            gap: 3px;
            height: auto;
            padding: 4px;
          }
          .day-selector-header .day-btn {
            flex: 1 1 0;
            min-width: 0;
            font-size: 0.7rem;
            height: 30px;
            padding: 4px 2px;
          }
        }
      `}</style>
        </header>
    );
}
