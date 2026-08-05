import * as path from 'path';
import * as vscode from 'vscode';
import {
  ScmQuickLookGroup,
  getScmQuickLookCandidates,
  shouldUseNextScmCandidate
} from './quicklookPreviewTarget';

export interface ScmQuickLookTarget {
  readonly uri: vscode.Uri;
  readonly versionLabel?: string;
}

interface GitExtensionExports {
  getAPI(version: 1): GitApi;
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

export async function resolveScmQuickLookTarget(
  resourceUri: vscode.Uri,
  group: ScmQuickLookGroup,
  log: (message: string) => void
): Promise<ScmQuickLookTarget | undefined> {
  if (resourceUri.scheme !== 'file') {
    log(`SCM preview cancelled: expected a file URI, received '${resourceUri.scheme}'.`);
    vscode.window.showErrorMessage('QuickLook could not identify the selected Source Control file.');
    return undefined;
  }

  let workingFileExists = true;
  if (group !== 'index') {
    try {
      workingFileExists = await fileExists(resourceUri);
    } catch (error) {
      showResolutionError(resourceUri, error, log);
      return undefined;
    }
  }

  const candidates = getScmQuickLookCandidates(group, workingFileExists);
  if (candidates.length === 0) {
    log(`SCM preview cancelled: '${resourceUri.fsPath}' is unavailable in group '${group}'.`);
    vscode.window.showErrorMessage('The selected Source Control version is no longer available.');
    return undefined;
  }

  if (candidates[0].version === 'workingTree') {
    return { uri: resourceUri };
  }

  const gitContext = await resolveGitContext(resourceUri, log);
  if (!gitContext) {
    return undefined;
  }

  for (const [index, candidate] of candidates.entries()) {
    const ref = candidate.version === 'index'
      ? ''
      : gitContext.repository.state.HEAD?.commit;
    if (ref === undefined) {
      log(`SCM preview cancelled: HEAD is unavailable for '${resourceUri.fsPath}'.`);
      vscode.window.showErrorMessage('QuickLook could not resolve the repository HEAD version.');
      return undefined;
    }

    const gitUri = gitContext.api.toGitUri(resourceUri, ref);
    try {
      await vscode.workspace.fs.stat(gitUri);
      return { uri: gitUri, versionLabel: candidate.label };
    } catch (error) {
      if (shouldUseNextScmCandidate(
        group,
        candidate.version,
        index + 1 < candidates.length,
        getFileSystemErrorCode(error)
      )) {
        log(`SCM index path is absent; resolving staged deletion from HEAD: ${resourceUri.fsPath}`);
        continue;
      }

      showResolutionError(gitUri, error, log);
      return undefined;
    }
  }

  return undefined;
}

async function resolveGitContext(
  resourceUri: vscode.Uri,
  log: (message: string) => void
): Promise<{ readonly api: GitApi; readonly repository: GitRepository } | undefined> {
  const extension = vscode.extensions.getExtension<GitExtensionExports>('vscode.git');
  if (!extension) {
    log('SCM preview cancelled: the built-in Git extension is unavailable.');
    vscode.window.showErrorMessage('The built-in VS Code Git extension is unavailable.');
    return undefined;
  }

  try {
    const api = (await extension.activate()).getAPI(1);
    const repository = api.getRepository(resourceUri)
      ?? api.repositories.find(candidate => isUriInsideRoot(resourceUri, candidate.rootUri));
    if (!repository) {
      log(`SCM preview cancelled: no Git repository owns '${resourceUri.fsPath}'.`);
      vscode.window.showErrorMessage('QuickLook could not find the Git repository for this file.');
      return undefined;
    }
    return { api, repository };
  } catch (error) {
    log(`SCM preview cancelled: Git API activation failed: ${error instanceof Error ? error.message : String(error)}`);
    vscode.window.showErrorMessage('QuickLook could not access the built-in Git API.');
    return undefined;
  }
}

function isUriInsideRoot(uri: vscode.Uri, rootUri: vscode.Uri): boolean {
  const relativePath = path.relative(rootUri.fsPath, uri.fsPath);
  return relativePath === ''
    || (!relativePath.startsWith(`..${path.sep}`)
      && relativePath !== '..'
      && !path.isAbsolute(relativePath));
}

async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch (error) {
    if (getFileSystemErrorCode(error) === 'FileNotFound') {
      return false;
    }
    throw error;
  }
}

function getFileSystemErrorCode(error: unknown): string | undefined {
  return error instanceof vscode.FileSystemError ? error.code : undefined;
}

function showResolutionError(
  uri: vscode.Uri,
  error: unknown,
  log: (message: string) => void
): void {
  const message = error instanceof Error ? error.message : String(error);
  log(`SCM preview cancelled: could not read '${uri.toString()}': ${message}`);
  vscode.window.showErrorMessage('QuickLook could not read the selected Source Control version.');
}
