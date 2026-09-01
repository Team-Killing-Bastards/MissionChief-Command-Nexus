from pathlib import Path
import json
import subprocess

state_path = Path('project-state.json')
state = json.loads(state_path.read_text(encoding='utf-8'))

state['lastUpdated'] = '2026-09-01'
state['canonical']['status'] = 'published'
state['canonical']['version'] = '3.0.41'
state['canonical']['sourceBytes'] = 2095431
state['canonical']['sourceSha256'] = '4212d3c05d862eb70f4eb3888793e8deda03780ae53dfac8e90d4fe74a0375dd'
state['canonical']['components']['missionFinder'] = '10.6.178'

state['production'].update({
    'version': '3.0.41',
    'tag': 'v3.0.41',
    'releaseCommit': 'c288eeedb91adb3b0fe7e471fa72f0ec50806512',
    'releaseUrl': 'https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/releases/tag/v3.0.41',
    'publishedAt': '2026-09-01T19:04:22Z',
    'releaseStatus': 'published',
    'liveValidationStatus': 'pending',
    'liveValidationNote': 'Repository, release-asset, deployment and Discord verification passed. Live Hot Brakes - Code D validation must confirm the standalone Airfield command-vehicle row selects an eligible Airfield FF Command Vehicle; any Police Inspector shortage remains a separate fail-closed personnel result.',
})
state['production']['asset'] = {
    'name': 'MissionChief-Command-Nexus-3.0.41.user.js',
    'bytes': 2095431,
    'sha256': '4212d3c05d862eb70f4eb3888793e8deda03780ae53dfac8e90d4fe74a0375dd',
}

state_path.write_text(json.dumps(state, indent=2) + '\n', encoding='utf-8')
subprocess.run(['node', 'scripts/render-project-state.mjs'], check=True)

Path('.github/workflows/_temporary-reconcile-v3041-project-state.yml').unlink()
Path('scripts/_temporary-reconcile-v3041-project-state.py').unlink()
