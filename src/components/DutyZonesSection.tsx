import React from 'react';
import { DutyZone } from '../types';

interface DutyZonesSectionProps {
  dutyZones: DutyZone[];
  onAddZone?: () => void;
  onDeleteZone?: (zoneId: string) => void;
  IconComponent: React.ComponentType<{ name: string; size?: number }>;
  classLocations?: Record<string, any>;
  locationZoneMapping?: Record<string, string>;
  setLocationZoneMapping?: (mapping: Record<string, string>) => void;
  onSaveLocationZoneMapping?: () => Promise<void> | void;
}

export default function DutyZonesSection({
  dutyZones,
  onAddZone,
  onDeleteZone,
  IconComponent,
  classLocations = {},
  locationZoneMapping = {},
  setLocationZoneMapping,
  onSaveLocationZoneMapping
}: DutyZonesSectionProps) {
  
  // Extract unique locations from classLocations
  const uniqueLocations = React.useMemo(() => {
    const locations = new Set<string>();
    Object.values(classLocations || {}).forEach((days: any) => {
      Object.values(days || {}).forEach((periods: any) => {
        Object.values(periods || {}).forEach((loc: any) => {
          if (loc && typeof loc === 'string' && loc.trim()) {
            locations.add(loc.trim());
          } else if (loc && typeof loc === 'object' && loc.location && typeof loc.location === 'string' && loc.location.trim()) {
            locations.add(loc.location.trim());
          }
        });
      });
    });
    return Array.from(locations).sort();
  }, [classLocations]);

  const handleMappingChange = (location: string, zoneName: string) => {
    if (setLocationZoneMapping) {
      setLocationZoneMapping({
        ...locationZoneMapping,
        [location]: zoneName
      });
    }
  };

  const [saveStatus, setSaveStatus] = React.useState<'idle'|'saving'|'success'|'error'>('idle');
  const handleSave = async () => {
    if (onSaveLocationZoneMapping) {
      setSaveStatus('saving');
      try {
        await onSaveLocationZoneMapping();
        setSaveStatus('success');
      } catch (err) {
        setSaveStatus('error');
      }
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  return (
    <div role="tabpanel" id="panel-duty-zones" aria-labelledby="tab-duty-zones">
      <div className="toolbar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={onAddZone}>
          <IconComponent name="plus" size={16} />
          <span className="btn-text">Nöbet Yeri Ekle</span>
        </button>
      </div>
      
      {(!dutyZones || dutyZones.length === 0) ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconComponent name="info" size={32} />
          </div>
          <h3>Henüz Nöbet Yeri Eklenmedi</h3>
          <p>Excel'den nöbet listesi yüklediğinizde nöbet yerleri otomatik olarak oluşturulur veya manuel ekleyebilirsiniz.</p>
        </div>
      ) : (
        <div style={{ padding: '24px' }}>
          <div className="dz-grid">
            {dutyZones.map((zone, index) => (
              <div 
                key={zone.zoneId} 
                className="dz-card" 
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="dz-card-bg-gradient"></div>
                <div className="dz-card-content">
                  <div className="dz-card-header">
                    <h3 className="dz-zone-name">{zone.name}</h3>
                    {onDeleteZone && (
                      <button 
                        className="dz-delete-btn" 
                        onClick={() => onDeleteZone(zone.zoneId)}
                        title="Sil"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px' }}>
                          <IconComponent name="trash" size={16} />
                        </div>
                      </button>
                    )}
                  </div>
                  <div className="dz-card-body">
                    <div className="dz-requirement-badge">
                      <IconComponent name="users" size={16} />
                      <span><strong>{zone.requiredTeacherCount}</strong> Öğretmen Gerekli</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {uniqueLocations.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <div className="card">
            <div className="card-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '8px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="dz-icon-wrapper" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
                    <IconComponent name="map" size={20} />
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>Sınıf Yeri & Nöbet Yeri Eşleştirmesi</h2>
                  <span className="badge badge-info">{uniqueLocations.length} Sınıf Yeri</span>
                </div>
                {onSaveLocationZoneMapping && (
                  <button 
                    className="btn btn-primary" 
                    onClick={handleSave}
                    disabled={saveStatus === 'saving'}
                    style={{ backgroundColor: saveStatus === 'success' ? 'var(--success)' : undefined }}
                  >
                    <IconComponent name={saveStatus === 'success' ? 'check' : 'save'} size={16} />
                    <span>{saveStatus === 'saving' ? 'Kaydediliyor...' : saveStatus === 'success' ? 'Kaydedildi' : 'Kaydet'}</span>
                  </button>
                )}
              </div>
              <p className="text-sm text-secondary" style={{ margin: '8px 0 0 0', maxWidth: '800px', lineHeight: '1.5' }}>
                Dersi boş geçen sınıfa nöbetçi öğretmen atanırken, sınıfın bulunduğu kattaki öğretmene öncelik verilir.
                Bunun düzgün çalışması için lütfen sınıf yerlerinin hangi nöbet bölgesinde olduğunu aşağıdan eşleştiriniz.
              </p>
            </div>
            
            <div className="table-container" style={{ borderTop: '1px solid var(--border)' }}>
              <table className="tbl w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left w-1/2" style={{ paddingLeft: '24px' }}>Sınıf Yeri (Excel'den)</th>
                    <th className="text-left w-1/2" style={{ paddingRight: '24px' }}>Bağlı Olduğu Nöbet Yeri (Kat)</th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueLocations.map(loc => (
                    <tr key={loc}>
                      <td className="font-medium text-left" style={{ paddingLeft: '24px' }}>{loc}</td>
                      <td style={{ paddingRight: '24px' }}>
                        <select
                          className="input w-full"
                          value={locationZoneMapping[loc] || ''}
                          onChange={(e) => handleMappingChange(loc, e.target.value)}
                        >
                          <option value="">-- Nöbet Yeri Seçin --</option>
                          {dutyZones.map(z => (
                            <option key={z.zoneId} value={z.name}>{z.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .dz-section {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          padding: var(--space-6);
          box-shadow: var(--shadow-md);
          width: 100%;
          color: var(--text-primary);
          transition: all var(--transition-default) ease;
        }

        .dz-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-6);
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: var(--space-5);
        }

        .dz-title {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }

        .dz-icon-wrapper {
          background: var(--gradient-primary);
          width: 48px;
          height: 48px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-sm);
          color: white;
        }

        .dz-title h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: var(--font-weight-semibold);
          letter-spacing: -0.02em;
        }

        .dz-badge {
          background: var(--bg-accent);
          color: var(--primary);
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-size: 0.85rem;
          font-weight: var(--font-weight-semibold);
          border: 1px solid var(--border-accent);
        }

        .dz-add-btn {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          background: var(--primary);
          color: var(--text-on-primary);
          border: none;
          padding: 10px 20px;
          border-radius: var(--radius-md);
          font-weight: var(--font-weight-semibold);
          cursor: pointer;
          transition: all var(--transition-fast) ease;
          box-shadow: var(--shadow-sm);
        }

        .dz-add-btn:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          background: var(--primary-hover);
        }

        .dz-add-btn-large {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          background: var(--primary);
          color: var(--text-on-primary);
          border: none;
          padding: 12px 28px;
          border-radius: var(--radius-lg);
          font-size: 1.05rem;
          font-weight: var(--font-weight-semibold);
          cursor: pointer;
          transition: all var(--transition-fast);
          margin-top: var(--space-5);
          box-shadow: var(--shadow-md);
        }
        
        .dz-add-btn-large:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
          background: var(--primary-hover);
        }

        .dz-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: var(--space-4);
        }

        .dz-card {
          background: var(--surface, #ffffff);
          border: 1px solid var(--border-strong, #e5e7eb);
          border-radius: var(--radius-lg);
          position: relative;
          overflow: hidden;
          transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
          box-shadow: var(--shadow-card);
        }

        @keyframes fadeUpIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dz-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: var(--primary);
        }

        .dz-card-bg-gradient {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--primary-gradient);
          opacity: 0;
          transition: opacity var(--transition-default);
        }

        .dz-card:hover .dz-card-bg-gradient {
          opacity: 1;
        }

        .dz-card-content {
          padding: var(--space-4);
        }

        .dz-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-3);
          gap: var(--space-2);
        }

        .dz-zone-name {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.4;
        }

        .dz-delete-btn {
          background: #fee2e2;
          color: #dc2626;
          border: none;
          border-radius: var(--radius-md);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          flex-shrink: 0;
          opacity: 0;
          pointer-events: none;
        }

        .dz-delete-btn svg {
          stroke: currentColor !important;
          flex-shrink: 0;
        }

        .dz-card:hover .dz-delete-btn {
          opacity: 1;
          pointer-events: auto;
        }

        .dz-delete-btn:hover {
          background: #dc2626;
          color: #ffffff;
          transform: scale(1.05);
        }

        .dz-requirement-badge {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          background: var(--bg-subtle);
          padding: 6px 12px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          color: var(--text-secondary);
          border: 1px solid var(--border-subtle);
        }

        .dz-requirement-badge strong {
          color: var(--primary);
          font-size: 1rem;
        }

        .dz-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          background: var(--bg-default);
          border-radius: var(--radius-lg);
          border: 1px dashed var(--border-default);
        }

        .dz-empty-icon {
          background: var(--bg-accent);
          color: var(--primary);
          width: 80px;
          height: 80px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: var(--space-6);
        }

        .dz-empty-state h3 {
          margin: 0 0 var(--space-3) 0;
          font-size: 1.4rem;
          color: var(--text-primary);
        }

        .dz-empty-state p {
          margin: 0;
          color: var(--text-secondary);
          max-width: 400px;
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .dz-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-5);
          }
          
          .dz-add-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
