import * as crypto from 'node:crypto';
import * as vscode from 'vscode';

type ToWebview =
  | { type: 'init'; rootPath: string }
  | { type: 'folderPicked'; path: string }
  | { type: 'saved' };

type FromWebview =
  | { type: 'ready' }
  | { type: 'pickFolder' }
  | { type: 'save'; rootPath: string }
  | { type: 'reset' };

export class SettingsPanel {
  private static current: SettingsPanel | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  static show(extensionUri: vscode.Uri): void {
    if (SettingsPanel.current) {
      SettingsPanel.current.panel.reveal();
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      'projectMemo.settings',
      'Project Memo Settings',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist', 'webview')],
      },
    );
    SettingsPanel.current = new SettingsPanel(panel, extensionUri);
  }

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
  ) {
    panel.iconPath = vscode.Uri.joinPath(extensionUri, 'media', 'activity-bar.svg');
    panel.webview.html = this.getHtml(panel.webview, extensionUri);
    panel.onDidDispose(() => this.dispose(), null, this.disposables);
    panel.webview.onDidReceiveMessage(
      (msg: FromWebview) => this.onMessage(msg),
      null,
      this.disposables,
    );
  }

  private async onMessage(msg: FromWebview): Promise<void> {
    const cfg = vscode.workspace.getConfiguration('projectMemo');
    switch (msg.type) {
      case 'ready':
        await this.sendInit();
        break;
      case 'pickFolder': {
        const picked = await vscode.window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          openLabel: 'Use as memo root',
          title: 'Project Memo: Choose root folder',
        });
        if (picked?.[0]) {
          this.post({ type: 'folderPicked', path: picked[0].fsPath });
        }
        break;
      }
      case 'save':
        await cfg.update('rootPath', msg.rootPath, vscode.ConfigurationTarget.Global);
        this.post({ type: 'saved' });
        await this.sendInit();
        break;
      case 'reset':
        await cfg.update('rootPath', undefined, vscode.ConfigurationTarget.Global);
        await this.sendInit();
        break;
    }
  }

  private async sendInit(): Promise<void> {
    const cfg = vscode.workspace.getConfiguration('projectMemo');
    this.post({
      type: 'init',
      rootPath: cfg.get<string>('rootPath') ?? '',
    });
  }

  private post(msg: ToWebview): void {
    void this.panel.webview.postMessage(msg);
  }

  private getHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'settings.js'),
    );
    const nonce = crypto.randomBytes(16).toString('base64');
    const csp = [
      `default-src 'none'`,
      `img-src ${webview.cspSource} https: data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `font-src ${webview.cspSource}`,
      `script-src 'nonce-${nonce}'`,
    ].join('; ');

    return /* html */ `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>Project Memo Settings</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      padding: 24px 32px;
      max-width: 720px;
    }
    h1 {
      font-size: 1.4rem;
      font-weight: 600;
      margin: 0 0 24px;
    }
    section {
      margin-bottom: 28px;
    }
    .label {
      font-weight: 600;
      margin-bottom: 6px;
    }
    .row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .row vscode-textfield {
      flex: 1;
    }
    .hint {
      color: var(--vscode-descriptionForeground);
      font-size: 0.85rem;
      margin: 6px 0 0;
      line-height: 1.5;
    }
    .info-block {
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-editorWidget-border);
      padding: 10px 12px;
      border-radius: 4px;
    }
    .info-row {
      display: flex;
      gap: 12px;
      align-items: baseline;
      font-size: 0.9rem;
      padding: 2px 0;
    }
    .info-row .key {
      color: var(--vscode-descriptionForeground);
      min-width: 140px;
    }
    .info-row .value {
      font-family: var(--vscode-editor-font-family);
      word-break: break-all;
    }
    .actions {
      display: flex;
      gap: 12px;
      margin-top: 32px;
    }
    .saved-notice {
      display: inline-block;
      margin-left: 8px;
      color: var(--vscode-charts-green, var(--vscode-foreground));
      opacity: 0;
      transition: opacity 0.2s;
      align-self: center;
    }
    .saved-notice.show {
      opacity: 1;
    }
    vscode-divider {
      margin: 24px 0;
    }
    .tip {
      margin-top: 12px;
      padding: 10px 12px;
      border-left: 3px solid var(--vscode-textBlockQuote-border, var(--vscode-focusBorder));
      background: var(--vscode-textBlockQuote-background, var(--vscode-editorWidget-background));
      font-size: 0.9rem;
      line-height: 1.5;
      color: var(--vscode-foreground);
    }
    .tip strong {
      font-weight: 600;
    }
  </style>
</head>
<body>
  <h1>Project Memo Settings</h1>

  <section>
    <div class="label">Memo root folder</div>
    <div class="row">
      <vscode-textfield id="rootPath" placeholder="e.g. ~/Dropbox/project-memo"></vscode-textfield>
      <vscode-button id="browse" secondary>Browse…</vscode-button>
    </div>
    <p class="hint"><code>~</code> expands to your home directory.</p>
    <div class="tip">
      💡 <strong>Tip:</strong> Choose a folder inside Dropbox / iCloud Drive / Google Drive (or any synced folder) to share your memos across multiple machines.
    </div>
  </section>

  <div class="actions">
    <vscode-button id="save">Save</vscode-button>
    <vscode-button id="reset" secondary>Reset to defaults</vscode-button>
    <span class="saved-notice" id="savedNotice">✓ Saved</span>
  </div>

  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private dispose(): void {
    SettingsPanel.current = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }
}
