import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Generates the MP4 fixtures with ffmpeg when they are missing.
export default function globalSetup(): void {
  const dir = path.resolve('e2e/fixtures');
  if (fs.existsSync(path.join(dir, 'fhd.mp4'))) return;
  execFileSync('bash', [path.resolve('scripts/make-fixtures.sh')], { stdio: 'inherit' });
}
