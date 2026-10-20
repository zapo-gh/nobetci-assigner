// @ts-nocheck
import React from 'react';
import ModernAvailabilityGrid from './ModernAvailabilityGrid.jsx';

export default function TeachersSection({
  teachers,
  teachersForCurrentDay,
  periods,
  teacherFree,
  onToggleTeacherFree,
  onToggleAllTeachersFree,
  onSetTeacherPeriodsFree,
  onDeleteTeacher,
  onEditTeacher,
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
      <div className="toolbar teachers-toolbar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn-primary btn-add-teacher" onClick={onOpenAddTeacherModal}>
          <span style={{ marginRight: '4px', fontWeight: 'bold' }}>+</span>
          <IconComponent name="users" size={16} />
          <span className="btn-text">Yeni Öğretmen Ekle</span>
        </button>
        <button className="btn btn-upload" onClick={onOpenDutyTeacherExcelModal} title="Nöbetçi Öğretmen Excel Yükle">
          <IconComponent name="upload" size={16} />
          <span>Excel Yükle</span>
        </button>
        <button className="btn btn-upload" onClick={onOpenPdfImport} title="PDF Çizelgesi Yükle">
          <IconComponent name="upload" size={16} />
          <span>PDF Yükle</span>
        </button>
        
        <div className="teachers-danger-group" style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {teachers.some((t) => t.teacherId?.startsWith('auto_')) && (
            <button
              className="btn btn-danger"
              onClick={onDeletePdfTeachers}
              title="PDF'den eklenen tüm öğretmenleri sil"
              aria-label="PDF'den eklenen tüm öğretmenleri sil"
            >
              <IconComponent name="trash" size={16} />
            </button>
          )}
          {teachers.length > 0 && (
            <button className="btn btn-danger" onClick={onDeleteAllTeachers} title="Tüm öğretmenleri sil">
              <IconComponent name="trash" size={14} />
              <span>Tümünü Sil</span>
            </button>
          )}
        </div>
        <style>{`
          @media (max-width: 768px) {
            .teachers-toolbar {
              display: flex;
              flex-wrap: wrap;
              gap: 6px !important;
            }
            .teachers-toolbar .btn-add-teacher {
              width: 100%;
              justify-content: center;
              padding: 9px 12px;
              order: -1;
              min-height: 42px;
            }
            .teachers-toolbar .btn-upload {
              flex: 1;
              min-width: 110px;
              justify-content: center;
              padding: 8px 6px;
              font-size: 0.78rem;
              min-height: 38px;
            }
            .teachers-toolbar .teachers-danger-group {
              margin-left: 0 !important;
              width: 100%;
              justify-content: flex-end;
              margin-top: 2px;
            }
          }
        `}</style>
      </div>
      <ModernAvailabilityGrid
        rows={teachersForCurrentDay}
        rowKey="teacherId"
        rowNameKey="teacherName"
        periods={periods}
        selectedMap={teacherFree}
        onToggle={onToggleTeacherFree}
        onToggleAll={onToggleAllTeachersFree}
        onSetTeacherPeriodsFree={onSetTeacherPeriodsFree}
        onDelete={onDeleteTeacher}
        onEdit={onEditTeacher}
        IconComponent={IconComponent}
        day={day}
        extraCol={(row) => {
          if (!row.dutyLocations || !day) return null;
          const systemDayMap = { 'Sun': 'sunday', 'Mon': 'monday', 'Tue': 'tuesday', 'Wed': 'wednesday', 'Thu': 'thursday', 'Fri': 'friday', 'Sat': 'saturday' };
          const systemDay = systemDayMap[day] || day;
          const location = row.dutyLocations[systemDay];
          return location ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted, gray)', lineHeight: '1.2' }}>
              <IconComponent name="mapPin" size={10} /> {location}
            </span>
          ) : null;
        }}
      />
    </div>
  );
}

