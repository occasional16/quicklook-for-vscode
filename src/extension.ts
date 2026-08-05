import * as path from 'path';
import * as vscode from 'vscode';
import { activateMarkdownViewController } from './markdownViewController';
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
import {
  ScmQuickLookGroup,
  createTemporaryPreviewFileName,
  inferGitPreviewVersionLabel,
  parseGitUriMetadata,
  selectTriggeredQuickLookResource,
  shouldPreferFocusedDiffSide
} from './quicklookPreviewTarget';
import { resolveScmQuickLookTarget } from './scmQuickLook';

const previewCommandId = 'quicklook.previewFile';
const previewScmWorkingTreeCommandId = 'quicklook.previewScmWorkingTree';
const previewScmIndexCommandId = 'quicklook.previewScmIndex';
const previewScmUntrackedCommandId = 'quicklook.previewScmUntracked';
const checkInstallationCommandId = 'quicklook.checkInstallation';
const setExecutablePathCommandId = 'quicklook.setExecutablePath';
const setPathAction = 'Set Path';
const openSettingsAction = 'Open Settings';
const showLogAction = 'Show Log';
const gitScheme = 'git';
const temporaryPreviewFileLifetimeMs = 10 * 60 * 1000;

const temporaryPreviewFiles = new Set<string>();

type PathSetupAction = 'detected' | 'browse' | 'manual' | 'settings';

interface ExecutablePathPickItem extends vscode.QuickPickItem {
  action: PathSetupAction;
  executablePath?: string;
}

interface ExecutablePathSetting {
  value: string;
  source: string;
}

interface PreviewCommandOptions {
  source?: 'activeEditor';
}

interface PreviewTarget {
  readonly uri: vscode.Uri;
  readonly versionLabel?: string;
}

let outputChannel: vscode.OutputChannel | undefined;

export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel('QuickLook');

  context.subscriptions.push(
    outputChannel,
    vscode.commands.registerCommand(previewCommandId, async (resource?: unknown, selectedResources?: unknown[]) => {
      await previewFile(context, resource, selectedResources);
    }),
    vscode.commands.registerCommand(previewScmWorkingTreeCommandId, async (resource?: unknown, selectedResources?: unknown[]) => {
      await previewScmFile(context, 'workingTree', resource, selectedResources);
    }),
    vscode.commands.registerCommand(previewScmIndexCommandId, async (resource?: unknown, selectedResources?: unknown[]) => {
      await previewScmFile(context, 'index', resource, selectedResources);
    }),
    vscode.commands.registerCommand(previewScmUntrackedCommandId, async (resource?: unknown, selectedResources?: unknown[]) => {
      await previewScmFile(context, 'untracked', resource, selectedResources);
    }),
    vscode.commands.registerCommand(checkInstallationCommandId, async () => {
      await checkInstallation();
    }),
    vscode.commands.registerCommand(setExecutablePathCommandId, async () => {
      await setExecutablePath();
    })
  );

  activateMarkdownViewController(context, log);
}

export async function deactivate(): Promise<void> {
  await cleanupTemporaryPreviewFiles();
}

async function previewFile(context: vscode.ExtensionContext, resource?: unknown, selectedResources?: unknown[]): Promise<void> {
  log('Preview command invoked.');
  const target = await resolvePreviewTarget(resource, selectedResources);

  if (!target) {
    log('Preview cancelled: no local file is selected.');
    vscode.window.showWarningMessage('No local file is selected for QuickLook preview.');
    return;
  }

  await previewResolvedTarget(context, target);
}

async function previewScmFile(
  context: vscode.ExtensionContext,
  group: ScmQuickLookGroup,
  resource?: unknown,
  selectedResources?: unknown[]
): Promise<void> {
  log(`SCM preview command invoked for group '${group}'.`);
  const resourceUri = getTriggeredResource(resource, selectedResources);
  if (!resourceUri) {
    log('SCM preview cancelled: the triggered resource is ambiguous or unavailable.');
    vscode.window.showWarningMessage('Select one specific Source Control item to preview with QuickLook.');
    return;
  }

  const target = await resolveScmQuickLookTarget(resourceUri, group, log);
  if (target) {
    await previewResolvedTarget(context, target);
  }
}

async function previewResolvedTarget(context: vscode.ExtensionContext, target: PreviewTarget): Promise<void> {
  log(`Resolved preview target: ${target.uri.fsPath || target.uri.toString()}`);

  const localPreviewUri = await resolveLocalPreviewFile(context, target);
  if (!localPreviewUri) {
    return;
  }

  const launchSettings = getLaunchSettings();
  const resolution = await resolveQuickLookExecutable(launchSettings.executablePath);
  logResolution('Preview launch resolution', getExecutablePathSetting(), resolution);

  try {
    await launchQuickLook(localPreviewUri.fsPath, {
      executablePath: resolution.executablePath,
      previewOptions: launchSettings.previewOptions
    });
    log(`QuickLook launch requested successfully for: ${localPreviewUri.fsPath}`);
  } catch (error) {
    log(`QuickLook launch failed: ${error instanceof Error ? error.message : String(error)}`);
    vscode.window.showErrorMessage(createLaunchFailureMessage(resolution.executablePath, error));
  }
}

async function resolveLocalPreviewFile(context: vscode.ExtensionContext, target: PreviewTarget): Promise<vscode.Uri | undefined> {
  if (target.uri.scheme === 'file') {
    return validateExistingFile(target.uri);
  }

  if (target.uri.scheme === gitScheme) {
    return createTemporaryPreviewFile(
      context,
      target.uri,
      target.versionLabel ?? inferGitPreviewVersionLabel(target.uri.query)
    );
  }

  log(`Preview cancelled: unsupported URI scheme '${target.uri.scheme}'.`);
  vscode.window.showWarningMessage('QuickLook can only preview local file system resources and Git preview files.');
  return undefined;
}

async function validateExistingFile(uri: vscode.Uri): Promise<vscode.Uri | undefined> {
  try {
    await vscode.workspace.fs.stat(uri);
    return uri;
  } catch {
    log(`Preview cancelled: target no longer exists: ${uri.fsPath}`);
    vscode.window.showErrorMessage(`The selected file no longer exists: ${uri.fsPath}`);
    return undefined;
  }
}

async function createTemporaryPreviewFile(
  context: vscode.ExtensionContext,
  sourceUri: vscode.Uri,
  versionLabel: string
): Promise<vscode.Uri | undefined> {
  try {
    const bytes = await vscode.workspace.fs.readFile(sourceUri);
    const previewDirectoryUri = vscode.Uri.joinPath(context.globalStorageUri, 'preview-cache');
    const previewFileUri = vscode.Uri.joinPath(
      previewDirectoryUri,
      createVersionedTemporaryPreviewFileName(sourceUri, versionLabel)
    );

    await vscode.workspace.fs.createDirectory(previewDirectoryUri);
    await vscode.workspace.fs.writeFile(previewFileUri, bytes);
    trackTemporaryPreviewFile(previewFileUri);

    log(`Prepared temporary preview file for '${sourceUri.toString()}': ${previewFileUri.fsPath}`);
    return previewFileUri;
  } catch (error) {
    log(`Preview cancelled: failed to prepare Git preview file: ${error instanceof Error ? error.message : String(error)}`);
    vscode.window.showErrorMessage('Could not prepare this Git preview for QuickLook.');
    return undefined;
  }
}

function createVersionedTemporaryPreviewFileName(sourceUri: vscode.Uri, versionLabel: string): string {
  const sourcePath = parseGitUriMetadata(sourceUri.query)?.path ?? sourceUri.fsPath ?? sourceUri.path;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return createTemporaryPreviewFileName(sourcePath, versionLabel, suffix);
}

function trackTemporaryPreviewFile(uri: vscode.Uri): void {
  temporaryPreviewFiles.add(uri.toString());
  setTimeout(() => {
    void cleanupTemporaryPreviewFile(uri);
  }, temporaryPreviewFileLifetimeMs);
}

async function cleanupTemporaryPreviewFiles(): Promise<void> {
  await Promise.all(Array.from(temporaryPreviewFiles).map((uriString) => cleanupTemporaryPreviewFile(vscode.Uri.parse(uriString))));
}

async function cleanupTemporaryPreviewFile(uri: vscode.Uri): Promise<void> {
  try {
    await vscode.workspace.fs.delete(uri, { useTrash: false });
  } catch {
    // Ignore cleanup failures; QuickLook may still be reading the file.
  } finally {
    temporaryPreviewFiles.delete(uri.toString());
  }
}

async function resolvePreviewTarget(resource?: unknown, selectedResources?: unknown[]): Promise<PreviewTarget | undefined> {
  const explicitResource = getExplicitResource(resource, selectedResources);
  if (explicitResource) {
    return { uri: preferFocusedDiffSide(explicitResource, selectedResources) };
  }

  if (selectedResources && selectedResources.length > 1) {
    log('Preview target is ambiguous because multiple resources were supplied without a triggered item.');
    return undefined;
  }

  const explorerResource = await resolveResourceFromExplorerSelection();
  if (explorerResource) {
    return { uri: explorerResource };
  }

  const activeUri = vscode.window.activeTextEditor?.document.uri;
  return activeUri ? { uri: activeUri } : undefined;
}

function getExplicitResource(resource?: unknown, selectedResources?: unknown[]): vscode.Uri | undefined {
  if (isPreviewCommandOptions(resource) && resource.source === 'activeEditor') {
    return vscode.window.activeTextEditor?.document.uri;
  }

  const selectedUris = selectedResources
    ?.map(selectedResource => getUriFromCommandResource(selectedResource))
    .filter((uri): uri is vscode.Uri => Boolean(uri))
    ?? [];
  return selectTriggeredQuickLookResource(getUriFromCommandResource(resource), selectedUris);

  function isPreviewCommandOptions(value: unknown): value is PreviewCommandOptions {
    if (!value || typeof value !== 'object') {
      return false;
    }

    return (value as Record<string, unknown>).source === 'activeEditor';
  }
}

function getTriggeredResource(resource?: unknown, selectedResources?: unknown[]): vscode.Uri | undefined {
  const selectedUris = selectedResources
    ?.map(selectedResource => getUriFromCommandResource(selectedResource))
    .filter((uri): uri is vscode.Uri => Boolean(uri))
    ?? [];
  return selectTriggeredQuickLookResource(getUriFromCommandResource(resource), selectedUris);
}

function preferFocusedDiffSide(uri: vscode.Uri, selectedResources?: unknown[]): vscode.Uri {
  if (selectedResources !== undefined) {
    return uri;
  }

  const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
  const focusedUri = vscode.window.activeTextEditor?.document.uri;
  if (!(activeTab?.input instanceof vscode.TabInputTextDiff) || !focusedUri) {
    return uri;
  }

  const sideUris = [activeTab.input.original, activeTab.input.modified].map(sideUri => sideUri.toString());
  return shouldPreferFocusedDiffSide(uri.toString(), focusedUri.toString(), sideUris)
    ? focusedUri
    : uri;
}

function getUriFromCommandResource(resource: unknown, depth = 0): vscode.Uri | undefined {
  if (depth > 3) {
    return undefined;
  }

  if (isUri(resource)) {
    return resource;
  }

  if (!resource || typeof resource !== 'object') {
    return undefined;
  }

  const resourceRecord = resource as Record<string, unknown>;
  const directUri = resourceRecord.resourceUri ?? resourceRecord.uri ?? resourceRecord.resource;
  const resolvedDirectUri = getUriFromCommandResource(directUri, depth + 1);
  if (resolvedDirectUri) {
    return resolvedDirectUri;
  }

  const parent = resourceRecord.parent;
  if (typeof parent === 'function') {
    try {
      return getUriFromCommandResource(parent.call(resource), depth + 1);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function isUri(value: unknown): value is vscode.Uri {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.scheme === 'string'
    && typeof candidate.fsPath === 'string'
    && typeof candidate.toString === 'function';
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
    const sourceText = {
      configured: 'configured path',
      detected: 'detected path',
      path: 'PATH'
    }[resolution.source];
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
      label: 'Enter path or command manually',
      description: 'Type a full path or QuickLook.exe to use PATH',
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
    prompt: 'Enter a full path, or QuickLook.exe to resolve it from PATH.',
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
  log(`  Checked path count: ${resolution.checkedPaths.length}`);
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
