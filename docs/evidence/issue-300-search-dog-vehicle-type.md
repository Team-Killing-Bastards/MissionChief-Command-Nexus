# Issue #300 Search Dog Unit vehicle-type evidence

## Capture record

| Item | Evidence |
|---|---|
| Capture date | 12 August 2026 |
| Game | MissionChief UK |
| Source | User-supplied native mission dispatch vehicle-row DOM |
| Route shape | `/missions/<redacted>/missing_vehicles?offset_page=1` |
| Extraction points | `tr.vehicle_select_table_tr`, `input.vehicle_checkbox[vehicle_type_id]` and the containing `td[vehicle_type_id]` |

The original mission, vehicle, building, coordinates and callsign identifiers
were removed. The attributes that establish native vehicle identity and
capability were retained:

```html
<tr class="vehicle_select_table_tr"
    vehicle_caption="<redacted>"
    vehicle_type="Search Dog Unit (SAR)"
    building="<redacted>">
  <input type="checkbox"
      class="vehicle_checkbox"
      vehicle_type_id="102"
      rescue_dogs="1">
  <td vehicle_type_id="102">
    <label class="mission_vehicle_label">
      <redacted>
      <small>[Search Dog Unit (SAR)]</small>
    </label>
    <span>linked building path: /buildings/&lt;redacted&gt;</span>
  </td>
</tr>
```

## Verified mapping

| Native `vehicle_type_id` | Native visible label | Capability signal |
|---:|---|---|
| `102` | Search Dog Unit (SAR) | `rescue_dogs="1"` |

The checkbox and its native type cell independently carry `102`, while the row
and label identify the vehicle as Search Dog Unit (SAR). No type-`101` identity
signal was present in the captured row. Command Nexus therefore treats `102`
as authoritative for Rescue Dog and Search Dog Unit requirements. Unit Naming's
existing `TYPE_ID_TO_VEHICLE_TYPE["102"] = "Search Dog Unit SAR"` mapping was
already correct; the Mission Finder selector, verification regression and
operating contract were the conflicting side.
