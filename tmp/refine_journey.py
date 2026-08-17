from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


source_path = Path("src/missionchief-command-nexus.user.js")
source = source_path.read_text(encoding="utf-8")

for name in [
    "sortVehicleCheckboxesByBestArrival",
    "readMissionLoggerUnitJourneyMetrics",
    "writeMissionLoggerObservedRegistry",
]:
    source = replace_once(
        source,
        f"        function {name}(",
        f"    function {name}(",
        f"{name} indentation",
    )

source = replace_once(
    source,
    """        const parseDistance = value => {
            const direct = parseNumber(value);
            if (direct !== null) return direct;
""",
    """        const parseDistance = (
            value,
            allowBareNumber = true
        ) => {
            const direct = allowBareNumber
                ? parseNumber(value)
                : null;
            if (direct !== null) return direct;
""",
    "distance text strictness",
)
source = replace_once(
    source,
    """        const parseEta = value => {
            const direct = parseNumber(value);
            if (direct !== null) return direct;
""",
    """        const parseEta = (
            value,
            allowBareNumber = true
        ) => {
            const direct = allowBareNumber
                ? parseNumber(value)
                : null;
            if (direct !== null) return direct;
""",
    "ETA text strictness",
)
source = replace_once(
    source,
    """        const readText = parser => {
            for (const node of textNodes) {
                for (const value of [
                    node?.getAttribute?.('aria-label'),
                    node?.getAttribute?.('title'),
                    node?.getAttribute?.('data-content'),
                    node?.textContent
                ]) {
                    const parsed = parser(value);
                    if (parsed !== null) return parsed;
                }
            }
            return null;
        };

        if (distanceKm === null) {
            distanceKm = readText(parseDistance);
        }
        if (etaSeconds === null) {
            etaSeconds = readText(parseEta);
        }
""",
    """        const readText = (
            parser,
            semanticSelector
        ) => {
            for (const node of textNodes) {
                const allowBareNumber =
                    !!semanticSelector &&
                    node?.matches?.(semanticSelector) === true;
                for (const value of [
                    node?.getAttribute?.('aria-label'),
                    node?.getAttribute?.('title'),
                    node?.getAttribute?.('data-content'),
                    node?.textContent
                ]) {
                    const parsed = parser(
                        value,
                        allowBareNumber
                    );
                    if (parsed !== null) return parsed;
                }
            }
            return null;
        };

        if (distanceKm === null) {
            distanceKm = readText(
                parseDistance,
                '.vehicle_distance, .vehicle-distance, [class*="distance"]'
            );
        }
        if (etaSeconds === null) {
            etaSeconds = readText(
                parseEta,
                '.vehicle_arrival_time, .vehicle-arrival-time, .vehicle_eta, .vehicle-eta, [class*="arrival"], [class*="eta"]'
            );
        }
""",
    "semantic text evidence reader",
)
source_path.write_text(source, encoding="utf-8")

test_path = Path("scripts/check-mission-journey-metrics.mjs")
test = test_path.read_text(encoding="utf-8")
anchor = (
    "expect(visible.estimatedDistanceKm === 3.4, 'Explicit kilometre text must remain valid native journey evidence');\n"
    "expect(visible.estimatedEtaSeconds === 420, 'Explicit ETA minute text must convert to seconds');\n\n"
)
addition = anchor + (
    "const unrelatedNumber = node({}, [], '34');\n"
    "const unrelatedRow = node({ __row: true }, [unrelatedNumber]);\n"
    "const unrelatedCheckbox = node({ __closest: unrelatedRow });\n"
    "const unrelated = readMetrics(unrelatedCheckbox);\n"
    "expect(unrelated.estimatedDistanceKm === null, 'An unlabelled numeric vehicle cell must not become distance evidence');\n"
    "expect(unrelated.estimatedEtaSeconds === null, 'An unlabelled numeric vehicle cell must not become ETA evidence');\n\n"
)
test = replace_once(
    test,
    anchor,
    addition,
    "unlabelled numeric journey regression",
)
test_path.write_text(test, encoding="utf-8")
