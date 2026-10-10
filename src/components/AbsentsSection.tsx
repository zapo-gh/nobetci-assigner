// @ts-nocheck
import React, { useState } from 'react';
import AbsenteeList from './AbsenteeList';
import EmptyState from './EmptyState';

export default function AbsentsSection({
  absentPeople = [],
  absentPeopleForCurrentDay = [],
  onAddAbsent,
  onDeleteAbsent,
  onDeleteAllAbsents,
  IconComponent,
  teacherSchedules,
  classLocations,
}) {
  if (!IconComponent) {
    throw new Error('AbsentsSection requires IconComponent prop');
  }

  // Varsayılan olarak seçili güne ait mazeretlileri göster (kullanıcı isterse tüm mazeretlileri görebilir)
  const [dayScope, setDayScope] = useState<'today' | 'all'>('today');

  const hasAnyAbsents = (Array.isArray(absentPeople) && absentPeople.length > 0) ||
                        (Array.isArray(absentPeopleForCurrentDay) && absentPeopleForCurrentDay.length > 0);

  const displayedAbsents = dayScope === 'today'
    ? absentPeopleForCurrentDay
    : (absentPeople.length > 0 ? absentPeople : absentPeopleForCurrentDay);

  return (
    <div role="tabpanel" id="panel-absents" aria-labelledby="tab-absents" style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
          padding: '12px 18px',
          background: 'var(--surface, #ffffff)',
          borderRadius: '14px',
          border: '1px solid var(--border, #e2e8f0)',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ef4444 0%, #f43f5e 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)'
            }}
          >
            <IconComponent name="userX" size={18} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              Okula Gelemeyen Öğretmenler
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Mazeretli öğretmenlerin boş kalan derslerini ve etkilenen sınıfları yönetin.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Gün Kapsamı Seçici (Seçili Gün / Tüm Mazeretliler) */}
          {hasAnyAbsents && (
            <div
              style={{
                display: 'inline-flex',
                background: '#f1f5f9',
                padding: '3px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}
            >
              <button
                type="button"
                onClick={() => setDayScope('today')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '7px',
                  border: 'none',
                  background: dayScope === 'today' ? '#ffffff' : 'transparent',
                  color: dayScope === 'today' ? '#0f172a' : '#64748b',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  boxShadow: dayScope === 'today' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Seçili Gün ({absentPeopleForCurrentDay.length})
              </button>
              <button
                type="button"
                onClick={() => setDayScope('all')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '7px',
                  border: 'none',
                  background: dayScope === 'all' ? '#ffffff' : 'transparent',
                  color: dayScope === 'all' ? '#0f172a' : '#64748b',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  boxShadow: dayScope === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Tüm Mazeretliler ({absentPeople.length})
              </button>
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={onAddAbsent}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.88rem'
            }}
          >
            <IconComponent name="userX" size={16} />
            <span>Yeni Mazeretli Ekle</span>
          </button>

          {absentPeople.length > 0 && (
            <button
              className="btn btn-danger"
              onClick={onDeleteAllAbsents}
              title="Tüm mazeretleri sil"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.88rem'
              }}
            >
              <IconComponent name="trash" size={15} />
              <span>Tümünü Sil</span>
            </button>
          )}
        </div>
      </div>

      {!hasAnyAbsents ? (
        <EmptyState
          IconComponent={IconComponent}
          icon="userX"
          title="Henüz Mazeret Eklenmedi"
          description="Sisteme girilmiş herhangi bir öğretmen mazereti bulunmuyor. Yeni mazeretli eklemek için yukarıdaki butonu kullanabilirsiniz."
        />
      ) : dayScope === 'today' && displayedAbsents.length === 0 ? (
        <div
          style={{
            padding: '36px 20px',
            textAlign: 'center',
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <span style={{ fontSize: '2rem' }}>📅</span>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>
            Seçili Gün İçin Mazeret Bulunmuyor
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', maxWidth: '420px' }}>
            Seçtiğiniz günde okula gelmeyen öğretmen kaydı yok. Sistemde diğer günlere ait toplam{' '}
            <strong>{absentPeople.length}</strong> mazeretli öğretmen bulunuyor.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setDayScope('all')}
            style={{ marginTop: '8px', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            Tüm Mazeretlileri Göster ({absentPeople.length})
          </button>
        </div>
      ) : (
        <AbsenteeList 
          absentPeople={displayedAbsents} 
          onDelete={onDeleteAbsent} 
          IconComponent={IconComponent}
          teacherSchedules={teacherSchedules}
          classLocations={classLocations}
        />
      )}
    </div>
  );
}
