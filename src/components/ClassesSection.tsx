// @ts-nocheck
import React from 'react';
import ModernClassAvailabilityGrid from './ModernClassAvailabilityGrid.jsx';

export default function ClassesSection({
  classes,
  classesForCurrentDay,
  periods,
  classFreeForCurrentDay,
  absentPeopleForCurrentDay,
  filteredClassAbsence,
  commonLessons,
  day,
  onToggleClassFree,
  onSetAllClassesFree,
  onSelectAbsence,
  onOpenCommonLessonModal,
  onCancelCommonLesson,
  onDeleteClass,
  teachers = [],
  onAddClass,
  onDeleteAllClasses,
  IconComponent,
  classLocations = {},
}) {
  if (!IconComponent) {
    throw new Error('ClassesSection requires IconComponent prop');
  }

  return (
    <div role="tabpanel" id="panel-classes" aria-labelledby="tab-classes">
      <div className="toolbar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={onAddClass}>
          <span style={{ marginRight: '4px', fontWeight: 'bold' }}>+</span>
          <IconComponent name="home" size={16} />
          <span className="btn-text">Yeni Sınıf Ekle</span>
        </button>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {classes.length > 0 && (
            <button className="btn btn-danger" onClick={onDeleteAllClasses} title="Tüm sınıfları sil">
              <IconComponent name="trash" size={14} />
              <span>Tümünü Sil</span>
            </button>
          )}
        </div>
      </div>
      <ModernClassAvailabilityGrid
        classes={classesForCurrentDay}
        periods={periods}
        classFree={classFreeForCurrentDay}
        onToggleClassFree={onToggleClassFree}
        onSetAllClassesFree={onSetAllClassesFree}
        absentPeople={absentPeopleForCurrentDay}
        classAbsence={filteredClassAbsence}
        onSelectAbsence={onSelectAbsence}
        commonLessons={commonLessons}
        onOpenCommonLessonModal={onOpenCommonLessonModal}
        onCancelCommonLesson={onCancelCommonLesson}
        onDelete={onDeleteClass}
        day={day}
        IconComponent={IconComponent}
        teachers={teachers}
        classLocations={classLocations}
      />
    </div>
  );
}

