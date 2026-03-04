import React, { useEffect, useMemo, useState } from 'react';

export default function AssignmentOptions({
    options,
    handleOptionChange,
    setAllTeachersMaxDuty,
  teachers = [],
  periods = [],
  dayOptions = [],
    IconComponent
}) {
    const Icon = IconComponent;
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
    handleOptionChange('ruleEngine', {
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
        <>
            <div className="assignment-options-row">
                {/* Atama Kuralları */}
                <div className="option-card">
                    <label className="control-label">
                        <Icon name="zap" size={16} />
                        <span>Atama Kuralları</span>
                    </label>
                    <div className="options-grid single">
                        <div className="option-item">
                            <label htmlFor="preventConsecutive" className="option-label">
                                <input
                                    type="checkbox"
                                    id="preventConsecutive"
                                    name="preventConsecutive"
                                    checked={options.preventConsecutive}
                                    onChange={(e) => handleOptionChange('preventConsecutive', e.target.checked)}
                                />
                                <span>Ardışık Görevi Engelle</span>
                            </label>
                            <small>Öğretmene art arda saatlerde görev verilmesini önler.</small>
                        </div>
                    </div>
                </div>

                {/* Aynı Saatte Max Görev */}
                <div className="option-card narrow">
                    <div className="control-label-with-input">
                        <input
                            type="number"
                            id="maxClassesPerSlot"
                            name="maxClassesPerSlot"
                            value={options.maxClassesPerSlot}
                            onChange={(e) => handleOptionChange('maxClassesPerSlot', e.target.value)}
                            className="option-input-inline"
                            min="1"
                            max="5"
                        />
                        <label htmlFor="maxClassesPerSlot" className="control-label">
                            <Icon name="layers" />
                            <span>Aynı Saatte Max Görev</span>
                        </label>
                    </div>
                    <small className="option-description">Bir öğretmene aynı saatte en fazla kaç görev verilebileceği.</small>
                </div>

                {/* Günlük Max Görev (Toplu) */}
                <div className="option-card narrow">
                    <div className="control-label-with-input">
                        <input
                            type="number"
                            id="bulkMaxDuty"
                            name="bulkMaxDuty"
                            defaultValue={6}
                            onChange={(e) => setAllTeachersMaxDuty(e.target.value)}
                            className="option-input-inline"
                            min="1"
                            max="9"
                        />
                        <label htmlFor="bulkMaxDuty" className="control-label">
                            <Icon name="sliders" />
                            <span>Günlük Max Görev (Toplu)</span>
                        </label>
                    </div>
                    <small className="option-description">Tüm öğretmenlerin günlük görev limitini topluca günceller.</small>
                </div>
            </div>

                <div className="option-card">
                  <label className="control-label">
                    <Icon name="calendar" size={16} />
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
                              <Icon name="x" size={14} />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>

            <style>{`
        .assignment-options-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: var(--space-3);
          margin-bottom: var(--space-4);
        }
        .option-card {
          padding: var(--space-2);
          background-color: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
        }
        .option-card.narrow { align-self: start; }
        .control-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        .control-label {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-weight: var(--font-weight-medium);
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .control-label-with-input {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin-bottom: var(--space-2);
        }
        .option-input-inline {
          width: 60px;
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-default);
          background-color: var(--bg-default);
          color: var(--text-primary);
          text-align: center;
          flex-shrink: 0;
        }
        .option-description {
          display: block;
          font-size: 0.65rem;
          color: var(--text-muted);
          line-height: 1.2;
          margin-top: var(--space-1);
        }
        .options-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-2);
        }
        .options-grid.single { grid-template-columns: 1fr; }
        @media (min-width: 480px) {
          .assignment-options-row { grid-template-columns: 1fr 1fr 1fr; }
        }
        @media (min-width: 768px) {
          .assignment-options-row { grid-template-columns: 1fr 1fr 1fr; }
        }
        .option-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .option-label {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          cursor: pointer;
        }
        .option-label span {
          font-weight: var(--font-weight-medium);
          font-size: 0.8rem;
        }
        .option-input {
          width: 60px;
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-default);
          background-color: var(--bg-default);
          color: var(--text-primary);
          text-align: center;
        }
        .option-item small {
          font-size: 0.65rem;
          color: var(--text-muted);
          padding-left: 24px;
          line-height: 1.2;
        }
        .rule-engine-toggle {
          margin-top: var(--space-2);
          margin-bottom: var(--space-2);
        }
        .rule-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr auto;
          gap: var(--space-2);
          align-items: center;
          margin-bottom: var(--space-2);
        }
        .rule-select {
          width: 100%;
          text-align: left;
        }
        .rule-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        .rule-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: var(--space-1) var(--space-2);
          font-size: 0.8rem;
        }
        /* Günlük görev sayısı özeti */
        @media (max-width: 479px) {
          .options-grid {
            grid-template-columns: 1fr;
            gap: var(--space-2);
          }
          .option-item {
            gap: 1px;
          }
          .option-item small {
            font-size: 0.65rem;
            padding-left: 24px;
            line-height: 1.2;
          }
          .option-label span {
            font-size: 0.8rem;
          }
          .rule-form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </>
    );
}
