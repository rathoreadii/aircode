const vscode = typeof acquireVsCodeApi === 'function'
  ? acquireVsCodeApi()
  : { postMessage: () => {} };

export default vscode;