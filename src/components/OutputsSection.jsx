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
  onExportJPG,
  onPrint,
  onExportTeacherPDF,
  onExportClassPDF,
  onExportWeeklyExcel,
  termArchives,
  selectedArchiveId,
  onSelectArchive,
  onSaveTermArchive,
  onDeleteTermArchive,
  currentTermSummary,
  archiveComparison,
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
        <button className="btn" onClick={onExportTeacherPDF}>
          <IconComponent name="printer" size={16} /> Öğretmen PDF
        </button>
        <button className="btn" onClick={onExportClassPDF}>
          <IconComponent name="printer" size={16} /> Sınıf PDF
        </button>
        <button className="btn" onClick={onExportWeeklyExcel}>
          <IconComponent name="download" size={16} /> Haftalık Excel
        </button>
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

      <section className="option-card no-print" style={{ marginTop: '12px' }}>
        <label className="control-label" style={{ marginBottom: '8px' }}>
          <IconComponent name="calendar" size={16} />
          <span>Dönemsel Arşiv</span>
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <button className="btn" onClick={onSaveTermArchive}>Mevcut Planı Arşivle</button>
          <select
            className="option-input-inline"
            style={{ width: '320px', textAlign: 'left' }}
            value={selectedArchiveId}
            onChange={(e) => onSelectArchive(e.target.value)}
          >
            <option value="">Arşiv seçin</option>
            {(termArchives || []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {selectedArchiveId && (
            <button className="btn" onClick={() => onDeleteTermArchive(selectedArchiveId)}>Seçili Arşivi Sil</button>
          )}
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <strong>Güncel:</strong> {currentTermSummary?.totalAssignments || 0} atama · Adil skor {Number(currentTermSummary?.fairnessScore || 0).toFixed(1)}
        </div>

        {archiveComparison && (
          <div style={{ marginTop: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <div>
              <strong>Karşılaştırma ({archiveComparison.archiveName}):</strong> Toplam fark {archiveComparison.totalDiff >= 0 ? '+' : ''}{archiveComparison.totalDiff},
              adil skor farkı {archiveComparison.fairnessDiff >= 0 ? '+' : ''}{archiveComparison.fairnessDiff.toFixed(1)}
            </div>
            <div style={{ marginTop: '4px' }}>
              {archiveComparison.dayDiff.map((item) => (
                <span key={item.dayKey} style={{ marginRight: '10px' }}>
                  {item.dayKey}: {item.oldValue}→{item.newValue} ({item.diff >= 0 ? '+' : ''}{item.diff})
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

