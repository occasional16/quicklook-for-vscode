export type MarkdownView = 'source' | 'preview' | 'split';

export type MarkdownViewEvent =
  | 'inherit'
  | 'sourceSelected'
  | 'previewSelected'
  | 'splitSelected'
  | 'sourceClosed'
  | 'previewClosed';

const publicDynamicPreviewViewType = 'markdown.preview';
const mainThreadDynamicPreviewViewType = `mainThreadWebview-${publicDynamicPreviewViewType}`;

export function isMarkdownView(value: unknown): value is MarkdownView {
  return value === 'source' || value === 'preview' || value === 'split';
}

export function isMarkdownDynamicPreviewViewType(value: unknown): value is string {
  return value === publicDynamicPreviewViewType || value === mainThreadDynamicPreviewViewType;
}

export function previewActivationEvent(
  isSameResource: boolean,
  isInheritedActivation = false
): MarkdownViewEvent | undefined {
  if (isInheritedActivation) {
    return undefined;
  }
  return isSameResource ? 'previewSelected' : 'inherit';
}

export function sourceActivationEvent(
  current: MarkdownView | undefined,
  isSameResource: boolean,
  hasSplitStructure: boolean,
  isInheritedActivation = false
): MarkdownViewEvent | undefined {
  if (isInheritedActivation) {
    return undefined;
  }
  if (hasSplitStructure) {
    return 'splitSelected';
  }
  if (!isSameResource) {
    return 'inherit';
  }
  return current === 'preview' ? 'sourceSelected' : undefined;
}

export function resolveMarkdownView(
  current: MarkdownView | undefined,
  event: MarkdownViewEvent,
  initial: MarkdownView
): MarkdownView {
  switch (event) {
    case 'inherit':
      return current ?? initial;
    case 'sourceSelected':
      return 'source';
    case 'previewSelected':
      return 'preview';
    case 'splitSelected':
      return 'split';
    case 'sourceClosed':
      return current === 'split' ? 'preview' : current ?? initial;
    case 'previewClosed':
      return current === 'split' ? 'source' : current ?? initial;
  }
}

export function editorGroupCountForView(view: MarkdownView): 1 | 2 {
  return view === 'split' ? 2 : 1;
}

export function shouldRebuildSplitLayout(
  view: MarkdownView,
  sideBySideDirectionChanged: boolean
): boolean {
  return view === 'split' && sideBySideDirectionChanged;
}
