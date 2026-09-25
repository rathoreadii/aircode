import * as vscode from 'vscode';
import { HARDWARE_PROFILES } from './hardwareProfiles';

export class AirCodeCompletionProvider implements vscode.InlineCompletionItemProvider {
  private activeController: AbortController | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private activeProfileKey = '8gb';

  public setHardwareProfile(profileKey: string) {
    if (HARDWARE_PROFILES[profileKey]) {
      this.activeProfileKey = profileKey;
    }
  }

  public async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[]> {
    if (this.activeController) {
      this.activeController.abort();
      this.activeController = null;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    const config = vscode.workspace.getConfiguration('aircode');
    const debounceMs = config.get<number>('debounceMs', 250);
    const endpoint = config.get<string>('ollamaEndpoint', 'http://127.0.0.1:11434');

    await new Promise<void>((resolve) => {
      this.debounceTimer = setTimeout(() => resolve(), debounceMs);
    });

    if (token.isCancellationRequested) {
      return [];
    }

    const maxChars = 2000;
    const prefix = document.getText(
      new vscode.Range(new vscode.Position(Math.max(0, position.line - 60), 0), position)
    );
    const suffix = document.getText(
      new vscode.Range(position, new vscode.Position(position.line + 60, 0))
    );

    const truncatedPrefix = prefix.slice(-maxChars);
    const truncatedSuffix = suffix.slice(0, maxChars);
    const prompt = `<fim_prefix>${truncatedPrefix}<fim_suffix>${truncatedSuffix}<fim_middle>`;

    this.activeController = new AbortController();
    token.onCancellationRequested(() => {
      this.activeController?.abort();
    });

    const model = HARDWARE_PROFILES[this.activeProfileKey].inlineModel;

    try {
      const response = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: this.activeController.signal,
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            stop: ['<fim_prefix>', '<fim_suffix>', '<fim_middle>', '<|endoftext|>', '<|file_separator|>'],
            temperature: 0.1,
            num_predict: 128
          }
        })
      });

      if (!response.ok || token.isCancellationRequested) {
        return [];
      }

      const data = (await response.json()) as { response: string };
      const rawText = data.response;

      if (!rawText || rawText.trim().length === 0) {
        return [];
      }

      return [
        new vscode.InlineCompletionItem(
          rawText,
          new vscode.Range(position, position)
        )
      ];
    } catch {
      return [];
    }
  }
}