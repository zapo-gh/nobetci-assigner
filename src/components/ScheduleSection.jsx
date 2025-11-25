import React from 'react';
import AssignmentOptions from './AssignmentOptions.jsx';
import AssignmentEditor from './AssignmentEditor.jsx';
import ConflictSuggestions from './ConflictSuggestions.jsx';
import AssignmentInsights from './AssignmentInsights.jsx';

export default function ScheduleSection({
  day,
  periods,
  classesForCurrentDay,
  teachersForCurrentDay,
  freeTeachersByDay,
  freeClassesByDay,
  assignment,
  locked,
  options,
  assignmentInsights,
  unassignedForSelectedDay,
  commonLessons,
  classes,
  IconComponent,
  onOptionChange,
  onSetAllTeachersMaxDuty,
  onDropAssign,
  onManualAssign,
  onManualClear,
  onManualRelease,
}) {
  if (!IconComponent) {
    throw new Error('ScheduleSection requires IconComponent prop');
  }

  return (
    <div role="tabpanel" id="panel-schedule" aria-labelledby="tab-schedule">
      <AssignmentOptions
        options={options}
        handleOptionChange={onOptionChange}
        setAllTeachersMaxDuty={onSetAllTeachersMaxDuty}
        IconComponent={IconComponent}
      />
      <AssignmentEditor
        day={day}
        periods={periods}
        classes={classesForCurrentDay}
        teachers={teachersForCurrentDay}
        availableTeachersByPeriod={freeTeachersByDay[day] || {}}
        assignment={assignment}
        locked={locked}
        onDropAssign={onDropAssign}
        onManualAssign={onManualAssign}
        onManualClear={onManualClear}
        onManualRelease={onManualRelease}
        commonLessons={commonLessons}
        IconComponent={IconComponent}
      />
      {unassignedForSelectedDay.length > 0 && (
        <div className="unassigned-card" role="alert">
          <div className="unassigned-header">
            <IconComponent name="alertTriangle" size={16} />
            <span>Atanamayan sınıflar ({unassignedForSelectedDay.length})</span>
          </div>
          <p className="unassigned-description">
            Bu sınıflar için uygun öğretmen bulunamadı. Kuralları gevşetebilir, manuel atama yapabilir veya ilgili öğretmenlerin boş
            saatlerini kontrol edebilirsiniz.
          </p>
          <ul className="unassigned-list">
            {unassignedForSelectedDay.map(({ period, classId, className }) => (
              <li key={`${period}-${classId}`}>
                <span className="badge">{period}. saat</span>
                <span>{className}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ConflictSuggestions
        assignment={assignment}
        day={day}
        teachers={teachersForCurrentDay}
        classes={classes}
        freeTeachersByDay={freeTeachersByDay}
        freeClassesByDay={freeClassesByDay}
        maxClassesPerSlot={options.maxClassesPerSlot}
      />
      <AssignmentInsights insights={assignmentInsights} IconComponent={IconComponent} />
    </div>
  );
}

