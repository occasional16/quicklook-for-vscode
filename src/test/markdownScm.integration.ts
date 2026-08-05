import { writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { isMarkdownDynamicPreviewViewType } from '../markdownViewState';

interface TabSnapshot {
  readonly active: boolean;
  readonly inputType: string;
  readonly label: string;
  readonly modified?: string;
  readonly original?: string;
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

interface GitApi {
  readonly repositories: readonly GitRepository[];
  getRepository(uri: vscode.Uri): GitRepository | null;
  toGitUri(uri: vscode.Uri, ref: string): vscode.Uri;
}

interface GitRepository {
  readonly rootUri: vscode.Uri;
  readonly state: { readonly HEAD?: { readonly commit?: string } };
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
          readonly constructor?: { readonly name?: string };
          readonly modified?: vscode.Uri;
          readonly original?: vscode.Uri;
          readonly uri?: vscode.Uri;
          readonly viewType?: string;
        } | undefined;
        const inputType = tab.input instanceof vscode.TabInputTextDiff
          ? 'TabInputTextDiff'
          : tab.input instanceof vscode.TabInputText
            ? 'TabInputText'
            : tab.input instanceof vscode.TabInputCustom
              ? 'TabInputCustom'
              : tab.input instanceof vscode.TabInputWebview
                ? 'TabInputWebview'
                : input?.constructor?.name ?? typeof tab.input;
        return {
          active: tab.isActive,
          inputType,
          label: tab.label,
          modified: input?.modified?.toString(),
          original: input?.original?.toString(),
          uri: input?.uri?.toString(),
          viewType: input?.viewType
        };
      })
    }))
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function activeTab(snapshotValue: LayoutSnapshot): TabSnapshot | undefined {
  return snapshotValue.groups.find(group => group.active)?.tabs.find(tab => tab.active);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function closeEditors(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  await vscode.commands.executeCommand('workbench.action.editorLayoutSingle');
  await delay(350);
}

async function openLocalSource(uri: vscode.Uri): Promise<void> {
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document, {
    viewColumn: vscode.ViewColumn.One,
    preserveFocus: false,
    preview: false
  });
  await delay(500);

  const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
  if (tab?.input instanceof vscode.TabInputCustom) {
    await vscode.commands.executeCommand('markdown.reopenAsSource');
    await delay(500);
  }
}

async function openDiff(original: vscode.Uri, modified: vscode.Uri, label: string): Promise<void> {
  await vscode.commands.executeCommand('vscode.diff', original, modified, label, {
    viewColumn: vscode.ViewColumn.One,
    preserveFocus: false,
    preview: false
  });
  await delay(1_200);
}

async function waitForRepository(gitApi: GitApi, uri: vscode.Uri): Promise<GitRepository> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const repository = gitApi.getRepository(uri)
      ?? gitApi.repositories.find(candidate => uri.fsPath.startsWith(candidateRoot(candidate)));
    if (repository?.state.HEAD?.commit) {
      return repository;
    }
    await delay(250);
  }

  throw new Error(`Integration test could not resolve a Git repository for ${uri.fsPath}.`);

  function candidateRoot(repository: GitRepository): string {
    return repository.rootUri.fsPath;
  }
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
  await vscode.workspace.getConfiguration('workbench').update(
    'diffEditorAssociations',
    { '*.md': 'default' },
    vscode.ConfigurationTarget.Global
  );

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error('Integration test requires a workspace folder.');
  }

  const extension = vscode.extensions.getExtension('occasional16.preview-all-in-one-with-quicklook');
  await extension?.activate();

  const gitExtension = vscode.extensions.getExtension<{ getAPI(version: 1): GitApi }>('vscode.git');
  if (!gitExtension) {
    throw new Error('Built-in Git extension is unavailable.');
  }
  const gitApi = (await gitExtension.activate()).getAPI(1);

  const uri = vscode.Uri.joinPath(workspaceFolder.uri, 'README.md');
  const secondUri = vscode.Uri.joinPath(workspaceFolder.uri, 'README.zh-CN.md');
  const repository = await waitForRepository(gitApi, uri);
  const headCommit = repository.state.HEAD?.commit;
  if (!headCommit) {
    throw new Error('Integration test requires a Git repository with HEAD.');
  }

  const headUri = gitApi.toGitUri(uri, headCommit);
  const secondHeadUri = gitApi.toGitUri(secondUri, headCommit);
  const indexUri = gitApi.toGitUri(uri, '');
  const snapshots: LayoutSnapshot[] = [];
  const resultPath = path.join(__dirname, '..', `scm-integration-result-${direction}.json`);

  const record = async (value: LayoutSnapshot): Promise<void> => {
    snapshots.push(value);
    await writeFile(resultPath, JSON.stringify(snapshots, undefined, 2), 'utf8');
  };

  await closeEditors();
  await openLocalSource(uri);
  await openDiff(headUri, uri, `${path.basename(uri.fsPath)} (Working Tree)`);
  const sourceSnapshot = snapshot(`${direction}:scm-source`);
  await record(sourceSnapshot);
  assert(sourceSnapshot.groups.length === 1, 'SCM source must use exactly one Group.');
  assert(
    activeTab(sourceSnapshot)?.inputType === 'TabInputTextDiff',
    `SCM source must keep the native Diff input: ${JSON.stringify(sourceSnapshot)}`
  );

  await openDiff(secondHeadUri, secondUri, `${path.basename(secondUri.fsPath)} (Working Tree)`);
  const switchedSourceSnapshot = snapshot(`${direction}:scm-source-second-file`);
  await record(switchedSourceSnapshot);
  assert(switchedSourceSnapshot.groups.length === 1, 'Switching SCM Markdown must preserve source in one Group.');
  assert(
    activeTab(switchedSourceSnapshot)?.inputType === 'TabInputTextDiff'
      && activeTab(switchedSourceSnapshot)?.modified === secondUri.toString(),
    'SCM source must switch to the second native Diff.'
  );

  await openLocalSource(uri);
  await vscode.commands.executeCommand('markdown.reopenAsPreview');
  await delay(700);
  await openDiff(headUri, indexUri, `${path.basename(uri.fsPath)} (Staged)`);
  const previewSnapshot = snapshot(`${direction}:scm-preview`);
  await record(previewSnapshot);
  assert(previewSnapshot.groups.length === 1, 'SCM preview must use exactly one Group.');
  const previewTab = activeTab(previewSnapshot);
  assert(previewTab?.inputType === 'TabInputCustom', 'SCM preview must use the native custom Markdown preview.');
  assert(previewTab.uri === indexUri.toString(), 'Staged preview must use the modified index URI.');

  await openDiff(secondHeadUri, secondUri, `${path.basename(secondUri.fsPath)} (Working Tree Preview)`);
  const switchedPreviewSnapshot = snapshot(`${direction}:scm-preview-second-file`);
  await record(switchedPreviewSnapshot);
  assert(switchedPreviewSnapshot.groups.length === 1, 'Switching SCM Markdown must preserve preview in one Group.');
  const switchedPreviewTab = activeTab(switchedPreviewSnapshot);
  assert(
    switchedPreviewTab?.inputType === 'TabInputCustom'
      && switchedPreviewTab.uri === secondUri.toString(),
    'SCM preview must switch to the modified side of the second Diff.'
  );

  await openLocalSource(uri);
  await vscode.commands.executeCommand('markdown.showPreviewToSide', uri);
  await delay(800);
  await openLocalSource(uri);
  await openDiff(headUri, uri, `${path.basename(uri.fsPath)} (Working Tree Split)`);
  const splitSnapshot = snapshot(`${direction}:scm-split`);
  await record(splitSnapshot);
  assert(splitSnapshot.groups.length === 2, 'SCM split must use exactly two Groups.');
  const group1 = splitSnapshot.groups.find(group => group.viewColumn === vscode.ViewColumn.One);
  const group2 = splitSnapshot.groups.find(group => group.viewColumn === vscode.ViewColumn.Two);
  assert(group1?.tabs.some(tab => tab.active && tab.inputType === 'TabInputTextDiff'), 'Group 1 must keep the native Diff.');
  assert(group2?.tabs.some(tab => tab.active && isMarkdownDynamicPreviewViewType(tab.viewType)), 'Group 2 must contain the native Markdown preview.');

  await openDiff(headUri, uri, `${path.basename(uri.fsPath)} (Working Tree Split)`);
  const focusedSnapshot = snapshot(`${direction}:scm-split-group-1-focused`);
  await record(focusedSnapshot);
  assert(focusedSnapshot.groups.length === 2, 'Focusing Group 1 must not collapse SCM split.');

  await openDiff(secondHeadUri, secondUri, `${path.basename(secondUri.fsPath)} (Working Tree Split)`);
  const switchedSnapshot = snapshot(`${direction}:scm-split-second-file`);
  await record(switchedSnapshot);
  assert(switchedSnapshot.groups.length === 2, 'Switching SCM Markdown must preserve the split layout.');
  const switchedGroup1 = switchedSnapshot.groups.find(group => group.viewColumn === vscode.ViewColumn.One);
  const switchedGroup2 = switchedSnapshot.groups.find(group => group.viewColumn === vscode.ViewColumn.Two);
  assert(
    switchedGroup1?.tabs.some(tab => tab.active
      && tab.inputType === 'TabInputTextDiff'
      && tab.modified === secondUri.toString()),
    'Group 1 must switch to the second native Markdown Diff.'
  );
  assert(
    switchedGroup2?.tabs.some(tab => tab.active && isMarkdownDynamicPreviewViewType(tab.viewType)),
    'Group 2 must keep a live Markdown preview after switching SCM files.'
  );
}
