const { test, expect } = require("@playwright/test");

async function openApp(page) {
    await page.goto("/");
}

async function runDiff(page, original, changed) {
    await page.locator("#text1").fill(original);
    await page.locator("#text2").fill(changed);
    await page.locator("#findDiffBtn").click();
}

test("runs a side-by-side diff and shows summary stats", async ({ page }) => {
    await openApp(page);
    await runDiff(page, "alpha\nbeta\ngamma", "alpha\nbravo\ngamma\ndelta");

    await expect(page.locator("#summary")).toBeVisible();
    await expect(page.locator("#summaryClassification")).toContainText(/Moderate changes|Significant rewrite/);
    await expect(page.locator("#addedCount")).toHaveText("1");
    await expect(page.locator("#modifiedCount")).toHaveText("1");
    await expect(page.locator("#removedCount")).toHaveText("0");
    await expect(page.locator("#unchangedCount")).toHaveText("2");
    await expect(page.locator("#diff1")).toContainText("beta");
    await expect(page.locator("#diff2")).toContainText("bravo");
    await expect(page.locator("#diff2")).toContainText("delta");
});

test("keyboard shortcut runs the diff", async ({ page }) => {
    await openApp(page);
    await page.locator("#text1").fill("one\ntwo");
    await page.locator("#text2").fill("one\ntoo");
    await page.keyboard.press(process.platform === "darwin" ? "Meta+Enter" : "Control+Enter");

    await expect(page.locator("#summary")).toBeVisible();
    await expect(page.locator("#modifiedCount")).toHaveText("1");
});

test("clear resets inputs and output", async ({ page }) => {
    await openApp(page);
    await runDiff(page, "a", "b");
    await page.locator("#clearBtn").click();

    await expect(page.locator("#text1")).toHaveValue("");
    await expect(page.locator("#text2")).toHaveValue("");
    await expect(page.locator("#summary")).toBeHidden();
    await expect(page.locator("#stats")).toBeHidden();
    await expect(page.locator("#diffSection")).toBeHidden();
});

test("swap exchanges the input text", async ({ page }) => {
    await openApp(page);
    await page.locator("#text1").fill("left");
    await page.locator("#text2").fill("right");
    await page.locator("#swapBtn").click();

    await expect(page.locator("#text1")).toHaveValue("right");
    await expect(page.locator("#text2")).toHaveValue("left");
});

test("structured JSON can be normalized before comparing", async ({ page }) => {
    await openApp(page);
    await page.locator("#text1").fill('{"b":1,"a":2}');
    await page.locator("#text2").fill('{"a":2,"b":1}');

    await expect(page.locator("#normalizeSection")).toBeVisible();
    await expect(page.locator("#formatBadge")).toHaveText("JSON");
    await page.locator("#normalizeBtn").click();

    await expect(page.locator("#text1")).toHaveValue('{\n  "a": 2,\n  "b": 1\n}');
    await expect(page.locator("#text2")).toHaveValue('{\n  "a": 2,\n  "b": 1\n}');
    await expect(page.locator("#summaryClassification")).toHaveText("Identical");
});

test("structured YAML can be normalized before comparing", async ({ page }) => {
    await openApp(page);
    await page.locator("#text1").fill("zebra: 1\napple: 2");
    await page.locator("#text2").fill("apple: 2\nzebra: 1");

    await expect(page.locator("#normalizeSection")).toBeVisible();
    await expect(page.locator("#formatBadge")).toHaveText("YAML");
    await page.locator("#normalizeBtn").click();

    await expect(page.locator("#text1")).toHaveValue("apple: 2\nzebra: 1");
    await expect(page.locator("#text2")).toHaveValue("apple: 2\nzebra: 1");
    await expect(page.locator("#summaryClassification")).toHaveText("Identical");
});

test("diff panels keep scroll positions synchronized", async ({ page }) => {
    await openApp(page);
    const original = Array.from({ length: 80 }, (_, index) => `line ${index}`).join("\n");
    const changed = Array.from({ length: 80 }, (_, index) => index === 60 ? `changed ${index}` : `line ${index}`).join("\n");
    await runDiff(page, original, changed);

    await page.locator("#diff1").evaluate((element) => {
        element.scrollTop = 320;
        element.dispatchEvent(new Event("scroll"));
    });
    await expect.poll(() => page.locator("#diff2").evaluate((element) => element.scrollTop)).toBe(320);
});

test("mobile layout stacks inputs and diff panels", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openApp(page);

    const columns = await page.locator(".input-section").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
    const bodyWidth = await page.evaluate(() => document.documentElement.scrollWidth);

    expect(columns).toBe(1);
    expect(bodyWidth).toBeLessThanOrEqual(390);
});
