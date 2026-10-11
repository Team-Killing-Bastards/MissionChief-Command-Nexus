/* Station profile validation, role grouping and read-only fleet comparison. */
(() => {
  'use strict';

  const MULTI_ROLE_TYPES = new Set(['8']);
  const MAX_ROLE_GROUPS = 10;
  const MAX_ROLE_LENGTH = 60;

  const integer = (value, min, max) =>
    value !== null &&
    value !== undefined &&
    value !== '' &&
    typeof value !== 'boolean' &&
    Number.isInteger(Number(value)) &&
    Number(value) >= min &&
    Number(value) <= max;

  const cleanRole = value => String(value || '').trim();
  const availableAtStation = vehicle =>
    Number(vehicle?.fms_real) === 2 &&
    !vehicle?.mission_id &&
    !(vehicle?.target_type === 'mission' && vehicle?.target_id);

  function rolePriority(unit) {
    if (unit.training.length) return 0;
    if (unit.crew > 0) return 1;
    return 2;
  }

  function validate(raw, catalog) {
    if (!raw || typeof raw.name !== 'string' || !raw.name.trim() || raw.name.length > 100) {
      throw Error('Enter a profile name (up to 100 characters).');
    }

    const buildingType = String(raw.buildingType);
    if (!catalog.buildings[buildingType]) throw Error('Choose a supported building type.');
    if (!Array.isArray(raw.units) || !raw.units.length || raw.units.length > 200) {
      throw Error('Select at least one vehicle type.');
    }

    const typeRows = new Map();
    const units = raw.units.map((row, sourceIndex) => {
      const type = String(row.type);
      const vehicle = catalog.vehicles[type];
      if (!vehicle || !vehicle.buildings.includes(Number(buildingType))) {
        throw Error('Invalid vehicle type for this building profile.');
      }

      const existing = typeRows.get(type) || [];
      if (existing.length && !MULTI_ROLE_TYPES.has(type)) {
        throw Error(vehicle.name + ': duplicate vehicle type is not supported.');
      }
      if (existing.length >= MAX_ROLE_GROUPS) {
        throw Error(vehicle.name + ': maximum ' + MAX_ROLE_GROUPS + ' role groups.');
      }

      if (!integer(row.count, 1, 100)) throw Error(vehicle.name + ': enter 1–100 vehicles.');
      if (!integer(row.crew, 0, vehicle.max)) {
        throw Error(vehicle.name + ': crew must be between 0 and ' + vehicle.max + '.');
      }
      if (!Array.isArray(row.training) || row.training.some(training => !catalog.training.includes(training))) {
        throw Error('Unknown training requirement.');
      }

      const role = cleanRole(row.role);
      if (role.length > MAX_ROLE_LENGTH) {
        throw Error(vehicle.name + ': role name must be ' + MAX_ROLE_LENGTH + ' characters or fewer.');
      }

      const unit = {
        type,
        role,
        count: Number(row.count),
        crew: Number(row.crew),
        training: [...new Set(row.training)].sort(),
        sourceIndex
      };
      existing.push(unit);
      typeRows.set(type, existing);
      return unit;
    });

    for (const [type, rows] of typeRows) {
      const vehicle = catalog.vehicles[type];
      const total = rows.reduce((sum, row) => sum + row.count, 0);
      if (total > 100) throw Error(vehicle.name + ': combined role total cannot exceed 100 vehicles.');
      if (rows.length > 1) {
        const roles = new Set();
        for (const row of rows) {
          if (!row.role) throw Error(vehicle.name + ': give each role group a name.');
          const key = row.role.toLocaleLowerCase();
          if (roles.has(key)) throw Error(vehicle.name + ': role names must be unique.');
          roles.add(key);
        }
      }
    }

    return {
      id: typeof raw.id === 'string' ? raw.id : '',
      name: raw.name.trim(),
      buildingType,
      rename: raw.rename !== false,
      specialisation: String(raw.specialisation || '').trim().slice(0, 100),
      units: units.map(({ sourceIndex, ...unit }) => unit)
    };
  }

  function typeTotals(profile) {
    const totals = new Map();
    for (const unit of profile.units) totals.set(unit.type, (totals.get(unit.type) || 0) + unit.count);
    return totals;
  }

  function allocateValidated(profile, fleet) {
    const assignments = [];
    const extras = [];
    const shortages = [];
    const groupsByType = new Map();

    profile.units.forEach((unit, index) => {
      const list = groupsByType.get(unit.type) || [];
      list.push({ unit, index });
      groupsByType.set(unit.type, list);
    });

    for (const [type, groups] of groupsByType) {
      const vehicles = fleet
        .filter(vehicle => String(vehicle.vehicle_type) === type)
        .sort((a, b) => {
          const availability = Number(availableAtStation(b)) - Number(availableAtStation(a));
          return availability || Number(a.id) - Number(b.id);
        });

      if (groups.length === 1) {
        const group = groups[0];
        for (const vehicle of vehicles) {
          assignments.push({ vehicle, unit: group.unit, profileIndex: group.index });
        }
        if (vehicles.length < group.unit.count) {
          shortages.push({ unit: group.unit, count: group.unit.count - vehicles.length });
        }
        continue;
      }

      const orderedGroups = [...groups].sort((a, b) =>
        rolePriority(a.unit) - rolePriority(b.unit) || a.index - b.index
      );

      let cursor = 0;
      for (const group of orderedGroups) {
        let assigned = 0;
        while (assigned < group.unit.count && cursor < vehicles.length) {
          assignments.push({ vehicle: vehicles[cursor++], unit: group.unit, profileIndex: group.index });
          assigned += 1;
        }
        if (assigned < group.unit.count) {
          shortages.push({ unit: group.unit, count: group.unit.count - assigned });
        }
      }
      extras.push(...vehicles.slice(cursor));
    }

    return { assignments, extras, shortages };
  }

  function allocate(profile, fleet, catalog) {
    const validated = validate(profile, catalog);
    if (!Array.isArray(fleet)) throw Error('Station fleet could not be verified.');
    return allocateValidated(validated, fleet);
  }

  function compare(profile, station, fleet, catalog) {
    const validated = validate(profile, catalog);
    if (String(station.building_type) !== validated.buildingType) {
      throw Error('This profile is for a different building type.');
    }
    if (!Array.isArray(fleet) || fleet.some(vehicle => String(vehicle.building_id) !== String(station.id))) {
      throw Error('Station fleet could not be verified.');
    }

    const totals = typeTotals(validated);
    const keep = [];
    const remove = [];
    const blocked = [];
    const buy = [];
    const ids = new Set();

    for (const vehicle of [...fleet].sort((a, b) => Number(a.id) - Number(b.id))) {
      if (!/^\d+$/.test(String(vehicle.id)) || !integer(vehicle.vehicle_type, 0, 10000)) {
        throw Error('Vehicle identity is missing.');
      }
      if (ids.has(String(vehicle.id))) throw Error('Duplicate vehicle identity');
      ids.add(String(vehicle.id));

      if (totals.has(String(vehicle.vehicle_type))) keep.push(vehicle);
      else if (availableAtStation(vehicle)) remove.push(vehicle);
      else blocked.push({ vehicle, reason: 'Not safely available at station; leave in place.' });
    }

    for (const [type, count] of totals) {
      const have = keep.filter(vehicle => String(vehicle.vehicle_type) === type).length;
      if (have < count) buy.push({ type, count: count - have, target: count });
    }

    return {
      profile: validated,
      stationId: String(station.id),
      keep,
      remove,
      blocked,
      buy,
      allocation: allocateValidated(validated, keep),
      signature: JSON.stringify(
        fleet
          .map(vehicle => [
            String(vehicle.id),
            Number(vehicle.vehicle_type),
            Number(vehicle.fms_real),
            vehicle.mission_id ?? null,
            vehicle.target_type ?? null,
            vehicle.target_id ?? null
          ])
          .sort((a, b) => a[0].localeCompare(b[0]))
      )
    };
  }

  globalThis.NexusStationProfilesCore = {
    validate,
    compare,
    allocate,
    typeTotals,
    multiRoleTypes: Object.freeze([...MULTI_ROLE_TYPES])
  };
})();
