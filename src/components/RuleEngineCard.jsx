import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function RuleEngineCard({
  options,
  onOptionChange,
  teachers = [],
  periods = [],
  dayOptions = [],
  IconComponent,
}) {
  if (!IconComponent) {
    throw new Error('RuleEngineCard requires IconComponent prop');
  }

  const ruleEngine = useMemo(
    () => options?.ruleEngine || { singleDutyPerDay: false, blockedSlots: [] },
    [options?.ruleEngine],
  );

  const [ruleTeacherId, setRuleTeacherId] = useState('');
  const [ruleDay, setRuleDay] = useState('');
  const [rulePeriod, setRulePeriod] = useState('');
  const lastSelectedTeacherNameRef = useRef('');

  const normalizeTeacherName = (value = '') => String(value || '').trim().toLocaleUpperCase('tr-TR');

  useEffect(() => {
    if (!ruleTeacherId) return;
    const selectedTeacher = teachers.find((teacher) => teacher.teacherId === ruleTeacherId);
    if (selectedTeacher?.teacherName) {
      lastSelectedTeacherNameRef.current = selectedTeacher.teacherName;
    }
  }, [ruleTeacherId, teachers]);

  useEffect(() => {
    if (teachers.length === 0) {
      if (ruleTeacherId !== '') {
        setRuleTeacherId('');
      }
      return;
    }

    const hasSelectedTeacher = teachers.some((teacher) => teacher.teacherId === ruleTeacherId);
    if (!ruleTeacherId || !hasSelectedTeacher) {
      const targetName = normalizeTeacherName(lastSelectedTeacherNameRef.current);
      const matchedByName = targetName
        ? teachers.find((teacher) => normalizeTeacherName(teacher.teacherName) === targetName)
        : null;
      setRuleTeacherId(matchedByName?.teacherId || teachers[0].teacherId || '');
    }
  }, [ruleTeacherId, teachers]);

  useEffect(() => {
    if (!ruleDay && dayOptions.length > 0) {
      setRuleDay(dayOptions[0].key || '');
    }
  }, [ruleDay, dayOptions]);

  useEffect(() => {
    if (!rulePeriod && periods.length > 0) {
      setRulePeriod(String(periods[0]));
    }
  }, [rulePeriod, periods]);

  const dayLabelMap = useMemo(
    () => new Map((dayOptions || []).map((item) => [item.key, item.label])),
    [dayOptions],
  );

  const blockedSlots = useMemo(
    () => (Array.isArray(ruleEngine?.blockedSlots) ? ruleEngine.blockedSlots : []),
    [ruleEngine],
  );

  const updateRuleEngine = (partial) => {
    onOptionChange('ruleEngine', {
      singleDutyPerDay: !!ruleEngine?.singleDutyPerDay,
      blockedSlots,
      ...partial,
    });
  };

  const handleAddBlockedSlot = () => {
    if (!ruleTeacherId || !ruleDay || !rulePeriod) return;
    const periodValue = Number.parseInt(rulePeriod, 10);
    if (!Number.isFinite(periodValue)) return;

    const duplicate = blockedSlots.some(
      (item) =>
        item?.teacherId === ruleTeacherId &&
        item?.day === ruleDay &&
        Number.parseInt(item?.period, 10) === periodValue,
    );
    if (duplicate) return;

    updateRuleEngine({
      blockedSlots: [
        ...blockedSlots,
        { teacherId: ruleTeacherId, day: ruleDay, period: periodValue },
      ],
    });
  };

  const handleRemoveBlockedSlot = (targetRule) => {
    const next = blockedSlots.filter((item) => {
      const sameTeacher = item?.teacherId === targetRule.teacherId;
      const sameDay = item?.day === targetRule.day;
      const samePeriod = Number.parseInt(item?.period, 10) === Number.parseInt(targetRule.period, 10);
      return !(sameTeacher && sameDay && samePeriod);
    });
    updateRuleEngine({ blockedSlots: next });
  };

  const getTeacherName = (teacherId) => {
    const found = teachers.find((teacher) => teacher.teacherId === teacherId);
    return found?.teacherName || teacherId;
  };

  return (
    <div className="rule-engine-card" role="region" aria-label="Kural Motoru">
      <div className="rule-engine-header">
        <label className="rule-engine-title">
          <IconComponent name="calendar" size={16} />
          <span>Kural Motoru</span>
        </label>
      </div>

      <div className="rule-engine-toggle">
        <label htmlFor="singleDutyPerDay" className="rule-engine-check">
          <input
            type="checkbox"
            id="singleDutyPerDay"
            checked={!!ruleEngine?.singleDutyPerDay}
            onChange={(e) => updateRuleEngine({ singleDutyPerDay: e.target.checked })}
          />
          <span>Aynı güne 2 nöbet verme</span>
        </label>
      </div>

      <div className="rule-engine-form">
        <select
          className="rule-engine-select"
          value={ruleTeacherId}
          onChange={(e) => setRuleTeacherId(e.target.value)}
        >
          {(teachers || []).map((teacher) => (
            <option key={teacher.teacherId} value={teacher.teacherId}>
              {teacher.teacherName}
            </option>
          ))}
        </select>

        <select
          className="rule-engine-select"
          value={ruleDay}
          onChange={(e) => setRuleDay(e.target.value)}
        >
          {(dayOptions || []).map((dayItem) => (
            <option key={dayItem.key} value={dayItem.key}>
              {dayItem.label}
            </option>
          ))}
        </select>

        <select
          className="rule-engine-select"
          value={rulePeriod}
          onChange={(e) => setRulePeriod(e.target.value)}
        >
          {(periods || []).map((periodValue) => (
            <option key={periodValue} value={periodValue}>
              {periodValue}. saat
            </option>
          ))}
        </select>

        <button type="button" className="btn rule-engine-add" onClick={handleAddBlockedSlot}>
          Yasak Ekle
        </button>
      </div>

      <div className="rule-engine-list">
        {blockedSlots.length === 0 && (
          <small className="rule-engine-empty">Tanımlı slot kuralı yok.</small>
        )}

        {blockedSlots
          .slice()
          .sort((a, b) => {
            const teacherCmp = getTeacherName(a.teacherId).localeCompare(getTeacherName(b.teacherId), 'tr');
            if (teacherCmp !== 0) return teacherCmp;
            const dayCmp = String(a.day || '').localeCompare(String(b.day || ''), 'tr');
            if (dayCmp !== 0) return dayCmp;
            return Number.parseInt(a.period, 10) - Number.parseInt(b.period, 10);
          })
          .map((rule) => {
            const periodValue = Number.parseInt(rule.period, 10);
            const key = `${rule.teacherId}|${rule.day}|${periodValue}`;
            return (
              <div key={key} className="rule-engine-item">
                <span className="rule-engine-item-text">
                  {getTeacherName(rule.teacherId)} · {dayLabelMap.get(rule.day) || rule.day} · {periodValue}. saat
                </span>
                <button
                  type="button"
                  className="iconBtn rule-engine-remove"
                  aria-label="Kuralı sil"
                  onClick={() => handleRemoveBlockedSlot(rule)}
                >
                  <IconComponent name="x" size={14} />
                </button>
              </div>
            );
          })}
      </div>

      <style>{`
        .rule-engine-card {
          margin-top: 12px;
          padding: var(--space-3);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          background: var(--bg-elevated);
        }
        .rule-engine-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-2);
        }
        .rule-engine-title {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          font-weight: var(--font-weight-semibold, 600);
          color: var(--text-primary);
          font-size: 0.92rem;
        }
        .rule-engine-toggle {
          margin-bottom: var(--space-2);
          padding: var(--space-2);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          background: color-mix(in srgb, var(--bg-default) 92%, transparent);
        }
        .rule-engine-check {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          color: var(--text-secondary);
          font-weight: var(--font-weight-medium);
          cursor: pointer;
        }
        .rule-engine-form {
          display: grid;
          grid-template-columns: minmax(220px, 2fr) minmax(120px, 1fr) minmax(110px, 1fr) auto;
          gap: var(--space-2);
          align-items: center;
          margin-bottom: var(--space-2);
        }
        .rule-engine-select {
          width: 100%;
          min-height: 34px;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          background: var(--bg-default);
          color: var(--text-primary);
          padding: 0 var(--space-2);
        }
        .rule-engine-add {
          min-height: 34px;
          white-space: nowrap;
        }
        .rule-engine-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        .rule-engine-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          background: color-mix(in srgb, var(--bg-default) 90%, transparent);
          padding: 6px 10px;
        }
        .rule-engine-item-text {
          font-size: 0.82rem;
          color: var(--text-secondary);
        }
        .rule-engine-remove {
          width: 26px;
          height: 26px;
          min-width: 26px;
        }
        .rule-engine-empty {
          color: var(--text-muted);
          font-size: 0.78rem;
          margin-top: 2px;
        }
        @media (max-width: 900px) {
          .rule-engine-form {
            grid-template-columns: 1fr 1fr;
          }
          .rule-engine-add {
            grid-column: span 2;
          }
        }
        @media (max-width: 520px) {
          .rule-engine-form {
            grid-template-columns: 1fr;
          }
          .rule-engine-add {
            grid-column: auto;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
