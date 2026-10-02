// @ts-nocheck
import React from 'react';
import EmptyState from './EmptyState';

const DAY_LABELS = {
  Mon: 'Pazartesi',
  Tue: 'Salı',
  Wed: 'Çarşamba',
  Thu: 'Perşembe',
  Fri: 'Cuma'
};

export default function AbsenteeList({ absentPeople, onDelete, IconComponent }) {
  if (!absentPeople || absentPeople.length === 0) {
    return (
      <div className="empty-state">
         <div className="empty-state-icon">
           <IconComponent name="userX" size={42} />
         </div>
         <h3>Henüz Mazeret Eklenmedi</h3>
      </div>
    );
  }

  return (
    <div className="table-container mt-4">
      <table className="tbl w-full">
        <thead>
          <tr>
            <th className="text-left">İsim</th>
            <th className="text-left">Günler</th>
            <th className="text-left">Mazeret</th>
            <th className="text-center" style={{ width: '80px' }}>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {absentPeople.map(person => (
            <tr key={person.absentId}>
              <td className="font-medium">{person.name}</td>
              <td>
                {Array.isArray(person.days) && person.days.length > 0
                  ? person.days.map(dayKey => DAY_LABELS[dayKey] || dayKey).join(', ')
                  : 'Tüm Günler'}
              </td>
              <td className="text-muted">{person.reason}</td>
              <td className="text-center">
                <button
                  className="btn btn-danger"
                  style={{ padding: '6px', minWidth: 'unset', width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => onDelete(person.absentId)}
                  title={`${person.name} adlı kişiyi sil`}
                  aria-label={`${person.name} adlı kişiyi sil`}
                >
                  {IconComponent && <IconComponent name="trash" size={14} />}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
