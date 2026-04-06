import React from 'react';

const formatScore = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0';
  return numeric.toFixed(1);
};

export default function AutoBalanceReport({ report, IconComponent }) {
  if (!report) return null;

  const { overall = {}, perTeacher = [] } = report;
  if (!Array.isArray(perTeacher) || perTeacher.length === 0) return null;

  return (
    <section className="assignment-insights" aria-label="Otomatik dengeleme raporu">
      <header className="assignment-insights-header">
        <div className="assignment-insights-title">
          {IconComponent && <IconComponent name="info" size={18} />}
          <h3>Otomatik Dengeleme Raporu</h3>
        </div>
        <div className="teacher-assignment-count">
          <strong>{formatScore(overall.fairnessScore)}</strong> adil dağılım skoru
        </div>
      </header>

      <div className="teacher-insight-grid">
        {perTeacher.map((item) => (
          <div key={item.teacherId} className="teacher-insight-card">
            <div className="teacher-insight-header">
              <span className="teacher-name">{item.teacherName}</span>
              <span className="teacher-assignment-count">
                <strong>{item.weeklyLoad}</strong> haftalık
              </span>
            </div>
            <div className="teacher-assignment-list">
              <span className="assignment-chip">Aylık (4 hafta): {item.monthlyLoad}</span>
              <span className="assignment-chip">Kişisel skor: {formatScore(item.fairnessScore)}</span>
              {item.dayBreakdown.map((dayItem) => (
                <span key={`${item.teacherId}-${dayItem.dayKey}`} className="assignment-chip">
                  {dayItem.dayLabel}: {dayItem.count}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
