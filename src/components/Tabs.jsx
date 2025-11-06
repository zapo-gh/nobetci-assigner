import React from "react";
import styles from './Tabs.module.css';

// Bu bileşen artık App.jsx'ten bir 'icon' prop'u alacak.
// App.jsx'te tanımlanan Icon bileşeni burada kullanılacak.
// Bu nedenle, TabIcons nesnesi artık gerekli değil.

export default function Tabs({ items, active, onChange, IconComponent }) {
  // Aktif sekmenin genişliğini ve konumunu hesaplamak için ref
  const activeTabRef = React.useRef(null);
  const [indicatorStyle, setIndicatorStyle] = React.useState({});

  React.useEffect(() => {
    if (activeTabRef.current) {
      setIndicatorStyle({
        width: activeTabRef.current.offsetWidth,
        left: activeTabRef.current.offsetLeft,
      });
    }
  }, [active, items]); // active veya items değiştiğinde yeniden hesapla

  // Resize durumunda da güncelleme yap
  React.useEffect(() => {
    const handleResize = () => {
      if (activeTabRef.current) {
        setIndicatorStyle({
          width: activeTabRef.current.offsetWidth,
          left: activeTabRef.current.offsetLeft,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [active]);

  return (
    <nav className={styles.tabsContainer}>
      <div className={styles.tabsTopBar}>
        <div className={styles.tabsList} role="tablist">
          {items.map(it => (
            <button
              key={it.key}
              ref={active === it.key ? activeTabRef : null}
              className={`${styles.tabItem} ${active === it.key ? styles.active : ""}`}
              onClick={() => onChange(it.key)}
              type="button"
              role="tab"
              aria-selected={active === it.key}
            >
              {it.icon && IconComponent && <IconComponent name={it.icon} size={18} />}
              <span className={styles.tabLabel}>{it.label}</span>
            </button>
          ))}
          <div className={styles.tabIndicator} style={indicatorStyle}></div>
        </div>
      </div>
    </nav>
  );
}