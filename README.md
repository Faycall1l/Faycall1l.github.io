# Faycal Amrouche — Portfolio

Personal website built with [Astro](https://astro.build). Static single-page portfolio with a blog,
deployed to GitHub Pages via GitHub Actions.

## Commands

| Command            | Action                                  |
| :----------------- | :-------------------------------------- |
| `npm install`      | Install dependencies                    |
| `npm run dev`      | Local dev server at `localhost:4321`    |
| `npm run build`    | Build production site to `./dist/`      |
| `npm run preview`  | Preview the built site locally          |

## Structure

```
src/
├── layouts/Base.astro      # shared head, nav, footer
├── pages/
│   ├── index.astro         # portfolio homepage
│   └── blog/               # blog index + [...slug] post pages
├── content/blog/           # Markdown posts (add .md files here)
└── styles/global.css       # shared styles
```

## Writing a blog post

Drop a Markdown file in `src/content/blog/` with frontmatter:

```markdown
---
title: "My Post"
description: "Short summary shown on the blog index."
date: 2026-08-05
tags: ["ai", "agents"]
---

Post body here.
```

Set `draft: true` to keep a post unpublished. Push to `main` to deploy.
