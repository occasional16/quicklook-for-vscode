import * as path from 'path';

export type ScmQuickLookGroup = 'workingTree' | 'index' | 'untracked';
export type ScmQuickLookVersion = 'workingTree' | 'index' | 'head';

export interface ScmQuickLookCandidate {
  readonly label?: string;
  readonly version: ScmQuickLookVersion;
}

export interface GitUriMetadata {
  readonly path?: string;
  readonly ref?: string;
}

export function getScmQuickLookCandidates(
  group: ScmQuickLookGroup,
  workingFileExists: boolean
): readonly ScmQuickLookCandidate[] {
  switch (group) {
    case 'workingTree':
      return workingFileExists
        ? [{ version: 'workingTree' }]
        : [{ version: 'index', label: 'Before deletion' }];
    case 'untracked':
      return workingFileExists ? [{ version: 'workingTree' }] : [];
    case 'index':
      return [
        { version: 'index', label: 'Staged' },
        { version: 'head', label: 'Before deletion' }
      ];
  }
}

export function shouldUseNextScmCandidate(
  group: ScmQuickLookGroup,
  version: ScmQuickLookVersion,
  hasNextCandidate: boolean,
  errorCode: string | undefined
): boolean {
  return group === 'index'
    && version === 'index'
    && hasNextCandidate
    && errorCode === 'FileNotFound';
}

export function selectTriggeredQuickLookResource<T>(
  triggered: T | undefined,
  selected: readonly T[]
): T | undefined {
  return triggered ?? (selected.length === 1 ? selected[0] : undefined);
}

export function shouldPreferFocusedDiffSide(
  explicitResource: string,
  focusedResource: string,
  diffSides: readonly string[]
): boolean {
  return diffSides.includes(explicitResource) && diffSides.includes(focusedResource);
}

export function parseGitUriMetadata(query: string): GitUriMetadata | undefined {
  if (!query) {
    return undefined;
  }

  try {
    const value = JSON.parse(query) as Record<string, unknown>;
    return {
      path: typeof value.path === 'string' ? value.path : undefined,
      ref: typeof value.ref === 'string' ? value.ref : undefined
    };
  } catch {
    return undefined;
  }
}

export function inferGitPreviewVersionLabel(query: string): string {
  const ref = parseGitUriMetadata(query)?.ref;
  if (ref === '') {
    return 'Staged';
  }
  if (ref?.toUpperCase() === 'HEAD') {
    return 'HEAD';
  }
  if (ref === '~') {
    return 'Before change';
  }
  return 'History';
}

export function createTemporaryPreviewFileName(
  sourcePath: string,
  versionLabel: string | undefined,
  uniqueSuffix: string
): string {
  const sourceBaseName = path.basename(sourcePath) || 'preview';
  const extension = path.extname(sourceBaseName);
  const name = sanitizeFileName(path.basename(sourceBaseName, extension)) || 'preview';
  const label = versionLabel ? sanitizeFileName(versionLabel) : '';
  const labelSegment = label ? `-${label}` : '';

  return `${name.slice(0, 80)}${labelSegment}-${uniqueSuffix}${extension}`;
}

export function sanitizeFileName(value: string): string {
  return value.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim().replace(/[. ]+$/g, '');
}
