-- Class free slots table (JSONB for nested data: {day: {period: [classIds]}})
CREATE TABLE IF NOT EXISTS class_free (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  updatedAt TIMESTAMPTZ DEFAULT NOW()
);
