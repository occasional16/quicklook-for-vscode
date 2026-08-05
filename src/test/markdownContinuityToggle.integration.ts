import { writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';

interface LayoutSnapshot {
  readonly activeEditor?: string;
  readonly groups: readonly {
    readonly tabs: readonly {
      readonly inputType: string;
      readonly label: string;
    }[];
    readonly viewColumn: vscode.ViewColumn;
  }[];
  readonly label: string;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function snapshot(label: string): LayoutSnapshot {
  return {
    label,
    activeEditor: vscode.window.activeTextEditor?.document.uri.toString(),
    groups: vscode.window.tabGroups.all.map(group => ({
      viewColumn: group.viewColumn,
      tabs: group.tabs.map(tab => ({
        inputType: (tab.input as { constructor: { name: string } }).constructor.name,
        label: tab.label
      }))
    }))
  };
}

function assertGroupCount(expected: number, label: string): void {
  const actual = vscode.window.tabGroups.all.length;
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected} editor group(s), received ${actual}.`);
  }
}

async function openSource(uri: vscode.Uri): Promise<void> {
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document, {
    viewColumn: vscode.ViewColumn.One,
    preserveFocus: false,
    preview: false
  });
}

export async function run(): Promise<void> {
  const quicklookConfiguration = vscode.workspace.getConfiguration('quicklook');
  await quicklookConfiguration.update('markdownViewContinuity.enabled', false, vscode.ConfigurationTarget.Global);
  await quicklookConfiguration.update('markdownInitialView', 'preview', vscode.ConfigurationTarget.Global);

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error('Integration test requires a workspace folder.');
  }

  const extension = vscode.extensions.getExtension('occasional16.preview-all-in-one-with-quicklook');
  await extension?.activate();
  await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  await vscode.commands.executeCommand('workbench.action.editorLayoutSingle');

  const firstUri = vscode.Uri.joinPath(workspaceFolder.uri, 'README.md');
  const secondUri = vscode.Uri.joinPath(workspaceFolder.uri, 'README.zh-CN.md');
  const snapshots: LayoutSnapshot[] = [];

  await openSource(firstUri);
  await delay(500);
  assertGroupCount(1, 'Disabled continuity changed the explicitly opened source view');
  snapshots.push(snapshot('disabled-source'));

  await quicklookConfiguration.update('markdownViewContinuity.enabled', true, vscode.ConfigurationTarget.Global);
  await delay(750);
  assertGroupCount(1, 'Enabling continuity did not adopt the current source view');
  snapshots.push(snapshot('enabled-current-source'));

  await vscode.commands.executeCommand('markdown.showPreviewToSide', firstUri);
  await delay(750);
  assertGroupCount(2, 'Native split was not observed while continuity was enabled');
  snapshots.push(snapshot('enabled-split'));

  await quicklookConfiguration.update('markdownViewContinuity.enabled', false, vscode.ConfigurationTarget.Global);
  await delay(250);
  assertGroupCount(2, 'Disabling continuity changed the current split layout');

  await openSource(secondUri);
  await delay(750);
  assertGroupCount(2, 'Disabled continuity rearranged the editor groups after a Markdown switch');
  snapshots.push(snapshot('disabled-switch-preserves-layout'));

  await quicklookConfiguration.update('markdownViewContinuity.enabled', true, vscode.ConfigurationTarget.Global);
  await delay(1_000);
  assertGroupCount(2, 'Re-enabled continuity did not adopt the current split layout');
  snapshots.push(snapshot('re-enabled-current-split'));

  const resultPath = path.join(__dirname, '..', 'markdown-continuity-toggle-integration-result.json');
  await writeFile(resultPath, JSON.stringify(snapshots, undefined, 2), 'utf8');
}
