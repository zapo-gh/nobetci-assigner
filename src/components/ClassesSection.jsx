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
  onDeleteClass,
  teachers = [],
  onAddClass,
  onDeleteAllClasses,
  IconComponent,
}) {
  if (!IconComponent) {
    throw new Error('ClassesSection requires IconComponent prop');
  }

  return (
    <div role="tabpanel" id="panel-classes" aria-labelledby="tab-classes">
      <div className="section-toolbar">
        <button className="btn-secondary" onClick={onAddClass}>
          <span style={{ marginRight: '4px', fontWeight: 'bold' }}>+</span>
          <IconComponent name="home" size={16} />
          <span className="btn-text">Yeni Sınıf Ekle</span>
        </button>
        <div className="toolbar-spacer"></div>
        {classes.length > 0 && (
          <button className="btn-outline btn-sm" onClick={onDeleteAllClasses} title="Tüm sınıfları sil">
            <IconComponent name="trash" size={14} />
            <span>Tümünü Sil</span>
          </button>
        )}
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
        onDelete={onDeleteClass}
        day={day}
        IconComponent={IconComponent}
        teachers={teachers}
      />
    </div>
  );
}

