import * as vscode from 'vscode';
import { distinctPreferredValues, isManagedMarkdownResource } from './markdownResourceState';
import {
  MarkdownView,
  MarkdownViewEvent,
  isMarkdownDynamicPreviewViewType,
  isMarkdownView,
  previewActivationEvent,
  resolveMarkdownView,
  sourceActivationEvent,
  shouldRebuildSplitLayout
} from './markdownViewState';

const configSection = 'quicklook';
const continuityEnabledConfigKey = 'markdownViewContinuity.enabled';
const initialViewConfigKey = 'markdownInitialView';
const workspaceViewStateKey = 'quicklook.lastMarkdownView';
const staticPreviewViewType = 'vscode.markdown.preview.editor';
const reopenAsPreviewCommand = 'markdown.reopenAsPreview';
const reopenAsSourceCommand = 'markdown.reopenAsSource';
const showPreviewToSideCommand = 'markdown.showPreviewToSide';
const singleColumnLayoutCommand = 'workbench.action.editorLayoutSingle';
const resetEditorGroupSizesCommand = 'workbench.action.evenEditorWidths';
const sideBySideDirectionConfig = 'workbench.editor.openSideBySideDirection';
const arrangeDebounceMs = 75;
const closeResolutionDelayMs = 150;
const previewOpenTimeoutMs = 2_000;

interface TextSourceInput {
  readonly kind: 'text';
  readonly uri: vscode.Uri;
}

interface DiffSourceInput {
  readonly kind: 'diff';
  readonly label: string;
  readonly modified: vscode.Uri;
  readonly original: vscode.Uri;
}

type MarkdownSourceInput = TextSourceInput | DiffSourceInput;

interface MarkdownContext {
  readonly key: string;
  readonly preferredTargetKey: string;
  readonly previewCandidates: readonly vscode.Uri[];
  readonly source: MarkdownSourceInput;
}

interface PendingArrangement {
  readonly context: MarkdownContext;
  readonly generation: number;
  readonly reason: string;
  readonly rebuildLayout: boolean;
  readonly view: MarkdownView;
}

interface DynamicPreviewAssociation {
  readonly context: MarkdownContext;
  readonly previewUri: vscode.Uri;
  readonly tab: vscode.Tab;
}

let log: (message: string) => void = () => {};
let extensionContext: vscode.ExtensionContext | undefined;
let controllerEnabled = false;
let isApplyingLayout = false;
let arrangeTimer: ReturnType<typeof setTimeout> | undefined;
let arrangementGeneration = 0;
let pendingArrangement: PendingArrangement | undefined;
let activeManagedContext: MarkdownContext | undefined;
let lastMarkdownSourceContext: MarkdownContext | undefined;
let lastMarkdownView: MarkdownView | undefined;
let inheritedStaticPreviewTargetKey: string | undefined;
let inheritedSourceContextKey: string | undefined;
let activePreviewUri: vscode.Uri | undefined;

const dynamicPreviewAssociations = new Map<string, DynamicPreviewAssociation>();
const closeResolutionTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function activateMarkdownViewController(
  context: vscode.ExtensionContext,
  logFn: (message: string) => void
): void {
  log = logFn;
  extensionContext = context;

  const storedView = context.workspaceState.get<unknown>(workspaceViewStateKey);
  lastMarkdownView = isMarkdownView(storedView) ? storedView : undefined;
  controllerEnabled = getConfiguredContinuityEnabled();

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(onActiveTextEditorChanged),
    vscode.window.tabGroups.onDidChangeTabs(onTabsChanged),
    vscode.workspace.onDidChangeConfiguration(onConfigurationChanged),
    { dispose: disposeController }
  );

  log(
    `Markdown last-view controller registered (${controllerEnabled ? 'enabled' : 'disabled'}). `
    + `Stored workspace view: ${lastMarkdownView ?? 'none'}.`
  );
  if (controllerEnabled) {
    initializeActiveView();
  }
}

function initializeActiveView(preferCurrentView = false): void {
  const activeTab = getActiveTab();
  const staticUri = getStaticPreviewUri(activeTab);
  if (staticUri && isManagedMarkdownUri(staticUri)) {
    const context = createTextContext(staticUri);
    activeManagedContext = context;
    activePreviewUri = staticUri;
    inheritedStaticPreviewTargetKey = context.preferredTargetKey;
    if (preferCurrentView) {
      selectView(context, 'previewSelected', 'Markdown continuity enabled from current native preview');
    } else {
      inheritView(context, 'Initial native Markdown preview');
    }
    return;
  }

  const editor = vscode.window.activeTextEditor;
  const sourceContext = editor ? getActiveMarkdownSourceContext(editor) : undefined;
  if (sourceContext) {
    lastMarkdownSourceContext = sourceContext;
    activeManagedContext = sourceContext;

    const controlledDynamicTab = getControlledDynamicPreview(sourceContext);
    const dynamicTab = controlledDynamicTab
      ?? findDynamicPreviewInGroup(vscode.ViewColumn.Two);
    const dynamicAssociationWasMissing = !!dynamicTab && !findDynamicPreviewAssociation(dynamicTab);
    if (dynamicTab && dynamicAssociationWasMissing) {
      associateDynamicPreview(sourceContext, dynamicTab, sourceContext.previewCandidates[0]);
    }
    if (dynamicTab && isSplitStructure(sourceContext, dynamicTab)) {
      if (dynamicAssociationWasMissing) {
        selectView(sourceContext, 'splitSelected', 'Adopted and synchronized current native Markdown split view');
      } else {
        observeSplitView(sourceContext, dynamicTab, sourceContext.previewCandidates[0], 'Restored native Markdown split view');
      }
      return;
    }

    if (preferCurrentView) {
      selectView(sourceContext, 'sourceSelected', 'Markdown continuity enabled from current source');
    } else {
      inheritView(sourceContext, 'Initial Markdown source');
    }
    return;
  }

  if (isDynamicPreviewTab(activeTab)) {
    const context = findOpenMarkdownSourceContext();
    if (context) {
      observeSplitView(context, activeTab, context.previewCandidates[0], 'Restored native Markdown split view');
    }
  }
}

function onActiveTextEditorChanged(editor: vscode.TextEditor | undefined): void {
  if (!controllerEnabled || isApplyingLayout) {
    return;
  }

  // A webview focus change can emit `undefined` before the active Tab updates.
  if (!editor) {
    return;
  }

  const context = getActiveMarkdownSourceContext(editor);
  if (!context) {
    leaveManagedContext();
    return;
  }

  handleMarkdownSourceActivation(context);
}

function handleMarkdownSourceActivation(context: MarkdownContext): void {
  const isSameResource = isSameActivatedResource(context);
  const isInheritedActivation = inheritedSourceContextKey === context.key;
  clearInheritedStaticPreview(context);

  const dynamicTab = getControlledDynamicPreview(context)
    ?? findDynamicPreviewInGroup(vscode.ViewColumn.Two);
  const hasSplitStructure = !!dynamicTab && isSplitStructure(context, dynamicTab);

  lastMarkdownSourceContext = context;
  activeManagedContext = context;
  activePreviewUri = undefined;

  const viewEvent = sourceActivationEvent(
    lastMarkdownView,
    isSameResource,
    hasSplitStructure,
    isInheritedActivation
  );
  if (!viewEvent) {
    return;
  }

  if (viewEvent === 'splitSelected' && dynamicTab) {
    // Focusing Group 1 is not a layout request. The observed two-group
    // structure is authoritative, so cancel stale work and only remember it.
    observeSplitView(
      context,
      dynamicTab,
      getAssociatedPreviewUri(dynamicTab) ?? context.previewCandidates[0],
      'Native Markdown split observed from source'
    );
  } else if (viewEvent === 'inherit') {
    inheritedSourceContextKey = context.key;
    inheritView(context, 'Markdown source or Diff switched');
  } else {
    inheritedSourceContextKey = undefined;
    selectView(context, viewEvent, 'Native source view selected');
  }
}

function onTabsChanged(event: vscode.TabChangeEvent): void {
  if (!controllerEnabled || isApplyingLayout) {
    return;
  }

  for (const tab of event.closed) {
    handleClosedTab(tab);
  }

  for (const tab of event.opened) {
    if (!isDynamicPreviewTab(tab)) {
      continue;
    }

    const context = getContextForDynamicPreview(tab);
    if (context) {
      observeSplitView(
        context,
        tab,
        getFocusedPreviewCandidate(context) ?? context.previewCandidates[0],
        'Native Open Preview to the Side'
      );
      return;
    }
  }

  const activeTab = getActiveTab();
  const activeTabChanged = !!activeTab
    && (event.opened.includes(activeTab) || event.changed.includes(activeTab));
  if (!activeTabChanged) {
    return;
  }

  const staticUri = getStaticPreviewUri(activeTab);
  if (staticUri && isManagedMarkdownUri(staticUri)) {
    const context = createTextContext(staticUri);
    const isSameResource = isSameActivatedResource(context);
    const isInheritedActivation = inheritedStaticPreviewTargetKey === context.preferredTargetKey;
    activeManagedContext = context;
    activePreviewUri = staticUri;

    const viewEvent = previewActivationEvent(isSameResource, isInheritedActivation);
    if (!viewEvent) {
      return;
    }
    if (viewEvent === 'inherit') {
      inheritedStaticPreviewTargetKey = context.preferredTargetKey;
      inheritView(context, 'Markdown file switched through native preview');
    } else {
      selectView(context, viewEvent, 'Native Open as Preview');
    }
    return;
  }

  if (isDynamicPreviewTab(activeTab)) {
    const context = getContextForDynamicPreview(activeTab);
    if (context) {
      observeSplitView(
        context,
        activeTab,
        getAssociatedPreviewUri(activeTab) ?? context.previewCandidates[0],
        'Native Markdown side preview activated'
      );
    }
    return;
  }

  const sourceContext = getMarkdownContextFromTab(activeTab);
  if (sourceContext) {
    // VS Code can publish the Tab change before the active-text-editor change.
    // Handling source inputs in both event streams keeps an explicit source
    // choice from being overwritten by the previously remembered preview.
    handleMarkdownSourceActivation(sourceContext);
    return;
  }

  leaveManagedContext();
}

function handleClosedTab(tab: vscode.Tab): void {
  const sourceContext = getMarkdownContextFromTab(tab);
  if (sourceContext && isRelevantSourceContext(sourceContext)) {
    scheduleClosedLayoutResolution(sourceContext);
  }

  const association = findDynamicPreviewAssociation(tab);
  if (association) {
    dynamicPreviewAssociations.delete(association.context.preferredTargetKey);
    scheduleClosedLayoutResolution(association.context);
  }

  const staticUri = getStaticPreviewUri(tab);
  if (staticUri && activeManagedContext && contextContainsUri(activeManagedContext, staticUri)) {
    scheduleClosedLayoutResolution(activeManagedContext);
  }
}

function scheduleClosedLayoutResolution(context: MarkdownContext): void {
  const existing = closeResolutionTimers.get(context.key);
  if (existing) {
    clearTimeout(existing);
  }

  const timer = setTimeout(() => {
    closeResolutionTimers.delete(context.key);
    resolveClosedLayout(context);
  }, closeResolutionDelayMs);
  closeResolutionTimers.set(context.key, timer);
}

function resolveClosedLayout(context: MarkdownContext): void {
  if (!controllerEnabled) {
    return;
  }

  const sourceTab = findSourceTab(context);
  const association = getDynamicPreviewAssociation(context);
  const dynamicTab = association?.tab;
  const staticTab = findStaticPreviewTab(association?.previewUri ?? context.previewCandidates[0]);

  if (!sourceTab && !dynamicTab && !staticTab) {
    if (activeManagedContext?.key === context.key) {
      activeManagedContext = undefined;
      activePreviewUri = undefined;
      clearArrangementTimer();
    }
    return;
  }

  if (activeManagedContext?.key !== context.key || lastMarkdownView !== 'split') {
    return;
  }

  if (sourceTab && !dynamicTab) {
    selectView(context, 'previewClosed', 'Markdown side preview closed');
  } else if (!sourceTab && dynamicTab) {
    selectView(context, 'sourceClosed', 'Markdown source or Diff closed');
  }
}

function onConfigurationChanged(event: vscode.ConfigurationChangeEvent): void {
  const enabledChanged = event.affectsConfiguration(`${configSection}.${continuityEnabledConfigKey}`);
  const initialViewChanged = event.affectsConfiguration(`${configSection}.${initialViewConfigKey}`);
  const directionChanged = event.affectsConfiguration(sideBySideDirectionConfig);

  if (enabledChanged) {
    const enabled = getConfiguredContinuityEnabled();
    if (enabled !== controllerEnabled) {
      controllerEnabled = enabled;
      if (enabled) {
        log('Markdown last-view continuity enabled. The current Markdown view becomes the active workflow.');
        initializeActiveView(true);
      } else {
        log('Markdown last-view continuity disabled. Current editor layout is left unchanged.');
        suspendController();
      }
    }
  }

  if (!controllerEnabled) {
    return;
  }

  if (initialViewChanged) {
    log('Markdown initial view changed; it will apply only when the workspace has no remembered view.');
  }

  if (!directionChanged
    || !activeManagedContext
    || !lastMarkdownView
    || !shouldRebuildSplitLayout(lastMarkdownView, true)) {
    return;
  }

  requestView(
    activeManagedContext,
    lastMarkdownView,
    'Side-by-side direction changed',
    true
  );
}

function inheritView(context: MarkdownContext, reason: string): void {
  const view = resolveMarkdownView(lastMarkdownView, 'inherit', getConfiguredInitialView());
  rememberView(view);
  requestView(context, view, reason);
}

function selectView(context: MarkdownContext, event: MarkdownViewEvent, reason: string): void {
  const view = resolveMarkdownView(lastMarkdownView, event, getConfiguredInitialView());
  rememberView(view);
  requestView(context, view, reason);
}

function rememberView(view: MarkdownView): void {
  if (lastMarkdownView === view) {
    return;
  }

  lastMarkdownView = view;
  log(`Remembered Markdown workspace view: ${view}.`);
  void extensionContext?.workspaceState.update(workspaceViewStateKey, view).then(
    undefined,
    error => log(`Could not persist Markdown workspace view: ${error instanceof Error ? error.message : String(error)}`)
  );
}

function observeSplitView(
  context: MarkdownContext,
  previewTab: vscode.Tab,
  previewUri: vscode.Uri,
  reason: string
): void {
  clearArrangementTimer();
  clearInheritedStaticPreview(context);
  activeManagedContext = context;
  lastMarkdownSourceContext = context;
  activePreviewUri = undefined;
  inheritedSourceContextKey = undefined;
  associateDynamicPreview(context, previewTab, previewUri);
  rememberView('split');
  log(`Observed Markdown split view (${reason}): ${describeContext(context)}`);
}

function requestView(
  context: MarkdownContext,
  view: MarkdownView,
  reason: string,
  rebuildLayout = false
): void {
  if (!controllerEnabled) {
    return;
  }

  if (inheritedSourceContextKey !== context.key) {
    inheritedSourceContextKey = undefined;
  }
  activeManagedContext = context;
  clearArrangementTimer();

  const request: PendingArrangement = {
    context,
    generation: ++arrangementGeneration,
    reason,
    rebuildLayout,
    view
  };
  pendingArrangement = request;

  arrangeTimer = setTimeout(() => {
    arrangeTimer = undefined;
    void applyPendingArrangement(request);
  }, arrangeDebounceMs);
}

async function applyPendingArrangement(request: PendingArrangement): Promise<void> {
  if (!controllerEnabled
    || pendingArrangement?.generation !== request.generation
    || activeManagedContext?.key !== request.context.key) {
    return;
  }

  if (isApplyingLayout) {
    arrangeTimer = setTimeout(() => {
      arrangeTimer = undefined;
      void applyPendingArrangement(request);
    }, arrangeDebounceMs);
    return;
  }

  isApplyingLayout = true;
  try {
    log(`Applying Markdown ${request.view} view (${request.reason}): ${describeContext(request.context)}`);
    switch (request.view) {
      case 'source':
        await normalizeSourceView(request.context);
        break;
      case 'preview':
        await normalizePreviewView(request.context);
        break;
      case 'split':
        await normalizeSplitView(request.context, request.rebuildLayout);
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Markdown ${request.view} view failed: ${message}`);
    vscode.window.showErrorMessage(`Could not arrange the Markdown ${request.view} view: ${message}`);
  } finally {
    isApplyingLayout = false;
    if (pendingArrangement?.generation === request.generation) {
      pendingArrangement = undefined;
      clearInheritedStaticPreview(request.context);
      if (inheritedSourceContextKey === request.context.key) {
        inheritedSourceContextKey = undefined;
      }
    }
  }
}

async function normalizeSourceView(context: MarkdownContext): Promise<void> {
  if (isSourceLayoutCorrect(context)) {
    activePreviewUri = undefined;
    return;
  }

  await closeControlledDynamicPreviews();
  await vscode.commands.executeCommand(singleColumnLayoutCommand);

  const activeStaticUri = getStaticPreviewUri(getActiveTab());
  if (context.source.kind === 'text'
    && activeStaticUri?.toString() === context.source.uri.toString()) {
    await vscode.commands.executeCommand(reopenAsSourceCommand);
  }

  if (!isActiveSource(context)) {
    await openSourceInput(context);
  }

  await vscode.commands.executeCommand(singleColumnLayoutCommand);
  activePreviewUri = undefined;
}

async function normalizePreviewView(context: MarkdownContext): Promise<void> {
  const previewUri = await resolvePreviewUri(context);
  if (!previewUri) {
    throw new Error('The SCM target version is unavailable.');
  }

  if (isPreviewLayoutCorrect(previewUri)) {
    activePreviewUri = previewUri;
    return;
  }

  await closeControlledDynamicPreviews();
  await vscode.commands.executeCommand(singleColumnLayoutCommand);

  if (context.source.kind === 'text'
    && context.source.uri.scheme === 'file'
    && isActiveSource(context)
    && context.source.uri.toString() === previewUri.toString()) {
    await vscode.commands.executeCommand(reopenAsPreviewCommand);
  } else {
    await openStaticPreview(previewUri);
  }

  await vscode.commands.executeCommand(singleColumnLayoutCommand);
  if (!isPreviewLayoutCorrect(previewUri)) {
    await openStaticPreview(previewUri);
  }
  activePreviewUri = previewUri;
}

async function normalizeSplitView(context: MarkdownContext, rebuildLayout: boolean): Promise<void> {
  const previewUri = await resolvePreviewUri(context);
  if (!previewUri) {
    throw new Error('The SCM target version is unavailable.');
  }

  const existingDynamic = findDynamicPreviewInGroup(vscode.ViewColumn.Two);
  if (!rebuildLayout && existingDynamic && isSourceInGroupOne(context)) {
    // Retarget the existing unlocked preview without rebuilding the Groups.
    // Focus Group 1 first so `to the side` cannot create Group 3 when the
    // lower/right preview was the last focused editor.
    await openSourceInput(context);
    await vscode.commands.executeCommand(showPreviewToSideCommand, previewUri);
    const currentDynamic = await waitForDynamicPreviewInGroup(vscode.ViewColumn.Two);
    if (!currentDynamic) {
      throw new Error('VS Code did not keep a native Markdown side preview.');
    }
    associateDynamicPreview(context, currentDynamic, previewUri);
    await vscode.commands.executeCommand(resetEditorGroupSizesCommand);
    await openSourceInput(context);
    activePreviewUri = undefined;
    return;
  }

  await closeControlledDynamicPreviews();
  await vscode.commands.executeCommand(singleColumnLayoutCommand);

  const activeStaticUri = getStaticPreviewUri(getActiveTab());
  if (context.source.kind === 'text'
    && activeStaticUri?.toString() === context.source.uri.toString()) {
    await vscode.commands.executeCommand(reopenAsSourceCommand);
  }

  if (!isActiveSource(context)) {
    await openSourceInput(context);
  }

  // VS Code creates Group 2 in the configured `right` or `down` direction.
  await vscode.commands.executeCommand(showPreviewToSideCommand, previewUri);

  const dynamicTab = await waitForDynamicPreviewInGroup(vscode.ViewColumn.Two);
  if (!dynamicTab) {
    throw new Error('VS Code did not create the native Markdown side preview.');
  }
  associateDynamicPreview(context, dynamicTab, previewUri);

  await vscode.commands.executeCommand(resetEditorGroupSizesCommand);
  await openSourceInput(context);
  activePreviewUri = undefined;
}

async function openSourceInput(context: MarkdownContext): Promise<void> {
  if (context.source.kind === 'text') {
    await vscode.window.showTextDocument(context.source.uri, {
      viewColumn: vscode.ViewColumn.One,
      preserveFocus: false,
      preview: false
    });
    return;
  }

  await vscode.commands.executeCommand(
    'vscode.diff',
    context.source.original,
    context.source.modified,
    context.source.label,
    {
      viewColumn: vscode.ViewColumn.One,
      preserveFocus: false,
      preview: false
    }
  );
}

async function openStaticPreview(uri: vscode.Uri): Promise<void> {
  await vscode.commands.executeCommand(
    'vscode.openWith',
    uri,
    staticPreviewViewType,
    {
      viewColumn: vscode.ViewColumn.One,
      preserveFocus: false,
      preview: false
    }
  );
}

async function resolvePreviewUri(context: MarkdownContext): Promise<vscode.Uri | undefined> {
  for (const candidate of context.previewCandidates) {
    try {
      await vscode.workspace.openTextDocument(candidate);
      return candidate;
    } catch (error) {
      log(`Markdown Preview candidate unavailable (${candidate.toString()}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return undefined;
}

async function closeControlledDynamicPreviews(): Promise<void> {
  const tabs = Array.from(new Set(
    Array.from(dynamicPreviewAssociations.values(), association => association.tab)
  )).filter(isTabOpen);
  dynamicPreviewAssociations.clear();
  for (const tab of tabs) {
    await vscode.window.tabGroups.close(tab, true);
  }
}

function isSourceLayoutCorrect(context: MarkdownContext): boolean {
  const groups = vscode.window.tabGroups.all;
  return groups.length === 1 && sourceInputMatchesTab(context.source, groups[0].activeTab);
}

function isPreviewLayoutCorrect(uri: vscode.Uri): boolean {
  const groups = vscode.window.tabGroups.all;
  return groups.length === 1
    && getStaticPreviewUri(groups[0].activeTab)?.toString() === uri.toString();
}

function isSplitStructure(context: MarkdownContext, dynamicTab: vscode.Tab): boolean {
  const groups = vscode.window.tabGroups.all;
  if (groups.length !== 2) {
    return false;
  }

  const group1 = groups.find(group => group.viewColumn === vscode.ViewColumn.One);
  const group2 = groups.find(group => group.viewColumn === vscode.ViewColumn.Two);
  const association = findDynamicPreviewAssociation(dynamicTab);
  return !!group1
    && !!group2
    && sourceInputMatchesTab(context.source, group1.activeTab)
    && group2.activeTab === dynamicTab
    && association?.context.key === context.key;
}

function isSourceInGroupOne(context: MarkdownContext): boolean {
  const groups = vscode.window.tabGroups.all;
  if (groups.length !== 2) {
    return false;
  }

  const group1 = groups.find(group => group.viewColumn === vscode.ViewColumn.One);
  return !!group1 && sourceInputMatchesTab(context.source, group1.activeTab);
}

function isActiveSource(context: MarkdownContext): boolean {
  return sourceInputMatchesTab(context.source, getActiveTab());
}

function getActiveMarkdownSourceContext(editor: vscode.TextEditor): MarkdownContext | undefined {
  if (editor.document.languageId !== 'markdown') {
    return undefined;
  }

  const context = getMarkdownContextFromTab(getActiveTab());
  if (!context) {
    return undefined;
  }

  const editorUri = editor.document.uri.toString();
  if (context.source.kind === 'text') {
    return context.source.uri.toString() === editorUri ? context : undefined;
  }

  return context.source.original.toString() === editorUri
    || context.source.modified.toString() === editorUri
    ? context
    : undefined;
}

function getMarkdownContextFromTab(tab: vscode.Tab | undefined): MarkdownContext | undefined {
  if (!tab) {
    return undefined;
  }

  if (tab.input instanceof vscode.TabInputText) {
    return isManagedMarkdownUri(tab.input.uri) ? createTextContext(tab.input.uri) : undefined;
  }

  if (tab.input instanceof vscode.TabInputTextDiff) {
    return createDiffContext(tab.input.original, tab.input.modified, tab.label);
  }

  return undefined;
}

function createTextContext(uri: vscode.Uri): MarkdownContext {
  const key = uri.toString();
  return {
    key: `text:${key}`,
    preferredTargetKey: key,
    previewCandidates: [uri],
    source: { kind: 'text', uri }
  };
}

function createDiffContext(
  original: vscode.Uri,
  modified: vscode.Uri,
  label: string
): MarkdownContext | undefined {
  const previewCandidates = distinctPreferredValues(
    modified,
    original,
    candidate => candidate.toString()
  ).filter(isManagedMarkdownUri);

  if (previewCandidates.length === 0) {
    return undefined;
  }

  return {
    key: `diff:${original.toString()}::${modified.toString()}`,
    preferredTargetKey: previewCandidates[0].toString(),
    previewCandidates,
    source: { kind: 'diff', label, modified, original }
  };
}

function isManagedMarkdownUri(uri: vscode.Uri): boolean {
  return isManagedMarkdownResource({
    path: uri.path,
    query: uri.query,
    scheme: uri.scheme
  });
}

function getConfiguredInitialView(): MarkdownView {
  const value = vscode.workspace.getConfiguration(configSection).get<unknown>(initialViewConfigKey, 'preview');
  return isMarkdownView(value) ? value : 'preview';
}

function getConfiguredContinuityEnabled(): boolean {
  return vscode.workspace.getConfiguration(configSection).get<boolean>(continuityEnabledConfigKey, true);
}

function getActiveTab(): vscode.Tab | undefined {
  return vscode.window.tabGroups.activeTabGroup.activeTab;
}

function getStaticPreviewUri(tab: vscode.Tab | undefined): vscode.Uri | undefined {
  return tab?.input instanceof vscode.TabInputCustom
    && tab.input.viewType === staticPreviewViewType
    ? tab.input.uri
    : undefined;
}

function isDynamicPreviewTab(tab: vscode.Tab | undefined): tab is vscode.Tab {
  return !!tab
    && tab.input instanceof vscode.TabInputWebview
    && isMarkdownDynamicPreviewViewType(tab.input.viewType);
}

function sourceInputMatchesTab(source: MarkdownSourceInput, tab: vscode.Tab | undefined): boolean {
  if (!tab) {
    return false;
  }

  if (source.kind === 'text') {
    return tab.input instanceof vscode.TabInputText
      && tab.input.uri.toString() === source.uri.toString();
  }

  return tab.input instanceof vscode.TabInputTextDiff
    && tab.input.original.toString() === source.original.toString()
    && tab.input.modified.toString() === source.modified.toString();
}

function findSourceTab(context: MarkdownContext): vscode.Tab | undefined {
  for (const group of vscode.window.tabGroups.all) {
    const tab = group.tabs.find(candidate => sourceInputMatchesTab(context.source, candidate));
    if (tab) {
      return tab;
    }
  }
  return undefined;
}

function findStaticPreviewTab(uri: vscode.Uri): vscode.Tab | undefined {
  const key = uri.toString();
  for (const group of vscode.window.tabGroups.all) {
    const tab = group.tabs.find(candidate => getStaticPreviewUri(candidate)?.toString() === key);
    if (tab) {
      return tab;
    }
  }
  return undefined;
}

function findDynamicPreviewInGroup(viewColumn: vscode.ViewColumn): vscode.Tab | undefined {
  const group = vscode.window.tabGroups.all.find(candidate => candidate.viewColumn === viewColumn);
  if (!group) {
    return undefined;
  }

  if (isDynamicPreviewTab(group.activeTab)) {
    return group.activeTab;
  }
  return group.tabs.find(isDynamicPreviewTab);
}

function waitForDynamicPreviewInGroup(
  viewColumn: vscode.ViewColumn
): Promise<vscode.Tab | undefined> {
  const existing = findDynamicPreviewInGroup(viewColumn);
  if (existing) {
    return Promise.resolve(existing);
  }

  return new Promise(resolve => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;

    const finish = (tab: vscode.Tab | undefined): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      tabsDisposable.dispose();
      groupsDisposable.dispose();
      resolve(tab);
    };

    const check = (): void => {
      const tab = findDynamicPreviewInGroup(viewColumn);
      if (tab) {
        finish(tab);
      }
    };

    const tabsDisposable = vscode.window.tabGroups.onDidChangeTabs(check);
    const groupsDisposable = vscode.window.tabGroups.onDidChangeTabGroups(check);
    timer = setTimeout(() => finish(undefined), previewOpenTimeoutMs);
    check();
  });
}

function associateDynamicPreview(
  context: MarkdownContext,
  tab: vscode.Tab,
  previewUri: vscode.Uri
): void {
  for (const [key, association] of dynamicPreviewAssociations) {
    if (key === context.preferredTargetKey || association.tab === tab) {
      dynamicPreviewAssociations.delete(key);
    }
  }
  dynamicPreviewAssociations.set(context.preferredTargetKey, { context, previewUri, tab });
}

function getDynamicPreviewAssociation(context: MarkdownContext): DynamicPreviewAssociation | undefined {
  const association = dynamicPreviewAssociations.get(context.preferredTargetKey);
  return association && isTabOpen(association.tab) ? association : undefined;
}

function getControlledDynamicPreview(context: MarkdownContext): vscode.Tab | undefined {
  return getDynamicPreviewAssociation(context)?.tab;
}

function findDynamicPreviewAssociation(tab: vscode.Tab): DynamicPreviewAssociation | undefined {
  return Array.from(dynamicPreviewAssociations.values()).find(association => association.tab === tab);
}

function getAssociatedPreviewUri(tab: vscode.Tab): vscode.Uri | undefined {
  return findDynamicPreviewAssociation(tab)?.previewUri;
}

function getContextForDynamicPreview(tab: vscode.Tab): MarkdownContext | undefined {
  const association = findDynamicPreviewAssociation(tab);
  if (association) {
    return association.context;
  }

  if (activeManagedContext && findSourceTab(activeManagedContext)) {
    return activeManagedContext;
  }
  if (lastMarkdownSourceContext && findSourceTab(lastMarkdownSourceContext)) {
    return lastMarkdownSourceContext;
  }
  return findOpenMarkdownSourceContext();
}

function getFocusedPreviewCandidate(context: MarkdownContext): vscode.Uri | undefined {
  const editorUri = vscode.window.activeTextEditor?.document.uri;
  return editorUri && contextContainsUri(context, editorUri) ? editorUri : undefined;
}

function findOpenMarkdownSourceContext(): MarkdownContext | undefined {
  for (const group of vscode.window.tabGroups.all) {
    const activeContext = getMarkdownContextFromTab(group.activeTab);
    if (activeContext) {
      return activeContext;
    }
  }

  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      const context = getMarkdownContextFromTab(tab);
      if (context) {
        return context;
      }
    }
  }

  return undefined;
}

function isSameActivatedResource(context: MarkdownContext): boolean {
  if (activeManagedContext?.key === context.key) {
    return true;
  }

  return context.source.kind === 'text'
    && activePreviewUri?.toString() === context.source.uri.toString();
}

function contextContainsUri(context: MarkdownContext, uri: vscode.Uri): boolean {
  const key = uri.toString();
  if (context.previewCandidates.some(candidate => candidate.toString() === key)) {
    return true;
  }
  if (context.source.kind === 'text') {
    return context.source.uri.toString() === key;
  }
  return context.source.original.toString() === key || context.source.modified.toString() === key;
}

function isRelevantSourceContext(context: MarkdownContext): boolean {
  return activeManagedContext?.key === context.key
    || dynamicPreviewAssociations.has(context.preferredTargetKey);
}

function isTabOpen(tab: vscode.Tab): boolean {
  return vscode.window.tabGroups.all.some(group => group.tabs.includes(tab));
}

function describeContext(context: MarkdownContext): string {
  if (context.source.kind === 'text') {
    return context.source.uri.toString();
  }
  return `${context.source.original.toString()} ↔ ${context.source.modified.toString()}`;
}

function leaveManagedContext(): void {
  activeManagedContext = undefined;
  inheritedStaticPreviewTargetKey = undefined;
  activePreviewUri = undefined;
  inheritedSourceContextKey = undefined;
  clearArrangementTimer();
}

function clearInheritedStaticPreview(context: MarkdownContext): void {
  if (inheritedStaticPreviewTargetKey === context.preferredTargetKey) {
    inheritedStaticPreviewTargetKey = undefined;
  }
}

function disposeController(): void {
  controllerEnabled = false;
  suspendController();
  lastMarkdownView = undefined;
  extensionContext = undefined;
}

function suspendController(): void {
  arrangementGeneration += 1;
  clearArrangementTimer();
  for (const timer of closeResolutionTimers.values()) {
    clearTimeout(timer);
  }
  closeResolutionTimers.clear();
  dynamicPreviewAssociations.clear();
  activeManagedContext = undefined;
  lastMarkdownSourceContext = undefined;
  inheritedStaticPreviewTargetKey = undefined;
  inheritedSourceContextKey = undefined;
  activePreviewUri = undefined;
}

function clearArrangementTimer(): void {
  if (arrangeTimer !== undefined) {
    clearTimeout(arrangeTimer);
    arrangeTimer = undefined;
  }
  pendingArrangement = undefined;
}
