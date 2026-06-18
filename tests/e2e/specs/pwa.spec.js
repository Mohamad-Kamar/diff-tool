const { test, expect } = require("@playwright/test");

async function openApp(page) {
    await page.goto("/");
}

async function waitForServiceWorkerControl(page) {
    await page.waitForFunction(async () => {
        if (!navigator.serviceWorker) {
            return false;
        }
        await navigator.serviceWorker.ready;
        return true;
    }, null, { timeout: 15000 });

    const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker?.controller));
    if (!controlled) {
        await page.reload();
    }
    await page.waitForFunction(async () => {
        if (!navigator.serviceWorker) {
            return false;
        }
        if (navigator.serviceWorker.controller) {
            return true;
        }
        await new Promise((resolve) => {
            navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
        });
        return Boolean(navigator.serviceWorker.controller);
    }, null, { timeout: 15000 });
}

test("web app manifest exposes installable PWA metadata", async ({ page }) => {
    const manifestResponse = await page.request.get("/manifest.webmanifest");
    expect(manifestResponse.ok()).toBe(true);
    const manifest = await manifestResponse.json();

    expect(manifest).toMatchObject({
        name: "Diff Tool",
        short_name: "Diff",
        start_url: "./",
        scope: "./",
        display: "standalone",
    });
    expect(manifest.icons).toEqual(expect.arrayContaining([
        expect.objectContaining({ src: "assets/icons/icon-192.png", sizes: "192x192", type: "image/png" }),
        expect.objectContaining({ src: "assets/icons/icon-512.png", sizes: "512x512", type: "image/png" }),
        expect.objectContaining({ src: "assets/icons/icon-maskable-512.png", sizes: "512x512", purpose: "maskable" }),
    ]));

    for (const icon of manifest.icons) {
        const iconResponse = await page.request.get(`/${icon.src}`);
        expect(iconResponse.ok(), `${icon.src} should load`).toBe(true);
    }

    await openApp(page);
    await expect(page.locator("link[rel='manifest']")).toHaveAttribute("href", "manifest.webmanifest");
});

test("service worker caches the app shell", async ({ page }) => {
    await openApp(page);
    await waitForServiceWorkerControl(page);

    const requiredCachedUrls = [
        "/",
        "/index.html",
        "/styles.css",
        "/diff.js",
        "/manifest.webmanifest",
        "/service-worker.js",
        "/assets/icons/icon.svg",
        "/assets/icons/icon-192.png",
        "/assets/icons/icon-512.png",
        "/assets/icons/icon-maskable-512.png",
    ];

    const cacheState = await page.evaluate(async () => {
        const cacheNames = await caches.keys();
        const cacheName = cacheNames.find((name) => name.startsWith("diff-tool-")) || "";
        const cache = cacheName ? await caches.open(cacheName) : null;
        const requests = cache ? await cache.keys() : [];
        return {
            cacheName,
            urls: requests.map((request) => {
                const url = new URL(request.url);
                return `${url.pathname}${url.search}`;
            }),
        };
    });

    expect(cacheState.cacheName).toMatch(/^diff-tool-/);
    expect(cacheState.urls).toEqual(expect.arrayContaining(requiredCachedUrls));
});

test("fresh offline launch loads cached app and runs a diff", async ({ page }) => {
    await openApp(page);
    await waitForServiceWorkerControl(page);

    await page.context().setOffline(true);
    try {
        await page.goto("/");
        await expect(page.locator("#findDiffBtn")).toBeVisible();
        await page.locator("#text1").fill("one\ntwo");
        await page.locator("#text2").fill("one\ntoo");
        await page.locator("#findDiffBtn").click();
        await expect(page.locator("#summaryClassification")).toBeVisible();
        await expect(page.locator("#modifiedCount")).toHaveText("1");
    } finally {
        await page.context().setOffline(false);
    }
});

test("install button appears only while an install prompt is available", async ({ page }) => {
    await openApp(page);

    await expect(page.locator("#installBtn")).toBeHidden();
    const prompted = await page.evaluate(async () => {
        const event = new Event("beforeinstallprompt", { cancelable: true });
        Object.defineProperty(event, "prompt", {
            value: () => Promise.resolve(),
        });
        Object.defineProperty(event, "userChoice", {
            value: Promise.resolve({ outcome: "accepted" }),
        });
        window.dispatchEvent(event);
        await new Promise((resolve) => setTimeout(resolve, 0));
        return {
            defaultPrevented: event.defaultPrevented,
            available: window.__diffToolDebug.getPwaState().installPromptAvailable,
        };
    });

    expect(prompted.defaultPrevented).toBe(true);
    expect(prompted.available).toBe(true);
    await expect(page.locator("#installBtn")).toBeVisible();
    await page.locator("#installBtn").click();
    await expect.poll(() => page.evaluate(() => window.__diffToolDebug.getPwaState().installPromptAvailable)).toBe(false);
});
