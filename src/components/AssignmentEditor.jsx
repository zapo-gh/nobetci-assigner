import React, { memo, useMemo, useCallback, useState } from 'react'
import styles from './AssignmentEditor.module.css';

function AssignmentEditor({ day, periods, classes, teachers, assignment, locked, onToggleLock, onDropAssign, commonLessons, IconComponent }) {
  const teacherById = useMemo(() => Object.fromEntries(teachers.map(t => [t.teacherId, t])), [teachers])
  const [dragOverClassId, setDragOverClassId] = useState(null);
  const [droppedClassId, setDroppedClassId] = useState(null);

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

  const handleDragStart = (e, period, classId, teacherId) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ day, period, classId, teacherId }))
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
      const { day: srcDay, period, classId, teacherId } = JSON.parse(e.dataTransfer.getData('text/plain') || '{}')
      if (!teacherId || srcDay !== day || period !== targetPeriod) return

      onDropAssign({ day, period, fromClassId: classId, toClassId: targetClassId, teacherId })
      
      setDroppedClassId(targetClassId);
      setTimeout(() => setDroppedClassId(null), 600); // Animasyon süresiyle eşleşmeli
    } catch (err) {
      console.error("Drop error:", err);
    }
  }

  return (
    <div className="table-container">
      <div className="scrollX">
        <table className="tbl table-center">
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
                  // Önce assignment'dan kontrol et
                  let teacherId = cell?.teacherId || ''
                  // Eğer assignment'da yoksa ama locked state'te geçerli bir teacherId varsa, onu göster
                  // (Geçersiz teacherId'leri gösterme - bunlar otomatik temizlenecek)
                  if (!teacherId && locked?.[k]) {
                    const lockedTeacherId = locked[k]
                    // Sadece geçerli teacherId'leri göster
                    if (lockedTeacherId && teacherById[lockedTeacherId]) {
                      teacherId = lockedTeacherId
                    }
                  }
                  const t = teacherId ? teacherById[teacherId] : null
                  const isLocked = locked?.[k] && locked[k] === teacherId && teacherById[locked[k]]
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
                      <div className="flex items-center justify-center gap-2">
                        {commonLessonTeacher ? (
                          <div className="text-center">
                            <div className="text-xs text-primary font-medium">📚 Ders Birleştirilecek</div>
                            <div className="text-sm font-medium">{commonLessonTeacher}</div>
                          </div>
                        ) : teacherId ? (
                          <>
                            {t ? (
                              <>
                                <span
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, p, cls.classId, teacherId)}
                                  title={`Sürükleyerek başka sınıfa taşıyın`}
                                  className="hover-raise"
                                >
                                  {t.teacherName}
                                </span>
                                <button
                                  className={`btn-ghost btn-sm`}
                                  onClick={() => teacherId && onToggleLock({ day, period: p, classId: cls.classId, teacherId })}
                                  disabled={!teacherId}
                                  title={isLocked ? 'Kilidi kaldır' : 'Kilitle'}
                                >
                                  {IconComponent && (isLocked ? <IconComponent name="lock" size={14} /> : <IconComponent name="unlock" size={14} />)}
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-error" title={`Geçersiz öğretmen ID: ${teacherId}. Bu kaydı temizlemek için tıklayın.`}>
                                  ⚠️ Geçersiz: {teacherId}
                                </span>
                                <button
                                  className="btn-ghost btn-sm text-error"
                                  onClick={() => {
                                    // Geçersiz teacherId'yi locked state'ten temizle
                                    const key = getKey(p, cls.classId);
                                    if (locked?.[key] === teacherId) {
                                      onToggleLock({ day, period: p, classId: cls.classId, teacherId: '' });
                                    }
                                  }}
                                  title="Geçersiz kaydı temizle"
                                >
                                  {IconComponent && <IconComponent name="trash" size={14} />}
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </div>
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
