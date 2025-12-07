import React, { memo } from 'react'
import styles from './ModernAvailabilityGrid.module.css';
import EmptyState from './EmptyState.jsx';

function ModernAvailabilityGrid({
  rows,
  rowKey,
  rowNameKey,
  periods,
  selectedMap,
  onToggle,
  extraCol,
  IconComponent,
  onDelete
}) {
  const getSelectedCount = (period) => {
    const set = selectedMap?.[period] || new Set()
    return set.size
  }

  const getTotalCount = () => rows.length
  const getProgressBarColor = (percentage) => {
    if (percentage < 30) return styles.bgError;
    if (percentage < 70) return styles.bgWarning;
    return styles.bgSuccess;
  };

  const handleDragStart = (event, row) => {
    if (!event || !row) return
    const payload = {
      type: 'teacher-roster',
      teacherId: row[rowKey],
      teacherName: row[rowNameKey],
    }
    try {
      event.dataTransfer.setData('text/plain', JSON.stringify(payload))
      event.dataTransfer.effectAllowed = 'copyMove'
    } catch {
      event.dataTransfer.setData('text', JSON.stringify(payload))
    }
  }

  return (
    <div className="table-container">
      <div className="scrollX">
        <table className="tbl">
          <thead>
            <tr>
              <th className="text-left sticky-col stuck-shadow">
                <div className="flex items-center gap-2">
                  <span>Öğretmen</span>
                  <span className="badge badge-info">{rows.length}</span>
                </div>
              </th>
              <th className="text-center min-w-20">İşlem</th>
              {periods.map(p => {
                //const selectedCount = getSelectedCount(p)
                //const totalCount = getTotalCount()
                //const allSelected = selectedCount === totalCount && totalCount > 0
                return (
                  <th key={p} className="text-center min-w-24">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-sm">{p}</span>
                        <span className="text-xs opacity-75">. saat</span>
                      </div>
                      
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={periods.length + 3}>
                  <EmptyState
                    IconComponent={IconComponent}
                    icon="users"
                    title="Henüz NöbetçiÖğretmen Eklenmedi"
                    description=''
                    className="empty-state-card"
                  />
                </td>
              </tr>
            ) : (
              rows.map(row => {
                const rowId = row[rowKey]
                const rowName = row[rowNameKey]
                const selectedCount = periods.reduce((count, p) => {
                  const set = selectedMap?.[p] || new Set()
                  return count + (set.has(rowId) ? 1 : 0)
                }, 0)

                return (
                  <tr key={rowId}>
                    <td className="text-left sticky-col">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span
                            className="font-medium draggable-teacher"
                            draggable
                            onDragStart={(event) => handleDragStart(event, row)}
                            title="Planlama tablosuna sürükleyip bırakın"
                          >
                            {rowName}
                          </span>
                          {extraCol && <div className="text-xs text-secondary mt-1">{extraCol(row)}</div>}
                        </div>
                        <span className="badge badge-info ml-2">
                          {selectedCount}/{periods.length}
                        </span>
                      </div>
                    </td>
                    <td className="text-center p-2">
                      {onDelete && (
                        <button
                          className="btn-danger btn-sm"
                          onClick={() => onDelete(rowId)}
                          title={`${rowName} adlı öğretmeni sil`}
                          aria-label={`${rowName} adlı öğretmeni sil`}
                        >
                          {IconComponent && <IconComponent name="trash" size={14} />}
                        </button>
                      )}
                    </td>

                    {periods.map(p => {
                      const set = selectedMap?.[p] || new Set()
                      const isSelected = set.has(rowId)
                      return (
                        <td key={p} className="text-center p-2">
                          <label className="flex items-center justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => onToggle(p, rowId)}
                              className="rounded transition-all hover:scale-110"
                            />
                          </label>
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>

          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td className="text-left"><span>Toplam Seçili</span></td>
                <td className="text-center">—</td>
                {periods.map(p => {
                  const selectedCount = getSelectedCount(p)
                  const totalCount = getTotalCount()
                  const percentage = totalCount > 0 ? Math.round((selectedCount / totalCount) * 100) : 0
                  const progressBarColor = getProgressBarColor(percentage);
                  return (
                    <td key={p} className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-mono text-sm">{selectedCount}/{totalCount}</span>
                        <div className="w-full bg-tertiary rounded-full h-1.5">
                          <div className={`${progressBarColor} h-1.5 rounded-full transition-all duration-300`} style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="text-xs text-muted">%{percentage}</span>
                      </div>
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

export default memo(ModernAvailabilityGrid)