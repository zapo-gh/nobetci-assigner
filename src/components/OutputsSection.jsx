import React from 'react';
import PrintableDailyList from './PrintableDailyList.jsx';
import AssignmentText from './AssignmentText.jsx';

export default function OutputsSection({
  day,
  displayDate,
  periods,
  assignment,
  teachersForCurrentDay,
  classes,
  classAbsence,
  filteredClassAbsence,
  absentPeopleForCurrentDay,
  commonLessons,
  onExportJPG,
  onPrint,
  IconComponent,
}) {
  if (!IconComponent) {
    throw new Error('OutputsSection requires IconComponent prop');
  }

  return (
    <div id="panel-outputs" role="tabpanel" aria-labelledby="tab-outputs">
      <div className="toolbar no-print">
        <button className="btn" onClick={onExportJPG}>
          <IconComponent name="download" size={16} /> JPG indir
        </button>
        <button className="btn" onClick={onPrint}>
          <IconComponent name="printer" size={16} /> Yazdır
        </button>
      </div>
      <PrintableDailyList
        day={day}
        displayDate={displayDate}
        periods={periods}
        assignment={assignment}
        teachers={teachersForCurrentDay}
        classes={classes}
        classAbsence={filteredClassAbsence}
        absentPeople={absentPeopleForCurrentDay}
        commonLessons={commonLessons}
      />
      <AssignmentText
        day={day}
        displayDate={displayDate}
        periods={periods}
        assignment={assignment}
        teachers={teachersForCurrentDay}
        classes={classes}
        classAbsence={classAbsence}
        absentPeople={absentPeopleForCurrentDay}
        commonLessons={commonLessons}
      />
    </div>
  );
}

