import { spawn, execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('[with-version] Expected a command to run (e.g. "vite dev")');
  process.exit(1);
}

const resolveVersion = () => {
  const candidates = [
    process.env.VITE_APP_VERSION,
    process.env.RENDER_GIT_COMMIT,
    process.env.VERCEL_GIT_COMMIT_SHA,
    process.env.GIT_COMMIT_SHA,
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  try {
    return execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return `build-${Date.now().toString(36)}`;
  }
};

const version = resolveVersion();
const generatedAt = new Date().toISOString();

const publicDir = join(process.cwd(), 'public');
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

const versionFilePath = join(publicDir, 'version.json');
writeFileSync(
  versionFilePath,
  JSON.stringify({ version, generatedAt }, null, 2),
);
console.log(`[with-version] Using build version: ${version}`);

const [command, ...commandArgs] = args;
const child = spawn(command, commandArgs, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    VITE_APP_VERSION: version,
  },
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

