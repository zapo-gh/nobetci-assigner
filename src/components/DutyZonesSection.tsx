import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DutyZone } from '../types';
import Modal from './Modal';

interface DutyZonesSectionProps {
  dutyZones: DutyZone[];
  onAddZone?: () => void;
  onDeleteZone?: (zoneId: string) => void;
  onUpdateZone?: (updatedZone: DutyZone, oldZoneName?: string) => void;
  IconComponent: React.ComponentType<{ name: string; size?: number }>;
  classLocations?: Record<string, any>;
  locationZoneMapping?: Record<string, string>;
  setLocationZoneMapping?: (mapping: Record<string, string>) => void;
  onSaveLocationZoneMapping?: () => Promise<void> | void;
}

// Akıllı Eşleştirme Motoru: Oda kodlarını (A-01, A-102, A-350 vb.) nöbet yerleriyle otomatik eşleştirir
export function smartMatchLocation(loc: string, zones: { zoneId: string; name: string }[]): string | null {
  if (!loc || !zones || zones.length === 0) return null;
  const normLoc = loc.toLocaleUpperCase('tr-TR').trim();
  const zoneItems = zones.map((z) => ({
    orig: z.name,
    norm: z.name.toLocaleUpperCase('tr-TR').trim()
  }));

  const matchesFloor = (zNorm: string, floorNum: number) => {
    if (floorNum === 0) {
      return (
        zNorm.includes('ZEMİN') ||
        zNorm.includes('ZEMIN') ||
        zNorm.includes('BODRUM') ||
        zNorm.includes('GİRİŞ') ||
        zNorm.includes('GIRIS')
      );
    }
    if (floorNum === 1) {
      return (
        zNorm.includes('1.') ||
        zNorm.includes('1 .') ||
        zNorm.includes('1.KAT') ||
        zNorm.includes('BİRİNCİ') ||
        zNorm.includes('BIRINCI')
      );
    }
    if (floorNum === 2) {
      return (
        zNorm.includes('2.') ||
        zNorm.includes('2 .') ||
        zNorm.includes('2.KAT') ||
        zNorm.includes('İKİNCİ') ||
        zNorm.includes('IKINCI')
      );
    }
    if (floorNum === 3) {
      return (
        zNorm.includes('3.') ||
        zNorm.includes('3 .') ||
        zNorm.includes('3.KAT') ||
        zNorm.includes('ÜÇÜNCÜ') ||
        zNorm.includes('UCUNCU')
      );
    }
    if (floorNum === 4) {
      return zNorm.includes('4.') || zNorm.includes('4.KAT') || zNorm.includes('DÖRDÜNCÜ');
    }
    return false;
  };

  // Blok Harfi (A, B, C, D vb.)
  const blockMatch = normLoc.match(/^([A-Z])[\-_/]?/);
  const blockLetter = blockMatch ? blockMatch[1] : null;

  // Kat Numarası Tespiti (Örn: A-01 -> 0, A-102 -> 1, A-205 -> 2, A-350 -> 3)
  let floorNum: number | null = null;
  const numMatch = normLoc.match(/(?:[A-Z][\-_/]?)?(\d+)/);
  if (numMatch && numMatch[1]) {
    const digits = numMatch[1];
    if (digits.startsWith('0') || digits === '0') {
      floorNum = 0;
    } else if (digits.length >= 3) {
      floorNum = parseInt(digits.charAt(0), 10);
    } else if (digits.length === 2 && parseInt(digits, 10) >= 10 && parseInt(digits, 10) < 20) {
      floorNum = 1;
    } else if (digits.length === 2 && parseInt(digits, 10) >= 20 && parseInt(digits, 10) < 30) {
      floorNum = 2;
    } else if (digits.length === 2 && parseInt(digits, 10) >= 30 && parseInt(digits, 10) < 40) {
      floorNum = 3;
    } else if (digits.length === 1) {
      floorNum = parseInt(digits, 10);
    }
  }

  // Özel Alanlar (Atölye, Bahçe, Motor vb.)
  const isWorkshop =
    normLoc.includes('ATÖLYE') ||
    normLoc.includes('ATOLYE') ||
    normLoc.includes('MOTOR') ||
    normLoc.includes('METAL') ||
    normLoc.includes('ELEKTRİK') ||
    normLoc.includes('BİLİŞİM') ||
    normLoc.includes('TESİSAT') ||
    normLoc.includes('350') ||
    normLoc.includes('351') ||
    normLoc.includes('352');

  const isGarden =
    normLoc.includes('BAHÇE') ||
    normLoc.includes('BAHCE') ||
    normLoc.includes('KANTİN') ||
    normLoc.includes('SPOR');

  if (isWorkshop) {
    const workshopZone = zoneItems.find(
      (z) => z.norm.includes('ATÖLYE') || z.norm.includes('ATOLYE') || z.norm.includes('MOTOR')
    );
    if (workshopZone) return workshopZone.orig;
  }

  if (isGarden) {
    const gardenZone = zoneItems.find(
      (z) => z.norm.includes('BAHÇE') || z.norm.includes('BAHCE') || z.norm.includes('SPOR')
    );
    if (gardenZone) return gardenZone.orig;
  }

  // Blok + Kat Eşleşmesi
  if (blockLetter && floorNum !== null) {
    const matched = zoneItems.find((z) => {
      const hasBlock =
        z.norm.startsWith(`${blockLetter}-`) ||
        z.norm.startsWith(`${blockLetter} `) ||
        z.norm.includes(`${blockLetter} BLOK`) ||
        z.norm.includes(`${blockLetter}-`);
      const hasFloor = matchesFloor(z.norm, floorNum!);
      return hasBlock && hasFloor;
    });
    if (matched) return matched.orig;
  }

  // Kat Eşleşmesi (Yalnızca oda adı en az 2 karakterse veya 'KAT' içeriyorsa ve tek bir eşleşen kat varsa)
  if (floorNum !== null && (normLoc.length >= 2 || normLoc.includes('KAT'))) {
    const matchingFloors = zoneItems.filter((z) => matchesFloor(z.norm, floorNum!));
    if (matchingFloors.length === 1 && matchingFloors[0]) return matchingFloors[0].orig;
  }

  return null;
}

export default function DutyZonesSection({
  dutyZones,
  onAddZone,
  onDeleteZone,
  onUpdateZone,
  IconComponent,
  classLocations = {},
  locationZoneMapping = {},
  setLocationZoneMapping,
  onSaveLocationZoneMapping
}: DutyZonesSectionProps) {
  // Görünüm Modu: 'cards' (Nöbet Yeri Odaklı Kartlar) | 'table' (Klasik Liste)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedLocation, setDraggedLocation] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  const [activeAddZone, setActiveAddZone] = useState<string | null>(null);
  const [activeQuickAssignLoc, setActiveQuickAssignLoc] = useState<string | null>(null);
  const [batchTargetZone, setBatchTargetZone] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Nöbet Yeri Düzenleme State'i
  const [editingZone, setEditingZone] = useState<DutyZone | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', requiredTeachers: '1' });
  const [editErrors, setEditErrors] = useState<{ name?: string; requiredTeachers?: string }>({});

  const addDropdownRef = useRef<HTMLDivElement | null>(null);
  const quickAssignRef = useRef<HTMLDivElement | null>(null);

  // Dışarı tıklanınca açılır menüleri kapat
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addDropdownRef.current && !addDropdownRef.current.contains(e.target as Node)) {
        setActiveAddZone(null);
      }
      if (quickAssignRef.current && !quickAssignRef.current.contains(e.target as Node)) {
        setActiveQuickAssignLoc(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Düzenleme Modalını Aç
  const handleOpenEditModal = (zone: DutyZone) => {
    setEditingZone(zone);
    setEditFormData({
      name: zone.name,
      requiredTeachers: String(zone.requiredTeacherCount || 1)
    });
    setEditErrors({});
  };

  // Düzenleme Kaydet
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingZone) return;
    const nameTrimmed = editFormData.name.trim();
    const reqCount = parseInt(editFormData.requiredTeachers, 10);
    const errors: { name?: string; requiredTeachers?: string } = {};

    if (!nameTrimmed) {
      errors.name = 'Nöbet yeri adı boş olamaz.';
    }
    if (!Number.isFinite(reqCount) || reqCount < 1) {
      errors.requiredTeachers = 'Gerekli öğretmen sayısı en az 1 olmalıdır.';
    }
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    const oldName = editingZone.name;
    const updated: DutyZone = {
      ...editingZone,
      name: nameTrimmed,
      requiredTeacherCount: reqCount
    };

    if (onUpdateZone) {
      onUpdateZone(updated, oldName);
      showToast(`"${nameTrimmed}" nöbet yeri başarıyla güncellendi.`);
    }
    setEditingZone(null);
  };

  // Excel ve ders programlarından gelen benzersiz sınıf yerleri
  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    Object.values(classLocations || {}).forEach((days: any) => {
      Object.values(days || {}).forEach((periods: any) => {
        Object.values(periods || {}).forEach((loc: any) => {
          if (loc && typeof loc === 'string' && loc.trim()) {
            locations.add(loc.trim());
          } else if (
            loc &&
            typeof loc === 'object' &&
            loc.location &&
            typeof loc.location === 'string' &&
            loc.location.trim()
          ) {
            locations.add(loc.location.trim());
          }
        });
      });
    });
    return Array.from(locations).sort();
  }, [classLocations]);

  // Nöbet Yerine Göre Gruplanmış Sınıflar
  const zoneClassroomsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    (dutyZones || []).forEach((z) => {
      map[z.name] = [];
    });
    uniqueLocations.forEach((loc) => {
      const zName = locationZoneMapping[loc];
      if (zName && map[zName]) {
        map[zName].push(loc);
      }
    });
    return map;
  }, [dutyZones, uniqueLocations, locationZoneMapping]);

  // Atanmamış (Havuzda Bekleyen) Sınıf Yerleri
  const unassignedClassrooms = useMemo(() => {
    return uniqueLocations.filter((loc) => !locationZoneMapping[loc]);
  }, [uniqueLocations, locationZoneMapping]);

  // Filtrelenmiş Atanmamış Sınıf Yerleri
  const filteredUnassigned = useMemo(() => {
    if (!searchQuery.trim()) return unassignedClassrooms;
    const q = searchQuery.toLocaleUpperCase('tr-TR').trim();
    return unassignedClassrooms.filter((loc) => loc.toLocaleUpperCase('tr-TR').includes(q));
  }, [unassignedClassrooms, searchQuery]);

  // Tekli Atama
  const handleAssign = (location: string, zoneName: string) => {
    if (setLocationZoneMapping) {
      setLocationZoneMapping({
        ...locationZoneMapping,
        [location]: zoneName
      });
    }
  };

  // Atamayı Kaldırma (Havuza Geri Gönder)
  const handleUnassign = (location: string) => {
    if (setLocationZoneMapping) {
      const updated = { ...locationZoneMapping };
      delete updated[location];
      setLocationZoneMapping(updated);
    }
  };

  // Toplu Atama (Örn: A-0 ile başlayan filtrelenmişleri tek tıkla ata)
  const handleBatchAssignFiltered = (targetZone: string) => {
    if (!targetZone || filteredUnassigned.length === 0 || !setLocationZoneMapping) return;
    const updated = { ...locationZoneMapping };
    filteredUnassigned.forEach((loc) => {
      updated[loc] = targetZone;
    });
    setLocationZoneMapping(updated);
    showToast(`${filteredUnassigned.length} sınıf yeri "${targetZone}" bölgesine atandı!`);
    setSearchQuery('');
  };

  // ✨ Akıllı Otomatik Eşleştirme Motoru
  const handleSmartAutoMatch = () => {
    if (!setLocationZoneMapping || !dutyZones || dutyZones.length === 0) return;
    let matchCount = 0;
    const updated = { ...locationZoneMapping };

    uniqueLocations.forEach((loc) => {
      // Yalnızca henüz atanmamış olanları otomatik eşleştir
      if (!updated[loc]) {
        const matchedZone = smartMatchLocation(loc, dutyZones);
        if (matchedZone) {
          updated[loc] = matchedZone;
          matchCount++;
        }
      }
    });

    setLocationZoneMapping(updated);
    if (matchCount > 0) {
      showToast(`✨ ${matchCount} sınıf yeri otomatik olarak eşleştirildi!`);
    } else {
      showToast(`Otomatik eşleştirilecek yeni sınıf yeri bulunamadı.`);
    }
  };

  // Tüm Eşleştirmeleri Sıfırla
  const handleResetAll = () => {
    if (window.confirm('Tüm sınıf yeri eşleştirmelerini sıfırlamak istediğinize emin misiniz?')) {
      if (setLocationZoneMapping) {
        setLocationZoneMapping({});
        showToast('Tüm eşleştirmeler sıfırlandı.');
      }
    }
  };

  // Kaydet Butonu Durumu
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
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
      {/* Üst Araç Çubuğu */}
      <div className="toolbar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={onAddZone}>
          <IconComponent name="plus" size={16} />
          <span className="btn-text">Nöbet Yeri Ekle</span>
        </button>
      </div>

      {/* Bildirim Toast */}
      {toastMessage && (
        <div className="zone-toast-alert">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Nöbet Yerleri Yönetim Kartları */}
      {!dutyZones || dutyZones.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconComponent name="info" size={32} />
          </div>
          <h3>Henüz Nöbet Yeri Eklenmedi</h3>
          <p>
            Excel'den nöbet listesi yüklediğinizde nöbet yerleri otomatik olarak oluşturulur veya manuel ekleyebilirsiniz.
          </p>
        </div>
      ) : (
        <div style={{ padding: '24px' }}>
          <div className="dz-grid">
            {dutyZones.map((zone, index) => (
              <div key={zone.zoneId} className="dz-card" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="dz-card-bg-gradient"></div>
                <div className="dz-card-content">
                  <div className="dz-card-header">
                    <h3 className="dz-zone-name">{zone.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {onUpdateZone && (
                        <button
                          type="button"
                          className="dz-action-btn dz-edit-btn"
                          onClick={() => handleOpenEditModal(zone)}
                          title="Nöbet Yerini Düzenle"
                          aria-label="Nöbet Yerini Düzenle"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', pointerEvents: 'none' }}>
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      )}
                      {onDeleteZone && (
                        <button
                          type="button"
                          className="dz-action-btn dz-delete-btn"
                          onClick={() => onDeleteZone(zone.zoneId)}
                          title="Nöbet Yerini Sil"
                          aria-label="Nöbet Yerini Sil"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', pointerEvents: 'none' }}>
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="dz-card-body">
                    <div className="dz-requirement-badge">
                      <IconComponent name="users" size={16} />
                      <span>
                        <strong>{zone.requiredTeacherCount}</strong> Öğretmen Gerekli
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sınıf Yeri & Nöbet Yeri Eşleştirme Bölümü */}
      {uniqueLocations.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <div className="card" style={{ overflow: 'visible' }}>
            {/* Header & Controls */}
            <div
              className="card-header"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '24px',
                borderBottom: '1px solid var(--border)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="dz-icon-wrapper" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
                    <IconComponent name="map" size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
                        Sınıf Yeri & Nöbet Yeri Eşleştirmesi
                      </h2>
                      <span className="badge badge-info">{uniqueLocations.length} Sınıf Yeri</span>
                    </div>
                    <p
                      className="text-sm text-secondary"
                      style={{ margin: '4px 0 0 0', maxWidth: '750px', lineHeight: '1.4' }}
                    >
                      Dersi boş geçen sınıfa nöbetçi öğretmen atanırken, sınıfın bulunduğu kattaki öğretmene öncelik
                      verilir.
                    </p>
                  </div>
                </div>

                {/* Sağ Eylemler: Görünüm Seçici ve Kaydet */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Görünüm Geçişi */}
                  <div className="view-toggle-wrap">
                    <button
                      type="button"
                      className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
                      onClick={() => setViewMode('cards')}
                    >
                      <span>🏢</span>
                      <span>Nöbet Yeri Kartları</span>
                    </button>
                    <button
                      type="button"
                      className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                      onClick={() => setViewMode('table')}
                    >
                      <span>📋</span>
                      <span>Klasik Liste</span>
                    </button>
                  </div>

                  {/* Kaydet Butonu */}
                  {onSaveLocationZoneMapping && (
                    <button
                      className="btn btn-primary"
                      onClick={handleSave}
                      disabled={saveStatus === 'saving'}
                      style={{
                        backgroundColor: saveStatus === 'success' ? 'var(--success)' : undefined,
                        fontWeight: 600
                      }}
                    >
                      <IconComponent name={saveStatus === 'success' ? 'check' : 'save'} size={16} />
                      <span>
                        {saveStatus === 'saving'
                          ? 'Kaydediliyor...'
                          : saveStatus === 'success'
                          ? 'Kaydedildi'
                          : 'Kaydet'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ---------------- MOD 1: NÖBET YERİ ODAKLI GÖRÜNÜM (ÖNERİLEN) ---------------- */}
            {viewMode === 'cards' ? (
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* 1. Atanmamış Sınıf Yerleri Havuzu */}
                <div
                  className="unassigned-pool-box"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const loc = e.dataTransfer.getData('text/plain') || draggedLocation;
                    if (loc) handleUnassign(loc);
                    setDraggedLocation(null);
                  }}
                >
                  <div className="unassigned-pool-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.2rem' }}>📦</span>
                      <span className="unassigned-pool-title">Atanmamış Sınıf Yerleri</span>
                      <span className={`badge ${unassignedClassrooms.length === 0 ? 'badge-success' : 'badge-warning'}`}>
                        {unassignedClassrooms.length === 0
                          ? '🎉 Tüm Sınıflar Eşleştirildi'
                          : `${unassignedClassrooms.length} Sınıf Bekliyor`}
                      </span>
                    </div>

                    {/* Hızlı Eylemler: Akıllı Eşleştir & Sıfırla */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {unassignedClassrooms.length > 0 && (
                        <button
                          type="button"
                          className="btn-smart-match"
                          onClick={handleSmartAutoMatch}
                          title="Oda numaralarına ve kat isimlerine göre otomatik eşleştir"
                        >
                          <span>✨</span>
                          <span>Akıllı Otomatik Eşleştir</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn-reset-mappings"
                        onClick={handleResetAll}
                        title="Tüm eşleştirmeleri temizle"
                      >
                        <span>Sıfırla</span>
                      </button>
                    </div>
                  </div>

                  {/* Arama ve Toplu Gönder Barı */}
                  {unassignedClassrooms.length > 0 && (
                    <div className="unassigned-search-bar">
                      <div className="search-input-wrapper">
                        <span className="search-icon">🔍</span>
                        <input
                          type="text"
                          placeholder="Sınıf yeri ara (Örn: A-0, A-1, Atölye)..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="search-input"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="search-clear-btn"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Filtrelenenleri Toplu Ata Seçeneği */}
                      {filteredUnassigned.length > 0 && (
                        <div className="batch-assign-action">
                          <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                            {filteredUnassigned.length} sınıfı şuraya ata:
                          </span>
                          <select
                            className="batch-zone-select"
                            value={batchTargetZone}
                            onChange={(e) => {
                              const z = e.target.value;
                              setBatchTargetZone(z);
                              if (z) {
                                handleBatchAssignFiltered(z);
                                setBatchTargetZone('');
                              }
                            }}
                          >
                            <option value="">-- Nöbet Yeri Seçin --</option>
                            {dutyZones.map((z) => (
                              <option key={z.zoneId} value={z.name}>
                                {z.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sınıf Etiketleri Havuzu */}
                  <div className="chips-container">
                    {unassignedClassrooms.length === 0 ? (
                      <div className="all-assigned-message">
                        <span>✅ Tebrikler! Tüm sınıf yerleri bir nöbet bölgesine atandı. Değiştirmek için aşağıdaki kartlardan sürükleyebilirsiniz.</span>
                      </div>
                    ) : filteredUnassigned.length === 0 ? (
                      <div className="no-filter-match-text">
                        <span>"{searchQuery}" aramasıyla eşleşen atanmamış sınıf yeri bulunamadı.</span>
                      </div>
                    ) : (
                      filteredUnassigned.map((loc) => (
                        <div
                          key={loc}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', loc);
                            e.dataTransfer.effectAllowed = 'move';
                            setDraggedLocation(loc);
                          }}
                          onDragEnd={() => {
                            setDraggedLocation(null);
                            setDragOverZone(null);
                          }}
                          className={`draggable-chip unassigned-chip ${
                            draggedLocation === loc ? 'dragging' : ''
                          }`}
                          title="Sürükleyip aşağıdaki nöbet yerine bırakın veya tıklayıp seçin"
                        >
                          <span className="chip-text">{loc}</span>
                          <button
                            type="button"
                            className="chip-quick-assign-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveQuickAssignLoc(activeQuickAssignLoc === loc ? null : loc);
                            }}
                            title="Hızlı Kat Seç"
                          >
                            ▾
                          </button>

                          {/* Hızlı Atama Popover */}
                          {activeQuickAssignLoc === loc && (
                            <div ref={quickAssignRef} className="quick-assign-popover">
                              <div className="quick-assign-popover-title">Nöbet Yeri Seçin:</div>
                              {dutyZones.map((z) => (
                                <button
                                  key={z.zoneId}
                                  type="button"
                                  className="quick-assign-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAssign(loc, z.name);
                                    setActiveQuickAssignLoc(null);
                                  }}
                                >
                                  {z.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. Nöbet Yeri Kartları Grid'i */}
                <div className="zone-cards-grid">
                  {dutyZones.map((zone) => {
                    const assignedList = zoneClassroomsMap[zone.name] || [];
                    const isDragOver = dragOverZone === zone.name;

                    return (
                      <div
                        key={zone.zoneId}
                        className={`zone-mapping-card ${isDragOver ? 'drag-over' : ''}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDragEnter={() => setDragOverZone(zone.name)}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setDragOverZone(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const loc = e.dataTransfer.getData('text/plain') || draggedLocation;
                          if (loc) {
                            handleAssign(loc, zone.name);
                          }
                          setDragOverZone(null);
                          setDraggedLocation(null);
                        }}
                      >
                        {/* Kart Başlığı */}
                        <div className="zone-mapping-card-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.1rem' }}>🏢</span>
                            <span className="zone-card-title">{zone.name}</span>
                            {onUpdateZone && (
                              <button
                                type="button"
                                className="zone-title-edit-btn"
                                onClick={() => handleOpenEditModal(zone)}
                                title="Nöbet yerini düzenle"
                              >
                                <IconComponent name="edit" size={13} />
                              </button>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="zone-count-badge">{assignedList.length} Sınıf</span>

                            {/* + Sınıf Ekle Butonu */}
                            <div style={{ position: 'relative' }}>
                              <button
                                type="button"
                                className="zone-add-class-btn"
                                onClick={() =>
                                  setActiveAddZone(activeAddZone === zone.name ? null : zone.name)
                                }
                                title="Bu nöbet yerine sınıf ekle"
                              >
                                + Ekle
                              </button>

                              {/* Hızlı Ekleme Açılır Menüsü */}
                              {activeAddZone === zone.name && (
                                <div ref={addDropdownRef} className="add-class-popover">
                                  <div className="add-class-popover-header">
                                    <span>Atanacak Sınıfı Seçin</span>
                                    <button
                                      type="button"
                                      className="popover-close-btn"
                                      onClick={() => setActiveAddZone(null)}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  <div className="add-class-popover-list">
                                    {unassignedClassrooms.length === 0 ? (
                                      <div className="popover-empty-notice">
                                        Atanmamış sınıf yeri kalmadı.
                                      </div>
                                    ) : (
                                      unassignedClassrooms.map((loc) => (
                                        <button
                                          key={loc}
                                          type="button"
                                          className="add-class-item"
                                          onClick={() => {
                                            handleAssign(loc, zone.name);
                                          }}
                                        >
                                          <span>{loc}</span>
                                          <span style={{ fontSize: '0.78rem', color: '#16a34a' }}>+ Ekle</span>
                                        </button>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Kart İçeriği: Atanmış Sınıf Etiketleri */}
                        <div className="zone-mapping-card-body">
                          {assignedList.length === 0 ? (
                            <div className="zone-empty-dropzone">
                              <span>Buraya sınıf sürükleyin veya "+ Ekle" butonunu kullanın</span>
                            </div>
                          ) : (
                            <div className="assigned-chips-wrap">
                              {assignedList.map((loc) => (
                                <div
                                  key={loc}
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', loc);
                                    e.dataTransfer.effectAllowed = 'move';
                                    setDraggedLocation(loc);
                                  }}
                                  onDragEnd={() => {
                                    setDraggedLocation(null);
                                    setDragOverZone(null);
                                  }}
                                  className={`draggable-chip assigned-chip ${
                                    draggedLocation === loc ? 'dragging' : ''
                                  }`}
                                  title="Başka bir nöbet yerine sürükleyebilir veya kaldırabilirsiniz"
                                >
                                  <span className="chip-text">{loc}</span>
                                  <button
                                    type="button"
                                    className="chip-remove-btn"
                                    onClick={() => handleUnassign(loc)}
                                    title="Atamayı kaldır (Havuz'a gönder)"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ---------------- MOD 2: KLASİK TABLO GÖRÜNÜMÜ ---------------- */
              <div className="table-container" style={{ borderTop: '1px solid var(--border)' }}>
                <table className="tbl w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left w-1/2" style={{ paddingLeft: '24px' }}>
                        Sınıf Yeri (Excel'den)
                      </th>
                      <th className="text-left w-1/2" style={{ paddingRight: '24px' }}>
                        Bağlı Olduğu Nöbet Yeri (Kat)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueLocations.map((loc) => (
                      <tr key={loc}>
                        <td className="font-medium text-left" style={{ paddingLeft: '24px' }}>
                          {loc}
                        </td>
                        <td style={{ paddingRight: '24px' }}>
                          <select
                            className="input w-full"
                            value={locationZoneMapping[loc] || ''}
                            onChange={(e) => handleAssign(loc, e.target.value)}
                          >
                            <option value="">-- Nöbet Yeri Seçin --</option>
                            {dutyZones.map((z) => (
                              <option key={z.zoneId} value={z.name}>
                                {z.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------- NÖBET YERİ DÜZENLE MODALI ---------------- */}
      {editingZone && (
        <Modal
          isOpen={!!editingZone}
          onClose={() => setEditingZone(null)}
          title="Nöbet Yeri Düzenle"
          size="small"
        >
          <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                Nöbet Yeri Adı <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={editFormData.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditFormData((prev) => ({ ...prev, name: val }));
                  if (editErrors.name) setEditErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="Örn: A- ZEMİN KAT, Bahçe"
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '0.95rem',
                  border: editErrors.name ? '2px solid #ef4444' : '1.5px solid #d1d5db',
                  borderRadius: '10px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {editErrors.name && (
                <p style={{ margin: '5px 0 0', fontSize: '0.78rem', color: '#ef4444' }}>{editErrors.name}</p>
              )}
              <p style={{ margin: '5px 0 0', fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.4 }}>
                Nöbet yeri adı değiştirilirse, bu kata bağlı tüm sınıfların ve öğretmenlerin eşleştirmeleri otomatik güncellenir.
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                Gerekli Öğretmen Sayısı <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={editFormData.requiredTeachers}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditFormData((prev) => ({ ...prev, requiredTeachers: val }));
                  if (editErrors.requiredTeachers) setEditErrors((prev) => ({ ...prev, requiredTeachers: '' }));
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '0.95rem',
                  border: editErrors.requiredTeachers ? '2px solid #ef4444' : '1.5px solid #d1d5db',
                  borderRadius: '10px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {editErrors.requiredTeachers && (
                <p style={{ margin: '5px 0 0', fontSize: '0.78rem', color: '#ef4444' }}>
                  {editErrors.requiredTeachers}
                </p>
              )}
              <p style={{ margin: '5px 0 0', fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.4 }}>
                Bu nöbet yeri için atanması gereken asgari öğretmen sayısı.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
                paddingTop: '16px',
                borderTop: '1px solid #e5e7eb',
                marginTop: '4px'
              }}
            >
              <button
                type="button"
                onClick={() => setEditingZone(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1.5px solid #d1d5db',
                  background: '#fff',
                  color: '#374151',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                İptal
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 22px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#4338ca',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Kaydet
              </button>
            </div>
          </form>
        </Modal>
      )}

      <style>{`
        /* Toast Bildirim */
        .zone-toast-alert {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 9999;
          background: #0f172a;
          color: #ffffff;
          padding: 12px 20px;
          border-radius: 10px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
          font-weight: 600;
          font-size: 0.9rem;
          animation: toastSlideIn 0.25s ease-out;
        }

        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Görünüm Geçiş Butonları */
        .view-toggle-wrap {
          display: inline-flex;
          background: #f1f5f9;
          padding: 3px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .view-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #64748b;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .view-toggle-btn.active {
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        /* Atanmamış Havuz Kutusu */
        .unassigned-pool-box {
          background: #f8fafc;
          border: 1.5px dashed #cbd5e1;
          border-radius: 14px;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: all 0.2s ease;
        }

        .unassigned-pool-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .unassigned-pool-title {
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
        }

        .btn-smart-match {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: #ffffff;
          border: none;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
          transition: all 0.15s ease;
        }

        .btn-smart-match:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(79, 70, 229, 0.35);
        }

        .btn-reset-mappings {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #64748b;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-reset-mappings:hover {
          background: #fee2e2;
          color: #dc2626;
          border-color: #fca5a5;
        }

        /* Arama & Toplu İşlem Barı */
        .unassigned-search-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          min-width: 260px;
          flex: 1;
          max-width: 380px;
        }

        .search-icon {
          position: absolute;
          left: 10px;
          font-size: 0.85rem;
          color: #94a3b8;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 7px 30px 7px 32px;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.85rem;
          outline: none;
          background: #ffffff;
          color: #0f172a;
          transition: border-color 0.15s ease;
        }

        .search-input:focus {
          border-color: #6366f1;
        }

        .search-clear-btn {
          position: absolute;
          right: 8px;
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 0.8rem;
        }

        .batch-assign-action {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
        }

        .batch-zone-select {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #0f172a;
          outline: none;
          cursor: pointer;
        }

        /* Etiketler (Chips) */
        .chips-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          min-height: 48px;
          align-items: center;
        }

        .draggable-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: grab;
          user-select: none;
          position: relative;
          transition: all 0.15s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .draggable-chip:active {
          cursor: grabbing;
        }

        .draggable-chip.dragging {
          opacity: 0.4;
          transform: scale(0.95);
        }

        .unassigned-chip {
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          color: #1e293b;
        }

        .unassigned-chip:hover {
          border-color: #6366f1;
          background: #eef2ff;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(99, 102, 241, 0.15);
        }

        .chip-quick-assign-btn {
          background: #e2e8f0;
          border: none;
          border-radius: 4px;
          font-size: 0.65rem;
          color: #475569;
          width: 16px;
          height: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          margin-left: 2px;
        }

        .chip-quick-assign-btn:hover {
          background: #cbd5e1;
          color: #0f172a;
        }

        /* Hızlı Kat Seç Popover */
        .quick-assign-popover {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          z-index: 1000;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.25);
          min-width: 220px;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .quick-assign-popover-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
          padding: 6px 8px 4px 8px;
          border-bottom: 1px solid #f1f5f9;
          margin-bottom: 2px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .quick-assign-item {
          text-align: left;
          background: transparent;
          border: none;
          padding: 7px 10px;
          border-radius: 6px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #1e293b;
          cursor: pointer;
          transition: background 0.12s ease;
        }

        .quick-assign-item:hover {
          background: #eef2ff;
          color: #4f46e5;
        }

        .all-assigned-message {
          padding: 12px 16px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          color: #166534;
          font-size: 0.88rem;
          font-weight: 600;
          width: 100%;
        }

        .no-filter-match-text {
          padding: 10px;
          color: #64748b;
          font-size: 0.85rem;
          font-style: italic;
        }

        /* Nöbet Yeri Kartları Grid */
        .zone-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }

        .zone-mapping-card {
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          overflow: visible;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
        }

        .zone-mapping-card.drag-over {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
          background: #f5f3ff;
          transform: translateY(-2px);
        }

        .zone-mapping-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #f8fafc;
          border-bottom: 1.5px solid #e2e8f0;
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
        }

        .zone-card-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        .zone-title-edit-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.12s ease;
          padding: 0;
        }

        .zone-title-edit-btn:hover {
          background: #e2e8f0;
          color: #4338ca;
        }

        .zone-count-badge {
          display: inline-block;
          padding: 2px 8px;
          background: #e0e7ff;
          color: #3730a3;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 700;
        }

        .zone-add-class-btn {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 3px 8px;
          font-size: 0.78rem;
          font-weight: 700;
          color: #4338ca;
          cursor: pointer;
          transition: all 0.12s ease;
        }

        .zone-add-class-btn:hover {
          background: #4338ca;
          color: #ffffff;
          border-color: #4338ca;
        }

        /* + Ekle Popover */
        .add-class-popover {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          z-index: 1000;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.25);
          width: 220px;
          padding: 8px;
        }

        .add-class-popover-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.78rem;
          font-weight: 700;
          color: #64748b;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 6px;
          margin-bottom: 6px;
        }

        .popover-close-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.75rem;
          cursor: pointer;
        }

        .add-class-popover-list {
          max-height: 200px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .add-class-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: transparent;
          border: none;
          padding: 6px 8px;
          border-radius: 6px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #1e293b;
          cursor: pointer;
          text-align: left;
        }

        .add-class-item:hover {
          background: #f1f5f9;
        }

        .popover-empty-notice {
          padding: 8px;
          color: #94a3b8;
          font-size: 0.78rem;
          font-style: italic;
          text-align: center;
        }

        /* Kart İçeriği & Etiketler */
        .zone-mapping-card-body {
          padding: 14px;
          min-height: 90px;
          display: flex;
          flex-direction: column;
        }

        .zone-empty-dropzone {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px dashed #e2e8f0;
          border-radius: 8px;
          padding: 12px;
          text-align: center;
          color: #94a3b8;
          font-size: 0.82rem;
          font-style: italic;
        }

        .assigned-chips-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .assigned-chip {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.82rem;
        }

        .assigned-chip:hover {
          border-color: #6366f1;
          background: #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
        }

        .chip-remove-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.75rem;
          width: 14px;
          height: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border-radius: 3px;
          margin-left: 2px;
          transition: all 0.12s ease;
        }

        .chip-remove-btn:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        /* Orijinal Nöbet Yeri Yönetim Stilleri */
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
          height: 140px;
          min-height: 140px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
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
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
        }

        .dz-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-2);
          gap: var(--space-2);
          min-height: 52px;
        }

        .dz-card-body {
          margin-top: auto;
          display: flex;
          align-items: center;
        }

        .dz-zone-name {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.4;
        }

        .dz-action-btn {
          border: none;
          border-radius: var(--radius-md, 8px);
          width: 32px;
          height: 32px;
          min-width: 32px;
          min-height: 32px;
          padding: 0 !important;
          margin: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast, 150ms ease);
          flex-shrink: 0;
          box-sizing: border-box;
          line-height: 1;
        }

        .dz-action-btn svg {
          display: block;
          width: 15px;
          height: 15px;
          stroke: currentColor;
          fill: none;
          pointer-events: none;
          flex-shrink: 0;
        }

        .dz-edit-btn {
          background: #e0e7ff !important;
          color: #4338ca !important;
        }

        .dz-edit-btn:hover {
          background: #4338ca !important;
          color: #ffffff !important;
          transform: scale(1.05);
        }

        .dz-delete-btn {
          background: #fee2e2 !important;
          color: #dc2626 !important;
        }

        .dz-delete-btn:hover {
          background: #dc2626 !important;
          color: #ffffff !important;
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
      `}</style>
    </div>
  );
}
