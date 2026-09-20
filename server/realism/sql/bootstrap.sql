CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS hstore;

CREATE SCHEMA IF NOT EXISTS realism AUTHORIZATION nexus;
CREATE SCHEMA IF NOT EXISTS osm_stage AUTHORIZATION nexus;

CREATE TABLE IF NOT EXISTS realism.locations (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'osm',
    source_type TEXT NOT NULL,
    source_id BIGINT NOT NULL,
    name TEXT,
    latitude DOUBLE PRECISION NOT NULL
        CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL
        CHECK (longitude BETWEEN -180 AND 180),
    address JSONB NOT NULL DEFAULT '{}'::jsonb,
    tags JSONB NOT NULL DEFAULT '{}'::jsonb,
    geom geometry(Point, 4326) NOT NULL,
    source_updated_at TIMESTAMPTZ,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source, source_type, source_id)
);

CREATE TABLE IF NOT EXISTS realism.location_services (
    location_id BIGINT NOT NULL
        REFERENCES realism.locations(id)
        ON DELETE CASCADE,
    nexus_type TEXT NOT NULL,
    classification_method TEXT NOT NULL DEFAULT 'osm_tags',
    confidence SMALLINT NOT NULL DEFAULT 100
        CHECK (confidence BETWEEN 0 AND 100),
    PRIMARY KEY (location_id, nexus_type)
);

CREATE TABLE IF NOT EXISTS realism.import_runs (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'osm',
    region TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running',
    source_file TEXT,
    records_seen BIGINT NOT NULL DEFAULT 0,
    records_imported BIGINT NOT NULL DEFAULT 0,
    records_updated BIGINT NOT NULL DEFAULT 0,
    records_removed BIGINT NOT NULL DEFAULT 0,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS locations_geom_gix
ON realism.locations USING GIST (geom);

CREATE INDEX IF NOT EXISTS locations_name_idx
ON realism.locations (name);

CREATE INDEX IF NOT EXISTS location_services_type_idx
ON realism.location_services (nexus_type);
