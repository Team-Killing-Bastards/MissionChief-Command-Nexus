"""Read-only Nexus Realism Map API backed by PostgreSQL/PostGIS."""

from datetime import datetime, timezone

from fastapi import HTTPException, Query
from sqlalchemy import create_engine, text


ALLOWED_TYPES = {
    "fire_station",
    "ambulance_station",
    "police_station",
    "hospital",
    "prison",
    "lifeboat_station",
    "coastguard_station",
    "mountain_rescue",
    "dispatch_centre",
}


def install_realism(app, upload_engine):
    # Keep Realism reads isolated from the collector ingestion pool.
    engine = create_engine(
        upload_engine.url,
        pool_size=2,
        max_overflow=0,
        pool_timeout=2,
        pool_pre_ping=True,
    )

    @app.get("/v1/realism/status")
    def realism_status():
        with engine.begin() as db:
            db.execute(text("SET TRANSACTION READ ONLY"))
            db.execute(text("SET LOCAL statement_timeout='5000ms'"))

            latest = db.execute(
                text(
                    """
                    SELECT
                        id,
                        region,
                        status,
                        source_file,
                        records_seen,
                        records_imported,
                        started_at,
                        finished_at,
                        error_message
                    FROM realism.import_runs
                    ORDER BY id DESC
                    LIMIT 1
                    """
                )
            ).mappings().first()

            totals = db.execute(
                text(
                    """
                    SELECT
                        s.nexus_type,
                        COUNT(*) AS count
                    FROM realism.location_services s
                    GROUP BY s.nexus_type
                    ORDER BY s.nexus_type
                    """
                )
            ).mappings().all()

            total_locations = db.execute(
                text("SELECT COUNT(*) FROM realism.locations")
            ).scalar_one()

        return {
            "status": "ok",
            "dataset": {
                "locations": total_locations,
                "services": {
                    row["nexus_type"]: row["count"]
                    for row in totals
                },
            },
            "latestImport": dict(latest) if latest else None,
            "generatedAt": datetime.now(timezone.utc),
        }

    @app.get("/v1/realism/locations")
    def realism_locations(
        north: float = Query(..., ge=-90, le=90),
        south: float = Query(..., ge=-90, le=90),
        east: float = Query(..., ge=-180, le=180),
        west: float = Query(..., ge=-180, le=180),
        types: str = Query(default="", max_length=512),
        limit: int = Query(default=2000, ge=1, le=5000),
    ):
        if north <= south:
            raise HTTPException(
                status_code=400,
                detail="north must be greater than south",
            )

        if east <= west:
            raise HTTPException(
                status_code=400,
                detail="east must be greater than west",
            )

        if (north - south) > 12 or (east - west) > 18:
            raise HTTPException(
                status_code=400,
                detail="Bounding box is too large",
            )

        requested_types = sorted(
            {
                item.strip()
                for item in types.split(",")
                if item.strip()
            }
        )

        unknown_types = [
            item
            for item in requested_types
            if item not in ALLOWED_TYPES
        ]

        if unknown_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown realism type: {unknown_types[0]}",
            )

        type_filter = ",".join(requested_types)

        params = {
            "north": north,
            "south": south,
            "east": east,
            "west": west,
            "types": type_filter,
            "limit": limit,
        }

        sql = text(
            """
            SELECT
                l.id,
                l.source,
                l.source_type,
                l.source_id,
                l.name,
                l.latitude,
                l.longitude,
                l.address,
                COALESCE(
                    jsonb_agg(DISTINCT s.nexus_type)
                    FILTER (WHERE s.nexus_type IS NOT NULL),
                    '[]'::jsonb
                ) AS services
            FROM realism.locations l
            LEFT JOIN realism.location_services s
              ON s.location_id = l.id
            WHERE
                l.geom && ST_MakeEnvelope(
                    :west,
                    :south,
                    :east,
                    :north,
                    4326
                )
                AND (
                    :types = ''
                    OR EXISTS (
                        SELECT 1
                        FROM realism.location_services fs
                        WHERE fs.location_id = l.id
                          AND fs.nexus_type = ANY(
                              string_to_array(:types, ',')
                          )
                    )
                )
            GROUP BY
                l.id,
                l.source,
                l.source_type,
                l.source_id,
                l.name,
                l.latitude,
                l.longitude,
                l.address
            ORDER BY l.id
            LIMIT :limit
            """
        )

        with engine.begin() as db:
            db.execute(text("SET TRANSACTION READ ONLY"))
            db.execute(text("SET LOCAL statement_timeout='5000ms'"))
            rows = [
                dict(row)
                for row in db.execute(sql, params).mappings()
            ]

        return {
            "count": len(rows),
            "bounds": {
                "north": north,
                "south": south,
                "east": east,
                "west": west,
            },
            "types": requested_types,
            "locations": rows,
        }
