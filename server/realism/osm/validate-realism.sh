#!/usr/bin/env bash
set -euo pipefail

BASE="/opt/missionchief-nexus"
COMPOSE="$BASE/docker-compose.yml"

echo "=== Nexus Realism validation ==="

echo "[1/7] Collector health..."
HEALTH="$(curl -fsS http://127.0.0.1:8000/health)"
echo "$HEALTH" | grep -q '"status":"ok"'
echo "OK"

echo "[2/7] Public Realism API..."
STATUS="$(curl -fsS https://nexus.blyth.scot/v1/realism/status)"
echo "$STATUS" | grep -q '"status":"ok"'
echo "$STATUS" | grep -q '"region":"great-britain"'
echo "$STATUS" | grep -q '"status":"success"'
echo "OK"

echo "[3/7] Latest import state..."
sudo docker compose -f "$COMPOSE" exec -T postgres \
  psql -U nexus -d nexus -v ON_ERROR_STOP=1 -c "
DO \$\$
DECLARE
    latest_status text;
    latest_region text;
BEGIN
    SELECT status, region
      INTO latest_status, latest_region
    FROM realism.import_runs
    ORDER BY id DESC
    LIMIT 1;

    IF latest_status IS DISTINCT FROM 'success' THEN
        RAISE EXCEPTION 'Latest import is not successful: %', latest_status;
    END IF;

    IF latest_region IS DISTINCT FROM 'great-britain' THEN
        RAISE EXCEPTION 'Latest import is not Great Britain: %', latest_region;
    END IF;
END
\$\$;"
echo "OK"

echo "[4/7] Location/service integrity..."
sudo docker compose -f "$COMPOSE" exec -T postgres \
  psql -U nexus -d nexus -v ON_ERROR_STOP=1 -c "
DO \$\$
DECLARE
    locations bigint;
    orphans bigint;
    bad_geom bigint;
BEGIN
    SELECT COUNT(*) INTO locations
    FROM realism.locations;

    SELECT COUNT(*) INTO orphans
    FROM realism.locations l
    LEFT JOIN realism.location_services s
      ON s.location_id = l.id
    WHERE s.location_id IS NULL;

    SELECT COUNT(*) INTO bad_geom
    FROM realism.locations
    WHERE geom IS NULL
       OR ST_SRID(geom) <> 4326;

    IF locations < 5000 THEN
        RAISE EXCEPTION 'Location count unexpectedly low: %', locations;
    END IF;

    IF orphans <> 0 THEN
        RAISE EXCEPTION 'Orphaned realism locations: %', orphans;
    END IF;

    IF bad_geom <> 0 THEN
        RAISE EXCEPTION 'Invalid geometry rows: %', bad_geom;
    END IF;
END
\$\$;"
echo "OK"

echo "[5/7] Service classification sanity..."
sudo docker compose -f "$COMPOSE" exec -T postgres \
  psql -U nexus -d nexus -v ON_ERROR_STOP=1 -c "
DO \$\$
DECLARE
    unknown_count bigint;
BEGIN
    SELECT COUNT(*)
      INTO unknown_count
    FROM realism.location_services
    WHERE nexus_type NOT IN (
        'fire_station',
        'ambulance_station',
        'police_station',
        'hospital',
        'prison',
        'lifeboat_station',
        'coastguard_station',
        'mountain_rescue',
        'dispatch_centre'
    );

    IF unknown_count <> 0 THEN
        RAISE EXCEPTION 'Unknown service classifications: %', unknown_count;
    END IF;
END
\$\$;"
echo "OK"

echo "[6/7] GB dataset minimum coverage..."
sudo docker compose -f "$COMPOSE" exec -T postgres \
  psql -U nexus -d nexus -v ON_ERROR_STOP=1 -c "
DO \$\$
DECLARE
    c bigint;
BEGIN
    SELECT COUNT(*) INTO c FROM realism.location_services WHERE nexus_type='fire_station';
    IF c < 1500 THEN RAISE EXCEPTION 'Fire count unexpectedly low: %', c; END IF;

    SELECT COUNT(*) INTO c FROM realism.location_services WHERE nexus_type='police_station';
    IF c < 1200 THEN RAISE EXCEPTION 'Police count unexpectedly low: %', c; END IF;

    SELECT COUNT(*) INTO c FROM realism.location_services WHERE nexus_type='ambulance_station';
    IF c < 400 THEN RAISE EXCEPTION 'Ambulance count unexpectedly low: %', c; END IF;

    SELECT COUNT(*) INTO c FROM realism.location_services WHERE nexus_type='hospital';
    IF c < 1200 THEN RAISE EXCEPTION 'Hospital count unexpectedly low: %', c; END IF;

    SELECT COUNT(*) INTO c FROM realism.location_services WHERE nexus_type='prison';
    IF c < 100 THEN RAISE EXCEPTION 'Prison count unexpectedly low: %', c; END IF;

    SELECT COUNT(*) INTO c FROM realism.location_services WHERE nexus_type='lifeboat_station';
    IF c < 100 THEN RAISE EXCEPTION 'Lifeboat count unexpectedly low: %', c; END IF;

    SELECT COUNT(*) INTO c FROM realism.location_services WHERE nexus_type='coastguard_station';
    IF c < 5 THEN RAISE EXCEPTION 'Coastguard count unexpectedly low: %', c; END IF;

    SELECT COUNT(*) INTO c FROM realism.location_services WHERE nexus_type='mountain_rescue';
    IF c < 10 THEN RAISE EXCEPTION 'Mountain Rescue count unexpectedly low: %', c; END IF;

    SELECT COUNT(*) INTO c FROM realism.location_services WHERE nexus_type='dispatch_centre';
    IF c < 1 THEN RAISE EXCEPTION 'Dispatch Centre count unexpectedly low: %', c; END IF;
END
\$\$;"
echo "OK"

echo "[7/7] Viewport query..."
VIEW="$(curl -fsS \
  "http://127.0.0.1:8000/v1/realism/locations?north=56.10&south=56.00&east=-3.30&west=-3.50&types=fire_station,ambulance_station&limit=20")"

echo "$VIEW" | grep -q '"Dunfermline Fire Station"'
echo "OK"

echo
echo "=== Nexus Realism validation PASSED ==="
