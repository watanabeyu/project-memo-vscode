import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';

export type ProjectId =
  | { kind: 'git'; org: string; repo: string }
  | { kind: 'untitled'; folder?: string };

export function getRootPath(): string {
  const raw = vscode.workspace.getConfiguration('projectMemo').get<string>('rootPath') ?? '';
  return expandTilde(raw);
}

function expandTilde(p: string): string {
  if (!p) return p;
  if (p === '~') return os.homedir();
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  return p;
}

export function projectDir(rootPath: string, id: ProjectId): string {
  switch (id.kind) {
    case 'git':
      return path.join(rootPath, id.org, id.repo);
    case 'untitled':
      return rootPath;
  }
}

export function projectLabel(id: ProjectId): string {
  switch (id.kind) {
    case 'git':
      return `${id.org}/${id.repo}`;
    case 'untitled':
      return '(memo root)';
  }
}

export async function ensureDir(dir: string): Promise<void> {
  await vscode.workspace.fs.createDirectory(vscode.Uri.file(dir));
}

export async function exists(p: string): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(vscode.Uri.file(p));
    return true;
  } catch {
    return false;
  }
}

export function isInsideMemoRoot(filePath: string, rootPath: string): boolean {
  const rel = path.relative(rootPath, filePath);
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}
