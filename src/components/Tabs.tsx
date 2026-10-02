// @ts-nocheck
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
      if (document.activeElement !== activeTabRef.current) {
        activeTabRef.current.focus({ preventScroll: true });
      }
    }
  }, [active]);

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

  // Gruplara ayır
  const groupedItems = React.useMemo(() => {
    const groups = {};
    items.forEach(it => {
      const g = it.group || "Diğer";
      if (!groups[g]) groups[g] = [];
      groups[g].push(it);
    });
    return groups;
  }, [items]);

  return (
    <nav className="tabs">
      {Object.entries(groupedItems).map(([groupName, groupItems], groupIndex, arr) => (
        <React.Fragment key={groupName}>
          <div role="group" aria-label={groupName} style={{ display: 'flex', gap: '8px' }}>
            {groupItems.map((it, index) => {
              const globalIndex = items.findIndex(i => i.key === it.key);
              
              let dataGroup = "data"; // Default
              if (groupName === "Planlama") dataGroup = "plan";
              if (groupName === "Çıktılar") dataGroup = "output";

              return (
                <button
                  key={it.key}
                  ref={active === it.key ? activeTabRef : null}
                  className="tab"
                  data-group={dataGroup}
                  onClick={() => onChange(it.key)}
                  type="button"
                  role="tab"
                  aria-selected={active === it.key}
                  tabIndex={active === it.key ? 0 : -1}
                  id={`tab-${it.key}`}
                  aria-controls={`panel-${it.key}`}
                  onKeyDown={(event) => handleKeyDown(event, globalIndex)}
                >
                  {it.icon && IconComponent && <IconComponent name={it.icon} size={16} />}
                  <span>{it.label}</span>
                </button>
              );
            })}
          </div>
          {groupIndex < arr.length - 1 && <div className="tab-group-sep"></div>}
        </React.Fragment>
      ))}
    </nav>
  );
}

// 🚀 Performance: React.memo prevents re-renders when props haven't changed
export default React.memo(Tabs);