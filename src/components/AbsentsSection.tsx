// @ts-nocheck
import React from 'react';
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

  // Her mazeretli yalnızca kendi günü seçildiğinde görüntülenir
  const displayedAbsents = Array.isArray(absentPeopleForCurrentDay) ? absentPeopleForCurrentDay : [];

  return (
    <div role="tabpanel" id="panel-absents" aria-labelledby="tab-absents" style={{ width: '100%' }}>
      <div
        className="toolbar absents-toolbar"
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

        <div className="absents-toolbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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

      {displayedAbsents.length === 0 ? (
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
          <span style={{ fontSize: '2rem' }}>{absentPeople.length === 0 ? '📋' : '📅'}</span>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>
            {absentPeople.length === 0 ? 'Henüz Mazeret Eklenmedi' : 'Seçili Gün İçin Mazeret Bulunmuyor'}
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', maxWidth: '420px' }}>
            {absentPeople.length === 0
              ? 'Sisteme girilmiş herhangi bir öğretmen mazereti bulunmuyor. Yeni mazeretli eklemek için yukarıdaki butonu kullanabilirsiniz.'
              : 'Seçtiğiniz günde okula gelmeyen öğretmen kaydı bulunmamaktadır. Yeni bir mazeret ekleyebilir veya üst kısımdan farklı bir gün seçebilirsiniz.'}
          </p>
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

      <style>{`
        @media (max-width: 768px) {
          .absents-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 12px 14px !important;
            gap: 12px !important;
          }
          .absents-toolbar-actions {
            width: 100%;
            display: flex !important;
            gap: 8px !important;
          }
          .absents-toolbar-actions .btn {
            flex: 1;
            justify-content: center;
            min-height: 44px;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
}
