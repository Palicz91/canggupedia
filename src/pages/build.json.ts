import type { APIRoute } from 'astro';
import { execSync } from 'node:child_process';

/**
 * Which commit the live site was built from. The admin's status strip polls this after a Save, so
 * it can say "live" once a build that contains the save is actually online, instead of guessing
 * after a fixed two minutes. commitTime is GitHub's own clock, compared there with the Date header
 * of the same response, so the editor's computer clock never matters.
 */
function commitTime(): string | null {
  try {
    return execSync('git log -1 --format=%cI', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch {
    return null;
  }
}

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      commit: process.env.COMMIT_REF || null,
      commitTime: commitTime(),
      builtAt: new Date().toISOString(),
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
