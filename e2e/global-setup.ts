import { execSync } from 'node:child_process';

/**
 * Rebuild dist-e2e before every run.
 *
 * playwright.config.ts serves a prebuilt dist-e2e and reuses a server that is already listening on
 * 4321, so the webServer command — the only thing that could rebuild — does not run. On 2026-08-31
 * the whole admin suite passed green against a build made 25 minutes before the changes under test,
 * with a `serve` left over from an earlier session holding the port. A green suite that proves
 * nothing is worse than a red one.
 *
 * globalSetup runs on every invocation whatever the server is doing, so this cannot go stale again.
 */
export default function globalSetup() {
  execSync('npm run build:e2e', { stdio: 'inherit' });
}
