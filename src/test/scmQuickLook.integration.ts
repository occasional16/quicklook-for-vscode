import { writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { parseGitUriMetadata } from '../quicklookPreviewTarget';
import { resolveScmQuickLookTarget } from '../scmQuickLook';

interface GitApi {
  readonly repositories: readonly GitRepository[];
  getRepository(uri: vscode.Uri): GitRepository | null;
}

interface GitRepository {
  readonly rootUri: vscode.Uri;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function waitForRepository(api: GitApi, uri: vscode.Uri): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (api.getRepository(uri)
      ?? api.repositories.find(repository => uri.fsPath.startsWith(repository.rootUri.fsPath))) {
      return;
    }
    await delay(250);
  }
  throw new Error(`Integration test could not resolve a Git repository for ${uri.fsPath}.`);
}

export async function run(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error('Integration test requires a workspace folder.');
  }

  const extension = vscode.extensions.getExtension('occasional16.preview-all-in-one-with-quicklook');
  await extension?.activate();

  const resourceUri = vscode.Uri.joinPath(workspaceFolder.uri, 'README.md');
  const gitExtension = vscode.extensions.getExtension<{ getAPI(version: 1): GitApi }>('vscode.git');
  if (!gitExtension) {
    throw new Error('Built-in Git extension is unavailable.');
  }
  const gitApi = (await gitExtension.activate()).getAPI(1);
  await waitForRepository(gitApi, resourceUri);

  const logs: string[] = [];
  const log = (message: string): void => {
    logs.push(message);
  };

  const workingTarget = await resolveScmQuickLookTarget(resourceUri, 'workingTree', log);
  assert(workingTarget?.uri.toString() === resourceUri.toString(), 'Working Tree must use the local file.');

  const indexTarget = await resolveScmQuickLookTarget(resourceUri, 'index', log);
  assert(
    indexTarget?.uri.scheme === 'git',
    `Index must use a Git snapshot URI: ${JSON.stringify({ indexTarget, logs })}`
  );
  assert(indexTarget.versionLabel === 'Staged', 'Index must identify the Staged version.');
  assert(parseGitUriMetadata(indexTarget.uri.query)?.ref === '', 'Index must use the empty Git ref.');
  const indexBytes = await vscode.workspace.fs.readFile(indexTarget.uri);
  assert(indexBytes.byteLength > 0, 'The staged Git snapshot must be readable.');

  const resultPath = path.join(__dirname, '..', 'scm-quicklook-integration-result.json');
  await writeFile(resultPath, JSON.stringify({
    index: indexTarget.uri.toString(),
    indexLabel: indexTarget.versionLabel,
    logs,
    workingTree: workingTarget.uri.toString()
  }, undefined, 2), 'utf8');
}
