import React from 'react';
import ModernAvailabilityGrid from './ModernAvailabilityGrid.jsx';

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
      />
    </div>
  );
}

