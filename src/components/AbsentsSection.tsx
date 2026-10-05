// @ts-nocheck
import React from 'react';
import AbsenteeList from './AbsenteeList';
import EmptyState from './EmptyState';

export default function AbsentsSection({
  absentPeople,
  absentPeopleForCurrentDay,
  onAddAbsent,
  onDeleteAbsent,
  onDeleteAllAbsents,
  IconComponent,
}) {
  if (!IconComponent) {
    throw new Error('AbsentsSection requires IconComponent prop');
  }

  return (
    <div role="tabpanel" id="panel-absents" aria-labelledby="tab-absents">
      <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <button className="btn btn-primary" onClick={onAddAbsent}>
          <IconComponent name="userX" size={16} />
          <span>Yeni Mazeretli Ekle</span>
        </button>
        {absentPeople.length > 0 && (
          <button className="btn btn-danger" onClick={onDeleteAllAbsents} title="Tüm mazeretleri sil">
            <IconComponent name="trash" size={14} />
            <span>Tümünü Sil</span>
          </button>
        )}
      </div>

      {(!absentPeopleForCurrentDay || absentPeopleForCurrentDay.length === 0) ? (
        <EmptyState
          IconComponent={IconComponent}
          icon="userX"
          title="Henüz Mazeret Eklenmedi"
          description="Bugün için sisteme girilmiş herhangi bir öğretmen mazereti bulunmuyor."
        />
      ) : (
        <AbsenteeList absentPeople={absentPeopleForCurrentDay} onDelete={onDeleteAbsent} IconComponent={IconComponent} />
      )}
    </div>
  );
}

