import { spawn } from 'node:child_process';

const composeFile = 'docker-compose.test.yml';
async function run(command: string[]) {
  console.log(`\n$ ${command.join(' ')}`);
  const [exe, ...args] = command;
  const code = await new Promise<number | null>((resolve, reject) => {
    const child = spawn(exe, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', reject);
    child.on('close', resolve);
  });
  if (code !== 0)
    throw new Error(`Command failed (${code}): ${command.join(' ')}`);
}
async function cleanup() {
  await run(['docker', 'compose', '-f', composeFile, 'down', '-v']);
}

export default async function globalSetup() {
  try {
    await run(['docker', 'compose', '-f', composeFile, 'up', '-d', '--wait']);
    await run([
      'bun',
      'x',
      'drizzle-kit',
      'migrate',
      '--config',
      'drizzle.config.test.ts',
    ]);
  } catch (error) {
    await cleanup();
    throw error;
  }
  return cleanup;
}
