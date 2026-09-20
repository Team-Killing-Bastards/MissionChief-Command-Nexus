# Nexus Realism rollback

## Known-good production backups from Phase 1

The live VPS retained these local rollback points when Phase 1 was deployed:

- Database dump: /home/ubuntu/missionchief-nexus-backups/nexus-before-postgis-20260920-173503.dump
- Compose backup: /opt/missionchief-nexus/docker-compose.yml.before-postgis-20260920-174159
- Collector main backup: /opt/missionchief-nexus/api/app/main.py.before-realism-20260920
- Working Scotland importer: /opt/missionchief-nexus/osm/import-scotland.sh.working-20260920

These paths are production evidence, not repository artifacts. Database dumps and secrets must never be committed.

## Roll back the Realism API only

Restore the pre-Realism collector main.py, rebuild only the collector, and verify /health.

The realism schema can remain present because the original collector does not depend on it.

## Roll back the PostgreSQL image

Restore the pre-PostGIS Compose configuration only if the Realism/PostGIS schema is no longer required.

The current database contains PostGIS objects. Do not move back to the standard postgres image while those objects remain required.

## Full database recovery

Stop collector writes first. Preserve the current database before any destructive recovery. Restore the verified custom-format PostgreSQL 16.15 dump into a clean compatible database.

After recovery, start the stack and verify:

    sudo docker compose ps
    curl -s http://127.0.0.1:8000/health

## Realism validation

On the Phase 1 live VPS run:

    /opt/missionchief-nexus/osm/validate-realism.sh

The final expected line is:

    === Nexus Realism validation PASSED ===
