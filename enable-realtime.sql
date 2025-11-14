-- Supabase Realtime'ı etkinleştir
-- Bu dosyayı Supabase SQL Editor'da çalıştırın

-- Tüm tablolar için Realtime'ı etkinleştir
ALTER PUBLICATION supabase_realtime ADD TABLE teachers;
ALTER PUBLICATION supabase_realtime ADD TABLE classes;
ALTER PUBLICATION supabase_realtime ADD TABLE absents;
ALTER PUBLICATION supabase_realtime ADD TABLE class_free;
ALTER PUBLICATION supabase_realtime ADD TABLE teacher_free;
ALTER PUBLICATION supabase_realtime ADD TABLE class_absence;
ALTER PUBLICATION supabase_realtime ADD TABLE locks;
ALTER PUBLICATION supabase_realtime ADD TABLE pdf_schedule;
ALTER PUBLICATION supabase_realtime ADD TABLE teacher_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE common_lessons;
ALTER PUBLICATION supabase_realtime ADD TABLE import_history;
ALTER PUBLICATION supabase_realtime ADD TABLE snapshots;

-- Realtime'ın çalıştığını kontrol et
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

