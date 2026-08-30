// Empty PostCSS config so Vite/Vitest (which searches upward for one) does
// not pick up the root repo's postcss.config.js (which requires tailwindcss
// -- a dependency this Node-only test suite doesn't have, and doesn't need).
export default {};
