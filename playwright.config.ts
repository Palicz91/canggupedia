import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // Builds dist-e2e. It has to be here rather than in the webServer command below, which is skipped
  // whenever a server is already listening — see the comment in e2e/global-setup.ts.
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:4321',
  },
  webServer: {
    command: 'npx serve dist-e2e -l 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
