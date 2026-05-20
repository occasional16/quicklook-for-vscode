import * as path from 'path';
import * as vscode from 'vscode';
import {
  QuickLookExecutableResolution,
  QuickLookLaunchSettings,
  createLaunchFailureMessage,
  defaultExecutablePath,
  findExistingQuickLookExecutables,
  isQuickLookExecutablePath,
  launchQuickLook,
  normalizeExecutablePath,
  normalizePreviewOptions,
  resolveQuickLookExecutable
} from './quicklook';

const previewCommandId = 'quicklook.previewFile';
const checkInstallationCommandId = 'quicklook.checkInstallation';
const setExecutablePathCommandId = 'quicklook.setExecutablePath';
const setPathAction = 'Set Path';
const openSettingsAction = 'Open Settings';
const showLogAction = 'Show Log';

type PathSetupAction = 'detected' | 'browse' | 'manual' | 'settings';

interface ExecutablePathPickItem extends vscode.QuickPickItem {
  action: PathSetupAction;
  executablePath?: string;
}

interface ExecutablePathSetting {
  value: string;
  source: string;
}

let outputChannel: vscode.OutputChannel | undefined;

export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel('QuickLook');

  context.subscriptions.push(
    outputChannel,
    vscode.commands.registerCommand(previewCommandId, async (resource?: vscode.Uri, selectedResources?: vscode.Uri[]) => {
      await previewFile(resource, selectedResources);
    }),
    vscode.commands.registerCommand(checkInstallationCommandId, async () => {
      await checkInstallation();
    }),
    vscode.commands.registerCommand(setExecutablePathCommandId, async () => {
      await setExecutablePath();
    })
  );
}

export function deactivate(): void {}

async function previewFile(resource?: vscode.Uri, selectedResources?: vscode.Uri[]): Promise<void> {
  log('Preview command invoked.');
  const targetUri = await resolvePreviewTarget(resource, selectedResources);

  if (!targetUri) {
    log('Preview cancelled: no local file is selected.');
    vscode.window.showWarningMessage('No local file is selected for QuickLook preview.');
    return;
  }

  log(`Resolved preview target: ${targetUri.fsPath || targetUri.toString()}`);

  if (targetUri.scheme !== 'file') {
    log(`Preview cancelled: unsupported URI scheme '${targetUri.scheme}'.`);
    vscode.window.showWarningMessage('QuickLook can only preview local file system resources.');
    return;
  }

  try {
    await vscode.workspace.fs.stat(targetUri);
  } catch {
    log(`Preview cancelled: target no longer exists: ${targetUri.fsPath}`);
    vscode.window.showErrorMessage(`The selected file no longer exists: ${targetUri.fsPath}`);
    return;
  }

  const launchSettings = getLaunchSettings();
  const resolution = await resolveQuickLookExecutable(launchSettings.executablePath);
  logResolution('Preview launch resolution', getExecutablePathSetting(), resolution);

  try {
    await launchQuickLook(targetUri.fsPath, {
      executablePath: resolution.executablePath,
      previewOptions: launchSettings.previewOptions
    });
    log(`QuickLook launch requested successfully for: ${targetUri.fsPath}`);
  } catch (error) {
    log(`QuickLook launch failed: ${error instanceof Error ? error.message : String(error)}`);
    vscode.window.showErrorMessage(createLaunchFailureMessage(resolution.executablePath, error));
  }
}

async function resolvePreviewTarget(resource?: vscode.Uri, selectedResources?: vscode.Uri[]): Promise<vscode.Uri | undefined> {
  const explicitResource = getExplicitResource(resource, selectedResources);
  if (explicitResource) {
    return explicitResource;
  }

  const explorerResource = await resolveResourceFromExplorerSelection();
  if (explorerResource) {
    return explorerResource;
  }

  return vscode.window.activeTextEditor?.document.uri;
}

function getExplicitResource(resource?: vscode.Uri, selectedResources?: vscode.Uri[]): vscode.Uri | undefined {
  if (selectedResources?.length) {
    return selectedResources.find((selectedResource) => selectedResource.scheme === 'file') ?? selectedResources[0];
  }

  return resource;
}

async function resolveResourceFromExplorerSelection(): Promise<vscode.Uri | undefined> {
  const configuration = vscode.workspace.getConfiguration('quicklook');
  const useClipboardFallback = configuration.get<boolean>('useExplorerClipboardFallback', true);

  if (!useClipboardFallback) {
    log('Explorer clipboard fallback is disabled.');
    return undefined;
  }

  let previousClipboardText: string | undefined;

  try {
    previousClipboardText = await vscode.env.clipboard.readText();
    await vscode.commands.executeCommand('copyFilePath');

    const copiedText = await vscode.env.clipboard.readText();
    await restoreClipboard(previousClipboardText);

    const copiedPath = getFirstAbsolutePath(copiedText);
    if (copiedPath) {
      log(`Resolved Explorer selection from clipboard fallback: ${copiedPath}`);
    }

    return copiedPath ? vscode.Uri.file(copiedPath) : undefined;
  } catch (error) {
    log(`Explorer clipboard fallback failed: ${error instanceof Error ? error.message : String(error)}`);
    if (previousClipboardText !== undefined) {
      await restoreClipboard(previousClipboardText);
    }

    return undefined;
  }
}

function getLaunchSettings(): QuickLookLaunchSettings {
  const configuration = vscode.workspace.getConfiguration('quicklook');

  return {
    executablePath: normalizeExecutablePath(configuration.get<string>('executablePath')),
    previewOptions: normalizePreviewOptions(configuration.get<unknown[]>('previewOptions'))
  };
}

async function checkInstallation(): Promise<void> {
  const setting = getExecutablePathSetting();
  const resolution = await resolveQuickLookExecutable(setting.value);
  logResolution('Installation check', setting, resolution);

  if (resolution.foundOnDisk) {
    const sourceText = resolution.source === 'configured' ? 'configured path' : 'detected path';
    const action = await vscode.window.showInformationMessage(
      `QuickLook is ready from ${sourceText}: ${resolution.executablePath}. Setting source: ${setting.source}.`,
      setPathAction,
      openSettingsAction,
      showLogAction
    );
    await handleSelfCheckAction(action);
    return;
  }

  const action = await vscode.window.showWarningMessage(
    `QuickLook executable was not found. Setting source: ${setting.source}. Checked ${resolution.checkedPaths.length} path(s).`,
    setPathAction,
    openSettingsAction,
    showLogAction
  );
  await handleSelfCheckAction(action);
}

async function setExecutablePath(): Promise<void> {
  const configuration = vscode.workspace.getConfiguration('quicklook');
  const currentExecutablePath = normalizeExecutablePath(configuration.get<string>('executablePath'));
  const detectedPaths = await findExistingQuickLookExecutables(currentExecutablePath);
  const selectedItem = await vscode.window.showQuickPick(createExecutablePathPickItems(detectedPaths), {
    title: 'Set QuickLook Executable Path',
    placeHolder: 'Use a detected path, browse for QuickLook.exe, or enter a path manually.'
  });

  if (!selectedItem) {
    return;
  }

  if (selectedItem.action === 'settings') {
    await vscode.commands.executeCommand('workbench.action.openSettings', 'quicklook.executablePath');
    return;
  }

  let executablePath: string | undefined;

  if (selectedItem.action === 'detected') {
    executablePath = selectedItem.executablePath;
  } else if (selectedItem.action === 'browse') {
    executablePath = await browseExecutablePath(currentExecutablePath);
  } else {
    executablePath = await inputExecutablePath(currentExecutablePath);
  }

  if (!executablePath) {
    return;
  }

  const normalizedExecutablePath = normalizeExecutablePath(executablePath);
  await configuration.update('executablePath', normalizedExecutablePath, vscode.ConfigurationTarget.Global);
  log(`Updated quicklook.executablePath: ${normalizedExecutablePath}`);
  await checkInstallation();
}

function createExecutablePathPickItems(detectedPaths: readonly string[]): ExecutablePathPickItem[] {
  const detectedItems = detectedPaths.map<ExecutablePathPickItem>((detectedPath, index) => ({
    label: index === 0 ? 'Use detected QuickLook.exe' : `Use detected QuickLook.exe (${index + 1})`,
    description: detectedPath,
    action: 'detected',
    executablePath: detectedPath
  }));

  return [
    ...detectedItems,
    {
      label: 'Browse for QuickLook.exe',
      description: 'Choose the executable file from disk',
      action: 'browse'
    },
    {
      label: 'Enter path manually',
      description: 'Type or paste the full QuickLook.exe path',
      action: 'manual'
    },
    {
      label: 'Open Settings',
      description: 'Edit quicklook.executablePath in VS Code settings',
      action: 'settings'
    }
  ];
}

async function browseExecutablePath(currentExecutablePath: string): Promise<string | undefined> {
  const selectedUris = await vscode.window.showOpenDialog({
    title: 'Select QuickLook.exe',
    defaultUri: getOpenDialogDefaultUri(currentExecutablePath),
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: {
      Applications: ['exe'],
      All: ['*']
    }
  });

  const selectedPath = selectedUris?.[0]?.fsPath;
  if (!selectedPath) {
    return undefined;
  }

  if (isQuickLookExecutablePath(selectedPath)) {
    return selectedPath;
  }

  const action = await vscode.window.showWarningMessage('The selected file is not named QuickLook.exe.', 'Use Anyway', 'Choose Again');
  if (action === 'Use Anyway') {
    return selectedPath;
  }

  if (action === 'Choose Again') {
    return browseExecutablePath(selectedPath);
  }

  return undefined;
}

async function inputExecutablePath(currentExecutablePath: string): Promise<string | undefined> {
  return vscode.window.showInputBox({
    title: 'Enter QuickLook Executable Path',
    prompt: 'Enter the full path to QuickLook.exe. You can change this later in VS Code settings.',
    value: currentExecutablePath || defaultExecutablePath,
    valueSelection: [0, currentExecutablePath.length],
    validateInput: (value) => {
      if (!value.trim()) {
        return 'Enter a QuickLook executable path.';
      }

      const normalizedValue = normalizeExecutablePath(value);
      if (!isQuickLookExecutablePath(normalizedValue)) {
        return 'The path should point to QuickLook.exe.';
      }

      return undefined;
    }
  });
}

async function handleSelfCheckAction(action: string | undefined): Promise<void> {
  if (action === setPathAction) {
    await setExecutablePath();
    return;
  }

  if (action === openSettingsAction) {
    await vscode.commands.executeCommand('workbench.action.openSettings', 'quicklook.executablePath');
    return;
  }

  if (action === showLogAction) {
    outputChannel?.show(true);
  }
}

function getExecutablePathSetting(): ExecutablePathSetting {
  const configuration = vscode.workspace.getConfiguration('quicklook');
  const inspection = configuration.inspect<string>('executablePath');

  if (inspection?.workspaceFolderValue !== undefined) {
    return { value: normalizeExecutablePath(inspection.workspaceFolderValue), source: 'workspace folder setting' };
  }

  if (inspection?.workspaceValue !== undefined) {
    return { value: normalizeExecutablePath(inspection.workspaceValue), source: 'workspace setting' };
  }

  if (inspection?.globalValue !== undefined) {
    return { value: normalizeExecutablePath(inspection.globalValue), source: 'user setting' };
  }

  if (inspection?.defaultValue !== undefined) {
    return { value: normalizeExecutablePath(inspection.defaultValue), source: 'extension default' };
  }

  return { value: defaultExecutablePath, source: 'extension fallback' };
}

function logResolution(context: string, setting: ExecutablePathSetting, resolution: QuickLookExecutableResolution): void {
  log(`${context}:`);
  log(`  Setting source: ${setting.source}`);
  log(`  Configured path: ${setting.value}`);
  log(`  Resolved path: ${resolution.executablePath}`);
  log(`  Resolution source: ${resolution.source}`);
  log(`  Found on disk: ${resolution.foundOnDisk}`);
  log(`  Checked paths: ${resolution.checkedPaths.join('; ') || '(none)'}`);
}

function getOpenDialogDefaultUri(currentExecutablePath: string): vscode.Uri | undefined {
  const normalizedExecutablePath = normalizeExecutablePath(currentExecutablePath);
  const candidateDirectory = isQuickLookExecutablePath(normalizedExecutablePath)
    ? path.win32.dirname(normalizedExecutablePath)
    : normalizedExecutablePath;

  return path.win32.isAbsolute(candidateDirectory) ? vscode.Uri.file(candidateDirectory) : undefined;
}

function getFirstAbsolutePath(value: string): string | undefined {
  const firstPath = value
    .split(/\r?\n/)
    .map((line) => stripClipboardLine(line))
    .find((line) => Boolean(line));

  if (!firstPath || !path.isAbsolute(firstPath)) {
    return undefined;
  }

  return firstPath;
}

function stripClipboardLine(value: string): string {
  const trimmedValue = value.trim();
  const hasDoubleQuotes = trimmedValue.startsWith('"') && trimmedValue.endsWith('"');

  if (trimmedValue.length >= 2 && hasDoubleQuotes) {
    return trimmedValue.slice(1, -1).trim();
  }

  return trimmedValue;
}

async function restoreClipboard(value: string): Promise<void> {
  try {
    await vscode.env.clipboard.writeText(value);
  } catch {
    log('Clipboard restore failed.');
  }
}

function log(message: string): void {
  outputChannel?.appendLine(`[${new Date().toISOString()}] ${message}`);
}