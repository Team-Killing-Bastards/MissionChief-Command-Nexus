local schema = 'osm_stage'

local function columns()
    return {
        { column = 'name',            type = 'text' },
        { column = 'amenity',         type = 'text' },
        { column = 'operator',        type = 'text' },
        { column = 'building',        type = 'text' },
        { column = 'emergency',       type = 'text' },
        { column = 'seamark_type',    type = 'text' },
        { column = 'rescue_category', type = 'text' },
        { column = 'tags',            type = 'jsonb' },
        { column = 'geom',            type = 'point', projection = 4326, not_null = true },
    }
end

local nodes = osm2pgsql.define_node_table(
    'nexus_emergency_nodes',
    columns(),
    { schema = schema }
)

local ways = osm2pgsql.define_way_table(
    'nexus_emergency_ways',
    columns(),
    { schema = schema }
)

local relations = osm2pgsql.define_relation_table(
    'nexus_emergency_relations',
    columns(),
    { schema = schema }
)

local function is_relevant(tags)
    local amenity = tags.amenity
    local emergency = tags.emergency
    local seamark_type = tags['seamark:type']
    local rescue_category = tags['seamark:rescue_station:category']
    local operator = string.lower(tags.operator or '')
    local name = string.lower(tags.name or '')

    local dispatch_name =
        string.find(name, 'control centre', 1, true)
        or string.find(name, 'control center', 1, true)
        or string.find(name, 'dispatch centre', 1, true)
        or string.find(name, 'dispatch center', 1, true)
        or string.find(name, 'operations centre', 1, true)
        or string.find(name, 'operations center', 1, true)

    local emergency_operator =
        string.find(operator, 'ambulance', 1, true)
        or string.find(operator, 'fire', 1, true)
        or string.find(operator, 'police', 1, true)
        or string.find(operator, 'coastguard', 1, true)
        or string.find(operator, 'rescue', 1, true)

    if amenity == 'fire_station'
        or amenity == 'police'
        or amenity == 'hospital'
        or amenity == 'prison'
    then
        return true
    end

    if emergency == 'ambulance_station'
        or emergency == 'mountain_rescue'
        or emergency == 'water_rescue'
    then
        return true
    end

    if seamark_type == 'coast_guard'
        or seamark_type == 'rescue_station'
    then
        return true
    end

    if rescue_category == 'lifeboat'
        or rescue_category == 'lifeboat_on_mooring'
    then
        return true
    end

    if string.find(operator, 'royal national lifeboat', 1, true)
        or string.find(operator, 'rnli', 1, true)
        or string.find(operator, 'coastguard', 1, true)
    then
        return true
    end

    if dispatch_name and emergency_operator then
        return true
    end

    return false
end

local function row(object, geom)
    return {
        name = object.tags.name,
        amenity = object.tags.amenity,
        operator = object.tags.operator,
        building = object.tags.building,
        emergency = object.tags.emergency,
        seamark_type = object.tags['seamark:type'],
        rescue_category = object.tags['seamark:rescue_station:category'],
        tags = object.tags,
        geom = geom,
    }
end

function osm2pgsql.process_node(object)
    if not is_relevant(object.tags) then
        return
    end

    nodes:insert(row(object, object:as_point()))
end

function osm2pgsql.process_way(object)
    if not is_relevant(object.tags) then
        return
    end

    local geom

    if object.is_closed then
        geom = object:as_polygon():centroid()
    else
        geom = object:as_linestring():centroid()
    end

    ways:insert(row(object, geom))
end

function osm2pgsql.process_relation(object)
    if not is_relevant(object.tags) then
        return
    end

    local geom

    if object.tags.type == 'multipolygon' then
        geom = object:as_multipolygon():centroid()
    else
        geom = object:as_geometrycollection():centroid()
    end

    relations:insert(row(object, geom))
end
