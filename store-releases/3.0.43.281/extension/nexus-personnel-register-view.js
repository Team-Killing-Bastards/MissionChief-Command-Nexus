/* The Personnel Register screen lives in the Nexus Tools shadow root. */
(() => {
    'use strict';

    function mount(section, actions) {
        section.innerHTML = `
            <style>
                #registerView .register-card {padding:12px 14px;margin:9px 0;background:#11243a;border:1px solid #304b64;border-radius:8px}
                #registerView .register-line {display:flex;flex-wrap:wrap;align-items:center;gap:8px}
                #registerView .register-line strong {margin-right:auto}
                #registerView select {max-width:100%;flex:1;min-width:min(190px,100%)}
                #registerView .register-primary {background:#19627f;border-color:#488faa}
                #registerView progress {width:100%;height:9px;accent-color:#49c9b6;margin:6px 0}
                #registerView .register-grid {display:grid;grid-template-columns:repeat(auto-fit,minmax(min(170px,100%),1fr));gap:8px;margin-top:5px}
                #registerView small {display:block} #registerView output {display:block;overflow-wrap:anywhere}
                #registerView [data-r=activity] {max-height:120px;overflow:auto;margin:6px 0;color:#b8cfe0}
                #registerView [data-r=activity] div {margin:3px 0} #registerView .register-error {color:#ffc49a}
                #registerView pre {white-space:pre-wrap;font:inherit;font-size:12px}
                #registerView summary {cursor:pointer}
                #registerView .register-training {padding:9px 0;margin:6px 0;border-top:1px solid #304b64}
                #registerView .register-training h3 {font-size:14px;margin:0 0 4px}
                #registerView .register-training dl {display:flex;flex-wrap:wrap;gap:5px;max-height:9rem;overflow:auto;margin:6px 0}
                #registerView .register-training dl:empty {display:none}
                #registerView .register-training dl div {display:flex;align-items:baseline;gap:8px;padding:3px 8px;background:#19334b;border-radius:4px}
                #registerView .register-training dd {margin:0;color:#90ead9;font-weight:bold;font-variant-numeric:tabular-nums}
                @media(max-width:550px) {
                    #registerView .register-card {padding:9px;margin:6px 0}
                    #registerView .register-grid {grid-template-columns:1.3fr 1fr 1fr}
                    #registerView .register-grid output {font-size:13px}
                }
            </style>
            <div class="register-card">
                <div class="register-line"><strong data-r="saved">Reading saved register…</strong><small data-r="updated"></small></div>
                <div class="register-line" style="margin:12px 0"><label for="nexus-register-centre">Dispatch centre</label>
                    <select id="nexus-register-centre" data-r="centre"></select><button type="button" data-r="reload">Reload centres</button></div>
                <div class="register-line"><button type="button" class="register-primary" data-r="quick">Build register</button>
                    <button type="button" data-r="full">Full verify</button></div>
                <small>Quick refresh checks changes. Full verify reads the crew assigned to every vehicle in the selected area.</small>
                <section class="register-training" aria-labelledby="register-training-heading">
                    <h3 id="register-training-heading">Registered crew by qualification</h3>
                    <dl data-r="courses"></dl><small data-r="courseNote"></small>
                </section>
            </div>
            <div class="register-card">
                <div class="register-line"><strong data-r="status" role="status">Opening register…</strong>
                    <button type="button" data-r="pause" hidden>Pause</button><button type="button" data-r="stop" hidden>Stop</button></div>
                <progress data-r="bar" aria-label="Station progress" value="0" max="1"></progress>
                <div class="register-grid"><div><small>Station</small><output data-r="current">—</output></div>
                    <div><small>Stations</small><output data-r="progress">—</output></div>
                    <div><small>Vehicles checked</small><output data-r="vehicles">0</output></div></div>
                <small data-r="vehicle"></small><small data-r="pace"></small><p data-r="result"></p>
                <details><summary>Run details</summary><div data-r="activity"></div><pre data-r="report"></pre></details>
            </div>
            <div class="register-card">
                <h3>Cloud personnel register</h3>
                <p>Replace the entire online personnel register with this PC’s saved copy. Settings and saved profiles stay unchanged.</p>
                <div class="register-line"><button type="button" data-r="cloudReview">Replace cloud register…</button></div>
                <p data-r="cloudStatus" role="status">Sign in with Discord in Overview to use cloud sync. A replacement requires Nexus .265 or newer on your other PCs and the VPS update.</p>
                <div data-r="cloudConfirmation" hidden>
                    <p data-r="cloudSummary"></p>
                    <p>Cloud-only vehicle records will be removed. Original crew verification dates are kept. Your other PCs receive this register when Nexus is idle and sync runs.</p>
                    <div class="register-line"><button type="button" data-r="cloudConfirm">Replace cloud copy</button><button type="button" data-r="cloudCancel">Cancel</button></div>
                </div>
            </div>
            <div class="register-line"><strong>Register backup</strong><button type="button" data-r="export">Export register</button>
                <button type="button" data-r="import">Import register</button><input type="file" data-r="file" accept="application/json,.json" hidden></div>`;
        const fields = Object.fromEntries([...section.querySelectorAll('[data-r]')].map(node => [node.dataset.r, node]));
        let operation = '', running = false, stopping = false, inventoryReady = false, storeReady = false, cloudBusy = false, cloudToken = '';

        function controls() {
            const busy = Boolean(operation) || cloudBusy;
            fields.quick.disabled = fields.full.disabled = busy || !inventoryReady || !fields.centre.value;
            fields.centre.disabled = busy || !inventoryReady;
            fields.reload.disabled = busy;
            fields.import.disabled = fields.export.disabled = busy || !storeReady;
            fields.pause.hidden = fields.stop.hidden = !running;
            fields.stop.disabled = fields.pause.disabled = stopping;
            fields.cloudReview.disabled = busy || !storeReady;
            fields.cloudConfirm.disabled = busy || !cloudToken;
            fields.cloudCancel.disabled = busy;
        }
        function set(field, value) {
            if (!fields[field]) return;
            fields[field].textContent = value;
            if (field === 'progress') {
                const pair = String(value).match(/^(\d+)\s*\/\s*(\d+)$/);
                fields.bar.max = Number(pair?.[2]) || 1;
                fields.bar.value = Number(pair?.[1]) || 0;
            }
        }
        function log(message, type) {
            const line = document.createElement('div');
            line.textContent = message;
            if (type === 'error') line.className = 'register-error';
            fields.activity.append(line);
            if (fields.activity.childElementCount > 80) fields.activity.firstChild.remove();
        }
        function showStats(stats) {
            fields.saved.textContent = stats.count.toLocaleString('en-GB') + (stats.count === 1 ? ' vehicle' : ' vehicles') + ' in register';
            fields.updated.textContent = 'Last updated ' + stats.updated;
            fields.quick.textContent = stats.count ? 'Quick refresh' : 'Build register';
        }
        function showTraining() {
            if (section.hidden) return;
            fields.courses.replaceChildren();
            const scope = fields.centre.value;
            if (!inventoryReady || !scope) {
                fields.courseNote.textContent = 'Choose a loaded dispatch area to see its saved crew.';
                return;
            }
            let summary;
            try {
                summary = actions.training(scope);
            } catch (error) {
                fields.courseNote.textContent = 'Could not display saved qualifications. '+(error?.message || String(error));
                return;
            }
            const {courses, incomplete} = summary;
            const fragment = document.createDocumentFragment();
            for (const [name, count] of courses) {
                const row = document.createElement('div');
                const label = document.createElement('dt');
                const value = document.createElement('dd');
                label.textContent = name;
                value.textContent = count.toLocaleString('en-GB');
                row.append(label, value);
                fragment.append(row);
            }
            fields.courses.append(fragment);
            const area = fields.centre.selectedOptions[0].textContent;
            const note = courses.length
                ? 'Each assigned crew member counts once per qualification.'
                : 'No verified crew qualifications recorded.';
            const pending = incomplete ? ' '+incomplete+' vehicle '+(incomplete === 1 ? 'record needs' : 'records need')+' verification.' : '';
            fields.courseNote.textContent = area+' · '+note+pending;
        }
        async function perform(kind, task) {
            if (operation) return;
            operation = kind;
            controls();
            try { await task(); }
            catch (error) {
                const message = error?.message || String(error);
                set('status', message);
                log(message, 'error');
            } finally {
                operation = '';
                running = stopping = false;
                controls();
                if (kind !== 'export') showTraining();
            }
        }
        function reload() {
            return perform('load', async () => {
                inventoryReady = storeReady = false;
                set('status', 'Loading register and dispatch centres…');
                await actions.ready();
                showStats(actions.stats());
                storeReady = true;
                const previous = fields.centre.value;
                const centres = await actions.centres();
                const options = [new Option('All dispatch centres', 'all'), new Option('Unassigned / default', 'unassigned')];
                for (const centre of centres) options.push(new Option(centre.caption, centre.id));
                fields.centre.replaceChildren(...options);
                if (previous) fields.centre.value = previous;
                inventoryReady = true;
                set('status', 'Choose an area to build or check its register.');
            });
        }
        function build(fullVerify) {
            if (!inventoryReady || !fields.centre.value) return;
            return perform('build', async () => {
                fields.activity.replaceChildren();
                for (const field of ['result','report','vehicle','pace']) set(field, '');
                set('current','—'); set('progress','—'); set('vehicles','0');
                set('status','Reading selected area…');
                await actions.build({fullVerify, centre:fields.centre.value, scopeLabel:fields.centre.selectedOptions[0].textContent});
            });
        }
        fields.quick.onclick = () => build(false);
        fields.full.onclick = () => build(true);
        fields.reload.onclick = reload;
        fields.centre.onchange = () => { controls(); showTraining(); };
        fields.pause.onclick = () => { if (running && !stopping) actions.pause(); };
        fields.stop.onclick = () => {
            if (!running || stopping) return;
            stopping = true; controls(); actions.stop();
        };
        fields.export.onclick = () => perform('export', actions.export);
        fields.cloudReview.onclick = () => perform('cloud-review', async () => {
            cloudToken = ''; fields.cloudConfirmation.hidden = true;
            try {
                const review = await actions.cloudReview();
                fields.cloudReview.textContent = 'Review / check replacement';
                if (review.completed) { fields.cloudStatus.textContent = review.message; return; }
                cloudToken = review.token;
                fields.cloudSummary.textContent = `Discord: ${review.username} · MissionChief player ${review.player}. Replace ${review.cloudCount.toLocaleString()} cloud records with ${review.localCount.toLocaleString()} from this PC (${review.verifiedCount.toLocaleString()} marked fully verified). This uses the whole local register, across all dispatch centres.`;
                fields.cloudConfirmation.hidden = false;
            } catch(error) { fields.cloudStatus.textContent = error.message; throw error; }
        });
        fields.cloudConfirm.onclick = () => perform('cloud-replace', async () => {
            const token = cloudToken; cloudToken = ''; fields.cloudConfirmation.hidden = true;
            try { const result = await actions.cloudReplace(token); fields.cloudStatus.textContent = result.message; showStats(actions.stats()); }
            catch(error) { fields.cloudStatus.textContent = error.message; throw error; }
            finally { fields.cloudReview.textContent = 'Review / check replacement'; }
        });
        fields.cloudCancel.onclick = () => { cloudToken = ''; actions.cloudCancel(); fields.cloudConfirmation.hidden = true; controls(); };
        window.addEventListener('nexus:profile-sync-status', event => {
            let detail; try { detail = JSON.parse(event.detail); } catch { return; }
            if (typeof detail.busy !== 'boolean' || typeof detail.message !== 'string') return;
            cloudBusy = detail.busy; fields.cloudStatus.textContent = detail.message.slice(0,1000); controls();
        });
        fields.import.onclick = () => fields.file.click();
        fields.file.onchange = () => {
            const file = fields.file.files[0];
            fields.file.value = '';
            if (file) void perform('import', () => actions.import(file));
        };
        controls();
        return {reload, set, log, showStats,
            opened() {
                if (!storeReady) void reload();
                else if (!operation) { showStats(actions.stats()); showTraining(); }
            },
            started() { running = true; fields.pause.textContent = 'Pause'; controls(); },
            pauseLabel(paused) { fields.pause.textContent = paused ? 'Resume' : 'Pause'; },
            get transferring() { return operation === 'import' || operation === 'export'; }
        };
    }
    globalThis.NexusPersonnelRegisterView = Object.freeze({mount});
})();
