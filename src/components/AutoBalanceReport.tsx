// @ts-nocheck
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
    <section className="card" style={{ marginTop: '24px' }} aria-label="Otomatik dengeleme raporu">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {IconComponent && <IconComponent name="info" size={20} />}
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text)' }}>Otomatik Dengeleme Raporu</h3>
        </div>
        <span className="badge badge-info">{formatScore(overall.fairnessScore)} Adil Dağılım Skoru</span>
      </div>

      <div className="card-grid" style={{ padding: '20px', gap: '12px' }}>
        {perTeacher.map((item) => (
          <div key={item.teacherId} style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <strong style={{ color: 'var(--text)' }}>{item.teacherName}</strong>
              <span className="badge badge-info">{item.weeklyLoad} Haftalık</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <span className="badge" style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>Aylık (4 hafta): {item.monthlyLoad}</span>
              <span className="badge" style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>Kişisel skor: {formatScore(item.fairnessScore)}</span>
              {item.dayBreakdown.map((dayItem) => (
                <span key={`${item.teacherId}-${dayItem.dayKey}`} className="badge" style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
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
