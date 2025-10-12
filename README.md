# heartbeat-notes

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh
# Install browsers for the first run
npx playwright install

# When testing on CI, must build the project first
npm run build

# Runs the end-to-end tests
npm run test:e2e
# Runs the tests only on Chromium
npm run test:e2e -- --project=chromium
# Runs the tests of a specific file
npm run test:e2e -- tests/example.spec.ts
# Runs the tests in debug mode
npm run test:e2e -- --debug
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

# Heartbeat Notes

**Your personal career progress companion**

Heartbeat Notes is a progressive web application designed to help professionals track and document their weekly achievements, progress, and learnings at work. It serves as your digital memory keeper, ensuring that no accomplishment—big or small—gets forgotten.

## Why Heartbeat Notes?

Career conversations, performance reviews, and end-of-year evaluations often catch us off guard. We struggle to remember the projects we completed months ago, the problems we solved, or the skills we developed along the way. Heartbeat Notes solves this by providing a simple, consistent way to capture your professional journey week by week.

With Heartbeat Notes, you can:

- 📝 Document weekly wins, learnings, and progress
- 🎯 Build a comprehensive record of your professional growth
- 💼 Have concrete examples ready for career discussions and reviews
- 🚀 Reflect on your achievements and identify patterns in your development

Whether you're preparing for a promotion, updating your resume, or simply wanting to celebrate your progress, Heartbeat Notes ensures your hard work is never overlooked.
