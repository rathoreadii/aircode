import * as vscode from 'vscode';
import { HARDWARE_PROFILES } from './hardwareProfiles';

export class AirCodeChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'aircode.chatView';
  private _view?: vscode.WebviewView;
  private _currentProfile = '8gb';
  private _onProfileChanged: (profile: string) => void;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    onProfileChanged: (profile: string) => void
  ) {
    this._onProfileChanged = onProfileChanged;
  }

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'setProfile':
          this._currentProfile = message.profile;
          this._onProfileChanged(message.profile);
          break;
        case 'sendMessage':
          await this._handleChatMessage(message.prompt);
          break;
        case 'init':
          this._view?.webview.postMessage({
            command: 'syncProfiles',
            profiles: HARDWARE_PROFILES,
            selected: this._currentProfile
          });
          break;
      }
    });
  }

  private async _handleChatMessage(prompt: string) {
    const config = vscode.workspace.getConfiguration('aircode');
    const endpoint = config.get<string>('ollamaEndpoint', 'http://127.0.0.1:11434');
    const activeModel = HARDWARE_PROFILES[this._currentProfile].chatModel;

    try {
      const response = await fetch(`${endpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: activeModel,
          messages: [{ role: 'user', content: prompt }],
          stream: true
        })
      });

      if (!response.body) {
        throw new Error('No readable stream received.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const raw = decoder.decode(value, { stream: true });
        const lines = raw.split('\n').filter(Boolean);

        for (const line of lines) {
          const parsed = JSON.parse(line);
          this._view?.webview.postMessage({
            command: 'streamChunk',
            chunk: parsed.message?.content || ''
          });
        }
      }

      this._view?.webview.postMessage({ command: 'streamEnd' });
    } catch (err: any) {
      this._view?.webview.postMessage({
        command: 'streamChunk',
        chunk: `\n\n**Error connecting to Ollama:** ${err.message}. Ensure Ollama is active and model '${activeModel}' is pulled.`
      });
      this._view?.webview.postMessage({ command: 'streamEnd' });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'dist', 'assets', 'index.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'dist', 'assets', 'index.css')
    );

    return /* html */`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" type="text/css" href="${styleUri}">
        <title>AirCode</title>
      </head>
      <body>
        <div id="root"></div>
        <script type="module" src="${scriptUri}"></script>
      </body>
      </html>
    `;
  }
}