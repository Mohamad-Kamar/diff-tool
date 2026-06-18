const { test, expect } = require("@playwright/test");

async function openApp(page, path = "/") {
    await page.goto(path);
    await page.waitForFunction(() => Boolean(window.__diffToolDebug?.getAnalyticsState));
}

async function readAnalyticsEvents(page) {
    return page.evaluate(() => window.__diffToolDebug.getAnalyticsEvents());
}

function findEvent(events, eventName) {
    return events.find((entry) => entry.event === eventName);
}

function expectNoAnalyticsLeak(events, forbiddenValues) {
    const serialized = JSON.stringify(events);
    for (const value of forbiddenValues) {
        expect(serialized).not.toContain(value);
    }
}

test("analytics is disabled by default on local app loads", async ({ page }) => {
    const posthogRequests = [];
    page.on("request", (request) => {
        if (/posthog|array\.js/i.test(request.url())) {
            posthogRequests.push(request.url());
        }
    });

    await openApp(page);

    const analytics = await page.evaluate(() => window.__diffToolDebug.getAnalyticsState());
    expect(analytics).toMatchObject({
        mode: "disabled",
        enabled: false,
    });
    expect(posthogRequests).toEqual([]);
});

test("analytics config allows the deployed GitHub Pages host", async ({ page }) => {
    await openApp(page);

    const allowedHostnames = await page.evaluate(() => window.DIFF_TOOL_ANALYTICS?.allowedHostnames || []);
    expect(allowedHostnames).toContain("katooling.github.io");
});

test("analytics stub records sanitized diff workflow events", async ({ page }) => {
    await openApp(page, "/?analytics=stub");
    await page.locator("#text1").fill("private original token\nsame line");
    await page.locator("#text2").fill("private changed secret\nsame line");
    await page.locator("#findDiffBtn").click();
    await page.locator("#swapBtn").click();
    await page.locator("#clearBtn").click();

    const events = await readAnalyticsEvents(page);
    const appView = findEvent(events, "dt_app_view");
    const diffRun = findEvent(events, "dt_diff_run");
    const swap = findEvent(events, "dt_swap_click");
    const clear = findEvent(events, "dt_clear_click");

    expect(appView?.properties).toMatchObject({
        app: "diff_tool",
        event_version: 1,
    });
    expect(diffRun?.properties).toMatchObject({
        app: "diff_tool",
        original_format: "text",
        changed_format: "text",
    });
    expect(diffRun?.properties.classification).toEqual(expect.any(String));
    expect(diffRun?.properties.changed_percent_bucket).toEqual(expect.any(String));
    expect(diffRun?.properties.original_char_bucket).toEqual(expect.any(String));
    expect(swap?.properties.original_char_bucket).toEqual(expect.any(String));
    expect(clear?.properties.app).toBe("diff_tool");
    expectNoAnalyticsLeak(events, ["private original token", "private changed secret", "same line"]);
});

test("analytics stub records normalization and theme changes without raw content", async ({ page }) => {
    await openApp(page, "/?analytics=stub");
    await page.locator("#text1").fill('{"secretName":"alpha","a":1}');
    await page.locator("#text2").fill('{"a":1,"secretName":"alpha"}');
    await page.locator("#normalizeBtn").click();
    await page.locator("#themeToggle").click();

    const events = await readAnalyticsEvents(page);
    const normalized = findEvent(events, "dt_normalize_run");
    const theme = findEvent(events, "dt_theme_change");

    expect(normalized?.properties.format).toBe("json");
    expect(theme?.properties.effective_theme).toMatch(/dark|light/);
    expectNoAnalyticsLeak(events, ["secretName", "alpha"]);
});

test("live analytics override does not bypass the local host allowlist", async ({ page }) => {
    await page.route(/posthog|array\.js/i, (route) => route.abort("failed"));
    await openApp(page, "/?analytics=live");

    const analytics = await page.evaluate(() => window.__diffToolDebug.getAnalyticsState());
    expect(analytics).toMatchObject({
        mode: "disabled",
        enabled: false,
    });

    await page.locator("#text1").fill("one\ntwo");
    await page.locator("#text2").fill("one\ntoo");
    await page.locator("#findDiffBtn").click();

    await expect(page.locator("#summaryClassification")).toBeVisible();
    await expect(page.locator("#modifiedCount")).toHaveText("1");
});
