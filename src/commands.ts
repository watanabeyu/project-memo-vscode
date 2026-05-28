import * as path from 'node:path';
import * as vscode from 'vscode';

import { resolveCurrentProjectId } from './project';
import { ensureDir, exists, getRootPath, projectDir } from './storage';
import type { MemoTreeItem } from './tree';

function ensureMdExtension(name: string): string {
  return name.endsWith('.md') ? name : `${name}.md`;
}

async function resolveTargetDir(item: MemoTreeItem | undefined): Promise<string | undefined> {
  if (item) {
    if (item.kind === 'file') return path.dirname(item.uri.fsPath);
    return item.uri.fsPath;
  }
  const root = getRootPath();
  if (!root) {
    vscode.window.showErrorMessage('Project Memo: rootPath is not set. Please check the settings.');
    return undefined;
  }
  const id = await resolveCurrentProjectId();
  return projectDir(root, id);
}

async function uniqueMemoName(dir: string, base: string): Promise<string> {
  const ext = path.extname(base) || '.md';
  const stem = path.basename(base, ext);
  let candidate = ensureMdExtension(base);
  let n = 2;
  while (await exists(path.join(dir, candidate))) {
    candidate = `${stem}-${n}${ext}`;
    n++;
  }
  return candidate;
}

async function createMemoIn(dir: string): Promise<void> {
  await ensureDir(dir);
  const name = await uniqueMemoName(dir, 'Untitled.md');
  const uri = vscode.Uri.file(path.join(dir, name));
  await vscode.workspace.fs.writeFile(uri, new Uint8Array());
  await vscode.commands.executeCommand('vscode.open', uri);
}

export async function createMemo(item?: MemoTreeItem): Promise<void> {
  const dir = await resolveTargetDir(item);
  if (!dir) return;
  await createMemoIn(dir);
}

export async function createMemoAtRoot(): Promise<void> {
  const root = getRootPath();
  if (!root) {
    vscode.window.showErrorMessage('Project Memo: rootPath is not set. Please check the settings.');
    return;
  }
  await createMemoIn(root);
}

export async function revealRootInOS(): Promise<void> {
  const root = getRootPath();
  if (!root) {
    vscode.window.showErrorMessage('Project Memo: rootPath is not set. Please check the settings.');
    return;
  }
  await vscode.env.openExternal(vscode.Uri.file(root));
}

export async function openInNewWindow(item: MemoTreeItem): Promise<void> {
  if (!item) return;
  await vscode.commands.executeCommand('vscode.open', item.uri);
  await vscode.commands.executeCommand('workbench.action.moveEditorToNewWindow');
}

export async function newFolder(item?: MemoTreeItem): Promise<void> {
  const parent = await resolveTargetDir(item);
  if (!parent) return;

  const name = await vscode.window.showInputBox({
    prompt: 'Folder name',
    validateInput: (v) => (v.trim() ? undefined : 'Please enter a name'),
  });
  if (!name) return;

  const target = path.join(parent, name.trim());
  if (await exists(target)) {
    vscode.window.showErrorMessage(`A folder with the same name already exists: ${name}`);
    return;
  }
  await ensureDir(target);
}

export async function renameMemo(item: MemoTreeItem): Promise<void> {
  const oldPath = item.uri.fsPath;
  const oldName = path.basename(oldPath);
  const isFile = item.kind === 'file';

  const input = await vscode.window.showInputBox({
    prompt: isFile ? 'New memo file name' : 'New folder name',
    value: oldName,
    validateInput: (v) => (v.trim() ? undefined : 'Please enter a name'),
  });
  if (!input || input === oldName) return;

  const newName = isFile ? ensureMdExtension(input.trim()) : input.trim();
  const newPath = path.join(path.dirname(oldPath), newName);
  if (await exists(newPath)) {
    vscode.window.showErrorMessage(`An item with the same name already exists: ${newName}`);
    return;
  }

  await vscode.workspace.fs.rename(vscode.Uri.file(oldPath), vscode.Uri.file(newPath));
}

export async function deleteMemo(item: MemoTreeItem): Promise<void> {
  const target = item.uri.fsPath;
  const label = item.kind === 'folder' ? 'folder' : 'memo';
  const confirm = await vscode.window.showWarningMessage(
    `Delete ${label} "${path.basename(target)}"?`,
    { modal: true },
    'Delete',
  );
  if (confirm !== 'Delete') return;

  await vscode.workspace.fs.delete(vscode.Uri.file(target), {
    recursive: item.kind === 'folder',
    useTrash: true,
  });
}

export async function togglePreview(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  await vscode.commands.executeCommand('markdown.showPreview', editor.document.uri);
}

export async function copyAbsolutePath(item: MemoTreeItem): Promise<void> {
  const p = item.uri.fsPath;
  await vscode.env.clipboard.writeText(p);
  vscode.window.setStatusBarMessage(`Copied: ${p}`, 3000);
}

export async function pickAndSetRootPath(): Promise<void> {
  const picked = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: 'Use as memo root',
    title: 'Project Memo: Choose root folder',
  });
  if (!picked || picked.length === 0) return;

  const target = picked[0].fsPath;
  await vscode.workspace
    .getConfiguration('projectMemo')
    .update('rootPath', target, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage(`Project Memo: root set to ${target}`);
}
