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
    <section className="assignment-insights" aria-label="Planlama analizleri">
      <header className="assignment-insights-header">
        <div className="assignment-insights-title">
          {IconComponent && <IconComponent name="info" size={18} />}
          <h3>Planlama Analizi</h3>
        </div>
      </header>

      {hasTeachers && (
        <div className="teacher-insight-grid">
          {activeTeachers.map(({ teacher, assignments = [] }) => {
            return (
              <div key={teacher.teacherId} className="teacher-insight-card">
                <div className="teacher-insight-header">
                  <span className="teacher-name">{teacher.teacherName}</span>
                  <span className="teacher-assignment-count">
                    <strong>{assignments.length}</strong> görev
                  </span>
                </div>

                {assignments.length > 0 && (
                  <div className="teacher-assignment-list">
                    {assignments
                      .sort((a, b) => a.period - b.period)
                      .map((assignment) => (
                        <span key={`${assignment.period}-${assignment.classId}`} className="assignment-chip">
                          {assignment.period}. saat · {assignment.className || assignment.classId}
                        </span>
                      ))}
                  </div>
                )}

              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

