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
  const defaultExecutablePath = 'D:\\Program Files\\QuickLook\\QuickLook.exe';

  assert.equal(normalizeExecutablePath(undefined), defaultExecutablePath);
  assert.equal(normalizeExecutablePath('   '), defaultExecutablePath);
  assert.equal(normalizeExecutablePath(42), defaultExecutablePath);
});

test('normalizeExecutablePath strips wrapping quotes', () => {
  assert.equal(normalizeExecutablePath('"C:\\Program Files\\QuickLook\\QuickLook.exe"'), 'C:\\Program Files\\QuickLook\\QuickLook.exe');
  assert.equal(normalizeExecutablePath("'C:\\Tools\\QuickLook.exe'"), 'C:\\Tools\\QuickLook.exe');
});

test('normalizeExecutablePath maps stale quicklook command settings to the local QuickLook executable', () => {
  assert.equal(normalizeExecutablePath('quicklook'), 'D:\\Program Files\\QuickLook\\QuickLook.exe');
  assert.equal(normalizeExecutablePath(' QUICKLOOK '), 'D:\\Program Files\\QuickLook\\QuickLook.exe');
});

test('normalizePreviewOptions trims values and removes duplicates', () => {
  assert.deepEqual(normalizePreviewOptions([' /pin ', '/top', '/pin', '', 123]), ['/pin', '/top']);
});

test('getQuickLookExecutableCandidates includes unique absolute paths only', () => {
  assert.deepEqual(getQuickLookExecutableCandidates('quicklook'), [
    'D:\\Program Files\\QuickLook\\QuickLook.exe',
    'C:\\Program Files\\QuickLook\\QuickLook.exe',
    'C:\\Program Files (x86)\\QuickLook\\QuickLook.exe'
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