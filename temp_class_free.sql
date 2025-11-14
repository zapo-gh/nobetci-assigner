-- Class free slots table (JSONB for complex data)
CREATE TABLE IF NOT EXISTS class_free (
  id SERIAL PRIMARY KEY,
  day TEXT NOT NULL,
  period INTEGER NOT NULL,
  classIds TEXT[] DEFAULT '{}',
  updatedAt TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(day, period)
);
