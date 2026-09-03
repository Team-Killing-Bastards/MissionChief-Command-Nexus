from pathlib import Path
import json
import subprocess

state_path = Path('project-state.json')
state = json.loads(state_path.read_text(encoding='utf-8'))
state['lastUpdated'] = '2026-09-03'
state['canonical']['status'] = 'published'
state['canonical']['version'] = '3.0.43'
state['canonical']['sourceBytes'] = 2080437
state['canonical']['sourceSha256'] = '00473770dcad063edd9596fd855bb6bc2bb1dc72ca41ddae4460e459943e261b'
state['canonical']['components']['missionFinder'] = '10.6.180'
state['production'].update({
    'version': '3.0.43',
    'tag': 'v3.0.43',
    'releaseCommit': 'b8e5e46fe4b4acd7c028ee615416a048a853aac6',
    'releaseUrl': 'https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/releases/tag/v3.0.43',
    'publishedAt': '2026-09-03T19:35:44Z',
    'releaseStatus': 'published',
    'liveValidationStatus': 'pending',
    'liveValidationNote': 'Repository, release-asset, deployment and Discord verification passed. Live validation now requires a normal Auto Mode run with resource or trained-personnel shortages, followed by an export proving stationIssueSummary, vehicleIssueSummary and per-mission candidate evidence identify the responsible stations/vehicles/rejection reasons before any selection rules are changed.'
})
state['production']['asset'] = {
    'name': 'MissionChief-Command-Nexus-3.0.43.user.js',
    'bytes': 2080437,
    'sha256': '00473770dcad063edd9596fd855bb6bc2bb1dc72ca41ddae4460e459943e261b'
}
state_path.write_text(json.dumps(state, indent=2) + '\n', encoding='utf-8')
subprocess.run(['node', 'scripts/render-project-state.mjs'], check=True)
Path('.github/workflows/_temporary-reconcile-v3043-project-state.yml').unlink()
Path('scripts/_temporary-reconcile-v3043-project-state.py').unlink()
