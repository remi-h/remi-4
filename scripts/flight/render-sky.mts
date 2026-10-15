/**
 * Renders the cockpit view at points along the route, headless (vgpu/node, no browser), for judging the look
 * of the sky, clouds, aurora and glass without flying there. Usage:
 *
 *   npm run flight:sky -- --at 0.05,0.35,0.86 [--travel 0,0,4] [--size 1280x720] [--out tmp/flight]
 *
 * `--at` is progress along the route (0 Stockholm, 1 Tokyo); `--travel` the km flown for each (moves the
 * clouds and ground; defaults to 600 × progress). Validate shaders with `vgpu check` first: this skips it.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { PNG } from 'pngjs';
import { frame, init, target } from 'vgpu';
import { applyFlight, bakeLuts, createGraph, renderGraph } from '../../lib/flight/atmosphere/renderer';
import { routeSky } from '../../lib/flight/route';

const { values } = parseArgs({
  options: {
    at: { type: 'string', default: '0.05,0.35,0.72,0.86,0.95' },
    travel: { type: 'string', default: '' },
    size: { type: 'string', default: '1280x720' },
    out: { type: 'string', default: 'tmp/flight' },
  },
});
const points = values.at.split(',').map(Number);
const travels = values.travel.split(',').filter(Boolean).map(Number);
const [width, height] = values.size.split('x').map(Number);
mkdirSync(values.out, { recursive: true });

const gpu = await init();
const output = target(gpu, { size: [width, height], format: 'rgba8unorm' });
const graph = await createGraph(gpu, output, 'still');
graph.accumulate = false;

for (const [index, progress] of points.entries()) {
  const sky = routeSky(progress);
  applyFlight(
    graph,
    {
      atmosphere: { ...sky.atmosphere, yaw: 0, pitch: -2, time: 30 },
      illuminance: sky.illuminance,
      travel: travels[index] ?? 600 * progress,
      night: { stars: sky.stars, aurora: sky.aurora, city: sky.city, urban: sky.urban },
      fuji: sky.fuji,
      cockpit: { intro: 1, look: [0, 0], night: sky.night, fade: 0 },
      roll: 0,
      airliner: { camera: [0, 0, -1500], visible: 0 },
      dissolve: 1,
    },
    output.size,
  );
  if (graph.lutPhase !== 'ready') bakeLuts(gpu, graph);
  // A few frames: the per-frame constants read tables the frame before writes.
  for (let i = 0; i < 4; i++) frame(gpu, (f) => renderGraph(f, graph, output));
  const png = new PNG({ width, height });
  png.data.set(await output.color.read({ mipLevel: 0, region: 'all' }));
  const file = join(values.out, `sky-${progress}-${index}.png`);
  writeFileSync(file, PNG.sync.write(png));
  console.log(file);
}
gpu.dispose();
