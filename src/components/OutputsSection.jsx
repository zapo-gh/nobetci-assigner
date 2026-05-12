import React from 'react';
import PrintableDailyList from './PrintableDailyList.jsx';
import AssignmentText from './AssignmentText.jsx';

export default function OutputsSection({
  day,
  displayDate,
  periods,
  assignment,
  locked,
  teachersForCurrentDay,
  classes,
  classAbsence,
  absentPeopleForCurrentDay,
  commonLessons,
  onPrint,
  onExportJPG,
  IconComponent,
}) {
  if (!IconComponent) {
    throw new Error('OutputsSection requires IconComponent prop');
  }

  return (
    <div id="panel-outputs" role="tabpanel" aria-labelledby="tab-outputs">
      <div className="toolbar no-print">
        <button className="btn" onClick={onPrint}>
          <IconComponent name="printer" size={16} /> Yazdır
        </button>
        {onExportJPG && (
          <button className="btn" onClick={onExportJPG}>
            <IconComponent name="image" size={16} /> JPEG Kaydet
          </button>
        )}
      </div>
      <PrintableDailyList
        day={day}
        displayDate={displayDate}
        periods={periods}
        assignment={assignment}
        locked={locked}
        teachers={teachersForCurrentDay}
        classes={classes}
        classAbsence={classAbsence}
        absentPeople={absentPeopleForCurrentDay}
        commonLessons={commonLessons}
      />
      <AssignmentText
        day={day}
        displayDate={displayDate}
        periods={periods}
        assignment={assignment}
        locked={locked}
        teachers={teachersForCurrentDay}
        classes={classes}
        classAbsence={classAbsence}
        absentPeople={absentPeopleForCurrentDay}
        commonLessons={commonLessons}
      />
    </div>
  );
}

