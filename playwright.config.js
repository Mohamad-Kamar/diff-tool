const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
    testDir: "./tests/e2e/specs",
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: "list",
    timeout: 30_000,
    use: {
        baseURL: "http://127.0.0.1:4174",
        trace: "on-first-retry",
    },
    webServer: {
        command: "python3 -m http.server 4174",
        url: "http://127.0.0.1:4174",
        reuseExistingServer: !process.env.CI,
        cwd: __dirname,
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
});
