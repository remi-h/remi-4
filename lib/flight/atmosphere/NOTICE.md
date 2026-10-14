# The sky renderer

Adapted from vgpu's **Atmosphere & Clouds** example (`npx vgpu examples pull atmosphere`, revision
`af8ab210`) and the bloom passes of its **Earth** example: a Hillaire 2020 physically based sky and
Nubis-style volumetric clouds. Changes for the flight:

- `renderer.ts`: no demo controls; the clouds re-march every frame (they move), `applyFlight` drives
  the sky from the route, `present.wgsl` now writes linear HDR for bloom (`bright-pass.wgsl`,
  `blur.wgsl`) and the cockpit pass (`cockpit.wgsl`, new).
- `clouds-common.wgsl`: `travel` slides the cloud field back as the plane flies.
- `night.wgsl` (new): stars, the aurora and city lights, added in `scene.wgsl`.
- `terrain-heightmap.wgsl`: Mt Fuji, baked in for the last stretch of the route.

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
