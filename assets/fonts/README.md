# Fonts for generated images

Used by `app/opengraph-image.tsx`, `app/icon.tsx` and `app/apple-icon.tsx`, which render
with `next/og` and need the font files on disk (pages load the same families through
`next/font/google`). Taken from the `@fontsource` packages, all SIL Open Font License 1.1.

| File | Family | Notes |
| --- | --- | --- |
| `jetbrains-mono-latin-{400,800}-normal.woff` | JetBrains Mono | latin subset |
| `familjen-grotesk-latin-400-normal.woff` | Familjen Grotesk | latin subset |
| `dotgothic16-hi-400-normal.woff` | DotGothic16 | subset 70, contains 樋 |
| `dotgothic16-guchi-400-normal.woff` | DotGothic16 | subset 113, contains 口 |
