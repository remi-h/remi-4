import { PNG } from 'pngjs'; import fs from 'node:fs';
const [out, scale, cols, ...files] = process.argv.slice(2);
const ims = files.map(f => PNG.sync.read(fs.readFileSync(f)));
const s = Number(scale), W = Math.round(ims[0].width * s), H = Math.round(ims[0].height * s), C = Number(cols);
const m = new PNG({ width: W * C, height: H * Math.ceil(ims.length / C) });
ims.forEach((im, i) => { const ox = (i % C) * W, oy = Math.floor(i / C) * H;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let r=0,g=0,b=0,n=0; const sx0=Math.floor(x/s), sy0=Math.floor(y/s), sx1=Math.min(im.width,Math.floor((x+1)/s)), sy1=Math.min(im.height,Math.floor((y+1)/s));
    for (let yy=sy0; yy<Math.max(sy1,sy0+1); yy++) for (let xx=sx0; xx<Math.max(sx1,sx0+1); xx++){const k=(yy*im.width+xx)*4;r+=im.data[k];g+=im.data[k+1];b+=im.data[k+2];n++;}
    const o = ((oy + y) * m.width + ox + x) * 4; m.data[o]=r/n; m.data[o+1]=g/n; m.data[o+2]=b/n; m.data[o+3]=255; } });
fs.writeFileSync(out, PNG.sync.write(m));
