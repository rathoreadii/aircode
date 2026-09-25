import * as vscode from 'vscode';
import { AirCodeCompletionProvider } from './completionProvider';
import { AirCodeChatViewProvider } from './chatViewProvider';

export function activate(context: vscode.ExtensionContext) {
  const completionProvider = new AirCodeCompletionProvider();

  const inlineRegistration = vscode.languages.registerInlineCompletionItemProvider(
    { pattern: '**' },
    completionProvider
  );

  const chatProvider = new AirCodeChatViewProvider(
    context.extensionUri,
    (newProfile) => completionProvider.setHardwareProfile(newProfile)
  );

  const viewRegistration = vscode.window.registerWebviewViewProvider(
    AirCodeChatViewProvider.viewType,
    chatProvider
  );

  context.subscriptions.push(inlineRegistration, viewRegistration);
}

export function deactivate() {}