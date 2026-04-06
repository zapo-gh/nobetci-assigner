import React, { memo, useMemo } from 'react'

function ConflictSuggestions({ 
  assignment = {}, 
  day = '', 
  teachers = [], 
  classes = [], 
  freeTeachersByDay = {}, 
  freeClassesByDay = {},
  maxClassesPerSlot = 1,
}) {
  
  // Hooks...
  const classesById = useMemo(() => 
    Object.fromEntries((classes || []).map(c => [c.classId, c.className])), 
    [classes]
  );
  
  const teacherById = useMemo(() => 
    Object.fromEntries((teachers || []).map(t => [t.teacherId, t])), 
    [teachers]
  );

  const suggestions = useMemo(() => {
    if (!teachers.length || !classes.length || !assignment[day] || !freeTeachersByDay[day] || !freeClassesByDay[day]) {
      return []
    }

    const out = []
    const freeT = freeTeachersByDay[day] || {}
    const freeC = freeClassesByDay[day] || {}
    const allPeriods = Object.keys(freeT).concat(Object.keys(freeC)).filter((v, i, a) => a.indexOf(v) === i);

    // Günlük mevcut atama sayısı (öğretmen bazında)
    const dutyCountDay = (assignment[day] || {});
    const dailyUsage = Object.values(dutyCountDay).reduce((m, arr) => {
      (arr || []).forEach(a => {
        m[a.teacherId] = (m[a.teacherId] || 0) + 1;
      });
      return m;
    }, {});

    allPeriods.forEach(p => {
      const assignedClassesInPeriod = new Set((assignment[day]?.[p] || []).map(a => a.classId));
      const freeClassesInPeriod = freeC[p] || new Set();
      
      // Sadece atanmamış VE boş ders olarak işaretlenmiş sınıfları bul
      const unassignedAndFreeClasses = classes.filter(c => 
        !assignedClassesInPeriod.has(c.classId) && freeClassesInPeriod.has(c.classId)
      );

      if (unassignedAndFreeClasses.length === 0) return;

      // Aynı saatte bir öğretmene birden fazla sınıf verilebiliyorsa (maxClassesPerSlot>1),
      // o öğretmenin bu periyottaki mevcut kullanımını kontrol et
      const perTeacherUsage = (assignment[day]?.[p] || []).reduce((m, a) => {
        m[a.teacherId] = (m[a.teacherId] || 0) + 1; 
        return m; 
      }, {});

      const availableTeachersForSuggestions = Array.from(freeT[p] || []).filter(tid => {
        const usedInPeriod = perTeacherUsage[tid] || 0;
        if (usedInPeriod >= (parseInt(maxClassesPerSlot, 10) || 1)) return false;
        const t = teacherById[tid];
        const maxPerDay = Number.isFinite(parseInt(t?.maxDutyPerDay, 10)) ? parseInt(t.maxDutyPerDay, 10) : 6;
        const usedInDay = dailyUsage[tid] || 0;
        return usedInDay < maxPerDay;
      });

      unassignedAndFreeClasses.forEach(cls => {
        const proposed = availableTeachersForSuggestions.slice(0, 3).map(tid => ({
          teacherId: tid,
          teacherName: teacherById[tid]?.teacherName || tid
        }));
        out.push({ period: p, classId: cls.classId, className: classesById[cls.classId] || cls.classId, proposals: proposed });
      });
    });
    return out;
  }, [assignment, day, teachers, classes, freeTeachersByDay, freeClassesByDay, classesById, teacherById, maxClassesPerSlot]);

  if (!classes.length || !teachers.length) {
    return null;
  }

  if (!suggestions.length) {
    return (
      <div className="text-muted p-4 text-center">
        Atanmamış boş ders bulunmuyor.
      </div>
    );
  }

  return (
    <div className="table-container">
      <div className="scrollX">
        <table className="tbl">
          <thead>
            <tr>
              <th className="sticky-col">Saat</th>
              <th>Sınıf</th>
              <th>Önerilen Öğretmenler</th>
            </tr>
          </thead>
          <tbody>
            {suggestions.map((s, idx) => (
              <tr key={idx}>
                <td className="sticky-col text-center">{s.period}</td>
                <td>{s.className}</td>
                <td>
                  {s.proposals.length ? s.proposals.map(p => (
                    <span key={p.teacherId} className="badge badge-info" style={{ marginRight: 6 }}>{p.teacherName}</span>
                  )) : <span className="text-muted">Uygun öğretmen bulunamadı</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default memo(ConflictSuggestions)






