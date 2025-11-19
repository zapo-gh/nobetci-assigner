import React, { memo, useMemo, useCallback, useState, useEffect } from 'react'
import styles from './AssignmentEditor.module.css';
import { MANUAL_EMPTY_TEACHER_ID } from '../utils/assignDuty.js'

const AUTO_OPTION = '__AUTO__'

function AssignmentEditor({
  day,
  periods,
  classes,
  teachers,
  availableTeachersByPeriod,
  assignment,
  locked,
  onDropAssign,
  onManualAssign,
  onManualClear,
  onManualRelease,
  commonLessons,
  IconComponent,
  onManualEditorStateChange,
}) {
  const teacherById = useMemo(() => Object.fromEntries(teachers.map(t => [t.teacherId, t])), [teachers])
  const [dragOverClassId, setDragOverClassId] = useState(null);
  const [droppedClassId, setDroppedClassId] = useState(null);
  const [editingContext, setEditingContext] = useState(null);
  const [editSelection, setEditSelection] = useState(AUTO_OPTION);

  const baseTeacherOptions = useMemo(() => {
    return [...teachers].sort((a, b) => (a.teacherName || '').localeCompare(b.teacherName || '', 'tr', { sensitivity: 'base' }))
  }, [teachers])

  const availableTeacherOptions = useMemo(() => {
    const out = {}
    if (!availableTeachersByPeriod) return out

    Object.entries(availableTeachersByPeriod).forEach(([periodKey, value]) => {
      const period = Number(periodKey)
      let set
      if (value instanceof Set) {
        set = value
      } else if (Array.isArray(value)) {
        set = new Set(value)
      } else {
        set = new Set()
      }

      const list = Array.from(set)
        .map((tid) => teacherById[tid])
        .filter(Boolean)
        .sort((a, b) => (a.teacherName || '').localeCompare(b.teacherName || '', 'tr', { sensitivity: 'base' }))

      out[period] = list
    })

    return out
  }, [availableTeachersByPeriod, teacherById])

  // Sınıfları artan sırada sırala (önce sayı, sonra harf)
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const nameA = a.className || '';
      const nameB = b.className || '';
      
      // Sınıf ismini sayı ve harf kısımlarına ayır (örn: "10-A" -> [10, "A"])
      const parseClass = (name) => {
        const match = name.match(/^(\d+)[\s-]*(.*)$/);
        if (match) {
          return [parseInt(match[1], 10), match[2] || ''];
        }
        return [0, name]; // Eğer sayı yoksa başa al
      };
      
      const [numA, letterA] = parseClass(nameA);
      const [numB, letterB] = parseClass(nameB);
      
      // Önce sayıya göre karşılaştır
      if (numA !== numB) {
        return numA - numB;
      }
      
      // Sayılar eşitse harfe göre karşılaştır
      return letterA.localeCompare(letterB, 'tr', { numeric: true });
    });
  }, [classes]);

  const getKey = useCallback((period, classId) => `${day}|${period}|${classId}`, [day])

  const closeEditor = useCallback(() => {
    setEditingContext(null)
    setEditSelection(AUTO_OPTION)
    onManualEditorStateChange?.(false)
  }, [onManualEditorStateChange])

  const openEditor = useCallback((period, classId, currentValue) => {
    const key = `${day}|${period}|${classId}`
    let initialValue = currentValue || AUTO_OPTION
    if (
      initialValue !== AUTO_OPTION &&
      initialValue !== MANUAL_EMPTY_TEACHER_ID &&
      !teacherById[initialValue]
    ) {
      initialValue = AUTO_OPTION
    }
    setEditingContext({ key, period, classId })
    setEditSelection(initialValue)
    onManualEditorStateChange?.(true)
  }, [day, teacherById, onManualEditorStateChange])

  const handleManualSave = useCallback(() => {
    if (!editingContext) return
    const { period, classId } = editingContext

    if (editSelection === AUTO_OPTION) {
      onManualRelease && onManualRelease({ day, period, classId })
    } else if (editSelection === MANUAL_EMPTY_TEACHER_ID) {
      onManualClear && onManualClear({ day, period, classId })
    } else if (editSelection) {
      onManualAssign && onManualAssign({ day, period, classId, teacherId: editSelection })
    }
    closeEditor()
  }, [editingContext, editSelection, onManualAssign, onManualClear, onManualRelease, closeEditor, day])

  useEffect(() => {
    return () => {
      onManualEditorStateChange?.(false)
    }
  }, [onManualEditorStateChange])

  const handleDragStart = (e, period, classId, teacherId) => {
    const payload = { type: 'assignment', day, period, classId, teacherId }
    e.dataTransfer.setData('text/plain', JSON.stringify(payload))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, classId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverClassId(classId);
  }

  const handleDragLeave = () => {
    setDragOverClassId(null);
  };

  const handleDrop = (e, targetPeriod, targetClassId) => {
    e.preventDefault()
    setDragOverClassId(null);
    try {
      const raw = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text') || '{}'
      const payload = JSON.parse(raw)
      if (payload.type === 'teacher-roster') {
        if (!payload.teacherId) return
        onDropAssign({
          day,
          period: targetPeriod,
          fromClassId: payload.fromClassId || null,
          toClassId: targetClassId,
          teacherId: payload.teacherId,
        })
        setDroppedClassId(targetClassId);
        setTimeout(() => setDroppedClassId(null), 600);
        return
      }

      const { day: srcDay, period, classId, teacherId } = payload
      if (!teacherId || srcDay !== day || period !== targetPeriod) return

      onDropAssign({ day, period, fromClassId: classId, toClassId: targetClassId, teacherId })
      
      setDroppedClassId(targetClassId);
      setTimeout(() => setDroppedClassId(null), 600);
    } catch (err) {
      console.error("Drop error:", err);
    }
  }

  return (
    <div className="table-container">
      <div className="scrollX">
        <table className={`tbl table-center ${styles.assignmentTable}`}>
          <thead>
            <tr>
              <th className="sticky-col text-left stuck-shadow">Sınıf</th>
              {periods.map(p => (
                <th key={p}>{p}. Saat</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedClasses.map(cls => (
              <tr key={cls.classId}>
                <td className="sticky-col text-left">{cls.className}</td>
                {periods.map(p => {
                  const cell = (assignment?.[day]?.[p] || []).find(a => a.classId === cls.classId)
                  const k = getKey(p, cls.classId)
                  const lockValue = locked?.[k]
                  let teacherId = cell?.teacherId || ''

                  if (!teacherId && lockValue && lockValue !== MANUAL_EMPTY_TEACHER_ID && teacherById[lockValue]) {
                    teacherId = lockValue
                  }

                  const t = teacherId ? teacherById[teacherId] : null
                  const isManualEmpty = lockValue === MANUAL_EMPTY_TEACHER_ID
                  const isEditing = editingContext?.key === k
                  const manualInitialValue = lockValue || teacherId || AUTO_OPTION
                  const commonLessonTeacher = commonLessons?.[day]?.[p]?.[cls.classId]
                  
                  const tdClasses = [
                    styles.dndTarget,
                    dragOverClassId === cls.classId ? styles.dragOver : '',
                    droppedClassId === cls.classId ? styles.dropFlash : ''
                  ].filter(Boolean).join(' ');

                  return (
                    <td key={p}
                        className={tdClasses}
                        onDragOver={(e) => handleDragOver(e, cls.classId)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, p, cls.classId)}
                    >
                      <div className={styles.cellContent}>
                        {commonLessonTeacher ? (
                          <div className="text-center">
                            <div className="text-xs text-primary font-medium">📚 Ders Birleştirilecek</div>
                            <div className="text-sm font-medium">{commonLessonTeacher}</div>
                          </div>
                        ) : t ? (
                          <div className={styles.teacherRow}>
                            <span
                              className={`${styles.teacherNameText} ${styles.teacherDraggable}`}
                              draggable
                              onDragStart={(e) => handleDragStart(e, p, cls.classId, teacherId)}
                              title="Sürükleyerek başka sınıfa taşıyın"
                            >
                              {t.teacherName}
                            </span>
                          </div>
                        ) : isManualEmpty ? (
                          <span className={styles.manualEmptyLabel}>Manuel olarak boş bırakıldı</span>
                        ) : teacherId ? (
                          <div className="flex items-center gap-2">
                            <span className="text-error" title={`Geçersiz öğretmen ID: ${teacherId}. Bu kaydı temizlemek için tıklayın.`}>
                              ⚠️ Geçersiz: {teacherId}
                            </span>
                            <button
                              className="btn-ghost btn-sm text-error"
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                onManualRelease && onManualRelease({ day, period: p, classId: cls.classId })
                              }}
                              title="Geçersiz kaydı temizle"
                              aria-label="Geçersiz kaydı temizle"
                            >
                              {IconComponent && <IconComponent name="trash" size={14} />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}

                        {!commonLessonTeacher && (t || isManualEmpty) && (
                          <button
                            className="btn-ghost btn-sm"
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              openEditor(p, cls.classId, manualInitialValue)
                            }}
                          >
                            Düzenle
                          </button>
                        )}
                      </div>

                      {!commonLessonTeacher && isEditing && (
                        <div
                          className={styles.manualEditor}
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                        >
                          <div className={styles.manualEditorControls}>
                            <select
                              className={styles.manualSelect}
                              value={editSelection}
                              onChange={(e) => setEditSelection(e.target.value)}
                            >
                              <option value={AUTO_OPTION}>Otomatik ata</option>
                              <option value={MANUAL_EMPTY_TEACHER_ID}>Boş bırak</option>
                              <option value="" disabled>──────────</option>
                              {(() => {
                                const available = availableTeacherOptions[p] || []
                                const seen = new Set()
                                const result = []

                                available.forEach((teacher) => {
                                  if (!teacher || seen.has(teacher.teacherId)) return
                                  seen.add(teacher.teacherId)
                                  result.push(teacher)
                                })

                                if (t && !seen.has(t.teacherId)) {
                                  seen.add(t.teacherId)
                                  result.unshift(t)
                                }

                                if (!result.length) {
                                  baseTeacherOptions.forEach((teacher) => {
                                    if (!teacher || seen.has(teacher.teacherId)) return
                                    seen.add(teacher.teacherId)
                                    result.push(teacher)
                                  })
                                }

                                return result.map((teacher) => (
                                  <option key={teacher.teacherId} value={teacher.teacherId}>
                                  {teacher.teacherName}
                                </option>
                                ))
                              })()}
                            </select>
                            <button
                              className="btn btn-sm"
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleManualSave()
                              }}
                              disabled={!editSelection}
                            >
                              Kaydet
                            </button>
                            <button
                              className="btn-ghost btn-sm"
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                closeEditor()
                              }}
                            >
                              İptal
                            </button>
                          </div>
                          <div className={styles.manualHint}>Manuel atamalar otomatik planlamayı geçersiz kılar.</div>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}

          </tbody>
        </table>
      </div>
    </div>
  )
}

export default memo(AssignmentEditor)
