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

export const defaultExecutablePath = 'D:\\Program Files\\QuickLook\\QuickLook.exe';

const pathLookupExecutable = 'quicklook';
const quickLookFileName = 'QuickLook.exe';
const commonExecutablePaths = [
  defaultExecutablePath,
  'C:\\Program Files\\QuickLook\\QuickLook.exe',
  'C:\\Program Files (x86)\\QuickLook\\QuickLook.exe'
];

export function normalizeExecutablePath(value: unknown): string {
  if (typeof value !== 'string') {
    return defaultExecutablePath;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return defaultExecutablePath;
  }

  const unquotedValue = stripWrappingQuotes(trimmedValue);
  if (unquotedValue.toLowerCase() === pathLookupExecutable) {
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

export function getQuickLookExecutableCandidates(configuredExecutablePath: string): string[] {
  const candidates = [configuredExecutablePath, ...commonExecutablePaths];
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

  if (path.win32.isAbsolute(normalizedExecutablePath) && await pathExists(normalizedExecutablePath)) {
    return {
      executablePath: normalizedExecutablePath,
      foundOnDisk: true,
      source: 'configured',
      checkedPaths
    };
  }

  for (const candidatePath of checkedPaths) {
    if (await pathExists(candidatePath)) {
      return {
        executablePath: candidatePath,
        foundOnDisk: true,
        source: 'detected',
        checkedPaths
      };
    }
  }

  return {
    executablePath: path.win32.isAbsolute(normalizedExecutablePath) ? normalizedExecutablePath : pathLookupExecutable,
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