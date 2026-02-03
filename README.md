# Mac Diff Tool

A simple, browser-based diff tool. No installation required - just open and use.

## Quick Start

- Simply double-click `diff.html` to open it in your default browser


## Usage

1. Paste your original text in the left text area
2. Paste the changed text in the right text area
3. Click **Find Difference** (or press `Cmd+Enter`)
4. View the highlighted differences below

### Features

- **Color-coded diffs**: Removed lines shown in red, added lines in green
- **Side-by-side view**: Easy comparison of original vs changed text
- **Line numbers**: Track exactly where changes occurred
- **Synced scrolling**: Both panels scroll together
- **Swap button**: Quickly swap the two texts
- **Clear button**: Reset everything

### Keyboard Shortcut

- `Cmd+Enter` - Find differences

## Requirements

- Any modern web browser (Safari, Chrome, Firefox)
- No internet connection required
- No additional tools or dependencies

## Optional: Create a Desktop Mac App

To make it feel more like a native app, you can create a simple wrapper:

1. Open **Automator** (search in Spotlight)
2. Choose **Application**
3. Search for "Run Shell Script" and drag it to the workflow
4. Paste this command (update the path):
   ```bash
   open /Users/YOUR_USERNAME/Non_Work/Projects/mac-diff-tool/diff.html
   ```
5. Save as "Diff Tool" to your Applications folder

Now you can launch it from Spotlight like any other app.

## License

MIT - Free to use and modify.
