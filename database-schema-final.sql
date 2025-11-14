-- Nöbetçi Öğretmen Görevlendirme Sistemi - Supabase Database Schema
-- Bu SQL dosyasını Supabase SQL Editor'da çalıştırın

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
  "teacherId" TEXT PRIMARY KEY,
  "teacherName" TEXT NOT NULL,
  "maxDutyPerDay" INTEGER DEFAULT 6,
  source TEXT DEFAULT 'manual',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  "classId" TEXT PRIMARY KEY,
  "className" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Absents table
CREATE TABLE IF NOT EXISTS absents (
  "absentId" TEXT PRIMARY KEY,
  "teacherId" TEXT,
  name TEXT NOT NULL,
  reason TEXT,
  days TEXT[] DEFAULT '{}',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Class free slots table (JSONB for nested data {day: {period: [classIds]}})
CREATE TABLE IF NOT EXISTS class_free (
  id SERIAL PRIMARY KEY,
  data JSONB DEFAULT '{}',
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Teacher free slots table (JSONB for {period: [teacherIds]})
CREATE TABLE IF NOT EXISTS teacher_free (
  id SERIAL PRIMARY KEY,
  data JSONB DEFAULT '{}',
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Class absence table
CREATE TABLE IF NOT EXISTS class_absence (
  id SERIAL PRIMARY KEY,
  day TEXT NOT NULL,
  period INTEGER NOT NULL,
  "classId" TEXT NOT NULL,
  "absentId" TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(day, period, "classId")
);

-- Locks table (manual assignments)
CREATE TABLE IF NOT EXISTS locks (
  id SERIAL PRIMARY KEY,
  day TEXT NOT NULL,
  period INTEGER NOT NULL,
  "classId" TEXT NOT NULL,
  "teacherId" TEXT,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(day, period, "classId")
);

-- PDF schedule table
CREATE TABLE IF NOT EXISTS pdf_schedule (
  id SERIAL PRIMARY KEY,
  schedule JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Import history table
CREATE TABLE IF NOT EXISTS import_history (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  "fileName" TEXT,
  "fileSize" BIGINT,
  status TEXT DEFAULT 'success',
  note TEXT,
  stats JSONB DEFAULT '{}',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Teacher schedules table (individual teacher class schedules)
CREATE TABLE IF NOT EXISTS teacher_schedules (
  id SERIAL PRIMARY KEY,
  "teacher_name" TEXT NOT NULL,
  schedule JSONB NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("teacher_name")
);

-- Common lessons table
CREATE TABLE IF NOT EXISTS common_lessons (
  id SERIAL PRIMARY KEY,
  day TEXT NOT NULL,
  period INTEGER NOT NULL,
  "class_id" TEXT NOT NULL,
  "teacher_name" TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(day, period, "class_id")
);

-- Snapshots table
CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ts BIGINT NOT NULL,
  data JSONB NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_absents_teacherId ON absents("teacherId");
CREATE INDEX IF NOT EXISTS idx_class_absence_absentId ON class_absence("absentId");
CREATE INDEX IF NOT EXISTS idx_locks_day ON locks(day);
CREATE INDEX IF NOT EXISTS idx_import_history_type ON import_history(type);
CREATE INDEX IF NOT EXISTS idx_import_history_createdAt ON import_history("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_ts ON snapshots(ts DESC);
CREATE INDEX IF NOT EXISTS idx_teachers_source ON teachers(source);

-- Row Level Security (RLS) - Disabled for development/single user
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE absents DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_free DISABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_free DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_absence DISABLE ROW LEVEL SECURITY;
ALTER TABLE locks DISABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_schedule DISABLE ROW LEVEL SECURITY;
ALTER TABLE import_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE common_lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots DISABLE ROW LEVEL SECURITY;

-- RLS Policies (uncomment if RLS is enabled)
-- CREATE POLICY "Allow all operations for authenticated users" ON teachers FOR ALL USING (true);
-- CREATE POLICY "Allow all operations for authenticated users" ON classes FOR ALL USING (true);
-- CREATE POLICY "Allow all operations for authenticated users" ON absents FOR ALL USING (true);
-- CREATE POLICY "Allow all operations for authenticated users" ON class_free FOR ALL USING (true);
-- CREATE POLICY "Allow all operations for authenticated users" ON teacher_free FOR ALL USING (true);
-- CREATE POLICY "Allow all operations for authenticated users" ON class_absence FOR ALL USING (true);
-- CREATE POLICY "Allow all operations for authenticated users" ON locks FOR ALL USING (true);
-- CREATE POLICY "Allow all operations for authenticated users" ON pdf_schedule FOR ALL USING (true);
-- CREATE POLICY "Allow all operations for authenticated users" ON import_history FOR ALL USING (true);
-- CREATE POLICY "Allow all operations for authenticated users" ON snapshots FOR ALL USING (true);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_absents_updated_at BEFORE UPDATE ON absents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_class_free_updated_at BEFORE UPDATE ON class_free FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teacher_free_updated_at BEFORE UPDATE ON teacher_free FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_class_absence_updated_at BEFORE UPDATE ON class_absence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locks_updated_at BEFORE UPDATE ON locks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teacher_schedules_updated_at BEFORE UPDATE ON teacher_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_common_lessons_updated_at BEFORE UPDATE ON common_lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_snapshots_updated_at BEFORE UPDATE ON snapshots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
