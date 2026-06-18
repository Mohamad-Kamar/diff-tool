function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Detect format of text (json, yaml, or text)
function detectFormat(text) {
    const trimmed = text.trim();
    if (!trimmed) return 'text';

    // Try JSON first
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            JSON.parse(trimmed);
            return 'json';
        } catch (e) {
            // Not valid JSON
        }
    }

    // Check for YAML (top-level key: value patterns)
    const lines = trimmed.split('\n');
    let yamlLineCount = 0;
    for (const line of lines.slice(0, 10)) {
        if (/^[\w][\w\-]*:\s/.test(line)) yamlLineCount++;
    }
    if (yamlLineCount >= 2) return 'yaml';

    return 'text';
}

// Sort object keys recursively for JSON
function sortObjectKeys(obj) {
    if (Array.isArray(obj)) {
        return obj.map(sortObjectKeys);
    }
    if (obj !== null && typeof obj === 'object') {
        const sorted = {};
        Object.keys(obj).sort().forEach(key => {
            sorted[key] = sortObjectKeys(obj[key]);
        });
        return sorted;
    }
    return obj;
}

// Normalize JSON string
function normalizeJson(text) {
    try {
        const obj = JSON.parse(text.trim());
        const sorted = sortObjectKeys(obj);
        return JSON.stringify(sorted, null, 2);
    } catch (e) {
        return text; // Return original if parsing fails
    }
}

// Normalize YAML string (top-level keys only)
function normalizeYaml(text) {
    const lines = text.split('\n');
    const blocks = [];
    let currentBlock = [];

    for (const line of lines) {
        // Check if this is a top-level key (no leading whitespace)
        if (/^[\w][\w\-]*:/.test(line) && currentBlock.length > 0) {
            blocks.push(currentBlock);
            currentBlock = [line];
        } else {
            currentBlock.push(line);
        }
    }
    if (currentBlock.length > 0) {
        blocks.push(currentBlock);
    }

    // Sort blocks by their first line (the key)
    blocks.sort((a, b) => a[0].localeCompare(b[0]));

    return blocks.map(block => block.join('\n')).join('\n');
}

// Check and show normalize button if structured data detected
function checkForStructuredData() {
    const text1 = document.getElementById('text1').value;
    const text2 = document.getElementById('text2').value;

    const format1 = detectFormat(text1);
    const format2 = detectFormat(text2);

    // Show normalize option if both are same structured format
    if ((format1 === 'json' && format2 === 'json') ||
        (format1 === 'yaml' && format2 === 'yaml')) {
        document.getElementById('formatBadge').textContent = format1.toUpperCase();
        document.getElementById('normalizeSection').classList.add('visible');
    } else {
        hideNormalizeButton();
    }
}

function hideNormalizeButton() {
    document.getElementById('normalizeSection').classList.remove('visible');
}

function showElement(element) {
    element.hidden = false;
}

function hideElement(element) {
    element.hidden = true;
}

// Normalize both inputs and run diff
function normalizeAndDiff() {
    const text1 = document.getElementById('text1').value;
    const text2 = document.getElementById('text2').value;
    const format = detectFormat(text1);

    if (format === 'json') {
        document.getElementById('text1').value = normalizeJson(text1);
        document.getElementById('text2').value = normalizeJson(text2);
    } else if (format === 'yaml') {
        document.getElementById('text1').value = normalizeYaml(text1);
        document.getElementById('text2').value = normalizeYaml(text2);
    }

    hideNormalizeButton();
    findDiff();
}

// Compute LCS table for two arrays
function computeLCS(arr1, arr2) {
    const m = arr1.length;
    const n = arr2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (arr1[i - 1] === arr2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp;
}

// Get character-level diff between two strings
function getCharDiff(str1, str2) {
    const chars1 = str1.split('');
    const chars2 = str2.split('');
    const dp = computeLCS(chars1, chars2);

    const result = [];
    let i = chars1.length;
    let j = chars2.length;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && chars1[i - 1] === chars2[j - 1]) {
            result.unshift({ type: 'same', char: chars1[i - 1] });
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            result.unshift({ type: 'add', char: chars2[j - 1] });
            j--;
        } else {
            result.unshift({ type: 'del', char: chars1[i - 1] });
            i--;
        }
    }
    return result;
}

// Render inline diff for a modified line
function renderInlineDiff(str1, str2) {
    const diff = getCharDiff(str1, str2);

    let html1 = '';
    let html2 = '';
    let delBuffer = '';
    let addBuffer = '';

    function flushBuffers() {
        if (delBuffer) {
            html1 += `<span class="highlight-removed">${escapeHtml(delBuffer)}</span>`;
            delBuffer = '';
        }
        if (addBuffer) {
            html2 += `<span class="highlight-added">${escapeHtml(addBuffer)}</span>`;
            addBuffer = '';
        }
    }

    diff.forEach(d => {
        if (d.type === 'same') {
            flushBuffers();
            html1 += escapeHtml(d.char);
            html2 += escapeHtml(d.char);
        } else if (d.type === 'del') {
            delBuffer += d.char;
        } else if (d.type === 'add') {
            addBuffer += d.char;
        }
    });
    flushBuffers();

    return { html1, html2 };
}

// Calculate similarity ratio between two strings (0-1)
function similarity(str1, str2) {
    if (!str1 && !str2) return 1;
    if (!str1 || !str2) return 0;

    const chars1 = str1.split('');
    const chars2 = str2.split('');
    const dp = computeLCS(chars1, chars2);
    const lcsLen = dp[chars1.length][chars2.length];
    return (2 * lcsLen) / (chars1.length + chars2.length);
}

// Get line-level diff
function getLineDiff(lines1, lines2) {
    const dp = computeLCS(lines1, lines2);
    const result = [];
    let i = lines1.length;
    let j = lines2.length;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && lines1[i - 1] === lines2[j - 1]) {
            result.unshift({ type: 'unchanged', line1: lines1[i - 1], line2: lines2[j - 1] });
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            result.unshift({ type: 'added', line2: lines2[j - 1] });
            j--;
        } else {
            result.unshift({ type: 'removed', line1: lines1[i - 1] });
            i--;
        }
    }
    return result;
}

// Post-process diff to detect modified lines (similar removed+added pairs)
function detectModifiedLines(diff) {
    const result = [];
    let i = 0;

    while (i < diff.length) {
        const curr = diff[i];

        // Look for removed followed by added (or vice versa) that are similar
        if (curr.type === 'removed' && i + 1 < diff.length && diff[i + 1].type === 'added') {
            const next = diff[i + 1];
            if (similarity(curr.line1, next.line2) > 0.4) {
                result.push({ type: 'modified', line1: curr.line1, line2: next.line2 });
                i += 2;
                continue;
            }
        } else if (curr.type === 'added' && i + 1 < diff.length && diff[i + 1].type === 'removed') {
            const next = diff[i + 1];
            if (similarity(next.line1, curr.line2) > 0.4) {
                result.push({ type: 'modified', line1: next.line1, line2: curr.line2 });
                i += 2;
                continue;
            }
        }

        result.push(curr);
        i++;
    }
    return result;
}

function classifyDiff(added, removed, modified, _unchanged, totalLines) {
    if (totalLines === 0) return { classification: 'Empty', detail: 'Both texts are empty' };
    if (added === 0 && removed === 0 && modified === 0) {
        return { classification: 'Identical', detail: 'No differences found' };
    }

    const changedLines = added + removed + modified;
    const changeRatio = changedLines / totalLines;

    let classification;
    if (changeRatio < 0.1) {
        classification = 'Minor edit';
    } else if (changeRatio < 0.3) {
        classification = 'Moderate changes';
    } else if (added > removed * 2 && added > modified) {
        classification = 'Mostly additions';
    } else if (removed > added * 2 && removed > modified) {
        classification = 'Mostly removals';
    } else {
        classification = 'Significant rewrite';
    }

    const percent = Math.round(changeRatio * 100);
    const detail = `${changedLines} line${changedLines !== 1 ? 's' : ''} changed out of ${totalLines} (${percent}%)`;

    return { classification, detail };
}

function findDiff() {
    const text1 = document.getElementById('text1').value;
    const text2 = document.getElementById('text2').value;

    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');

    const rawDiff = getLineDiff(lines1, lines2);
    const diff = detectModifiedLines(rawDiff);

    let removals = 0;
    let additions = 0;
    let modified = 0;
    let unchanged = 0;
    let html1 = '';
    let html2 = '';
    let lineNum1 = 0;
    let lineNum2 = 0;

    diff.forEach(d => {
        if (d.type === 'unchanged') {
            lineNum1++;
            lineNum2++;
            unchanged++;
            html1 += `<div class="diff-line line-unchanged">
                <span class="line-number">${lineNum1}</span>
                <span class="line-content">${escapeHtml(d.line1)}</span>
            </div>`;
            html2 += `<div class="diff-line line-unchanged">
                <span class="line-number">${lineNum2}</span>
                <span class="line-content">${escapeHtml(d.line2)}</span>
            </div>`;
        } else if (d.type === 'modified') {
            lineNum1++;
            lineNum2++;
            modified++;
            const inline = renderInlineDiff(d.line1, d.line2);
            html1 += `<div class="diff-line line-unchanged">
                <span class="line-number">${lineNum1}</span>
                <span class="line-content">${inline.html1}</span>
            </div>`;
            html2 += `<div class="diff-line line-unchanged">
                <span class="line-number">${lineNum2}</span>
                <span class="line-content">${inline.html2}</span>
            </div>`;
        } else if (d.type === 'removed') {
            lineNum1++;
            removals++;
            html1 += `<div class="diff-line line-removed">
                <span class="line-number">${lineNum1}</span>
                <span class="line-content">${escapeHtml(d.line1)}</span>
            </div>`;
            html2 += `<div class="diff-line">
                <span class="line-number"></span>
                <span class="line-content"></span>
            </div>`;
        } else if (d.type === 'added') {
            lineNum2++;
            additions++;
            html1 += `<div class="diff-line">
                <span class="line-number"></span>
                <span class="line-content"></span>
            </div>`;
            html2 += `<div class="diff-line line-added">
                <span class="line-number">${lineNum2}</span>
                <span class="line-content">${escapeHtml(d.line2)}</span>
            </div>`;
        }
    });

    // Calculate stats
    const totalLines = Math.max(lines1.length, lines2.length);
    const changedLines = additions + removals + modified;
    const percentChanged = totalLines > 0 ? Math.round((changedLines / totalLines) * 100) : 0;

    // Generate summary
    const summary = classifyDiff(additions, removals, modified, unchanged, totalLines);

    // Update DOM
    document.getElementById('diff1').innerHTML = html1 || '<div class="empty-state">No content</div>';
    document.getElementById('diff2').innerHTML = html2 || '<div class="empty-state">No content</div>';
    document.getElementById('removedCount').textContent = removals;
    document.getElementById('addedCount').textContent = additions;
    document.getElementById('modifiedCount').textContent = modified;
    document.getElementById('unchangedCount').textContent = unchanged;
    document.getElementById('percentChanged').textContent = percentChanged;
    document.getElementById('summaryClassification').textContent = summary.classification;
    document.getElementById('summaryDetail').textContent = summary.detail;
    showElement(document.getElementById('summary'));
    showElement(document.getElementById('stats'));
    showElement(document.getElementById('diffSection'));

    // Sync scroll
    const diff1El = document.getElementById('diff1');
    const diff2El = document.getElementById('diff2');
    diff1El.onscroll = () => { diff2El.scrollTop = diff1El.scrollTop; };
    diff2El.onscroll = () => { diff1El.scrollTop = diff2El.scrollTop; };
}

function clearAll() {
    document.getElementById('text1').value = '';
    document.getElementById('text2').value = '';
    document.getElementById('diff1').innerHTML = '';
    document.getElementById('diff2').innerHTML = '';
    hideElement(document.getElementById('stats'));
    hideElement(document.getElementById('summary'));
    hideElement(document.getElementById('diffSection'));
    hideNormalizeButton();
}

function swapTexts() {
    const text1 = document.getElementById('text1');
    const text2 = document.getElementById('text2');
    const temp = text1.value;
    text1.value = text2.value;
    text2.value = temp;
}

function bindEvents() {
    document.getElementById('findDiffBtn').addEventListener('click', findDiff);
    document.getElementById('clearBtn').addEventListener('click', clearAll);
    document.getElementById('swapBtn').addEventListener('click', swapTexts);
    document.getElementById('normalizeBtn').addEventListener('click', normalizeAndDiff);

    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            findDiff();
        }
    });

    document.getElementById('text1').addEventListener('input', checkForStructuredData);
    document.getElementById('text2').addEventListener('input', checkForStructuredData);
}

bindEvents();
