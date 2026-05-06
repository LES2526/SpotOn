export default async function globalTeardown() {
    // No-op: the test server is started externally (CI step or manual `npm run dev`),
    // so teardown is the responsibility of the process that started it.
}
