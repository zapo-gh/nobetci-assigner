// @ts-nocheck
import React from 'react'

export default function AssignmentInsights({ insights, IconComponent }) {
  if (!insights) return null

  const { teacherSummaries = [] } = insights
  const activeTeachers = teacherSummaries.filter((summary) => {
    const assignmentCount = Array.isArray(summary.assignments) ? summary.assignments.length : 0
    const dutyHints = Array.isArray(summary.unassignedReasons) ? summary.unassignedReasons.length : 0
    return assignmentCount > 0 || dutyHints > 0
  })
  const hasCoverage = false
  const hasTeachers = activeTeachers.length > 0

  if (!hasCoverage && !hasTeachers) {
    return null
  }

  return (
    <section className="card" style={{ marginTop: '24px' }} aria-label="Planlama analizleri">
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        {IconComponent && <IconComponent name="info" size={20} />}
        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text)' }}>Planlama Analizi</h3>
      </div>

      {hasTeachers && (
        <div className="card-grid" style={{ padding: '20px', gap: '12px' }}>
          {activeTeachers.map(({ teacher, assignments = [] }) => (
            <div key={teacher.teacherId} style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <strong style={{ color: 'var(--text)' }}>{teacher.teacherName}</strong>
                <span className="badge badge-primary">{assignments.length} görev</span>
              </div>
              {assignments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {assignments
                    .sort((a, b) => a.period - b.period)
                    .map((assignment) => (
                      <span key={`${assignment.period}-${assignment.classId}`} className="badge" style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
                        {assignment.period}. saat · {assignment.className || assignment.classId}
                      </span>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

