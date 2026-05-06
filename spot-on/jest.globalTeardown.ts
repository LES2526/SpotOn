import fs from 'node:fs';
import path from 'node:path';

const SERVER_PID_FILE = path.resolve(__dirname, '.jest-server.pid');

export default async function globalTeardown() {
    if (!fs.existsSync(SERVER_PID_FILE)) {
        return;
    }

    const rawPid = fs.readFileSync(SERVER_PID_FILE, 'utf-8').trim();
    if (rawPid) {
        const pid = Number(rawPid);
        if (Number.isFinite(pid)) {
            try {
                process.kill(pid, 'SIGTERM');
            } catch {
                // Ignore if already stopped.
            }
        }
    }

    fs.unlinkSync(SERVER_PID_FILE);
}
