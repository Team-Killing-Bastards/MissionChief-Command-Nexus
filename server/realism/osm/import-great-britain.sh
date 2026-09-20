#!/usr/bin/env bash
set -euo pipefail

BASE="/opt/missionchief-nexus"
DATA="$BASE/osm/data/great-britain-latest.osm.pbf"
CONFIG="$BASE/osm/config/nexus-emergency.lua"
PROMOTE="$BASE/osm/config/promote-realism.sql"
COMPOSE="$BASE/docker-compose.yml"
NETWORK="missionchief-nexus_internal"
RUN_ID=""

on_error() {
    code=$?

    if [ -n "${RUN_ID:-}" ]; then
        sudo docker compose -f "$COMPOSE" exec -T postgres \
          psql -U nexus -d nexus -c \
          "UPDATE realism.import_runs
           SET status = 'failed',
               finished_at = NOW(),
               error_message = 'Importer exited with status ${code}'
           WHERE id = ${RUN_ID};" || true
    fi

    exit "$code"
}

trap on_error ERR

echo "=== Nexus Realism: Great Britain import starting ==="

if [ ! -f "$DATA" ]; then
    echo "ERROR: Missing $DATA"
    exit 1
fi

RUN_ID="$(
    sudo docker compose -f "$COMPOSE" exec -T postgres \
      psql -U nexus -d nexus -qAtc \
      "INSERT INTO realism.import_runs (
           source,
           region,
           status,
           source_file
       )
       VALUES (
           'osm',
           'great-britain',
           'running',
           'great-britain-latest.osm.pbf'
       )
       RETURNING id;"
)"

echo "Import run ID: $RUN_ID"

echo "Resetting OSM staging schema..."
sudo docker compose -f "$COMPOSE" exec -T postgres \
  psql -U nexus -d nexus -c \
  "DROP SCHEMA IF EXISTS osm_stage CASCADE;
   CREATE SCHEMA osm_stage AUTHORIZATION nexus;"

echo "Importing filtered emergency-service OSM data..."
sudo docker run --rm \
  --network "$NETWORK" \
  --env-file "$BASE/.env" \
  -v "$BASE/osm/data:/data:ro" \
  -v "$BASE/osm/config:/config:ro" \
  --entrypoint sh \
  iboates/osm2pgsql:2.3.1 \
  -lc '
    export PGPASSWORD="$POSTGRES_PASSWORD"
    exec osm2pgsql \
      --create \
      --drop \
      --output flex \
      --style /config/nexus-emergency.lua \
      --schema osm_stage \
      --database nexus \
      --host postgres \
      --username nexus \
      /data/great-britain-latest.osm.pbf
  '

STAGED="$(
    sudo docker compose -f "$COMPOSE" exec -T postgres \
      psql -U nexus -d nexus -Atc \
      "SELECT
          (SELECT COUNT(*) FROM osm_stage.nexus_emergency_nodes) +
          (SELECT COUNT(*) FROM osm_stage.nexus_emergency_ways) +
          (SELECT COUNT(*) FROM osm_stage.nexus_emergency_relations);"
)"

echo "Filtered staging records: $STAGED"

echo "Promoting classified locations..."
sudo docker compose -f "$COMPOSE" exec -T postgres \
  psql -U nexus -d nexus < "$PROMOTE"

IMPORTED="$(
    sudo docker compose -f "$COMPOSE" exec -T postgres \
      psql -U nexus -d nexus -Atc \
      "SELECT COUNT(*) FROM realism.locations WHERE source = 'osm';"
)"

sudo docker compose -f "$COMPOSE" exec -T postgres \
  psql -U nexus -d nexus -c \
  "UPDATE realism.import_runs
   SET status = 'success',
       finished_at = NOW(),
       records_seen = ${STAGED},
       records_imported = ${IMPORTED},
       error_message = NULL
   WHERE id = ${RUN_ID};"

trap - ERR

echo "Import summary:"
sudo docker compose -f "$COMPOSE" exec -T postgres \
  psql -U nexus -d nexus -c \
  "SELECT nexus_type, COUNT(*)
   FROM realism.location_services
   GROUP BY nexus_type
   ORDER BY nexus_type;"

echo "=== Nexus Realism: Great Britain import complete ==="
