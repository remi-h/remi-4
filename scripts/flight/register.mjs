// `node --import ./scripts/flight/register.mjs …` installs the hooks in node-hooks.mjs.
import { register } from 'node:module';

register('./node-hooks.mjs', import.meta.url);
