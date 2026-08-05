import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createTemporaryPreviewFileName,
  getScmQuickLookCandidates,
  inferGitPreviewVersionLabel,
  parseGitUriMetadata,
  selectTriggeredQuickLookResource,
  shouldPreferFocusedDiffSide,
  shouldUseNextScmCandidate
} from '../quicklookPreviewTarget';

test('SCM groups select the intended Git version without guessing from the path', () => {
  assert.deepEqual(getScmQuickLookCandidates('workingTree', true), [
    { version: 'workingTree' }
  ]);
  assert.deepEqual(getScmQuickLookCandidates('workingTree', false), [
    { version: 'index', label: 'Before deletion' }
  ]);
  assert.deepEqual(getScmQuickLookCandidates('untracked', true), [
    { version: 'workingTree' }
  ]);
  assert.deepEqual(getScmQuickLookCandidates('untracked', false), []);
  assert.deepEqual(getScmQuickLookCandidates('index', true), [
    { version: 'index', label: 'Staged' },
    { version: 'head', label: 'Before deletion' }
  ]);
});

test('only a missing staged path can fall back to HEAD as a deletion', () => {
  assert.equal(shouldUseNextScmCandidate('index', 'index', true, 'FileNotFound'), true);
  assert.equal(shouldUseNextScmCandidate('index', 'index', true, 'Unavailable'), false);
  assert.equal(shouldUseNextScmCandidate('workingTree', 'index', true, 'FileNotFound'), false);
  assert.equal(shouldUseNextScmCandidate('index', 'head', false, 'FileNotFound'), false);
});

test('the context-clicked resource wins over a multi-selection', () => {
  assert.equal(selectTriggeredQuickLookResource('clicked', ['first', 'clicked']), 'clicked');
  assert.equal(selectTriggeredQuickLookResource(undefined, ['only']), 'only');
  assert.equal(selectTriggeredQuickLookResource(undefined, ['first', 'second']), undefined);
});

test('a Diff command follows the focused side only when both URIs belong to that Diff', () => {
  const sides = ['original', 'modified'];
  assert.equal(shouldPreferFocusedDiffSide('modified', 'original', sides), true);
  assert.equal(shouldPreferFocusedDiffSide('explorer-file', 'original', sides), false);
  assert.equal(shouldPreferFocusedDiffSide('modified', 'unrelated-editor', sides), false);
});

test('Git URI metadata preserves empty index refs', () => {
  assert.deepEqual(
    parseGitUriMetadata(JSON.stringify({ path: 'D:\\repo\\README.md', ref: '' })),
    { path: 'D:\\repo\\README.md', ref: '' }
  );
  assert.equal(parseGitUriMetadata('{invalid'), undefined);
});

test('Git refs receive understandable version labels', () => {
  assert.equal(inferGitPreviewVersionLabel(JSON.stringify({ ref: '' })), 'Staged');
  assert.equal(inferGitPreviewVersionLabel(JSON.stringify({ ref: 'HEAD' })), 'HEAD');
  assert.equal(inferGitPreviewVersionLabel(JSON.stringify({ ref: '~' })), 'Before change');
  assert.equal(inferGitPreviewVersionLabel(JSON.stringify({ ref: 'abc123' })), 'History');
});

test('temporary preview names preserve extension and identify the version', () => {
  assert.equal(
    createTemporaryPreviewFileName('D:\\repo\\Quarterly Report.pdf', 'Before deletion', '123-abc'),
    'Quarterly Report-Before deletion-123-abc.pdf'
  );
  assert.equal(
    createTemporaryPreviewFileName('D:\\repo\\bad:name?.md', 'Staged', '456-def'),
    'bad_name_-Staged-456-def.md'
  );
});
