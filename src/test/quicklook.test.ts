import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLaunchArguments,
  createLaunchFailureMessage,
  findExistingQuickLookExecutables,
  getQuickLookExecutableCandidates,
  isQuickLookExecutablePath,
  normalizeExecutablePath,
  normalizePreviewOptions,
  resolveQuickLookExecutable
} from '../quicklook';

test('normalizeExecutablePath falls back to the configured default executable path for invalid input', () => {
  const defaultExecutablePath = 'QuickLook.exe';

  assert.equal(normalizeExecutablePath(undefined), defaultExecutablePath);
  assert.equal(normalizeExecutablePath('   '), defaultExecutablePath);
  assert.equal(normalizeExecutablePath(42), defaultExecutablePath);
});

test('normalizeExecutablePath strips wrapping quotes', () => {
  assert.equal(normalizeExecutablePath('"C:\\Program Files\\QuickLook\\QuickLook.exe"'), 'C:\\Program Files\\QuickLook\\QuickLook.exe');
  assert.equal(normalizeExecutablePath("'C:\\Tools\\QuickLook.exe'"), 'C:\\Tools\\QuickLook.exe');
});

test('normalizeExecutablePath normalizes the PATH command name', () => {
  assert.equal(normalizeExecutablePath('quicklook'), 'QuickLook.exe');
  assert.equal(normalizeExecutablePath(' QUICKLOOK.EXE '), 'QuickLook.exe');
});

test('normalizePreviewOptions trims values and removes duplicates', () => {
  assert.deepEqual(normalizePreviewOptions([' /pin ', '/top', '/pin', '', 123]), ['/pin', '/top']);
});

test('getQuickLookExecutableCandidates checks PATH before common install directories', () => {
  const environment = {
    Path: '"C:\\Tools";C:\\Program Files\\QuickLook',
    LOCALAPPDATA: 'C:\\Users\\Demo\\AppData\\Local',
    ProgramFiles: 'C:\\Program Files',
    'ProgramFiles(x86)': 'C:\\Program Files (x86)',
    USERPROFILE: 'C:\\Users\\Demo'
  };

  assert.deepEqual(getQuickLookExecutableCandidates('quicklook', environment), [
    'C:\\Tools\\QuickLook.exe',
    'C:\\Program Files\\QuickLook\\QuickLook.exe',
    'C:\\Users\\Demo\\AppData\\Local\\Programs\\QuickLook\\QuickLook.exe',
    'C:\\Program Files (x86)\\QuickLook\\QuickLook.exe',
    'C:\\Users\\Demo\\scoop\\apps\\quicklook\\current\\QuickLook.exe',
    'D:\\Program Files\\QuickLook\\QuickLook.exe'
  ]);
});

test('getQuickLookExecutableCandidates keeps an explicit path first and removes duplicates', () => {
  const environment = {
    PATH: 'C:\\Tools',
    ProgramFiles: 'C:\\Program Files'
  };

  assert.deepEqual(getQuickLookExecutableCandidates('C:\\Tools\\QuickLook.exe', environment), [
    'C:\\Tools\\QuickLook.exe',
    'C:\\Program Files\\QuickLook\\QuickLook.exe',
    'D:\\Program Files\\QuickLook\\QuickLook.exe'
  ]);
});

test('isQuickLookExecutablePath validates the executable filename', () => {
  assert.equal(isQuickLookExecutablePath('D:\\Program Files\\QuickLook\\QuickLook.exe'), true);
  assert.equal(isQuickLookExecutablePath('D:\\Program Files\\QuickLook\\Other.exe'), false);
});

test('buildLaunchArguments keeps the file path as the first argument', () => {
  assert.deepEqual(buildLaunchArguments('C:\\Temp\\demo.png', ['/top']), ['C:\\Temp\\demo.png', '/top']);
});

test('createLaunchFailureMessage includes the normalized executable path', () => {
  const message = createLaunchFailureMessage(' "quicklook.exe" ', new Error('ENOENT'));

  assert.match(message, /quicklook\.exe/);
  assert.match(message, /ENOENT/);
});

test('resolveQuickLookExecutable returns a structured resolution result', async () => {
  const resolution = await resolveQuickLookExecutable('D:\\Program Files\\QuickLook\\QuickLook.exe');

  assert.equal(resolution.executablePath, 'D:\\Program Files\\QuickLook\\QuickLook.exe');
  assert.equal(typeof resolution.foundOnDisk, 'boolean');
  assert.ok(['configured', 'detected', 'path'].includes(resolution.source));
  assert.ok(resolution.checkedPaths.length >= 1);
});

test('findExistingQuickLookExecutables returns valid QuickLook executable paths when present', async () => {
  const executablePaths = await findExistingQuickLookExecutables('quicklook');

  assert.ok(Array.isArray(executablePaths));
  for (const executablePath of executablePaths) {
    assert.equal(isQuickLookExecutablePath(executablePath), true);
  }
});
