import * as path from 'node:path';
import * as vscode from 'vscode';

import { resolveCurrentProjectId } from './project';
import { exists, getRootPath, projectDir } from './storage';

export type MemoItemKind = 'file' | 'folder';

export class MemoTreeItem extends vscode.TreeItem {
  constructor(
    public readonly uri: vscode.Uri,
    public readonly kind: MemoItemKind,
    label?: string,
  ) {
    super(
      label ?? path.basename(uri.fsPath),
      kind === 'file' ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed,
    );
    this.contextValue = kind;
    this.resourceUri = uri;
    if (kind === 'file') {
      this.command = { command: 'vscode.open', title: 'Open', arguments: [uri] };
    }
  }
}

export type SectionKind = 'project' | 'other';

export class SectionItem extends vscode.TreeItem {
  constructor(
    label: string,
    public readonly section: SectionKind,
    description?: string,
  ) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = `${section}-section`;
    if (description) this.description = description;
  }
}

class ActionItem extends vscode.TreeItem {
  constructor(label: string, commandId: string, iconId: string) {
    super(label);
    this.contextValue = 'action';
    this.iconPath = new vscode.ThemeIcon(iconId);
    this.command = { command: commandId, title: label };
  }
}

class DividerItem extends vscode.TreeItem {
  constructor() {
    super('─────────────────');
    this.contextValue = 'divider';
  }
}

export type Element = MemoTreeItem | SectionItem | ActionItem | DividerItem;

async function listDir(dir: string): Promise<MemoTreeItem[]> {
  const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dir));
  const items = entries
    .filter(([name, type]) => type === vscode.FileType.Directory || (type === vscode.FileType.File && name.endsWith('.md')))
    .map(([name, type]) => {
      const uri = vscode.Uri.file(path.join(dir, name));
      return new MemoTreeItem(uri, type === vscode.FileType.Directory ? 'folder' : 'file');
    });
  items.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
    return String(a.label).localeCompare(String(b.label));
  });
  return items;
}

export class MemoTreeDataProvider implements vscode.TreeDataProvider<Element> {
  private readonly _onDidChange = new vscode.EventEmitter<Element | undefined>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  refresh(): void {
    this._onDidChange.fire(undefined);
  }

  getTreeItem(el: Element): vscode.TreeItem {
    return el;
  }

  async getChildren(el?: Element): Promise<Element[]> {
    if (!el) {
      const root = getRootPath();
      if (!root) return [];
      const id = await resolveCurrentProjectId();
      const elements: Element[] = [];
      if (id.kind === 'git') {
        elements.push(new SectionItem(`${id.org}/${id.repo}`, 'project'));
      }
      elements.push(new DividerItem());
      elements.push(new SectionItem('All memos', 'other'));
      return elements;
    }
    if (el instanceof SectionItem) {
      return el.section === 'project' ? this.getProjectChildren() : this.getOtherChildren();
    }
    if (el instanceof MemoTreeItem && el.kind === 'folder') {
      return listDir(el.uri.fsPath);
    }
    return [];
  }

  private async getProjectChildren(): Promise<Element[]> {
    const root = getRootPath();
    if (!root) return [];
    const id = await resolveCurrentProjectId();
    if (id.kind !== 'git') return [];
    const dir = projectDir(root, id);
    const items = (await exists(dir)) ? await listDir(dir) : [];
    return [...items, new ActionItem('Create new memo', 'projectMemo.createMemo', 'new-file')];
  }

  private async getOtherChildren(): Promise<Element[]> {
    const root = getRootPath();
    if (!root || !(await exists(root))) return [];
    return listDir(root);
  }
}
