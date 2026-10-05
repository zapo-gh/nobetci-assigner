// @ts-nocheck
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
            <div className="toolbar assignment-options-container">
                {/* Ardışık Görevi Engelle */}
                <div className="option-section">
                    <div className="option-row-top">
                        <div className="checkbox-wrapper">
                            <input
                                type="checkbox"
                                id="preventConsecutive"
                                name="preventConsecutive"
                                checked={options.preventConsecutive}
                                onChange={(e) => handleOptionChange('preventConsecutive', e.target.checked)}
                            />
                        </div>
                        <label htmlFor="preventConsecutive" className="control-label">
                            <span>Ardışık Görevi Engelle</span>
                        </label>
                    </div>
                </div>

                {/* Aynı Saatte Max Görev */}
                <div className="option-section">
                    <div className="option-row-top">
                        <input
                            type="number" inputMode="numeric" pattern="[0-9]*"
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
                </div>

                {/* Günlük Max Görev (Toplu) */}
                <div className="option-section">
                    <div className="option-row-top">
                        <input
                            type="number" inputMode="numeric" pattern="[0-9]*"
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
                </div>
            </div>

            <style>{`
        .assignment-options-container {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0;
          padding: var(--space-3) 0 !important;
          overflow: hidden;
        }
        .option-section {
          padding: 0 var(--space-4);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .option-section:not(:last-child) {
          border-right: 2px solid var(--border);
        }
        @media (max-width: 768px) {
          .assignment-options-container {
            grid-template-columns: 1fr;
            padding: var(--space-3) 0 !important;
            gap: var(--space-3);
          }
          .option-section:not(:last-child) {
            border-right: none;
            border-bottom: 2px solid var(--border);
            padding-bottom: var(--space-3);
          }
        }
        .option-row-top {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .checkbox-wrapper {
          width: 54px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .checkbox-wrapper input {
          width: 16px;
          height: 16px;
          cursor: pointer;
          margin: 0;
        }
        .option-input-inline {
          width: 54px;
          height: 32px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-default);
          background-color: var(--bg-default);
          color: var(--text-primary);
          text-align: center;
          font-weight: 600;
          flex-shrink: 0;
        }
        .control-label {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-weight: var(--font-weight-medium);
          font-size: 0.8rem;
          color: var(--text-secondary);
          cursor: pointer;
          margin: 0;
        }
      `}</style>
        </>
    );
}
