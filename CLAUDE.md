# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal landing page at `venelinpetkov.com`. Plain HTML/CSS/JS — no build step, no frameworks. Deployed to GitHub Pages via GitHub Actions on push to `main`.

## Local Development

Open `index.html` directly in a browser. No dev server needed.

## Architecture

- **index.html** — Single-page landing with name, tagline, and links
- **style.css** — Styling with CSS custom properties for light/dark theming
- **theme.js** — Light/dark toggle, persists preference in `localStorage`, respects `prefers-color-scheme`
- **CNAME** — Custom domain for GitHub Pages

## Deployment

Automated via `.github/workflows/gh-pages.yml`: pushes to `main` deploy the root directory to GitHub Pages.
