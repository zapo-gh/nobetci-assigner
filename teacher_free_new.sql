-- Teacher free slots table (JSONB for nested data: {period: [teacherIds]})
CREATE TABLE IF NOT EXISTS teacher_free (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  updatedAt TIMESTAMPTZ DEFAULT NOW()
);
