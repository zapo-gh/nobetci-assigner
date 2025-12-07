import React from 'react'

export default function ModernClassAvailabilityGrid({
  classes,
  periods,
  classFree,
  onToggleClassFree,
  //onSetAllClassesFree,
  absentPeople,
  classAbsence,
  onSelectAbsence,
  commonLessons,
  onOpenCommonLessonModal,
  onDelete,
  day,
  IconComponent,
  teachers = [],
  onDropdownStateChange,
}) {
  const getAbsentInfo = (absentId) => absentPeople.find(a => a.absentId === absentId)

  const getCommonLessonInfo = (day, period, classId) => {
    const teacherVal = commonLessons?.[day]?.[period]?.[classId]
    if (!teacherVal) return null
    // Check if it's a teacher ID and resolve to name
    const teacher = teacherMap.get(teacherVal)
    return teacher?.teacherName || teacherVal
  }

  const teacherMap = React.useMemo(() => {
    if (!Array.isArray(teachers)) return new Map()
    return new Map(teachers.map(t => [t.teacherId, t]))
  }, [teachers])

  const normalizeWhiteSpace = (value = '') => value.trim().replace(/\s+/g, ' ')

  const removeTrailingHyphen = (value = '') => value.replace(/[-\s]+$/, '')

  const formatTeacherName = (name = '', teacherId) => {
    const fromTeacher = teacherId ? teacherMap.get(teacherId)?.teacherName : ''
    const base = removeTrailingHyphen(normalizeWhiteSpace(fromTeacher || name))
    if (!base) return ''

    const parts = base.split(' ')
    if (parts.length === 0) return ''

    const first = parts[0]
    const last = parts.length > 1 ? parts[parts.length - 1] : ''

    const firstInitial = first.charAt(0)
      ? first.charAt(0).toLocaleUpperCase('tr-TR')
      : ''

    const lastFormatted = last
      ? last.toLocaleUpperCase('tr-TR')
      : ''

    if (!lastFormatted) {
      return `${firstInitial}.`
    }

    return `${firstInitial}. ${lastFormatted}`
  }

  const getAbsentBadgeColor = (reason) => {
    const colorMap = {
      raporlu: 'badge-info',
      sevkli: 'badge-info',
      izinli: 'badge-success',
      'gorevli-izinli': 'badge-warning',
      diger: 'badge-muted'
    }
    return colorMap[reason?.toLowerCase()] || 'badge-muted'
  }

  return (
    <div className="table-container">
      <div className="scrollX">
        <table className="tbl">
          <thead>
            <tr>
              <th className="text-left sticky-col stuck-shadow w-[200px]">
                <div className="flex items-center gap-2">
                  <span>Sınıf</span>
                  <span className="badge badge-info text-xs">{classes.length}</span>
                </div>
              </th>
              <th className="text-center min-w-20">İşlem</th>
              {periods.map(p => (
                <th key={p} className="text-center min-w-32">
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-mono">{p}. Saat</span>

                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {classes.length === 0 ? (
              <tr>
                <td colSpan={periods.length + 2} className="text-center text-muted p-4">
                  Henüz sınıf eklenmedi. Lütfen "Sınıflar" sekmesinden ekleyin.
                </td>
              </tr>
            ) : (
              classes.map(cls => {
                const selectedCount = periods.reduce((count, p) => {
                  const s = classFree?.[day]?.[p] || new Set()
                  const selectedAbsent = classAbsence?.[day]?.[p]?.[cls.classId]
                  const isSelected = s.has(cls.classId) || !!selectedAbsent
                  return count + (isSelected ? 1 : 0)
                }, 0)

                return (
                  <tr key={cls.classId} className="hover:bg-secondary transition-colors">
                    <td className="text-center sticky-col">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-medium overflow-hidden text-ellipsis whitespace-nowrap flex-shrink-0">{cls.className}</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        {selectedCount > 0 && (
                          <span className="badge badge-info text-xs flex-shrink-0">{selectedCount} boş ders</span>
                        )}
                      </div>
                    </td>
                    <td className="text-center p-2">
                      {onDelete && (
                        <button
                          className="btn-danger btn-sm"
                          onClick={() => onDelete(cls.classId)}
                          title={`${cls.className} sınıfını sil`}
                          aria-label={`${cls.className} sınıfını sil`}
                        >
                          {IconComponent && <IconComponent name="trash" size={14} />}
                        </button>
                      )}
                    </td>

                    {periods.map(p => {
                      const set = classFree?.[day]?.[p] || new Set()
                      const selectedAbsent = classAbsence?.[day]?.[p]?.[cls.classId] ?? ''
                      const isSelected = set.has(cls.classId) || Boolean(selectedAbsent)
                      const isCommonLesson = selectedAbsent === "COMMON_LESSON"
                      const needsAbsentSelection = isSelected && !selectedAbsent && !isCommonLesson
                      const absentInfo = selectedAbsent && !isCommonLesson ? getAbsentInfo(selectedAbsent) : null

                      return (
                        <td
                          key={p}
                          className="text-center p-2 dnd-target"
                          onMouseDown={(e) => {
                            const target = e.target
                            if (target?.closest?.('select') || target?.closest?.('button')) {
                              e.stopPropagation()
                            }
                          }}
                          onClick={(e) => {
                            const target = e.target
                            if (target?.closest?.('select') || target?.closest?.('button')) {
                              e.stopPropagation()
                            }
                          }}
                        >
                          <div className="flex flex-col items-center gap-2">
                            {/* Checkbox */}
                            <label className="inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onClick={() => onToggleClassFree(day, p, cls.classId)}
                                readOnly
                                className="rounded transition-all hover:scale-110"
                              />
                            </label>

                            {/* Absent dropdown */}
                            {isSelected && (
                              <div className="relative w-32">
                                <select
                                  value={selectedAbsent}
                                  onChange={e => {
                                    const value = e.target.value
                                    if (value === "COMMON_LESSON") {
                                      onOpenCommonLessonModal(day, p, cls.classId)
                                    } else {
                                      onSelectAbsence(day, p, cls.classId, value)
                                    }
                                    onDropdownStateChange?.(false)
                                  }}
                                  className={`
                                    modern-select
                                    ${needsAbsentSelection
                                      ? 'modern-select-error'
                                      : ''
                                    }
                                  `}
                                  title={needsAbsentSelection ? 'Gelmeyen öğretmen seçimi zorunlu!' : ''}
                                  onFocus={() => onDropdownStateChange?.(true)}
                                  onBlur={() => {
                                    setTimeout(() => onDropdownStateChange?.(false), 50)
                                  }}
                                >
                                  <option value="">— Öğretmen Seç —</option>
                                  <option value="COMMON_LESSON">📚 Ders Birleştirilecek</option>
                                  {absentPeople.map(absent => (
                                    <option key={absent.absentId} value={absent.absentId}>
                                      {formatTeacherName(absent.name, absent.teacherId)}
                                    </option>
                                  ))}
                                </select>
                                <div className="modern-select-arrow"></div>
                              </div>
                            )}

                            {/* Selected Absent Info */}
                            {absentInfo && (
                              <div className="mt-1">
                                <span className={`badge ${getAbsentBadgeColor(absentInfo.reason)} text-xs`}>
                                  {absentInfo.reason.charAt(0).toUpperCase() + absentInfo.reason.slice(1).toLowerCase()}
                                </span>
                              </div>
                            )}

                            {/* Fallback for missing absent info */}
                            {selectedAbsent && !isCommonLesson && !absentInfo && (
                              <div className="mt-1">
                                <span className="badge badge-muted text-xs">{selectedAbsent}</span>
                              </div>
                            )}


                            {/* Common Lesson Info */}
                            {selectedAbsent === "COMMON_LESSON" && (
                              <div className="mt-1">
                                <span className="badge badge-info text-xs">
                                  📚 Ders Birleştirilecek
                                </span>
                                {getCommonLessonInfo(day, p, cls.classId) && (
                                  <div className="mt-1 text-center">
                                    <span className="text-xs text-primary font-medium">
                                      {getCommonLessonInfo(day, p, cls.classId)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Warning for missing selection */}
                            {needsAbsentSelection && (
                              <div className="mt-1">
                                <span className="text-xs text-error">⚠️ Zorunlu</span>
                              </div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>

          {/* Özet */}
        </table>
      </div>

      {/* Yardım */}
      <div className="mt-4 p-3 bg-secondary rounded-lg border border-subtle">
        <h4 className="font-medium mb-2">📋 Kullanım Rehberi:</h4>
        <ul className="text-sm text-secondary space-y-1 list-disc list-inside">
          <li>Boş ders saatlerini işaretlemek için checkbox'ları kullanın</li>
          <li>Her işaretlenen saat için gelmeyen öğretmen seçimi zorunludur</li>
          <li>Kırmızı kenarlı seçimler eksik öğretmen seçimini gösterir</li>
        </ul>
      </div>

      <style>{`
        .table-container { width: 100%; }
        .scrollX { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .text-left { text-align: left; }
        .text-center { text-align: center; }
        .text-xs { font-size: 0.75rem; }
        .text-sm { font-size: 0.875rem; }
        .text-muted { color: var(--text-muted); }
        .text-secondary { color: var(--text-secondary); }
        .font-medium { font-weight: 500; }
        .font-mono { font-family: monospace; }
        .p-1 { padding: 0.25rem; }
        .p-2 { padding: 0.5rem; }
        .p-3 { padding: 0.75rem; }
        .p-4 { padding: var(--space-4); } /* Yeni */
        .mt-1 { margin-top: 0.25rem; }
        .mt-4 { margin-top: 1rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .ml-2 { margin-left: 0.5rem; }
        .inline-flex { display: inline-flex; }
        .cursor-pointer { cursor: pointer; }

        .modern-select {
          min-width: 32px;
          width: 100%;
          max-width: 128px;
          padding: 0.4rem 0.75rem;
          border-radius: 8px;
          border: 1px solid var(--border-default);
          background-color: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.8rem;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          cursor: pointer;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .modern-select:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.2);
        }

        .modern-select option {
          background-color: var(--bg-secondary);
          color: var(--text-primary);
          padding: 8px 12px;
        }

        .modern-select-error {
          border-color: var(--error) !important;
          background-color: var(--error-bg) !important;
          color: var(--error) !important;
        }

        .relative { position: relative; }
        .modern-select-arrow {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 4px solid var(--text-muted);
        }

        /* Mobil responsive */
        @media (max-width: 768px) {
          .modern-select {
            max-width: 100px;
            font-size: 0.7rem;
            padding: 0.3rem 0.5rem;
          }
        }

        @media (max-width: 480px) {
          .modern-select {
            max-width: 80px;
            font-size: 0.65rem;
            padding: 0.25rem 0.4rem;
          }
        }
      `}</style>
    </div>
  )
}