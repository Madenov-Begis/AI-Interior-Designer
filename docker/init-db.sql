-- Выполняется PostgreSQL только при инициализации пустого volume.
SELECT format(
  'CREATE ROLE ruvie_app LOGIN PASSWORD %L',
  trim(pg_read_file('/run/secrets/postgres_app_password'))
) \gexec
GRANT CONNECT ON DATABASE ruvie TO ruvie_app;
GRANT USAGE ON SCHEMA public TO ruvie_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ruvie_app;
ALTER DEFAULT PRIVILEGES FOR ROLE ruvie_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ruvie_app;
