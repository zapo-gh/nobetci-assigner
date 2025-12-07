import React from 'react';

export default function AssignmentOptions({
    options,
    handleOptionChange,
    setAllTeachersMaxDuty,
    IconComponent
}) {
    const Icon = IconComponent;

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
        }
      `}</style>
        </>
    );
}
