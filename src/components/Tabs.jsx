import React from "react";
import styles from './Tabs.module.css';

// Bu bileşen artık App.jsx'ten bir 'icon' prop'u alacak.
// App.jsx'te tanımlanan Icon bileşeni burada kullanılacak.
// Bu nedenle, TabIcons nesnesi artık gerekli değil.

function Tabs({ items, active, onChange, IconComponent }) {
  // Aktif sekmenin genişliğini ve konumunu hesaplamak için ref
  const activeTabRef = React.useRef(null);
  const [indicatorStyle, setIndicatorStyle] = React.useState({});

  React.useEffect(() => {
    if (activeTabRef.current) {
      setIndicatorStyle({
        width: activeTabRef.current.offsetWidth,
        left: activeTabRef.current.offsetLeft,
      });
      activeTabRef.current.focus();
    }
  }, [active]); // active değiştiğinde yeniden hesapla

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

  const focusTabAtIndex = React.useCallback(
    (index) => {
      const nextIndex = (index + items.length) % items.length;
      const nextKey = items[nextIndex]?.key;
      if (nextKey) {
        onChange(nextKey);
      }
    },
    [items, onChange]
  );

  const handleKeyDown = React.useCallback(
    (event, index) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          focusTabAtIndex(index + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          focusTabAtIndex(index - 1);
          break;
        case 'Home':
          event.preventDefault();
          focusTabAtIndex(0);
          break;
        case 'End':
          event.preventDefault();
          focusTabAtIndex(items.length - 1);
          break;
        default:
          break;
      }
    },
    [focusTabAtIndex, items.length]
  );

  return (
    <nav className={styles.tabsContainer}>
      <div className={styles.tabsTopBar}>
        <div className={styles.tabsList} role="tablist" aria-label="Ana sekmeler">
          {items.map((it, index) => (
            <button
              key={it.key}
              ref={active === it.key ? activeTabRef : null}
              className={`${styles.tabItem} ${active === it.key ? styles.active : ""}`}
              onClick={() => onChange(it.key)}
              type="button"
              role="tab"
              aria-selected={active === it.key}
              tabIndex={active === it.key ? 0 : -1}
              id={`tab-${it.key}`}
              aria-controls={`panel-${it.key}`}
              onKeyDown={(event) => handleKeyDown(event, index)}
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

// 🚀 Performance: React.memo prevents re-renders when props haven't changed
export default React.memo(Tabs);