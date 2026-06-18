import fs from "node:fs";

const resultPath = process.argv[2];
if (!resultPath || !fs.existsSync(resultPath)) {
    console.log("[agent-e2e] No JSON result file found.");
    process.exit(0);
}

const data = JSON.parse(fs.readFileSync(resultPath, "utf8"));
const tests = [];

function collect(suite) {
    for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
            const status = test.results?.at(-1)?.status || "unknown";
            tests.push({ title: spec.title, status });
        }
    }
    for (const child of suite.suites || []) {
        collect(child);
    }
}

for (const suite of data.suites || []) {
    collect(suite);
}

const failed = tests.filter((test) => test.status !== "passed" && test.status !== "skipped");
console.log(`[agent-e2e] ${tests.length} tests, ${failed.length} failed.`);
for (const test of failed) {
    console.log(`[agent-e2e] ${test.status}: ${test.title}`);
}
