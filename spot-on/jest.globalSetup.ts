import { execSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DB_CONTAINER = 'spot-on-test-db';
const DB_PORT = '5434';
const TEST_DB_URL = `postgresql://admin:admin@localhost:${DB_PORT}/spot_on_test_db`;
const SERVER_PORT = '3001';
const SERVER_URL = `http://localhost:${SERVER_PORT}`;
const SERVER_PID_FILE = path.resolve(__dirname, '.jest-server.pid');

function loadEnvFile(filePath: string) {
    if (!fs.existsSync(filePath)) return;
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [key, ...rest] = trimmed.split('=');
        const value = rest.join('=').replace(/^"|"$/g, '');
        if (key && !(key in process.env)) {
            process.env[key] = value;
        }
    }
}

function isContainerRunning(name: string): boolean {
    const result = spawnSync('docker', ['ps', '-q', '-f', `name=^/${name}$`], { encoding: 'utf-8' });
    return !!result.stdout?.trim();
}

async function startTestDb(): Promise<void> {
    if (!isContainerRunning(DB_CONTAINER)) {
        spawnSync('docker', ['rm', '-f', DB_CONTAINER]);
        execSync(
            `docker run -d --name ${DB_CONTAINER} \
            -e POSTGRES_USER=admin \
            -e POSTGRES_PASSWORD=admin \
            -e POSTGRES_DB=spot_on_test_db \
            -p ${DB_PORT}:5432 \
            postgres:17-alpine`,
            { stdio: 'inherit' }
        );
    }
    for (let i = 0; i < 30; i++) {
        const result = spawnSync(
            'docker', ['exec', DB_CONTAINER, 'pg_isready', '-h', '127.0.0.1', '-U', 'admin'],
            { encoding: 'utf-8' }
        );
        if (result.status === 0) break;
        await new Promise(r => setTimeout(r, 1000));
        if (i === 29) throw new Error('Test database did not become ready in time.');
    }
    execSync('npx prisma db push --force-reset --skip-generate', {
        env: { ...process.env, DATABASE_URL: TEST_DB_URL },
        stdio: 'inherit',
        cwd: path.resolve(__dirname),
    });
}

async function startNextServer(): Promise<void> {
    console.log('[setup] Starting Next.js test server...');

    const server = spawn(
        'npx', ['next', 'dev', '--port', SERVER_PORT, '--webpack'],
        {
            stdio: 'pipe',
            detached: false,
            shell: true,
            env: { ...process.env },
        }
    );

    server.stdout?.on('data', (d: Buffer) => process.stdout.write(`[next] ${d}`));
    server.stderr?.on('data', (d: Buffer) => process.stderr.write(`[next] ${d}`));

    if (server.pid) {
        process.env.__TEST_SERVER_PID__ = String(server.pid);
        fs.writeFileSync(SERVER_PID_FILE, String(server.pid));
    }

    const start = Date.now();
    while (Date.now() - start < 120_000) {
        try {
            const res = await fetch(SERVER_URL);
            if (res.status < 500) {
                console.log('[setup] Next.js server is ready!');
                return;
            }
        } catch {
            // ainda não está pronto
        }
        await new Promise(r => setTimeout(r, 2000));
    }

    if (fs.existsSync(SERVER_PID_FILE)) {
        fs.unlinkSync(SERVER_PID_FILE);
    }
    server.kill();
    throw new Error('Next.js server did not start within 120s');
}

export default async function globalSetup() {
    loadEnvFile(path.resolve(__dirname, '.env.test'));
    loadEnvFile(path.resolve(__dirname, '.env'));

    if (process.env.CI) {
        execSync('npx prisma db push --force-reset --skip-generate', {
            env: { ...process.env },
            stdio: 'inherit',
            cwd: path.resolve(__dirname),
        });
        return;
    }

    await startTestDb();
    await startNextServer();
}
