import React from 'react';

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
      <div className="text-center p-8 text-muted">
        <p>Henüz mazeretli kimse eklenmedi.</p>
      </div>
    );
  }

  return (
    <div className="table-container mt-4">
      <table className="tbl">
        <thead>
          <tr>
            <th className="text-left">İsim</th>
            <th className="text-left">Günler</th>
            <th className="text-left">Mazeret</th>
            <th className="text-center">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {absentPeople.map(person => (
            <tr key={person.absentId}>
              <td>{person.name}</td>
              <td>
                {Array.isArray(person.days) && person.days.length > 0
                  ? person.days.map(dayKey => DAY_LABELS[dayKey] || dayKey).join(', ')
                  : 'Tüm Günler'}
              </td>
              <td>{person.reason}</td>
              <td className="text-center">
                <button 
                  className="btn-danger btn-sm" 
                  onClick={() => onDelete(person.absentId)}
                  title={`${person.name} adlı kişiyi sil`}
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
