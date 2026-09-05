    function createPersonnelRegisterReader() {
        const controllers = new Set();
        const slots = [];
        const limit = isIosSafariWebsite() ? 2 : PERSONNEL_REGISTER_MAX_CONCURRENCY;
        const launchGap = isIosSafariWebsite() ? 350 : PERSONNEL_REGISTER_LAUNCH_GAP_MS;
        let active = 0, nextLaunchAt = 0, cooldownUntil = 0, cancelled = false;
        let launchChain = Promise.resolve();
        const stats = { requests: 0, throttled: 0, failed: 0, networkMs: 0 };
        const check = () => {
            if (cancelled || PERSONNEL_STATE.stopped) throw new DOMException('Register scan stopped', 'AbortError');
        };
        const waitUntil = async target => {
            while (Date.now() < target) {
                check();
                await new Promise(resolve => setTimeout(resolve, Math.min(100, target - Date.now())));
            }
        };
        const waitPaused = async () => {
            while (PERSONNEL_STATE.paused) { check(); await new Promise(resolve => setTimeout(resolve, 100)); }
        };
        const waitForLaunchSlot = () => {
            const task = launchChain.then(async () => {
                check();
                while (active >= limit) { await new Promise(resolve => slots.push(resolve)); check(); }
                // Recheck after every pause/wait: another response can impose
                // backoff while this request is waiting for its launch slot.
                while (true) {
                    await waitPaused(); check();
                    const target = Math.max(nextLaunchAt, cooldownUntil);
                    if (Date.now() >= target) break;
                    await waitUntil(target);
                }
                nextLaunchAt = Date.now() + launchGap;
                active++;
            });
            launchChain = task.catch(() => {});
            return task;
        };
        const read = async (url, timeoutMs = 14000) => {
            const requestUrl = getSameOriginResourceUrl(url, 'Personnel register read');
            await waitForLaunchSlot();
            const controller = new AbortController();
            controllers.add(controller);
            const started = Date.now();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            stats.requests++;
            try {
                check();
                const response = await fetch(`${requestUrl.pathname}${requestUrl.search}`, {
                    method: 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'follow',
                    headers: { Accept: 'text/html,application/xhtml+xml' }, signal: controller.signal
                });
                // Keep assignment writes on their original conservative pacing.
                PERSONNEL_STATE.lastRequestAt = Date.now();
                if (response.status === 429 || response.status === 503) {
                    stats.throttled++;
                    const retry = response.headers?.get('Retry-After');
                    const seconds = retry == null || retry === '' ? NaN : Number(retry);
                    const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retry) - Date.now();
                    cooldownUntil = Math.max(cooldownUntil, Date.now() + Math.max(5000, Number.isFinite(delay) ? delay : 5000));
                }
                if (!response.ok) throw new Error(`Register read returned HTTP ${response.status}`);
                const finalUrl = getSameOriginResourceUrl(response.url || requestUrl.href, 'Personnel register response');
                if (finalUrl.pathname !== requestUrl.pathname) throw new Error('Register read redirected to a different page');
                const html = await response.text();
                check();
                const doc = new DOMParser().parseFromString(html, 'text/html');
                return { response, doc, href: new URL(response.url || url, location.origin).pathname };
            } catch (error) { stats.failed++; throw error; }
            finally {
                clearTimeout(timer); controllers.delete(controller); active--;
                stats.networkMs += Date.now() - started;
                slots.splice(0).forEach(resolve => resolve());
            }
        };
        return {
            read, stats,
            cancel() {
                cancelled = true;
                controllers.forEach(controller => controller.abort());
                slots.splice(0).forEach(resolve => resolve());
            }
        };
    }
