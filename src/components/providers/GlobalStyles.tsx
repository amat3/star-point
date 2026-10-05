'use client'

import { Global, css } from '@emotion/react'
import { lightTheme, darkTheme } from '@/theme'

// Page-level styles. Colors come from CSS variables switched by the `.dark` class
// that next-themes puts on <html> before first paint, so there is no flash.
// The reset replicates the one the app was built on (margin/padding/border zeroed,
// inherited fonts, block media).
const styles = css`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    border: 0 solid;
  }

  html {
    height: 100%;
    -webkit-text-size-adjust: 100%;
  }

  :root {
    --sp-bg: ${lightTheme.colors.background};
    --sp-ink: ${lightTheme.colors.ink};
    color-scheme: light;
  }

  html.dark {
    --sp-bg: ${darkTheme.colors.background};
    --sp-ink: ${darkTheme.colors.ink};
    color-scheme: dark;
  }

  body {
    display: flex;
    min-height: 100%;
    flex-direction: column;
    overflow-x: hidden;
    background: var(--sp-bg);
    color: var(--sp-ink);
    font-family: ${lightTheme.fonts.body};
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    /* Hidden scrollbars: the app is a mobile-style column */
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  body::-webkit-scrollbar {
    display: none;
  }

  /* Touch devices: no scrollbar anywhere (page, dialogs, lists), scrolling still works */
  @media (hover: none) and (pointer: coarse) {
    html,
    * {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    *::-webkit-scrollbar {
      display: none;
    }
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-size: inherit;
    font-weight: inherit;
  }

  a {
    color: inherit;
    text-decoration: inherit;
  }

  ol,
  ul {
    list-style: none;
  }

  img,
  svg,
  video,
  canvas {
    display: block;
    max-width: 100%;
  }

  img,
  video {
    height: auto;
  }

  button,
  input,
  select,
  textarea {
    font: inherit;
    letter-spacing: inherit;
    color: inherit;
    background: transparent;
    border-radius: 0;
  }

  textarea {
    resize: vertical;
  }

  ::placeholder {
    opacity: 1;
  }

  [hidden]:where(:not([hidden='until-found'])) {
    display: none !important;
  }
`

function GlobalStyles() {
  return <Global styles={styles} />
}

export default GlobalStyles
