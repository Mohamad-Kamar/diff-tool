#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

RESULT_JSON="test-results/agent-results.json"
mkdir -p test-results
rm -f "$RESULT_JSON"

echo "[agent-e2e] Running Playwright with agent config..."
echo "[agent-e2e] Command: npx playwright test -c playwright.agent.config.js $*"

set +e
npx playwright test -c playwright.agent.config.js "$@"
TEST_EXIT_CODE=$?
set -e

if [[ -f "$RESULT_JSON" ]]; then
    node tools/testing/summarize-playwright-results.mjs "$RESULT_JSON"
else
    echo "[agent-e2e] JSON report was not generated."
fi

if [[ $TEST_EXIT_CODE -ne 0 ]]; then
    echo "[agent-e2e] Failures detected. Open report with: npm run test:e2e:report"
fi

exit "$TEST_EXIT_CODE"
