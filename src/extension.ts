import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';

import {
  copyAbsolutePath,
  createMemo,
  createMemoAtRoot,
  deleteMemo,
  newFolder,
  openInNewWindow,
  pickAndSetRootPath,
  renameMemo,
  revealRootInOS,
  togglePreview,
} from './commands';
import { resolveCurrentProjectId } from './project';
import { SettingsPanel } from './settingsPanel';
import { exists, getRootPath, isInsideMemoRoot } from './storage';
import { MemoTreeDataProvider, type Element, type MemoTreeItem } from './tree';

function displayPath(p: string): string {
  const home = os.homedir();
  if (p === home) return '~';
  if (p.startsWith(home + path.sep)) return '~' + p.slice(home.length);
  return p;
}

export function activate(context: vscode.ExtensionContext): void {
  const memoTree = new MemoTreeDataProvider();
  const memoView = vscode.window.createTreeView<Element>('projectMemo.main', {
    treeDataProvider: memoTree,
    showCollapseAll: true,
  });
  context.subscriptions.push(memoView);

  const updateDescription = (): void => {
    const root = getRootPath();
    memoView.description = root ? displayPath(root) : '(not set)';
  };

  const updateTreeMessage = async (): Promise<void> => {
    const id = await resolveCurrentProjectId();
    memoView.message =
      id.kind === 'git'
        ? undefined
        : 'Project Memo is unavailable: no git remote (origin) is set';
  };

  const refreshAll = (): void => {
    memoTree.refresh();
    updateDescription();
    void updateTreeMessage();
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('projectMemo.refresh', refreshAll),
    vscode.commands.registerCommand('projectMemo.createMemo', async (item?: MemoTreeItem) => {
      await createMemo(item);
      refreshAll();
    }),
    vscode.commands.registerCommand('projectMemo.createMemoAtRoot', async () => {
      await createMemoAtRoot();
      refreshAll();
    }),
    vscode.commands.registerCommand('projectMemo.revealRootInOS', revealRootInOS),
    vscode.commands.registerCommand('projectMemo.openInNewWindow', openInNewWindow),
    vscode.commands.registerCommand('projectMemo.newFolder', async (item?: MemoTreeItem) => {
      await newFolder(item);
      refreshAll();
    }),
    vscode.commands.registerCommand('projectMemo.renameMemo', async (item: MemoTreeItem) => {
      await renameMemo(item);
      refreshAll();
    }),
    vscode.commands.registerCommand('projectMemo.deleteMemo', async (item: MemoTreeItem) => {
      await deleteMemo(item);
      refreshAll();
    }),
    vscode.commands.registerCommand('projectMemo.togglePreview', togglePreview),
    vscode.commands.registerCommand('projectMemo.setRootPath', pickAndSetRootPath),
    vscode.commands.registerCommand('projectMemo.copyAbsolutePath', copyAbsolutePath),
    vscode.commands.registerCommand('projectMemo.openSettings', () => {
      SettingsPanel.show(context.extensionUri);
    }),
  );

  const updateIsMemoFileContext = (): void => {
    const editor = vscode.window.activeTextEditor;
    const root = getRootPath();
    const isMemo =
      !!editor &&
      !!root &&
      editor.document.uri.scheme === 'file' &&
      editor.document.fileName.endsWith('.md') &&
      isInsideMemoRoot(editor.document.fileName, root);
    void vscode.commands.executeCommand('setContext', 'projectMemo.isMemoFile', isMemo);
  };

  const updateRootPathSetContext = (): void => {
    void vscode.commands.executeCommand('setContext', 'projectMemo.rootPathSet', !!getRootPath());
  };

  const updateHasGitRemoteContext = async (): Promise<void> => {
    const id = await resolveCurrentProjectId();
    void vscode.commands.executeCommand('setContext', 'projectMemo.hasGitRemote', id.kind === 'git');
  };

  const promptIfRootMissing = async (): Promise<void> => {
    const root = getRootPath();
    const message = !root
      ? 'Project Memo: memo root is not set. Please choose a folder.'
      : (await exists(root))
        ? undefined
        : `Project Memo: root "${displayPath(root)}" not found. Choose a folder?`;
    if (!message) return;
    const choice = await vscode.window.showInformationMessage(message, 'Choose folder…', 'Later');
    if (choice === 'Choose folder…') {
      await pickAndSetRootPath();
    }
  };

  let rootWatcher: vscode.FileSystemWatcher | undefined;
  const setupRootWatcher = (): void => {
    rootWatcher?.dispose();
    const root = getRootPath();
    if (!root) return;
    const pattern = new vscode.RelativePattern(vscode.Uri.file(root), '**/*');
    rootWatcher = vscode.workspace.createFileSystemWatcher(pattern);
    rootWatcher.onDidCreate(refreshAll);
    rootWatcher.onDidDelete(refreshAll);
    context.subscriptions.push(rootWatcher);
  };

  const cleanupEmptyUntitled = async (uri: vscode.Uri): Promise<void> => {
    if (uri.scheme !== 'file') return;
    const root = getRootPath();
    if (!root || !isInsideMemoRoot(uri.fsPath, root)) return;
    if (!/^Untitled(-\d+)?\.md$/.test(path.basename(uri.fsPath))) return;
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.size === 0) {
        await vscode.workspace.fs.delete(uri, { useTrash: false });
      }
    } catch {
      /* file may have been renamed/deleted already */
    }
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(updateIsMemoFileContext),
    vscode.window.tabGroups.onDidChangeTabs((e) => {
      for (const tab of e.closed) {
        if (tab.input instanceof vscode.TabInputText) {
          void cleanupEmptyUntitled(tab.input.uri);
        }
      }
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      refreshAll();
      void updateHasGitRemoteContext();
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration('projectMemo')) return;
      refreshAll();
      updateIsMemoFileContext();
      updateRootPathSetContext();
      setupRootWatcher();
      void promptIfRootMissing();
    }),
  );

  updateIsMemoFileContext();
  updateRootPathSetContext();
  setupRootWatcher();
  updateDescription();
  void updateTreeMessage();
  void promptIfRootMissing();

  // Flip the loaded flag after initial async work so the real welcome/UI replaces "Loading...".
  void updateHasGitRemoteContext().then(() => {
    void vscode.commands.executeCommand('setContext', 'projectMemo.loaded', true);
  });
}

export function deactivate(): void {}
