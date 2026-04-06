import React from 'react';
import AbsenteeList from './AbsenteeList.jsx';

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
      <div className="section-toolbar">
        <button className="btn-secondary" onClick={onAddAbsent}>
          <span style={{ marginRight: '4px', fontWeight: 'bold' }}>+</span>
          <IconComponent name="userX" size={16} />
          <span className="btn-text">Yeni Mazeretli Ekle</span>
        </button>
        <div className="toolbar-spacer"></div>
        {absentPeople.length > 0 && (
          <button className="btn-outline btn-sm" onClick={onDeleteAllAbsents} title="Tüm mazeretleri sil">
            <IconComponent name="trash" size={14} />
            <span>Tümünü Sil</span>
          </button>
        )}
      </div>
      <AbsenteeList absentPeople={absentPeopleForCurrentDay} onDelete={onDeleteAbsent} IconComponent={IconComponent} />
    </div>
  );
}

