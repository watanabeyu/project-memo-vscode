# Project Memo

Manage lightweight, project-scoped memos inside VSCode — the kind of notes that are too informal for `README.md` but you still want to keep handy.

- Notes that don't belong in git
- Personal cheat sheets next to each project
- Meeting notes, debug steps, environment setup
- Everything kept in a single synced folder (Dropbox / iCloud Drive / Google Drive)

## How it works

Open the **Project Memo** view from the Activity Bar. The sidebar shows two sections:

| Section | Contents |
|---|---|
| `{org}/{repo}` | Memos for the currently opened git project, auto-detected from `git remote origin`. New memos are created here. |
| **All memos** | Full tree of every memo under your memo root. |

If the current workspace has no `git remote origin`, the project section is replaced with an info note — memos still work but get saved at the root of your memo folder.

## Settings

Click the gear icon in the view title bar to open the settings panel.

| Setting | Description |
|---|---|
| `projectMemo.rootPath` | Root folder where memos are stored. Point it inside a synced folder to share across machines. `~` expands to home. |

## Storage layout

```
{rootPath}/
├── scratch.md                 # loose root-level memo
├── {org}/
│   └── {repo}/
│       ├── memo.md
│       └── debug.md
└── another-org/
    └── another-repo/
        └── memo.md
```

- Files are plain `.md` — readable / editable outside of VSCode
- Sync is delegated to the folder provider (Dropbox / iCloud Drive / etc.)

## Features

- **New memo** — creates `Untitled.md` and opens it. Close without typing and the file is auto-deleted (nothing left behind)
- **Rename / Delete / Copy absolute path** — inline icons on hover, or right-click menu
- **Markdown preview** — toggle button on the editor title bar
- **Per-machine sync** — pick a folder inside a sync service; the extension does not implement its own sync layer

## Requirements

- VSCode 1.90 or later

## Known limitations

- Search across all memo contents is not implemented yet
- Only `.md` files are tracked

## License

[MIT](./LICENSE)
