import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { frame, init, target } from 'vgpu';
import { applyFlight, bakeLuts, createGraph, renderGraph } from '../lib/flight/atmosphere/renderer';
import { routeSky } from '../lib/flight/route';

const [w, h] = [1280, 720];
const points = (process.argv[2] ?? '0,0.1,0.3,0.45,0.7,0.8,0.86,0.95').split(',').map(Number);
const gpu = await init();
const out = target(gpu, { size: [w, h], format: 'rgba8unorm' });
const graph = await createGraph(gpu, out, 'still');
graph.accumulate = false;
for (const p of points) {
  const sky = routeSky(p);
  const view = {
    atmosphere: { ...sky.atmosphere, yaw: 0, pitch: -2, time: 30 },
    illuminance: sky.illuminance, travel: 600 * p,
    night: { stars: sky.stars, aurora: sky.aurora, city: sky.city, urban: sky.urban },
    fuji: sky.fuji, cockpit: { intro: 1, look: [0, 0] as const, night: sky.night, fade: 0 }, roll: 0.02,
  };
  applyFlight(graph, view, out.size);
  if (graph.lutPhase !== 'ready') bakeLuts(gpu, graph);
  for (let i = 0; i < 4; i++) frame(gpu, (f) => renderGraph(f, graph, out));
  const px = await out.color.read({ mipLevel: 0, region: 'all' });
  const png = new PNG({ width: w, height: h }); png.data.set(px);
  writeFileSync(`/tmp/flight/sky-${p}.png`, PNG.sync.write(png));
  console.log('rendered', p);
}
gpu.dispose();
