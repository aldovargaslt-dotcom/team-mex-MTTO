-- Legacy public schema from PR #84 baseline, PostgreSQL 16, without rows or credentials.



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET search_path=public;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA public;



COMMENT ON SCHEMA public IS 'standard public schema';



CREATE TYPE public.choferes_estado_enum AS ENUM (
    'ACTIVO',
    'INACTIVO'
);



CREATE TYPE public.unidades_estado_enum AS ENUM (
    'ACTIVA',
    'INACTIVA'
);



CREATE TYPE public.visita_firmas_tipo_enum AS ENUM (
    'CHOFER',
    'JEFE'
);



CREATE TYPE public.visita_piezas_origen_enum AS ENUM (
    'DESDE_STOCK',
    'COMPRA_EXTERNA'
);



CREATE TYPE public.visita_trabajos_categoria_enum AS ENUM (
    'A',
    'B',
    'C',
    'D',
    'E'
);



CREATE TYPE public.visitas_estado_enum AS ENUM (
    'BORRADOR',
    'CERRADO'
);



CREATE TYPE public.visitas_tipo_enum AS ENUM (
    'PREDICTIVO',
    'CORRECTIVO'
);


SET default_tablespace = '';

SET default_table_access_method = heap;


CREATE TABLE public.choferes (
    id uuid NOT NULL,
    nombre character varying NOT NULL,
    estado public.choferes_estado_enum DEFAULT 'ACTIVO'::public.choferes_estado_enum NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.outbox_events (
    id uuid NOT NULL,
    type character varying NOT NULL,
    payload jsonb NOT NULL,
    processed_at timestamp with time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.tipos_vehiculo (
    id uuid NOT NULL,
    nombre character varying NOT NULL,
    descripcion text,
    icono character varying(16),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.unidades (
    id uuid NOT NULL,
    numero_interno character varying NOT NULL,
    placas character varying NOT NULL,
    vin character varying(32),
    estado public.unidades_estado_enum DEFAULT 'ACTIVA'::public.unidades_estado_enum NOT NULL,
    motivo_inactivacion character varying(32),
    chofer_id uuid,
    ambito character varying(16) DEFAULT 'LOCAL'::character varying NOT NULL,
    destino character varying(160),
    ops_estado character varying(16) DEFAULT 'DISPONIBLE'::character varying NOT NULL,
    salida_at timestamp with time zone,
    marca_modelo character varying,
    anio integer,
    foto_data_url text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    tipo_id uuid
);



CREATE TABLE public.visita_firmas (
    id uuid NOT NULL,
    tipo public.visita_firmas_tipo_enum NOT NULL,
    data_url text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    visita_id uuid
);



CREATE TABLE public.visita_fotos (
    id uuid NOT NULL,
    data_url text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    visita_id uuid
);



CREATE TABLE public.visita_piezas (
    id uuid NOT NULL,
    item_id uuid NOT NULL,
    qty integer NOT NULL,
    origen public.visita_piezas_origen_enum NOT NULL,
    visita_id uuid
);



CREATE TABLE public.visita_trabajos (
    id uuid NOT NULL,
    categoria public.visita_trabajos_categoria_enum NOT NULL,
    item character varying NOT NULL,
    visita_id uuid
);



CREATE TABLE public.visitas (
    id uuid NOT NULL,
    estado public.visitas_estado_enum DEFAULT 'BORRADOR'::public.visitas_estado_enum NOT NULL,
    km integer,
    tipo public.visitas_tipo_enum,
    observaciones text,
    created_by character varying,
    cerrado_at timestamp with time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    unidad_id uuid,
    chofer_id uuid
);



ALTER TABLE ONLY public.visita_firmas
    ADD CONSTRAINT "PK_1440c5b4269aa148f9ee643fe08" PRIMARY KEY (id);



ALTER TABLE ONLY public.unidades
    ADD CONSTRAINT "PK_3e728a664b48bbd90a355065233" PRIMARY KEY (id);



ALTER TABLE ONLY public.visita_trabajos
    ADD CONSTRAINT "PK_5651e0021d31358509082c6003b" PRIMARY KEY (id);



ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT "PK_6689a16c00d09b8089f6237f1d2" PRIMARY KEY (id);



ALTER TABLE ONLY public.choferes
    ADD CONSTRAINT "PK_7195d73953de6e5118ac0b1897f" PRIMARY KEY (id);



ALTER TABLE ONLY public.visita_fotos
    ADD CONSTRAINT "PK_c84abad40ef710efbde97cdec24" PRIMARY KEY (id);



ALTER TABLE ONLY public.visitas
    ADD CONSTRAINT "PK_d1245dc9e45b6dd4eef05f68bba" PRIMARY KEY (id);



ALTER TABLE ONLY public.tipos_vehiculo
    ADD CONSTRAINT "PK_e6238f9d960a7784d6ad7b3490e" PRIMARY KEY (id);



ALTER TABLE ONLY public.visita_piezas
    ADD CONSTRAINT "PK_fd44bc494696d1c30a207ba40fb" PRIMARY KEY (id);



ALTER TABLE ONLY public.unidades
    ADD CONSTRAINT "UQ_274cc75b48ff0a352261aeffb42" UNIQUE (placas);



ALTER TABLE ONLY public.unidades
    ADD CONSTRAINT "UQ_62537e54c92287a280ac267d2c9" UNIQUE (chofer_id);



ALTER TABLE ONLY public.visita_piezas
    ADD CONSTRAINT "UQ_6c15cfed8d40861467dd5d89489" UNIQUE (visita_id, item_id);



ALTER TABLE ONLY public.unidades
    ADD CONSTRAINT "UQ_7d2d70ab30657a34a451e1157b9" UNIQUE (numero_interno);



ALTER TABLE ONLY public.visita_firmas
    ADD CONSTRAINT "UQ_a44b5d47c7f1fa5500d52cdfff4" UNIQUE (visita_id, tipo);



ALTER TABLE ONLY public.tipos_vehiculo
    ADD CONSTRAINT "UQ_e45219bf25cdb1ef3d4dbc1b3f1" UNIQUE (nombre);



ALTER TABLE ONLY public.visita_trabajos
    ADD CONSTRAINT "UQ_edaaf9b9a1aeff8f0020c466da9" UNIQUE (visita_id, categoria, item);



ALTER TABLE ONLY public.unidades
    ADD CONSTRAINT "UQ_fa84e6b9a91526a3b9864bcd4ba" UNIQUE (vin);



ALTER TABLE ONLY public.choferes
    ADD CONSTRAINT choferes_nombre_uidx UNIQUE (nombre);



CREATE UNIQUE INDEX visitas_un_borrador_por_unidad_uidx ON public.visitas USING btree (unidad_id) WHERE (estado = 'BORRADOR'::public.visitas_estado_enum);



ALTER TABLE ONLY public.visita_piezas
    ADD CONSTRAINT "FK_0d0006849c44197b076a9ab60de" FOREIGN KEY (visita_id) REFERENCES public.visitas(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.visitas
    ADD CONSTRAINT "FK_4d2bc0a80f64e12647067e28e29" FOREIGN KEY (chofer_id) REFERENCES public.choferes(id) ON DELETE RESTRICT;



ALTER TABLE ONLY public.visitas
    ADD CONSTRAINT "FK_50b4045419caa98ffaebfd2c9fc" FOREIGN KEY (unidad_id) REFERENCES public.unidades(id) ON DELETE RESTRICT;



ALTER TABLE ONLY public.visita_trabajos
    ADD CONSTRAINT "FK_89ce3a607ba2648e27ddece67bc" FOREIGN KEY (visita_id) REFERENCES public.visitas(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.unidades
    ADD CONSTRAINT "FK_ae98d8ce084524e068e74461eb8" FOREIGN KEY (tipo_id) REFERENCES public.tipos_vehiculo(id);



ALTER TABLE ONLY public.visita_fotos
    ADD CONSTRAINT "FK_d966aa350894c028ffa337ac5d6" FOREIGN KEY (visita_id) REFERENCES public.visitas(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.visita_firmas
    ADD CONSTRAINT "FK_efcd0613d4646926dc13dd4b8f0" FOREIGN KEY (visita_id) REFERENCES public.visitas(id) ON DELETE CASCADE;
