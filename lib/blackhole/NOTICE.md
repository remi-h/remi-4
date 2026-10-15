# The black hole

`trace.wgsl` is adapted from vgpu's **Black Hole** example (`npx vgpu examples pull black-hole`, revision
`af8ab210`): Verlet steps along Schwarzschild null geodesics and the volumetric Keplerian accretion disk with
Doppler beaming and gravitational redshift. `bright.wgsl` and `blur.wgsl` are that example's bloom passes.
Changes for the site:

- `trace.wgsl`: the horizon grows from nothing (`mass`), step sizes scale with it, the disk brightens as it
  feeds and takes the site's hot colours, and escaped rays report where they land on the page and the sky
  instead of shading stars, into a second render target.
- `bright.wgsl`: the threshold sits above the page's own whites.
- New: `space.wgsl` (camera, page plane, tile release), `debris.wgsl` (compute: page tiles on infall
  orbits), `debris-draw.wgsl` (instanced tile quads), `resolve.wgsl` (the lensed page at full resolution),
  `present.wgsl`, and the engine and timeline.

The original code is under the MIT licence below.

MIT License

Copyright (c) 2025 Vercel, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
