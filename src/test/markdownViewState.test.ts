import assert from 'node:assert/strict';
import test from 'node:test';
import {
  editorGroupCountForView,
  isMarkdownDynamicPreviewViewType,
  isMarkdownView,
  previewActivationEvent,
  resolveMarkdownView,
  sourceActivationEvent,
  shouldRebuildSplitLayout
} from '../markdownViewState';

test('a Markdown file inherits the workspace view or configured initial view', () => {
  assert.equal(resolveMarkdownView(undefined, 'inherit', 'preview'), 'preview');
  assert.equal(resolveMarkdownView(undefined, 'inherit', 'source'), 'source');
  assert.equal(resolveMarkdownView(undefined, 'inherit', 'split'), 'split');
  assert.equal(resolveMarkdownView('source', 'inherit', 'preview'), 'source');
  assert.equal(resolveMarkdownView('preview', 'inherit', 'source'), 'preview');
  assert.equal(resolveMarkdownView('split', 'inherit', 'preview'), 'split');
});

test('native view selections become the workspace view', () => {
  assert.equal(resolveMarkdownView('preview', 'sourceSelected', 'preview'), 'source');
  assert.equal(resolveMarkdownView('source', 'previewSelected', 'preview'), 'preview');
  assert.equal(resolveMarkdownView('preview', 'splitSelected', 'preview'), 'split');
});

test('a static preview for another file inherits split instead of selecting preview', () => {
  const event = previewActivationEvent(false);
  assert.equal(event, 'inherit');
  assert.equal(resolveMarkdownView('split', event!, 'preview'), 'split');
  assert.equal(previewActivationEvent(true), 'previewSelected');
});

test('duplicate static preview events cannot override inherited source or split', () => {
  assert.equal(previewActivationEvent(true, true), undefined);
  assert.equal(previewActivationEvent(true, false), 'previewSelected');
});

test('focusing Group 1 in an observed split never selects source', () => {
  const event = sourceActivationEvent('preview', true, true);
  assert.equal(event, 'splitSelected');
  assert.equal(resolveMarkdownView('preview', event!, 'preview'), 'split');
});

test('source activation distinguishes file switches, reopen actions, and focus', () => {
  assert.equal(sourceActivationEvent('split', false, false), 'inherit');
  assert.equal(sourceActivationEvent('preview', true, false), 'sourceSelected');
  assert.equal(sourceActivationEvent('source', true, false), undefined);
  assert.equal(sourceActivationEvent('split', true, false), undefined);
});

test('a source reopen is idempotent across tab and editor event order', () => {
  const firstEvent = sourceActivationEvent('preview', true, false);
  assert.equal(firstEvent, 'sourceSelected');

  const viewAfterFirstEvent = resolveMarkdownView('preview', firstEvent!, 'preview');
  assert.equal(viewAfterFirstEvent, 'source');
  assert.equal(sourceActivationEvent(viewAfterFirstEvent, true, false), undefined);
});

test('duplicate source events cannot override an inherited view', () => {
  const firstEvent = sourceActivationEvent('preview', false, false);
  assert.equal(firstEvent, 'inherit');

  const inheritedView = resolveMarkdownView('preview', firstEvent!, 'preview');
  assert.equal(inheritedView, 'preview');
  assert.equal(sourceActivationEvent(inheritedView, true, false, true), undefined);
});

test('closing one side of split keeps the remaining view', () => {
  assert.equal(resolveMarkdownView('split', 'sourceClosed', 'preview'), 'preview');
  assert.equal(resolveMarkdownView('split', 'previewClosed', 'preview'), 'source');
});

test('close events outside split do not invent a different view', () => {
  assert.equal(resolveMarkdownView('source', 'sourceClosed', 'preview'), 'source');
  assert.equal(resolveMarkdownView('preview', 'previewClosed', 'source'), 'preview');
});

test('only the three canonical workspace-state values are accepted', () => {
  assert.equal(isMarkdownView('source'), true);
  assert.equal(isMarkdownView('preview'), true);
  assert.equal(isMarkdownView('split'), true);
  assert.equal(isMarkdownView('dualPane'), false);
  assert.equal(isMarkdownView(undefined), false);
});

test('VS Code public and main-thread Markdown preview tab types are recognized', () => {
  assert.equal(isMarkdownDynamicPreviewViewType('markdown.preview'), true);
  assert.equal(isMarkdownDynamicPreviewViewType('mainThreadWebview-markdown.preview'), true);
  assert.equal(isMarkdownDynamicPreviewViewType('vscode.markdown.preview.editor'), false);
  assert.equal(isMarkdownDynamicPreviewViewType('other-markdown.preview'), false);
});

test('canonical views require exactly one or two editor groups', () => {
  assert.equal(editorGroupCountForView('source'), 1);
  assert.equal(editorGroupCountForView('preview'), 1);
  assert.equal(editorGroupCountForView('split'), 2);
});

test('a side-by-side direction change rebuilds only split', () => {
  assert.equal(shouldRebuildSplitLayout('split', true), true);
  assert.equal(shouldRebuildSplitLayout('source', true), false);
  assert.equal(shouldRebuildSplitLayout('preview', true), false);
  assert.equal(shouldRebuildSplitLayout('split', false), false);
});
