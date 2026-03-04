import React, { useEffect, useMemo, useState } from 'react';

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

  useEffect(() => {
    if (!ruleTeacherId && teachers.length > 0) {
      setRuleTeacherId(teachers[0].teacherId || '');
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
    <div className="option-card" style={{ marginTop: '12px' }}>
      <label className="control-label">
        <IconComponent name="calendar" size={16} />
        <span>Kural Motoru</span>
      </label>

      <div className="rule-engine-toggle">
        <label htmlFor="singleDutyPerDay" className="option-label">
          <input
            type="checkbox"
            id="singleDutyPerDay"
            checked={!!ruleEngine?.singleDutyPerDay}
            onChange={(e) => updateRuleEngine({ singleDutyPerDay: e.target.checked })}
          />
          <span>Aynı güne 2 nöbet verme</span>
        </label>
      </div>

      <div className="rule-form-grid">
        <select
          className="option-input-inline rule-select"
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
          className="option-input-inline rule-select"
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
          className="option-input-inline rule-select"
          value={rulePeriod}
          onChange={(e) => setRulePeriod(e.target.value)}
        >
          {(periods || []).map((periodValue) => (
            <option key={periodValue} value={periodValue}>
              {periodValue}. saat
            </option>
          ))}
        </select>

        <button type="button" className="btn" onClick={handleAddBlockedSlot}>
          Yasak Ekle
        </button>
      </div>

      <div className="rule-list">
        {blockedSlots.length === 0 && (
          <small className="option-description">Tanımlı slot kuralı yok.</small>
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
              <div key={key} className="rule-item">
                <span>
                  {getTeacherName(rule.teacherId)} · {dayLabelMap.get(rule.day) || rule.day} · {periodValue}. saat
                </span>
                <button
                  type="button"
                  className="iconBtn"
                  aria-label="Kuralı sil"
                  onClick={() => handleRemoveBlockedSlot(rule)}
                >
                  <IconComponent name="x" size={14} />
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}
