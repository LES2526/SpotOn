import { execSync, spawnSync } from 'node:child_process';
import path from 'node:path';

const DB_CONTAINER = 'spot-on-test-db';
const DB_PORT = '5434';
const TEST_DB_URL = `postgresql://admin:admin@localhost:${DB_PORT}/spot_on_test_db`;

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

export default async function globalSetup() {
    if (process.env.CI) {
        // In CI the database is provided by the workflow service and DATABASE_URL
        // is set at the job level — just wipe and recreate the schema.
        execSync('npx prisma db push --force-reset --skip-generate', {
            env: { ...process.env },
            stdio: 'inherit',
            cwd: path.resolve(__dirname),
        });
    } else {
        await startTestDb();
    }
    // The Next.js server is NOT started here because env-var changes made in
    // globalSetup (which runs in a separate Node process) do not propagate to
    // Jest worker processes.  In CI the server is started as a dedicated
    // workflow step before tests run so that all processes share the same
    // DATABASE_URL / NEXTAUTH_URL values set at the job level.  For local
    // development, start the dev server manually (e.g. `npm run dev`) with the
    // appropriate DATABASE_URL and NEXTAUTH_URL before running `npm test`.
}
