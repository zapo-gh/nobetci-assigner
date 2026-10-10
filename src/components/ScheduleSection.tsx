// @ts-nocheck
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
  balanceReport,
  unassignedForSelectedDay,
  commonLessons,
  classes,
  classLocations,
  locationZoneMapping = {},
  teacherSchedules = {},
  IconComponent,
  onOptionChange,
  onSetAllTeachersMaxDuty,
  onDropAssign,
  onManualAssign,
  onManualClear,
  onManualSetAdmin,
  onManualRelease,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
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
        freeClassesByDay={freeClassesByDay}
        assignment={assignment}
        locked={locked}
        classLocations={classLocations}
        locationZoneMapping={locationZoneMapping}
        teacherSchedules={teacherSchedules}
        onDropAssign={onDropAssign}
        onManualAssign={onManualAssign}
        onManualClear={onManualClear}
        onManualSetAdmin={onManualSetAdmin}
        onManualRelease={onManualRelease}
        unassignedForSelectedDay={unassignedForSelectedDay}
        commonLessons={commonLessons}
        IconComponent={IconComponent}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
      />
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

