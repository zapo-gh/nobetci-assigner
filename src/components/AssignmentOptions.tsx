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
        <div className="assignment-options-card">
            {/* 1. Ardışık Görevi Engelle */}
            <div className="option-tile">
                <div className="option-icon-box option-icon-purple">
                    {Icon ? <Icon name="refreshCw" size={18} /> : '🔄'}
                </div>
                <div className="option-body">
                    <span className="option-title">Ardışık Görevi Engelle</span>
                    <span className="option-desc">Aynı öğretmene üst üste 2 saat nöbet verilmesini önler</span>
                </div>
                <label className="switch-toggle" title="Ardışık görevi engelleme kuralını aç / kapat">
                    <input
                        type="checkbox"
                        id="preventConsecutive"
                        name="preventConsecutive"
                        checked={options.preventConsecutive}
                        onChange={(e) => handleOptionChange('preventConsecutive', e.target.checked)}
                    />
                    <span className="switch-slider"></span>
                </label>
            </div>

            <div className="option-divider"></div>

            {/* 2. Aynı Saatte Max Görev */}
            <div className="option-tile">
                <div className="option-icon-box option-icon-blue">
                    {Icon ? <Icon name="book" size={18} /> : '📚'}
                </div>
                <div className="option-body">
                    <span className="option-title">Aynı Saatte Max Görev</span>
                    <span className="option-desc">Bir öğretmene aynı ders saatinde atanabilecek sınıf</span>
                </div>
                <div className="number-stepper">
                    <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        id="maxClassesPerSlot"
                        name="maxClassesPerSlot"
                        value={options.maxClassesPerSlot}
                        onChange={(e) => handleOptionChange('maxClassesPerSlot', e.target.value)}
                        className="stepper-input"
                        min="1"
                        max="5"
                    />
                    <span className="stepper-unit">sınıf</span>
                </div>
            </div>

            <div className="option-divider"></div>

            {/* 3. Günlük Max Görev (Toplu) */}
            <div className="option-tile">
                <div className="option-icon-box option-icon-emerald">
                    {Icon ? <Icon name="calendar" size={18} /> : '⚡'}
                </div>
                <div className="option-body">
                    <span className="option-title">Günlük Max Görev (Toplu)</span>
                    <span className="option-desc">Tüm öğretmenlerin günlük üst görev limiti</span>
                </div>
                <div className="number-stepper">
                    <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        id="bulkMaxDuty"
                        name="bulkMaxDuty"
                        defaultValue={6}
                        onChange={(e) => setAllTeachersMaxDuty(e.target.value)}
                        className="stepper-input"
                        min="1"
                        max="9"
                    />
                    <span className="stepper-unit">saat</span>
                </div>
            </div>

            <style>{`
                .assignment-options-card {
                    display: grid;
                    grid-template-columns: 1fr auto 1fr auto 1fr;
                    align-items: center;
                    background: var(--surface, #ffffff);
                    border: 1px solid var(--border, #c5cdf0);
                    border-radius: 16px;
                    box-shadow: 0 4px 20px rgba(15, 21, 53, 0.05);
                    padding: 12px 18px;
                    margin-bottom: 14px;
                    gap: 16px;
                    transition: all 0.25s ease;
                }

                .option-tile {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    min-width: 0;
                }

                .option-icon-box {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .option-icon-purple {
                    background: #eef2ff;
                    color: #4f46e5;
                }

                .option-icon-blue {
                    background: #eff6ff;
                    color: #2563eb;
                }

                .option-icon-emerald {
                    background: #ecfdf5;
                    color: #059669;
                }

                .option-body {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    min-width: 0;
                    flex: 1;
                }

                .option-title {
                    font-size: 0.86rem;
                    font-weight: 700;
                    color: var(--text, #0f1535);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .option-desc {
                    font-size: 0.72rem;
                    color: var(--text-muted, #64748b);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .option-divider {
                    width: 1px;
                    height: 36px;
                    background: var(--border, #e2e8f0);
                    flex-shrink: 0;
                }

                /* Modern Toggle Switch */
                .switch-toggle {
                    position: relative;
                    display: inline-block;
                    width: 44px;
                    height: 24px;
                    flex-shrink: 0;
                    cursor: pointer;
                }

                .switch-toggle input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .switch-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #cbd5e1;
                    transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    border-radius: 24px;
                }

                .switch-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    border-radius: 50%;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
                }

                .switch-toggle input:checked + .switch-slider {
                    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                }

                .switch-toggle input:checked + .switch-slider:before {
                    transform: translateX(20px);
                }

                /* Modern Number Stepper */
                .number-stepper {
                    display: inline-flex;
                    align-items: center;
                    background: var(--bg-subtle, #f8fafc);
                    border: 1.5px solid var(--border, #cbd5e1);
                    border-radius: 10px;
                    padding: 2px 8px;
                    gap: 6px;
                    flex-shrink: 0;
                    transition: all 0.2s ease;
                }

                .number-stepper:focus-within {
                    border-color: var(--primary, #4f46e5);
                    background: #ffffff;
                    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
                }

                .stepper-input {
                    width: 32px;
                    height: 26px;
                    border: none;
                    background: transparent;
                    color: var(--text, #0f1535);
                    font-size: 0.95rem;
                    font-weight: 800;
                    text-align: center;
                    outline: none;
                    font-family: inherit;
                }

                .stepper-unit {
                    font-size: 0.72rem;
                    font-weight: 600;
                    color: var(--text-muted, #64748b);
                    user-select: none;
                }

                @media (max-width: 900px) {
                    .assignment-options-card {
                        grid-template-columns: 1fr;
                        gap: 12px;
                    }
                    .option-divider {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
}
