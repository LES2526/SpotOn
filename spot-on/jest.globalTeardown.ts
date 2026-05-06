import fs from 'node:fs';

const SERVER_PID_FILE = '/tmp/spot-on-test-server.pid';

export default async function globalTeardown() {
    try {
        const pid = Number.parseInt(fs.readFileSync(SERVER_PID_FILE, 'utf-8').trim(), 10);
        if (!Number.isNaN(pid)) {
            process.kill(pid, 'SIGTERM');
        }
        fs.unlinkSync(SERVER_PID_FILE);
    } catch {
        // Server not running or already stopped — nothing to do.
    }
}
