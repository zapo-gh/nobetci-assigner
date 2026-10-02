// @ts-nocheck
import React from 'react';
import ModernAvailabilityGrid from './ModernAvailabilityGrid.jsx';
import RuleEngineCard from './RuleEngineCard.jsx';

export default function TeachersSection({
  teachers,
  teachersForCurrentDay,
  periods,
  teacherFree,
  onToggleTeacherFree,
  onToggleAllTeachersFree,
  onDeleteTeacher,
  onOpenDutyTeacherExcelModal,
  onOpenPdfImport,
  onOpenAddTeacherModal,
  onDeletePdfTeachers,
  onDeleteAllTeachers,
  options,
  onOptionChange,
  dayOptions,
  day,
  IconComponent,
}) {
  if (!IconComponent) {
    throw new Error('TeachersSection requires IconComponent prop');
  }

  return (
    <div role="tabpanel" id="panel-teachers" aria-labelledby="tab-teachers">
      <div className="section-toolbar">
        <button className="btn-tertiary" onClick={onOpenDutyTeacherExcelModal}>
          <IconComponent name="upload" size={16} />
          <span>Nöbetçi Öğretmen Excel Yükle</span>
        </button>
        <button className="btn-tertiary" onClick={onOpenPdfImport}>
          <IconComponent name="upload" size={16} />
          <span>PDF Çizelgesi Yükle</span>
        </button>
        <button className="btn-secondary" onClick={onOpenAddTeacherModal}>
          <span style={{ marginRight: '4px', fontWeight: 'bold' }}>+</span>
          <IconComponent name="users" size={16} />
          <span className="btn-text">Yeni Öğretmen Ekle</span>
        </button>
        <div className="toolbar-spacer"></div>
        {teachers.some((t) => t.teacherId?.startsWith('auto_')) && (
          <button
            className="btn-danger"
            onClick={onDeletePdfTeachers}
            title="PDF'den eklenen tüm öğretmenleri sil"
            aria-label="PDF'den eklenen tüm öğretmenleri sil"
          >
            <IconComponent name="trash" size={16} />
          </button>
        )}
        {teachers.length > 0 && (
          <button className="btn-outline btn-sm" onClick={onDeleteAllTeachers} title="Tüm öğretmenleri sil">
            <IconComponent name="trash" size={14} />
            <span>Tümünü Sil</span>
          </button>
        )}
      </div>
      <ModernAvailabilityGrid
        rows={teachersForCurrentDay}
        rowKey="teacherId"
        rowNameKey="teacherName"
        periods={periods}
        selectedMap={teacherFree}
        onToggle={onToggleTeacherFree}
        onToggleAll={onToggleAllTeachersFree}
        onDelete={onDeleteTeacher}
        IconComponent={IconComponent}
        extraCol={(row) => {
          if (!row.dutyLocations || !day) return null;
          const systemDayMap = { 'Sun': 'sunday', 'Mon': 'monday', 'Tue': 'tuesday', 'Wed': 'wednesday', 'Thu': 'thursday', 'Fri': 'friday', 'Sat': 'saturday' };
          const systemDay = systemDayMap[day];
          const location = row.dutyLocations[systemDay];
          return location ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
              <IconComponent name="mapPin" size={12} /> {location}
            </span>
          ) : null;
        }}
      />
      <RuleEngineCard
        options={options}
        onOptionChange={onOptionChange}
        teachers={teachersForCurrentDay}
        periods={periods}
        dayOptions={dayOptions}
        IconComponent={IconComponent}
      />
    </div>
  );
}

