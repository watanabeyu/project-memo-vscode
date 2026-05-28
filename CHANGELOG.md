# Changelog

## 1.0.0

Initial release.

- Single `Memo` view in the Activity Bar with two sections
  - `PROJECT MEMO` — memos scoped to the current git project (`{org}/{repo}`)
  - `All memos` — full file tree under the memo root
- Auto-detects current project from `git remote get-url origin`
- Root folder configurable in the settings panel (Dropbox / iCloud Drive / Google Drive recommended)
- Inline actions on hover: rename, copy absolute path, delete
- "New memo" creates `Untitled.md`; closing it empty auto-deletes the file
- Markdown preview toggle button on memo editor title bar
