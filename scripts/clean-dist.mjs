import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const distPath = resolve(process.cwd(), 'dist');
const projectRoot = resolve(process.cwd());

if (!distPath.startsWith(projectRoot)) {
  throw new Error('Refusing to clean a path outside the project');
}

await rm(distPath, { recursive: true, force: true });
