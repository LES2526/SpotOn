import { execSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const DB_CONTAINER = 'spot-on-test-db';
const DB_PORT = '5434';
const TEST_DB_URL = `postgresql://admin:admin@localhost:${DB_PORT}/spot_on_test_db`;

const SERVER_PORT = '3001';
const SERVER_PID_FILE = '/tmp/spot-on-test-server.pid';

function isContainerRunning(name: string): boolean {
    const result = spawnSync(
        'docker', ['ps', '-q', '-f', `name=^/${name}$`],
        { encoding: 'utf-8' }
    );
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

    const maxRetries = 30;
    for (let i = 0; i < maxRetries; i++) {
        const result = spawnSync(
            'docker', ['exec', DB_CONTAINER, 'pg_isready', '-h', '127.0.0.1', '-U', 'admin'],
            { encoding: 'utf-8' }
        );
        if (result.status === 0) break;
        await new Promise(r => setTimeout(r, 1000));
        if (i === maxRetries - 1) {
            throw new Error(`Test database container "${DB_CONTAINER}" did not become ready in time.`);
        }
    }

    execSync('npx prisma db push --force-reset --skip-generate', {
        env: { ...process.env, DATABASE_URL: TEST_DB_URL },
        stdio: 'inherit',
        cwd: path.resolve(__dirname),
    });
}

async function startNextServer(): Promise<void> {
    // Load base env from .env so the server has all required secrets
    dotenv.config({ path: path.join(__dirname, '.env') });

    const server = spawn(
        'npx', ['next', 'dev', '--port', SERVER_PORT, '--webpack'],
        {
            env: {
                ...process.env,
                DATABASE_URL: TEST_DB_URL,
                NEXTAUTH_URL: `http://localhost:${SERVER_PORT}`,
            },
            cwd: __dirname,
            stdio: ['ignore', 'pipe', 'pipe'],
        }
    );

    if (server.pid) {
        fs.writeFileSync(SERVER_PID_FILE, String(server.pid));
    }

    await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
            () => reject(new Error('Next.js test server did not become ready within 120s')),
            120_000
        );

        server.stdout?.on('data', (data: Buffer) => {
            if (data.toString().includes('Ready in')) {
                clearTimeout(timeout);
                resolve();
            }
        });

        server.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });

        server.on('exit', (code) => {
            if (code !== 0 && code !== null) {
                clearTimeout(timeout);
                reject(new Error(`Next.js test server exited early with code ${code}`));
            }
        });
    });
}

export default async function globalSetup() {
    if (process.env.CI) {
        // In CI the database is provided by the workflow service — skip Docker.
        // Just wipe and recreate the schema so each run starts clean.
        execSync('npx prisma db push --force-reset --skip-generate', {
            env: { ...process.env },
            stdio: 'inherit',
            cwd: path.resolve(__dirname),
        });
    } else {
        await startTestDb();
    }
    await startNextServer();
}
