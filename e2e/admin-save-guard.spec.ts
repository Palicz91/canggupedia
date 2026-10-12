import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { seedAdmin, loginAdmin } from './seed';

const HOME = 'src/data/home.json';
const original = readFileSync(HOME, 'utf8');
const home = JSON.parse(original);

/** home.json as the test-repo backend holds it, i.e. what a save actually wrote. */
async function savedHome(page: Page) {
  return page.evaluate(() => {
    const files = (window as unknown as { repoFiles: { src: { data: Record<string, { content: string }> } } }).repoFiles;
    return files.src.data['home.json'].content;
  });
}

async function save(page: Page) {
  await page.locator('[role="button"][class*="StyledDropdownButton"]').first().click();
  await page.waitForTimeout(3000);
}

// The guard asks GitHub (through git-gateway) for the file before every save. Here that request is
// answered with whatever `github.content` holds, standing in for the file on main right now.
test('a save is refused when the file changed after the editor opened it', async ({ page }) => {
  const github = { content: original, asked: 0 };
  await page.route('**/.netlify/git/github/contents/**', (route) => {
    github.asked++;
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ path: HOME, content: Buffer.from(github.content, 'utf8').toString('base64') }),
    });
  });

  await seedAdmin(page);
  await loginAdmin(page);
  // test-repo has no Netlify Identity login; the guard only runs for a logged-in editor.
  await page.evaluate(() => {
    const w = window as unknown as { netlifyIdentity?: Record<string, unknown> };
    w.netlifyIdentity = Object.assign(w.netlifyIdentity || {}, {
      currentUser: () => ({ jwt: () => Promise.resolve('e2e') }),
    });
  });
  await page.goto('/admin/#/collections/home/entries/home');
  await page.waitForTimeout(6000);
  // Held as a handle: the value-attribute selector stops matching once the title is edited.
  const title = (await page.locator(`input[value="${home.title}"]`).elementHandle())!;
  const setTitle = async (text: string) => {
    await title.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type(text);
  };

  // 1. Nothing changed on GitHub: the save goes through.
  await setTitle('Guard test one');
  await save(page);
  expect(github.asked).toBe(1);
  expect(JSON.parse(await savedHome(page)).title).toBe('Guard test one');

  // 2. GitHub now holds this tab's own save. A second save in the same visit is not a conflict,
  //    even though Decap still remembers the copy it first opened.
  github.content = await savedHome(page);
  await setTitle('Guard test two');
  await save(page);
  expect(github.asked).toBe(2);
  expect(JSON.parse(await savedHome(page)).title).toBe('Guard test two');

  // 3. Someone else saved in between: the save is stopped and their change survives.
  const theirs = JSON.stringify({ ...JSON.parse(github.content), intro: 'Changed by someone else' }, null, 2);
  github.content = theirs;
  const before = await savedHome(page);
  await setTitle('Guard test three');
  await save(page);
  expect(github.asked).toBe(3);
  await expect(page.locator('#cp-strip')).toContainText('Someone else changed this');
  expect(await savedHome(page)).toBe(before);
});
