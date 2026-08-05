import { writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';

interface TabSnapshot {
  readonly active: boolean;
  readonly inputType: string;
  readonly label: string;
  readonly uri?: string;
  readonly viewType?: string;
}

interface GroupSnapshot {
  readonly active: boolean;
  readonly tabs: readonly TabSnapshot[];
  readonly viewColumn: vscode.ViewColumn;
}

interface LayoutSnapshot {
  readonly activeEditor?: string;
  readonly groups: readonly GroupSnapshot[];
  readonly label: string;
}

function snapshot(label: string): LayoutSnapshot {
  return {
    label,
    activeEditor: vscode.window.activeTextEditor?.document.uri.toString(),
    groups: vscode.window.tabGroups.all.map(group => ({
      active: group.isActive,
      viewColumn: group.viewColumn,
      tabs: group.tabs.map(tab => {
        const input = tab.input as unknown as {
          readonly constructor: { readonly name: string };
          readonly uri?: vscode.Uri;
          readonly viewType?: string;
        };
        return {
          active: tab.isActive,
          inputType: input.constructor.name,
          label: tab.label,
          uri: input.uri?.toString(),
          viewType: input.viewType
        };
      })
    }))
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

export async function run(): Promise<void> {
  const direction = process.env.QUICKLOOK_SPLIT_DIRECTION === 'down' ? 'down' : 'right';
  await vscode.workspace.getConfiguration('quicklook').update(
    'markdownInitialView',
    'source',
    vscode.ConfigurationTarget.Global
  );
  await vscode.workspace.getConfiguration('workbench.editor').update(
    'openSideBySideDirection',
    direction,
    vscode.ConfigurationTarget.Global
  );

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error('Integration test requires a workspace folder.');
  }

  const uri = vscode.Uri.joinPath(workspaceFolder.uri, 'README.md');
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document, {
    viewColumn: vscode.ViewColumn.One,
    preserveFocus: false,
    preview: false
  });
  await delay(500);

  const snapshots: LayoutSnapshot[] = [snapshot(`${direction}:source`)];
  await vscode.commands.executeCommand('markdown.showPreviewToSide', uri);
  await delay(750);
  snapshots.push(snapshot(`${direction}:split`));

  await vscode.window.showTextDocument(document, {
    viewColumn: vscode.ViewColumn.One,
    preserveFocus: false,
    preview: false
  });
  await delay(750);
  snapshots.push(snapshot(`${direction}:group-1-focused`));

  const resultPath = path.join(__dirname, '..', `split-integration-result-${direction}.json`);
  await writeFile(resultPath, JSON.stringify(snapshots, undefined, 2), 'utf8');

  const finalSnapshot = snapshots.at(-1)!;
  if (finalSnapshot.groups.length !== 2) {
    throw new Error(`Group 1 focus collapsed split; see ${resultPath}`);
  }
}
