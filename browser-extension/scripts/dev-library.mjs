import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
export function devLibrary(name) {
  try { return require(name); } catch {
    // Codex ships test/build libraries beside its Node executable. Production
    // extension code has no dependency on this helper or the local runtime.
    return require(path.resolve(path.dirname(process.execPath),'../node_modules',name));
  }
}
