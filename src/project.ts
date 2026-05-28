import { exec } from 'node:child_process';
import * as path from 'node:path';
import { promisify } from 'node:util';
import * as vscode from 'vscode';

import type { ProjectId } from './storage';

const execAsync = promisify(exec);

export async function resolveCurrentProjectId(): Promise<ProjectId> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return { kind: 'untitled' };

  const remote = await tryGetGitOrigin(folder.uri.fsPath);
  if (remote) {
    const parsed = parseRemote(remote);
    if (parsed) return { kind: 'git', ...parsed };
  }

  return { kind: 'untitled', folder: path.basename(folder.uri.fsPath) };
}

async function tryGetGitOrigin(cwd: string): Promise<string | undefined> {
  try {
    const { stdout } = await execAsync('git remote get-url origin', { cwd });
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

// Matches both SSH (git@host:org/repo.git) and HTTPS (https://host/org/repo[.git]).
export function parseRemote(url: string): { org: string; repo: string } | undefined {
  const match = url.match(/[:/]([^/:]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!match) return undefined;
  return { org: match[1], repo: match[2] };
}
