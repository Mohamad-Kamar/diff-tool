const { test, expect } = require("@playwright/test");

async function prepareRenderedDiff(page) {
    await page.goto("/");
    await page.locator("#text1").fill("alpha\nbeta\ngamma");
    await page.locator("#text2").fill("alpha\nbravo\ngamma\ndelta");
    await page.locator("#findDiffBtn").click();
    await expect(page.locator("#diffSection")).toBeVisible();
}

async function assertNoHorizontalOverflow(page) {
    const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
}

async function assertPrimaryControlsDoNotOverlap(page) {
    const result = await page.evaluate(() => {
        const selectors = ["#installBtn", "#themeToggle", "#clearBtn", "#swapBtn", "#findDiffBtn"];
        const rects = selectors
            .map((selector) => {
                const element = document.querySelector(selector);
                if (!element || element.hidden) {
                    return null;
                }
                const rect = element.getBoundingClientRect();
                return { selector, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
            })
            .filter(Boolean);

        for (let index = 0; index < rects.length; index += 1) {
            for (let nextIndex = index + 1; nextIndex < rects.length; nextIndex += 1) {
                const a = rects[index];
                const b = rects[nextIndex];
                const overlaps = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
                if (overlaps) {
                    return { ok: false, a: a.selector, b: b.selector };
                }
            }
        }
        return { ok: true };
    });

    expect(result).toEqual({ ok: true });
}

test("desktop visual smoke has stable layout and screenshot artifact", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await prepareRenderedDiff(page);
    await assertNoHorizontalOverflow(page);
    await assertPrimaryControlsDoNotOverlap(page);

    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot.length).toBeGreaterThan(20_000);
    await testInfo.attach("desktop-diff-tool.png", { body: screenshot, contentType: "image/png" });
});

test("mobile visual smoke has stable layout and screenshot artifact", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepareRenderedDiff(page);
    await assertNoHorizontalOverflow(page);
    await assertPrimaryControlsDoNotOverlap(page);

    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot.length).toBeGreaterThan(20_000);
    await testInfo.attach("mobile-diff-tool.png", { body: screenshot, contentType: "image/png" });
});
