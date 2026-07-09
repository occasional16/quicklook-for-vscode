# 7. Markdown 双面板预览功能探索

## 目标

新增一个**全新的独立功能**（与 QuickLook 预览无关），实现：

- 默认开启，可通过设置手动关闭。
- 点击 `.md` 文件时，**自动**将编辑器区域 split 为恰好 2 个面板：源文件在左（Group 1），VS Code 内置 Markdown Preview 在右（Group 2）。
- 避免当前的痛点：MD 源文件打开在任意活跃 split 中，手动打开 Preview 会再多出一个 split，导致 split 无限增多。

---

## 问题分析

### 当前行为（VS Code 默认）

1. 用户点击 `.md` 文件 → 源文件在**当前活跃的 editor group** 中打开（可能是 Group 3、Group 4…）。
2. Preview **不会自动打开**。
3. 手动执行 `Ctrl+K V`（Preview to Side）→ Preview 出现在源文件的**右边新 group**。
4. 如果源文件在 Group 4，Preview 在 Group 5 → **split 无限增多**。

### 期望行为

```
┌────────────────┬────────────────┐
│   Group 1      │   Group 2      │
│   Source (.md)  │   Preview      │
│   (可编辑)     │   (只读渲染)    │
└────────────────┴────────────────┘
```

无论当前有多少 split，点击 `.md` 文件后，编辑器区域**恰好保持 2 个面板**。

---

## VS Code API 调研

### 1. 事件：何时触发

VS Code **不提供** `onWillOpenTextDocument` 拦截事件。我们只能在文件打开**之后**做出反应。

| 事件 | 触发时机 | 适用性 |
|---|---|---|
| `vscode.window.onDidChangeActiveTextEditor` | 用户切换 tab 或打开文件后 | ✅ **最佳选择**。可检测 `editor.document.languageId === 'markdown'` |
| `vscode.workspace.onDidOpenTextDocument` | 文档加载到内存时 | ⚠️ 也会在扩展读取文件时触发，需额外过滤 |
| `vscode.window.tabGroups.onDidChangeTabs` | tab 打开/关闭/切换时 | ⚠️ 一次操作可能触发多次 |

**推荐使用 `onDidChangeActiveTextEditor`**，这是最直观且可靠的入口。

### 2. 布局控制

#### 读取当前 group 数量

```typescript
const groupCount = vscode.window.tabGroups.all.length;
```

#### 强制设置 2 列布局

```typescript
// 方案 A：高级命令
await vscode.commands.executeCommand('workbench.action.editorLayoutTwoColumns');

// 方案 B：精细控制（推荐）
await vscode.commands.executeCommand('vscode.setEditorLayout', {
    orientation: 0,  // 0 = 水平并排
    groups: [
        { size: 0.5 },   // 左列
        { size: 0.5 }    // 右列
    ]
});
```

#### 关闭多余 group

```typescript
// 关闭特定 tab
await vscode.window.tabGroups.close(tab);

// 关闭特定 group 的所有 tab（group 会随之消失）
const group = vscode.window.tabGroups.all[2]; // 第 3 个 group
if (group) {
    await vscode.window.tabGroups.close(group.tabs);
}
```

### 3. 打开源文件到指定 group

```typescript
await vscode.window.showTextDocument(uri, {
    viewColumn: vscode.ViewColumn.One,  // 左列
    preserveFocus: false
});
```

`ViewColumn` 枚举值：

| 值 | 含义 |
|---|---|
| `ViewColumn.Active` (-1) | 当前活跃 group |
| `ViewColumn.Beside` (-2) | 活跃 group 的旁边 |
| `ViewColumn.One` (1) | 第 1 个 group（最左） |
| `ViewColumn.Two` (2) | 第 2 个 group |
| `ViewColumn.Three` ~ `Nine` | 第 3-9 个 group |

### 4. 打开内置 Markdown Preview 到指定 group

有两种 Preview 类型，控制能力差异较大：

#### 方案 A：经典 Webview Preview（`markdown.showPreviewToSide`）

```typescript
await vscode.commands.executeCommand('markdown.showPreviewToSide', uri);
```

- ✅ 用户最熟悉的 Preview 体验（滚动同步、工具栏）。
- ❌ **不接受 `viewColumn` 参数**，无法精确控制出现在哪个 group。
- ❌ Tab 类型为 `TabInputWebview`，**不暴露 `uri`**，无法判断它在预览哪个文件。

#### 方案 B：Custom Editor Preview（`vscode.openWith`）🔑 推荐

```typescript
await vscode.commands.executeCommand('vscode.openWith',
    uri,
    'vscode.markdown.preview.editor',
    {
        viewColumn: vscode.ViewColumn.Two,  // 精确指定 group
        preview: true                        // 预览模式（斜体标题）
    }
);
```

- ✅ **可精确指定 `viewColumn`**。
- ✅ Tab 类型为 `TabInputCustom`，**暴露 `uri` 和 `viewType`**，可精确检测。
- ✅ 使用同一个 Markdown 渲染引擎，渲染效果与经典 Preview 一致。
- ⚠️ UI 与经典 Preview 略有差异（作为 custom editor tab 而非 webview panel）。

### 5. 检测 Preview 是否已打开

```typescript
function findMarkdownPreviewTab(
    targetUri: vscode.Uri
): { tab: vscode.Tab; group: vscode.TabGroup } | undefined {
    for (const group of vscode.window.tabGroups.all) {
        for (const tab of group.tabs) {
            if (tab.input instanceof vscode.TabInputCustom
                && tab.input.viewType === 'vscode.markdown.preview.editor'
                && tab.input.uri.toString() === targetUri.toString()) {
                return { tab, group };
            }
        }
    }
    return undefined;
}
```

> **重要**：只有通过 `vscode.openWith` 打开的 Custom Editor Preview 才能通过 `TabInputCustom.uri` 精确匹配文件。经典 Webview Preview（`TabInputWebview`）不暴露 URI，无法判断其关联文件。

### 6. Tab 类型参考

| TabInput 类型 | `uri` 可用？ | 典型用途 |
|---|---|---|
| `TabInputText` | ✅ | 普通文本编辑器 |
| `TabInputCustom` | ✅ uri + viewType | Custom Editor（含 `vscode.openWith` 的 MD Preview） |
| `TabInputWebview` | ❌ 只有 viewType | 经典 MD Preview（`markdown.showPreview`） |
| `TabInputTextDiff` | ✅ original + modified | Diff 编辑器 |

---

## 技术架构推荐

### 核心流程

```
用户点击 .md 文件
    → onDidChangeActiveTextEditor 触发
    → isArranging 守卫检查（防止死循环）
    → 功能是否启用？
    → languageId === 'markdown' && scheme === 'file'？
    → 布局是否已正确？（源文件在 Group 1 + Preview 在 Group 2 + 恰好 2 个 group）
        → 是：跳过
        → 否：
            1. 设置 isArranging = true
            2. 确保源文件在 Group 1
            3. 确保 Preview 在 Group 2
            4. 关闭多余 Groups
            5. 焦点回到 Group 1 源文件
            6. 设置 isArranging = false
```

### 关键实现要点

#### 1. 防止无限循环

在调整布局时，`showTextDocument` 和 `vscode.openWith` 会再次触发 `onDidChangeActiveTextEditor`。必须使用守卫标志：

```typescript
let isArranging = false;

vscode.window.onDidChangeActiveTextEditor(async (editor) => {
    if (isArranging) return;
    if (!editor) return;
    if (editor.document.languageId !== 'markdown') return;
    if (editor.document.uri.scheme !== 'file') return;

    isArranging = true;
    try {
        await arrangeMarkdownLayout(editor.document.uri);
    } finally {
        isArranging = false;
    }
});
```

#### 2. 布局状态检测（避免重复调整）

如果当前布局已经正确（源文件在 Group 1、Preview 在 Group 2、恰好 2 个 group），则跳过：

```typescript
function isLayoutCorrect(uri: vscode.Uri): boolean {
    const groups = vscode.window.tabGroups.all;
    if (groups.length !== 2) return false;

    // 检查 Group 1 是否有此 MD 文件的 source tab
    const hasSourceInGroup1 = groups[0].tabs.some(tab =>
        tab.input instanceof vscode.TabInputText
        && tab.input.uri.toString() === uri.toString()
    );

    // 检查 Group 2 是否有此 MD 文件的 Preview tab
    const hasPreviewInGroup2 = groups[1].tabs.some(tab =>
        tab.input instanceof vscode.TabInputCustom
        && tab.input.viewType === 'vscode.markdown.preview.editor'
        && tab.input.uri.toString() === uri.toString()
    );

    return hasSourceInGroup1 && hasPreviewInGroup2;
}
```

#### 3. 核心布局函数

```typescript
async function arrangeMarkdownLayout(uri: vscode.Uri): Promise<void> {
    // 如果布局已正确，跳过
    if (isLayoutCorrect(uri)) return;

    // Step 1: 关闭已有的此文件的 Preview（如果在错误的 group 中）
    const existingPreview = findMarkdownPreviewTab(uri);
    if (existingPreview && existingPreview.group.viewColumn !== vscode.ViewColumn.Two) {
        await vscode.window.tabGroups.close(existingPreview.tab);
    }

    // Step 2: 确保源文件在 Group 1（左）
    await vscode.window.showTextDocument(uri, {
        viewColumn: vscode.ViewColumn.One,
        preserveFocus: false
    });

    // Step 3: 确保 Preview 在 Group 2（右）
    if (!existingPreview || existingPreview.group.viewColumn !== vscode.ViewColumn.Two) {
        await vscode.commands.executeCommand('vscode.openWith',
            uri,
            'vscode.markdown.preview.editor',
            { viewColumn: vscode.ViewColumn.Two }
        );
    }

    // Step 4: 关闭多余的 editor groups（只保留 Group 1 和 Group 2）
    await closeExtraGroups();

    // Step 5: 焦点回到源文件
    await vscode.window.showTextDocument(uri, {
        viewColumn: vscode.ViewColumn.One,
        preserveFocus: false
    });
}
```

#### 4. 关闭多余 Groups

```typescript
async function closeExtraGroups(): Promise<void> {
    const groups = vscode.window.tabGroups.all;
    if (groups.length <= 2) return;

    // 从后往前关闭，避免索引偏移
    for (let i = groups.length - 1; i >= 2; i--) {
        const group = groups[i];
        if (group.tabs.length > 0) {
            // 将此 group 中的非 MD 文件移动到 Group 1，避免丢失
            for (const tab of group.tabs) {
                if (tab.input instanceof vscode.TabInputText) {
                    await vscode.window.showTextDocument(tab.input.uri, {
                        viewColumn: vscode.ViewColumn.One,
                        preserveFocus: true,
                        preview: false
                    });
                }
            }
        }
        // 关闭此 group 中的所有 tab，group 会自动消失
        await vscode.window.tabGroups.close(group.tabs);
    }
}
```

> **注意**：关闭多余 groups 时，如果其中有用户正在编辑的非 MD 文件，直接关闭可能造成困扰。上面的代码先将这些文件移到 Group 1，再关闭 group。
>
> **需要决策**：是否真的要关闭所有多余 groups？还是仅确保 MD 源文件在 Group 1 + Preview 在 Group 2，不动其他 groups？后者更安全但无法保证 "恰好 2 个面板"。

---

## 配置设计

### `package.json` 新增配置

```jsonc
{
    "quicklook.markdownDualPane": {
        "type": "boolean",
        "default": true,
        "markdownDescription": "When opening a Markdown file, automatically arrange a two-panel layout with the source editor on the left and the built-in Markdown preview on the right. Ensures the editor area has exactly two panels."
    }
}
```

### 读取配置

```typescript
function isMarkdownDualPaneEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('quicklook');
    return config.get<boolean>('markdownDualPane', true);
}
```

配置应支持实时变更（通过 `onDidChangeConfiguration` 监听），开关时无需 reload。

---

## 边缘情况与注意事项

### 1. 视觉闪烁

由于无法拦截文件打开，MD 文件会先在原来的 group 中短暂出现，然后被我们移动到 Group 1。这会导致**一帧左右的闪烁**。

**缓解方案**：
- 尽量减少中间步骤的 `await` 数量。
- 考虑使用 `setTimeout(..., 0)` 或 `queueMicrotask` 进行批量布局操作。
- 实际测试中闪烁通常在可接受范围内（<100ms）。

### 2. 非 MD 文件的处理

此功能**只在激活 MD 文件时触发**。打开非 MD 文件时不做任何干预，用户可以正常使用任意数量的 split。

但需要考虑：用户在 2-pane MD 布局中打开了一个 `.ts` 文件 → 不触发 → `.ts` 文件在当前活跃的 Group 中打开（可能是 Group 1 或 Group 2）。这是可接受的行为。

### 3. 多个 MD 文件

用户可能依次打开 `a.md` 和 `b.md`：

- 打开 `a.md` → 布局调整为 `a.md source | a.md preview`
- 打开 `b.md` → 布局调整为 `b.md source | b.md preview`
- `a.md` 仍在 Group 1 的 tabs 中，但不活跃

这是自然的行为。切换回 `a.md` tab 时，应该重新将 Preview 切换为 `a.md` 的 preview。

### 4. 已有的 `markdown.showPreviewToSide` Preview

如果用户之前手动用 `Ctrl+K V` 打开了经典 Webview Preview，它是 `TabInputWebview` 类型。我们的功能使用 `vscode.openWith` 创建的是 `TabInputCustom` 类型。两者可能同时存在。

**建议**：在布局调整时，也检测并关闭 Group 2 中的 `TabInputWebview` 类型的 markdown preview（通过 `viewType` 包含 `markdown.preview` 来识别），避免 Preview 重复。

### 5. 守卫标志与异步竞态

由于所有操作都是 `async`，如果用户快速连续点击多个 MD 文件，可能出现多个 `arrangeMarkdownLayout` 同时执行的情况。

**建议**：使用队列化或 debounce 机制：

```typescript
let arrangeTimer: ReturnType<typeof setTimeout> | undefined;

vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (arrangeTimer) clearTimeout(arrangeTimer);
    arrangeTimer = setTimeout(async () => {
        if (isArranging) return;
        // ... 执行布局调整
    }, 50);  // 50ms debounce
});
```

### 6. Remote / WSL / SSH 环境

`editor.document.uri.scheme` 在 remote 环境下可能是 `vscode-remote` 而非 `file`。如果需要支持 remote，需要放宽 scheme 过滤。当前实现可以先限定 `file` scheme。

### 7. Untitled（未保存）MD 文件

`Untitled` 文件的 scheme 为 `untitled`，不是 `file`。如需支持，需要额外处理。可以先排除。

---

## Preview 类型选择分析

| 维度 | 经典 Webview Preview | Custom Editor Preview |
|---|---|---|
| 命令 | `markdown.showPreviewToSide` | `vscode.openWith` + `vscode.markdown.preview.editor` |
| `viewColumn` 控制 | ❌ 不支持 | ✅ 支持 |
| Tab 类型 | `TabInputWebview` | `TabInputCustom` |
| URI 可检测 | ❌ | ✅ |
| 滚动同步 | ✅ 自动 | ✅ 自动 |
| 实时更新 | ✅ | ✅ |
| 用户熟悉度 | ✅ 经典 UI | ⚠️ 略有差异 |
| 工具栏 | ✅ 有预览工具栏 | ⚠️ 作为 editor tab |

> **推荐使用 Custom Editor Preview（`vscode.openWith`）**，因为它是唯一允许精确控制 `viewColumn` 且支持通过 `TabInputCustom.uri` 检测关联文件的方案。这对实现 "确保恰好 2 个面板" 至关重要。

---

## 文件组织方案

### 新增文件

```
src/
├── extension.ts             // 修改：在 activate() 中注册新功能
├── markdownDualPane.ts      // 新增：独立模块，所有双面板逻辑
└── quicklook.ts             // 不变
```

将所有双面板逻辑放在独立的 `markdownDualPane.ts` 模块中，通过 `activate()` 注册，与现有 QuickLook 功能完全解耦。

### 模块接口

```typescript
// markdownDualPane.ts
import * as vscode from 'vscode';

export function activateMarkdownDualPane(context: vscode.ExtensionContext): void {
    // 注册事件监听和命令
}
```

```typescript
// extension.ts 中的变更
import { activateMarkdownDualPane } from './markdownDualPane';

export function activate(context: vscode.ExtensionContext): void {
    // ... 现有 QuickLook 代码 ...
    activateMarkdownDualPane(context);
}
```

---

## 实现分步概要

### Phase 1：基础框架

1. 新建 `src/markdownDualPane.ts`。
2. 在 `package.json` 添加 `quicklook.markdownDualPane` 配置项。
3. 在 `extension.ts` 的 `activate()` 中调用 `activateMarkdownDualPane(context)`。

### Phase 2：核心逻辑

1. 注册 `onDidChangeActiveTextEditor` 监听。
2. 实现 `isLayoutCorrect()` 检测。
3. 实现 `arrangeMarkdownLayout()` 布局调整（源文件 → Group 1, Preview → Group 2）。
4. 实现 `closeExtraGroups()` 关闭多余 groups。
5. 实现防无限循环的 `isArranging` 守卫。

### Phase 3：健壮性

1. 添加 debounce 防止快速连续触发。
2. 处理 Preview 已存在的情况（避免重复打开）。
3. 处理多 MD 文件切换时的 Preview 切换。
4. 添加日志输出到 QuickLook OutputChannel。

### Phase 4：配置与 UX

1. 支持 `onDidChangeConfiguration` 实时开关。
2. 考虑是否需要状态栏指示或命令切换开关。

---

## 开放问题

### Q1：关闭多余 groups 的策略

当用户有 3+ 个 groups（包含非 MD 文件）时，点击 MD 文件是否应该**强制关闭多余 groups**？

- **选项 A（严格模式）**：强制关闭，先将多余 groups 中的文件移到 Group 1，再关闭 groups。可能打扰用户的现有布局。
- **选项 B（温和模式）**：只确保 MD source 在 Group 1、Preview 在 Group 2，不关闭其他 groups。无法保证 "恰好 2 个面板"，但不会打扰非 MD 工作流。

**当前建议**：采用选项 A（严格模式），与需求描述 "确保编辑器区域有且仅有 split 成的 2 个面板" 一致。但如果实际使用中发现太打扰，可以后续改为选项 B 或增加子选项。

### Q2：Custom Editor Preview vs 经典 Webview Preview

推荐使用 `vscode.openWith`（Custom Editor），因为 API 控制力更强。但其 UI 与用户熟悉的 `Ctrl+K V` 经典 Preview 略有差异。

是否接受这个差异？如果强烈偏好经典 Preview，可以使用 `markdown.showPreviewToSide`，但需要接受无法精确控制 `viewColumn` 的限制（通过先调整布局再打开 Preview 来间接控制）。

### Q3：非 MD 文件行为

当功能启用时，如果用户从 2-pane MD 布局切换到一个非 MD 文件（如 `.ts`），是否需要做任何处理？例如：

- **不做处理**：非 MD 文件在当前活跃 group 中打开（可能是 Group 1 或 Group 2），保持 2-pane 布局。
- **自动恢复单 pane**：关闭 Preview 所在的 Group 2，恢复单列布局。

**当前建议**：不做处理。此功能只在激活 MD 文件时触发。
