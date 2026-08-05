import { spawn } from 'child_process';
import { access } from 'fs/promises';
import * as path from 'path';

export interface QuickLookLaunchSettings {
  executablePath: string;
  previewOptions: readonly string[];
}

export interface QuickLookExecutableResolution {
  executablePath: string;
  foundOnDisk: boolean;
  source: 'configured' | 'detected' | 'path';
  checkedPaths: readonly string[];
}

export const defaultExecutablePath = 'QuickLook.exe';

const quickLookFileName = 'QuickLook.exe';

export function normalizeExecutablePath(value: unknown): string {
  if (typeof value !== 'string') {
    return defaultExecutablePath;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return defaultExecutablePath;
  }

  const unquotedValue = stripWrappingQuotes(trimmedValue);
  if (['quicklook', 'quicklook.exe'].includes(unquotedValue.toLowerCase())) {
    return defaultExecutablePath;
  }

  return unquotedValue || defaultExecutablePath;
}

export function normalizePreviewOptions(value: readonly unknown[] | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalizedOptions: string[] = [];
  const seenOptions = new Set<string>();

  for (const option of value) {
    if (typeof option !== 'string') {
      continue;
    }

    const normalizedOption = option.trim();
    if (!normalizedOption || seenOptions.has(normalizedOption)) {
      continue;
    }

    normalizedOptions.push(normalizedOption);
    seenOptions.add(normalizedOption);
  }

  return normalizedOptions;
}

export function getQuickLookExecutableCandidates(
  configuredExecutablePath: string,
  environment: NodeJS.ProcessEnv = process.env
): string[] {
  const normalizedConfiguredPath = normalizeExecutablePath(configuredExecutablePath);
  const candidates = [
    normalizedConfiguredPath,
    ...getPathExecutableCandidates(environment),
    ...getCommonExecutablePaths(environment)
  ];
  const normalizedCandidates: string[] = [];
  const seenCandidates = new Set<string>();

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeExecutablePath(candidate);

    if (!path.win32.isAbsolute(normalizedCandidate)) {
      continue;
    }

    const candidateKey = normalizedCandidate.toLowerCase();
    if (seenCandidates.has(candidateKey)) {
      continue;
    }

    normalizedCandidates.push(normalizedCandidate);
    seenCandidates.add(candidateKey);
  }

  return normalizedCandidates;
}

export async function resolveQuickLookExecutable(configuredExecutablePath: string): Promise<QuickLookExecutableResolution> {
  const normalizedExecutablePath = normalizeExecutablePath(configuredExecutablePath);
  const checkedPaths = getQuickLookExecutableCandidates(normalizedExecutablePath);
  const configuredPathKey = path.win32.isAbsolute(normalizedExecutablePath)
    ? normalizedExecutablePath.toLowerCase()
    : undefined;
  const pathCandidateKeys = new Set(
    getPathExecutableCandidates(process.env).map(candidate => candidate.toLowerCase())
  );

  for (const candidatePath of checkedPaths) {
    if (await pathExists(candidatePath)) {
      return {
        executablePath: candidatePath,
        foundOnDisk: true,
        source: candidatePath.toLowerCase() === configuredPathKey
          ? 'configured'
          : pathCandidateKeys.has(candidatePath.toLowerCase()) ? 'path' : 'detected',
        checkedPaths
      };
    }
  }

  return {
    executablePath: normalizedExecutablePath,
    foundOnDisk: false,
    source: 'path',
    checkedPaths
  };
}

export async function findExistingQuickLookExecutables(configuredExecutablePath: string): Promise<string[]> {
  const existingPaths: string[] = [];

  for (const candidatePath of getQuickLookExecutableCandidates(configuredExecutablePath)) {
    if (await pathExists(candidatePath)) {
      existingPaths.push(candidatePath);
    }
  }

  return existingPaths;
}

export function buildLaunchArguments(filePath: string, previewOptions: readonly string[]): string[] {
  return [filePath, ...previewOptions];
}

export async function launchQuickLook(filePath: string, settings: QuickLookLaunchSettings): Promise<void> {
  const resolution = await resolveQuickLookExecutable(settings.executablePath);
  const executablePath = resolution.executablePath;
  const previewOptions = normalizePreviewOptions(settings.previewOptions);
  const launchArguments = buildLaunchArguments(filePath, previewOptions);

  return new Promise((resolve, reject) => {
    let childProcess;

    try {
      childProcess = spawn(executablePath, launchArguments, {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
    } catch (error) {
      reject(error);
      return;
    }

    let settled = false;

    childProcess.once('error', (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error);
    });

    childProcess.once('spawn', () => {
      if (settled) {
        return;
      }

      settled = true;
      childProcess.unref();
      resolve();
    });
  });
}

export function createLaunchFailureMessage(executablePath: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `Unable to launch QuickLook with '${normalizeExecutablePath(executablePath)}'. Check quicklook.executablePath in settings. Details: ${message}`;
}

export function isQuickLookExecutablePath(value: string): boolean {
  return path.win32.basename(value).toLowerCase() === quickLookFileName.toLowerCase();
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function stripWrappingQuotes(value: string): string {
  const hasDoubleQuotes = value.startsWith('"') && value.endsWith('"');
  const hasSingleQuotes = value.startsWith("'") && value.endsWith("'");

  if (value.length >= 2 && (hasDoubleQuotes || hasSingleQuotes)) {
    return value.slice(1, -1).trim();
  }

  return value;
}

function getPathExecutableCandidates(environment: NodeJS.ProcessEnv): string[] {
  const pathValue = getEnvironmentValue(environment, 'PATH');
  if (!pathValue) {
    return [];
  }

  return pathValue
    .split(path.win32.delimiter)
    .map(entry => stripWrappingQuotes(entry.trim()))
    .filter(Boolean)
    .map(entry => path.win32.join(entry, quickLookFileName));
}

function getCommonExecutablePaths(environment: NodeJS.ProcessEnv): string[] {
  const localAppData = getEnvironmentValue(environment, 'LOCALAPPDATA');
  const programFiles = getEnvironmentValue(environment, 'ProgramFiles');
  const programFilesX86 = getEnvironmentValue(environment, 'ProgramFiles(x86)');
  const userProfile = getEnvironmentValue(environment, 'USERPROFILE');

  return [
    localAppData && path.win32.join(localAppData, 'Programs', 'QuickLook', quickLookFileName),
    programFiles && path.win32.join(programFiles, 'QuickLook', quickLookFileName),
    programFilesX86 && path.win32.join(programFilesX86, 'QuickLook', quickLookFileName),
    userProfile && path.win32.join(userProfile, 'scoop', 'apps', 'quicklook', 'current', quickLookFileName),
    'D:\\Program Files\\QuickLook\\QuickLook.exe'
  ].filter((candidate): candidate is string => Boolean(candidate));
}

function getEnvironmentValue(environment: NodeJS.ProcessEnv, name: string): string | undefined {
  const matchingKey = Object.keys(environment).find(key => key.toLowerCase() === name.toLowerCase());
  return matchingKey ? environment[matchingKey] : undefined;
}
