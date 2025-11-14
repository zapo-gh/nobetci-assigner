import React from 'react'

export default function AssignmentInsights({ insights, IconComponent }) {
  if (!insights) return null

  const { teacherSummaries = [] } = insights // coverageByPeriod kullanılmıyor
  const hasCoverage = false
  const hasTeachers = teacherSummaries.some(
    (summary) =>
      (summary.assignments && summary.assignments.length > 0) ||
      (summary.unassignedReasons && summary.unassignedReasons.length > 0)
  )

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
          {teacherSummaries.map(({ teacher, assignments = [], unassignedReasons = [] }) => {
            if (assignments.length === 0 && unassignedReasons.length === 0) return null

            return (
              <div key={teacher.teacherId} className="teacher-insight-card">
                <div className="teacher-insight-header">
                  <span className="teacher-name">{teacher.teacherName}</span>
                  {assignments.length > 0 && (
                    <span className="teacher-assignment-count">
                      {assignments.length} görev
                    </span>
                  )}
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

                {unassignedReasons.length > 0 && (
                  <div className="teacher-reasons">
                    <p>Görev alamadığı saatler:</p>
                    <ul>
                      {unassignedReasons.map((reason, index) => (
                        <li key={index}>
                          <strong>{reason.period}. saat:</strong> {reason.message}
                        </li>
                      ))}
                    </ul>
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

