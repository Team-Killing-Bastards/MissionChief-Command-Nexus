BEGIN;

CREATE TEMP TABLE source_locations AS
SELECT
    'node'::text AS source_type,
    node_id AS source_id,
    name,
    amenity,
    operator,
    building,
    emergency,
    seamark_type,
    rescue_category,
    tags,
    geom
FROM osm_stage.nexus_emergency_nodes

UNION ALL

SELECT
    'way'::text,
    way_id,
    name,
    amenity,
    operator,
    building,
    emergency,
    seamark_type,
    rescue_category,
    tags,
    geom
FROM osm_stage.nexus_emergency_ways

UNION ALL

SELECT
    'relation'::text,
    relation_id,
    name,
    amenity,
    operator,
    building,
    emergency,
    seamark_type,
    rescue_category,
    tags,
    geom
FROM osm_stage.nexus_emergency_relations;

CREATE TEMP TABLE classified_locations AS

SELECT *, 'fire_station'::text AS nexus_type
FROM source_locations
WHERE amenity = 'fire_station'

UNION ALL

SELECT *, 'police_station'
FROM source_locations
WHERE amenity = 'police'

UNION ALL

SELECT *, 'ambulance_station'
FROM source_locations
WHERE emergency = 'ambulance_station'

UNION ALL

SELECT *, 'hospital'
FROM source_locations
WHERE amenity = 'hospital'

UNION ALL

SELECT *, 'prison'
FROM source_locations
WHERE amenity = 'prison'

UNION ALL

SELECT *, 'mountain_rescue'
FROM source_locations
WHERE emergency = 'mountain_rescue'

UNION ALL

SELECT *, 'lifeboat_station'
FROM source_locations
WHERE rescue_category = 'lifeboat'
  AND (
       LOWER(COALESCE(operator, '')) LIKE '%royal national lifeboat%'
       OR LOWER(COALESCE(operator, '')) LIKE '%rnli%'
  )

UNION ALL

SELECT *, 'coastguard_station'
FROM source_locations
WHERE
       seamark_type = 'coast_guard'
    OR (
        emergency = 'water_rescue'
        AND (
             LOWER(COALESCE(operator, '')) LIKE '%coastguard%'
             OR LOWER(COALESCE(name, '')) LIKE '%coastguard%'
        )
    )

UNION ALL

SELECT *, 'dispatch_centre'
FROM source_locations
WHERE
    (
         LOWER(COALESCE(name, '')) LIKE '%control centre%'
      OR LOWER(COALESCE(name, '')) LIKE '%control center%'
      OR LOWER(COALESCE(name, '')) LIKE '%dispatch centre%'
      OR LOWER(COALESCE(name, '')) LIKE '%dispatch center%'
      OR LOWER(COALESCE(name, '')) LIKE '%operations centre%'
      OR LOWER(COALESCE(name, '')) LIKE '%operations center%'
    )
    AND
    (
         LOWER(COALESCE(operator, '')) LIKE '%ambulance%'
      OR LOWER(COALESCE(operator, '')) LIKE '%fire%'
      OR LOWER(COALESCE(operator, '')) LIKE '%police%'
      OR LOWER(COALESCE(operator, '')) LIKE '%coastguard%'
      OR LOWER(COALESCE(operator, '')) LIKE '%rescue%'
      OR amenity IN ('fire_station', 'police')
      OR emergency IN (
          'ambulance_station',
          'water_rescue',
          'mountain_rescue'
      )
    );

CREATE INDEX ON classified_locations (source_type, source_id);
CREATE INDEX ON classified_locations (nexus_type);

DELETE FROM realism.locations
WHERE source = 'osm';

INSERT INTO realism.locations (
    source,
    source_type,
    source_id,
    name,
    latitude,
    longitude,
    address,
    tags,
    geom,
    last_seen_at,
    updated_at
)
SELECT DISTINCT ON (source_type, source_id)
    'osm',
    source_type,
    source_id,
    name,
    ST_Y(geom),
    ST_X(geom),
    jsonb_strip_nulls(
        jsonb_build_object(
            'housename', tags->>'addr:housename',
            'housenumber', tags->>'addr:housenumber',
            'street', tags->>'addr:street',
            'city', tags->>'addr:city',
            'postcode', tags->>'addr:postcode'
        )
    ),
    COALESCE(tags, '{}'::jsonb),
    geom,
    NOW(),
    NOW()
FROM classified_locations
ORDER BY source_type, source_id;

INSERT INTO realism.location_services (
    location_id,
    nexus_type,
    classification_method,
    confidence
)
SELECT DISTINCT
    l.id,
    c.nexus_type,
    'osm_tags',
    100
FROM classified_locations c
JOIN realism.locations l
  ON l.source = 'osm'
 AND l.source_type = c.source_type
 AND l.source_id = c.source_id;

COMMIT;
