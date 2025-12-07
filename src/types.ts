export interface Teacher {
  teacherId: string;
  teacherName: string;
  maxDutyPerDay: number;
  source?: string;
  createdAt?: string;
}

export interface Class {
  classId: string;
  className: string;
  createdAt?: string;
}

export interface Absent {
  absentId: string;
  teacherId?: string | null;
  name: string;
  reason?: string | null;
  days: string[]; // e.g. ["Mon", "Tue"]
  createdAt?: string;
}

// Data structures as transformed in supabaseDataService.js
export interface ClassFree {
  [day: string]: {
    [period: number]: string[]; // Array of classIds
  };
}

export interface TeacherFree {
  [period: number]: string[]; // Array of teacherIds
}

export interface ClassAbsence {
  [day: string]: {
    [period: number]: {
      [classId: string]: string; // absentId
    };
  };
}

export interface Locks {
  [key: string]: string; // key: "day|period|classId", value: teacherId
}

export interface PdfSchedule {
  [key: string]: any; // Structure depends on PDF parsing
}

export interface TeacherSchedules {
  [teacherName: string]: any; // Structure depends on schedule parsing
}

export interface CommonLessons {
  [day: string]: {
    [period: number]: {
      [classId: string]: string; // teacher_name
    };
  };
}

export interface AppData {
  teachers: Teacher[];
  classes: Class[];
  absents: Absent[];
  classFree: ClassFree;
  teacherFree: TeacherFree;
  classAbsence: ClassAbsence;
  locked: Locks;
  pdfSchedule: PdfSchedule;
  teacherSchedules: TeacherSchedules;
  commonLessons: CommonLessons;
}
