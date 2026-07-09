import * as vscode from 'vscode';

const markdownPreviewViewType = 'vscode.markdown.preview.editor';
const configSection = 'quicklook';
const configKey = 'markdownDualPane';
const arrangeDebounceMs = 50;
const supportedSchemes = ['file', 'git', 'gitlens', 'vscode-local-history', 'review'];

let isArranging = false;
let arrangeTimer: ReturnType<typeof setTimeout> | undefined;
let log: (message: string) => void = () => {};

export function activateMarkdownDualPane(
  context: vscode.ExtensionContext,
  logFn: (message: string) => void
): void {
  log = logFn;

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(onActiveEditorChanged),
    { dispose: clearArrangeTimer }
  );

  log('Markdown dual pane feature registered.');
}

function onActiveEditorChanged(editor: vscode.TextEditor | undefined): void {
  clearArrangeTimer();

  if (!editor || !isEnabled() || !isMarkdownFile(editor)) {
    return;
  }

  const uri = editor.document.uri;
  arrangeTimer = setTimeout(() => {
    arrangeTimer = undefined;
    void tryArrangeLayout(uri);
  }, arrangeDebounceMs);
}

function isEnabled(): boolean {
  return vscode.workspace.getConfiguration(configSection).get<boolean>(configKey, true);
}

function isMarkdownFile(editor: vscode.TextEditor): boolean {
  return editor.document.languageId === 'markdown'
    && supportedSchemes.includes(editor.document.uri.scheme);
}

async function tryArrangeLayout(uri: vscode.Uri): Promise<void> {
  if (isArranging) {
    return;
  }

  isArranging = true;
  try {
    await arrangeMarkdownLayout(uri);
  } catch (error) {
    log(`Markdown dual pane layout failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    isArranging = false;
  }
}

async function arrangeMarkdownLayout(uri: vscode.Uri): Promise<void> {
  if (isLayoutAlreadyCorrect(uri)) {
    return;
  }

  log(`Arranging dual pane layout for: ${uri.fsPath || uri.toString()}`);

  // Close existing preview for this file if it is in the wrong group.
  const existingPreview = findPreviewTab(uri);
  if (existingPreview && existingPreview.group.viewColumn !== vscode.ViewColumn.Two) {
    await vscode.window.tabGroups.close(existingPreview.tab);
  }

  const groups = vscode.window.tabGroups.all;
  const group1 = groups.find(g => g.viewColumn === vscode.ViewColumn.One);

  // Open (or activate) the source file in Group 1 (left) only if it's not already active there.
  if (!group1 || !isSourceTab(group1.activeTab, uri)) {
    await vscode.window.showTextDocument(uri, {
      viewColumn: vscode.ViewColumn.One,
      preserveFocus: true
    });
  }

  // Open the preview in Group 2 (right) unless it is already there.
  if (!findPreviewInGroup(uri, vscode.ViewColumn.Two)) {
    await vscode.commands.executeCommand(
      'vscode.openWith',
      uri,
      markdownPreviewViewType,
      { 
        viewColumn: vscode.ViewColumn.Two, 
        preview: true,
        preserveFocus: true
      }
    );
  }

  // Remove editor groups beyond Group 1 and Group 2.
  await closeExtraGroups();

  // Restore Group 1 as the active editor group.
  const finalGroups = vscode.window.tabGroups.all;
  const finalGroup1 = finalGroups.find(g => g.viewColumn === vscode.ViewColumn.One);
  if (finalGroup1 && finalGroup1.activeTab) {
    const tab = finalGroup1.activeTab;
    const isPreview = tab.isPreview;

    if (tab.input instanceof vscode.TabInputTextDiff) {
      await vscode.commands.executeCommand(
        'vscode.diff',
        tab.input.original,
        tab.input.modified,
        tab.label,
        {
          viewColumn: vscode.ViewColumn.One,
          preserveFocus: false
        }
      );
    } else {
      await vscode.window.showTextDocument(uri, {
        viewColumn: vscode.ViewColumn.One,
        preserveFocus: false
      });
    }

    if (isPreview) {
      await vscode.commands.executeCommand('workbench.action.focusSideBar');
    }
  }
}

function isLayoutAlreadyCorrect(uri: vscode.Uri): boolean {
  const groups = vscode.window.tabGroups.all;
  if (groups.length !== 2) {
    return false;
  }

  const uriString = uri.toString();

  const group1 = groups.find(g => g.viewColumn === vscode.ViewColumn.One);
  const group2 = groups.find(g => g.viewColumn === vscode.ViewColumn.Two);
  if (!group1 || !group2) {
    return false;
  }

  const sourceActiveInGroup1 = isSourceTab(group1.activeTab, uri);

  const previewInGroup2 = group2.tabs.some(tab =>
    tab.input instanceof vscode.TabInputCustom
    && tab.input.viewType === markdownPreviewViewType
    && tab.input.uri.toString() === uriString
  );

  return sourceActiveInGroup1 && previewInGroup2;
}

function isSourceTab(tab: vscode.Tab | undefined, uri: vscode.Uri): boolean {
  if (!tab) {
    return false;
  }
  const uriString = uri.toString();
  if (tab.input instanceof vscode.TabInputText) {
    return tab.input.uri.toString() === uriString;
  }
  if (tab.input instanceof vscode.TabInputTextDiff) {
    return tab.input.modified.toString() === uriString;
  }
  return false;
}

function findPreviewTab(uri: vscode.Uri): { tab: vscode.Tab; group: vscode.TabGroup } | undefined {
  const uriString = uri.toString();
  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      if (tab.input instanceof vscode.TabInputCustom
        && tab.input.viewType === markdownPreviewViewType
        && tab.input.uri.toString() === uriString) {
        return { tab, group };
      }
    }
  }
  return undefined;
}

function findPreviewInGroup(uri: vscode.Uri, viewColumn: vscode.ViewColumn): vscode.Tab | undefined {
  const uriString = uri.toString();
  const group = vscode.window.tabGroups.all.find(g => g.viewColumn === viewColumn);
  if (!group) {
    return undefined;
  }

  return group.tabs.find(tab =>
    tab.input instanceof vscode.TabInputCustom
    && tab.input.viewType === markdownPreviewViewType
    && tab.input.uri.toString() === uriString
  );
}

async function closeExtraGroups(): Promise<void> {
  const groups = vscode.window.tabGroups.all;
  if (groups.length <= 2) {
    return;
  }

  // Collect groups that are not Group 1 or Group 2, in descending viewColumn order.
  const extraGroups = groups
    .filter(g => g.viewColumn !== vscode.ViewColumn.One && g.viewColumn !== vscode.ViewColumn.Two)
    .sort((a, b) => (b.viewColumn ?? 0) - (a.viewColumn ?? 0));

  for (const group of extraGroups) {
    // Move text editors to Group 1 before closing the group so files are not lost.
    for (const tab of group.tabs) {
      if (tab.input instanceof vscode.TabInputText) {
        try {
          await vscode.window.showTextDocument(tab.input.uri, {
            viewColumn: vscode.ViewColumn.One,
            preserveFocus: true,
            preview: false
          });
        } catch {
          // Best-effort move; ignore failures.
        }
      }
    }

    try {
      await vscode.window.tabGroups.close(group.tabs);
    } catch {
      // Best-effort close; ignore failures.
    }
  }

  log(`Closed ${extraGroups.length} extra editor group(s).`);
}

function clearArrangeTimer(): void {
  if (arrangeTimer !== undefined) {
    clearTimeout(arrangeTimer);
    arrangeTimer = undefined;
  }
}
