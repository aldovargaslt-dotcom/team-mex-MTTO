CREATE DATABASE team_mex_mtto_test;
GRANT ALL PRIVILEGES ON DATABASE team_mex_mtto_test TO team_mex;
\connect team_mex_mtto
CREATE SCHEMA IF NOT EXISTS inventario;
CREATE SCHEMA IF NOT EXISTS andon;
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE SCHEMA IF NOT EXISTS flota;
CREATE SCHEMA IF NOT EXISTS salud;
CREATE SCHEMA IF NOT EXISTS alertas;
GRANT ALL ON SCHEMA inventario TO team_mex;
GRANT ALL ON SCHEMA andon TO team_mex;
GRANT ALL ON SCHEMA notifications TO team_mex;
GRANT ALL ON SCHEMA flota TO team_mex;
GRANT ALL ON SCHEMA salud TO team_mex;
GRANT ALL ON SCHEMA alertas TO team_mex;
\connect team_mex_mtto_test
CREATE SCHEMA IF NOT EXISTS inventario;
CREATE SCHEMA IF NOT EXISTS andon;
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE SCHEMA IF NOT EXISTS flota;
CREATE SCHEMA IF NOT EXISTS salud;
CREATE SCHEMA IF NOT EXISTS alertas;
GRANT ALL ON SCHEMA inventario TO team_mex;
GRANT ALL ON SCHEMA andon TO team_mex;
GRANT ALL ON SCHEMA notifications TO team_mex;
GRANT ALL ON SCHEMA flota TO team_mex;
GRANT ALL ON SCHEMA salud TO team_mex;
GRANT ALL ON SCHEMA alertas TO team_mex;

