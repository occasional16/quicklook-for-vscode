import assert from 'node:assert/strict';
import test from 'node:test';
import {
  distinctPreferredValues,
  getMarkdownResourcePath,
  isManagedMarkdownResource
} from '../markdownResourceState';

test('local Markdown resources are managed case-insensitively', () => {
  assert.equal(isManagedMarkdownResource({ scheme: 'file', path: '/repo/README.md', query: '' }), true);
  assert.equal(isManagedMarkdownResource({ scheme: 'file', path: '/repo/NOTES.MD', query: '' }), true);
  assert.equal(isManagedMarkdownResource({ scheme: 'file', path: '/repo/image.png', query: '' }), false);
});

test('Git Markdown resources use the workspace path encoded in the query', () => {
  const query = JSON.stringify({ path: 'D:\\repo\\docs\\decision.md', ref: '' });
  const uri = { scheme: 'git', path: '/repository-root', query };

  assert.equal(getMarkdownResourcePath(uri), 'D:\\repo\\docs\\decision.md');
  assert.equal(isManagedMarkdownResource(uri), true);
});

test('malformed Git queries fall back to the URI path', () => {
  const uri = { scheme: 'git', path: '/repo/fallback.md', query: '{invalid' };

  assert.equal(getMarkdownResourcePath(uri), '/repo/fallback.md');
  assert.equal(isManagedMarkdownResource(uri), true);
});

test('unrelated virtual Markdown resources remain unmanaged', () => {
  assert.equal(isManagedMarkdownResource({ scheme: 'untitled', path: '/draft.md', query: '' }), false);
  assert.equal(isManagedMarkdownResource({ scheme: 'vscode-userdata', path: '/settings.md', query: '' }), false);
});

test('Diff candidates prefer the modified side and remove duplicates', () => {
  assert.deepEqual(distinctPreferredValues('modified', 'original', value => value), ['modified', 'original']);
  assert.deepEqual(distinctPreferredValues('same', 'same', value => value), ['same']);
});
