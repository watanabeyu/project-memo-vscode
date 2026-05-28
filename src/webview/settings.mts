import '@vscode-elements/elements/dist/vscode-button';
import '@vscode-elements/elements/dist/vscode-textfield';

declare function acquireVsCodeApi<T = unknown>(): {
  postMessage(msg: T): void;
  setState(state: unknown): void;
  getState(): unknown;
};

type FromExtension =
  | { type: 'init'; rootPath: string }
  | { type: 'folderPicked'; path: string }
  | { type: 'saved' };

type ToExtension =
  | { type: 'ready' }
  | { type: 'pickFolder' }
  | { type: 'save'; rootPath: string }
  | { type: 'reset' };

const vscode = acquireVsCodeApi<ToExtension>();

type ValueEl = HTMLElement & { value: string };

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

const rootPathEl = $<ValueEl>('rootPath');
const savedNoticeEl = $('savedNotice');

window.addEventListener('message', (event) => {
  const msg = event.data as FromExtension;
  switch (msg.type) {
    case 'init':
      rootPathEl.value = msg.rootPath;
      break;
    case 'folderPicked':
      rootPathEl.value = msg.path;
      break;
    case 'saved':
      savedNoticeEl.classList.add('show');
      setTimeout(() => savedNoticeEl.classList.remove('show'), 2000);
      break;
  }
});

$('browse').addEventListener('click', () => {
  vscode.postMessage({ type: 'pickFolder' });
});

$('save').addEventListener('click', () => {
  vscode.postMessage({ type: 'save', rootPath: rootPathEl.value });
});

$('reset').addEventListener('click', () => {
  vscode.postMessage({ type: 'reset' });
});

vscode.postMessage({ type: 'ready' });
