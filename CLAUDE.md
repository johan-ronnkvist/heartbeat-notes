# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Heartbeat Notes is a progressive web application built with Vue 3, TypeScript, and Vite. It's designed to help professionals track and document their weekly achievements, progress, and learnings at work. The app serves as a digital memory keeper for career progress and accomplishments.

## Architecture

This is a Progressive Web Application (PWA) built with Vue 3 using the Composition API with the following structure:

- **Frontend Framework**: Vue 3 with TypeScript and `<script setup>` syntax
- **Build Tool**: Vite with Hot Module Replacement for development
- **PWA**: Vite PWA plugin with Workbox for service worker and offline functionality
- **State Management**: Pinia stores using the composition API pattern
- **Routing**: Vue Router with web history mode
- **Styling**: Scoped CSS in Vue components
- **Path Aliasing**: `@/` maps to the `src/` directory

### Key Directories

- `src/` - Main application source code
- `src/stores/` - Pinia state management stores
- `src/router/` - Vue Router configuration
- `e2e/` - Playwright end-to-end tests
- `src/__tests__/` - Vitest unit tests

The application currently has minimal implementation with a basic router setup (no routes defined yet) and a sample counter store.

## Development Commands

### Core Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Type-check and build for production
- `npm run preview` - Preview production build locally

### Code Quality

- `npm run lint` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

### Testing

- `npm run test:unit` - Run Vitest unit tests
- `npm run test:e2e` - Run Playwright end-to-end tests
- `npm run test:e2e -- --project=chromium` - Run E2E tests on Chromium only
- `npm run test:e2e -- tests/example.spec.ts` - Run specific E2E test file
- `npm run test:e2e -- --debug` - Run E2E tests in debug mode

Note: For first-time E2E testing, run `npx playwright install` to install browsers.

## Code Conventions

### Vue Components

- Use `<script setup lang="ts">` syntax for new components
- Use scoped CSS styles
- Follow Vue 3 Composition API patterns

### State Management

- Use Pinia stores with the composition API pattern (see `src/stores/counter.ts`)
- Export stores with the `use[StoreName]Store` naming convention

### Testing

- Unit tests use Vitest with jsdom environment
- E2E tests use Playwright configured for Chromium, Firefox, and WebKit
- E2E tests automatically start the dev server (development) or preview server (CI)

### Linting & Formatting

- ESLint configuration includes Vue, TypeScript, Vitest, and Playwright rules
- Prettier handles code formatting
- VSCode is configured to auto-fix on save and format on save

## PWA Configuration

The application is configured as a Progressive Web App using the Vite PWA plugin:

- **Service Worker**: Auto-updating service worker with Workbox
- **Manifest**: Configured for standalone display mode
- **Icons**: Requires `pwa-192x192.png` and `pwa-512x512.png` in the `public/` directory
- **Offline Support**: Caches JS, CSS, HTML, and image assets for offline functionality

When adding PWA icons, place them in the `public/` directory with the specified dimensions.

## Node.js Requirements

This project requires Node.js version ^20.19.0 or >=22.12.0.

- before starting the dev server, check if it's already running

## Commit Requirements

Before committing all checks must be passing, we never commit with --no-verify.
