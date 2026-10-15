import { test as base, expect } from '@playwright/test'

// Every test skips the splash by default (it covers the screen for almost 4 seconds); the splash
// test turns that off with `test.use({ skipSplash: false })`.
export const test = base.extend<{ skipSplash: boolean }>({
  skipSplash: [true, { option: true }],
  // (`provide` is Playwright's `use`: the name is changed so the React hooks lint rule does not mistake it for a hook)
  page: async ({ page, skipSplash }, provide) => {
    if (skipSplash) {
      await page.addInitScript(() => {
        try {
          sessionStorage.setItem('sp-splash', '1')
        } catch {
          // storage blocked: the splash simply shows
        }
      })
    }
    await provide(page)
  },
})

export { expect }
