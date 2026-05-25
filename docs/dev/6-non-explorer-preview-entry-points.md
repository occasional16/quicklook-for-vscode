# 6. Non-Explorer Preview Entry Points

本文档记录下一轮候选需求：除了 VS Code 资源管理器之外，在其他合理上下文中提供 `Preview All-in-One with QuickLook` 的预览入口，包括按钮、右键菜单和快捷键策略。

状态：第一阶段已实现；Search Results 和 SCM Graph 已调研，当前只做安全解析补强，不加入不稳定菜单贡献点。

## 背景

当前扩展已经把 QuickLook 接入 VS Code 资源管理器和编辑器上下文。随着产品定位升级为 Preview All-in-One，预览入口不应只绑定资源管理器，而应覆盖更多能明确指向本地文件的 VS Code 场景。

基本原则：

- 只处理 `file` scheme 的本地资源。
- 不处理 untitled、remote、virtual document。
- 不为了覆盖更多入口而牺牲稳定性。
- 第三方扩展场景必须先验证是否有稳定 API 或菜单上下文。
- QuickLook 原生窗口仍是唯一预览模式，不实现 VS Code 内部 preview tab。

## 入口优先级

### P0：应实现

#### 1. 当前编辑器上下文

场景：用户已经打开一个本地文件，希望不回到资源管理器即可预览当前文件。

入口：

- 编辑器标题右侧按钮。
- 编辑器标题右键菜单。
- 编辑器正文右键菜单。
- 命令面板。
- 用户自定义快捷键。

当前状态：已实现。编辑器标题按钮、编辑器标题上下文菜单、编辑器正文右键菜单和命令面板是核心入口。

#### 2. Source Control Changes 列表

场景：用户在 Git 变更列表中 review 文件，尤其是图片、PDF、文档、压缩包、字体、二进制产物等非代码资产。

建议入口：

- SCM changed file 右键菜单。

价值：

- 非代码文件 review 时非常自然。
- 与 Preview All-in-One 定位高度一致。
- 比从 SCM 列表先打开文件再点击编辑器按钮更直接。

当前状态：已实现。使用 `scm/resourceState/context` 贡献菜单项，并从 SCM resource state 的 `resourceUri` 解析目标文件。

### P1：已调研

#### 3. Search Results

场景：用户在搜索结果中看到某个文件匹配项，想快速预览整个文件。

期望入口：

- 搜索结果项右键菜单。

价值：

- 从搜索结果直接查看图片、文档、日志、配置文件会很方便。

调研结果：

- VS Code 内部存在 Search 结果上下文菜单 `SearchContext`，但公开 `contributes.menus` 列表中没有稳定的 Search Results 菜单贡献点。
- `view/item/context` 是稳定菜单贡献点，但 Search Results 使用的是内置 Search 视图内部菜单，不等同于普通扩展 TreeView item。
- 直接尝试未公开 menu id 可能被忽略，或在后续 VS Code 版本中失效。
- 当前不把 Search Results 右键菜单写入发布 manifest。

已做补强：命令资源解析支持 `resource` 和 `parent().resource` 形态。如果未来 VS Code 暴露稳定 Search Results 菜单，或其他搜索类 TreeView 调用命令传入这类对象，扩展可以解析到对应本地文件。

#### 4. SCM Graph / SCM History

场景：用户在 VS Code Source Control Graph / History 中浏览提交、分支引用或历史变更，希望直接 QuickLook 预览相关文件。

期望入口：

- SCM Graph / History item 右键菜单。
- SCM Graph / History item ref 右键菜单。

价值：

- 历史变更里如果包含图片、文档、压缩包、字体等资产，QuickLook 预览很自然。

调研结果：

- VS Code 当前存在 `scm/historyItem/context` 和 `scm/historyItemRef/context`。
- 这两个菜单贡献点在当前 VS Code 资源中标记为 proposed：`contribSourceControlHistoryItemMenu`。
- proposed contribution point 不适合作为 Marketplace 可发布扩展的默认 manifest 配置。
- `scm/historyItem/context` 面向提交项，`scm/historyItemRef/context` 面向分支/引用项，本身不一定指向可预览的本地文件。
- 当前没有确认稳定的 “history item changed file” 菜单贡献点。

结论：不加入 `scm/historyItem/context` 或 `scm/historyItemRef/context`。当前可发布实现只保留稳定的 `scm/resourceState/context`，覆盖 Source Control Changes 列表中的本地变更文件。

#### 5. Git Graph 等第三方图形扩展

场景：用户在 Git Graph 中浏览提交、文件变更或历史文件，希望直接 QuickLook 预览文件。

判断：应纳入调研，但不应直接承诺首轮实现。

原因：

- Git Graph 是第三方扩展，可能使用自定义 Webview 渲染文件列表。
- 如果 Git Graph 使用 Webview，其他扩展通常无法注入右键菜单或标题按钮。
- 如果 Git Graph 使用标准 VS Code TreeView，并暴露稳定 `resourceUri`，才可能通过 `view/item/context` 做可选集成。
- 如果 Git Graph 暴露公开命令或 API，也可以研究可选适配，但不应成为主功能依赖。

可接受的 fallback：

- 用户从 Git Graph 打开文件后，使用编辑器标题按钮或命令面板预览当前文件。

调研结论：暂不实现。Git Graph 属于第三方扩展集成，若其使用 Webview，其他扩展通常无法注入菜单；当前使用“从 Git Graph 打开文件后，通过编辑器按钮预览”的 fallback。

### P2：暂不建议实现

#### 6. Terminal 路径预览

暂不建议做。终端输出中的路径识别、相对路径解析、工作目录判断、远程路径和 shell 转义都容易引入误判，维护成本高。

#### 7. Remote / WSL / SSH / Dev Container

暂不作为目标。QuickLook 是 Windows 本地应用，远程 URI 不一定对应本机可访问路径。除非后续明确设计临时文件下载和生命周期管理，否则不应承诺支持。

## 快捷键策略

### 最终方向

默认快捷键从反引号键 `` ` `` 改为空格键 `Space`，并且只在资源管理器焦点下生效。

理由：

- QuickLook 的原生心智是选中文件后按 Space 预览。
- VS Code 资源管理器中的文件选择场景与系统 QuickLook 最接近。
- 扩展尚处早期，默认快捷键迁移成本较低。

建议配置：

```json
{
  "command": "quicklook.previewFile",
  "key": "space",
  "win": "space",
  "when": "filesExplorerFocus && !inputFocus"
}
```

反引号键不再作为默认快捷键保留。用户如果喜欢旧快捷键，可以在 VS Code Keyboard Shortcuts 中自行绑定 `QuickLook: Preview with QuickLook`。

### 编辑器场景

编辑器正文中不绑定 Space。

要求：

- 当 `editorTextFocus` 为 true 时，Space 必须保持输入空格。
- 当前编辑器文件优先通过标题按钮、右键菜单、命令面板或用户自定义快捷键预览。
- 不使用过宽的 keybinding 条件，例如 `resourceScheme == file && !editorTextFocus`，避免在搜索、面板、终端或其他 UI 中误触发。

关于“单击标题后 Space 触发，单击编辑器内容时 Space 输入”：

- 这个体验方向合理。
- 但需要先验证 VS Code 是否提供稳定的“编辑器标题区域获得焦点”上下文。
- 如果没有可靠上下文，不应通过宽泛条件模拟该行为。
- 首轮不把编辑器标题 Space 作为硬需求。

### SCM / Search 场景

这些列表场景是否绑定 Space，需要在验证各自 focus/context 后再决定。

原则：

- 只有当 `when` 条件足够窄，能明确表示焦点在某个文件资源列表项上时，才考虑绑定 Space。
- 如果无法避免误触发，则只提供右键菜单和命令面板，不提供默认 Space。

## 实现结果

第一阶段已完成：

1. 已将资源管理器默认快捷键从反引号改为 Space。
2. 已移除反引号默认快捷键。
3. 当前编辑器入口继续保留。
4. 已新增 SCM changed file 右键预览入口。

第二阶段调研结果：

1. Search Results：不加入菜单贡献点；当前未发现稳定公开 menu id。已补强命令资源解析，支持 Search-like 对象的 `resource` / `parent().resource`。
2. SCM Graph / SCM History：不加入 proposed 菜单贡献点；当前仅保留稳定的 SCM Changes 入口。
3. Git Graph：暂不实现，当前采用打开文件后通过编辑器按钮预览的 fallback。

## 验收标准

- 在资源管理器选中本地文件后，按 Space 可以调起 QuickLook。
- 在编辑器正文中按 Space 仍然输入空格，不触发预览。
- 反引号不再是默认快捷键。
- 当前编辑器标题按钮、右键菜单和命令面板入口不退化。
- SCM Changes 中的本地文件右键菜单可以调起 QuickLook。
- Search Results、SCM Graph 和 Git Graph 在没有稳定公开菜单贡献点前，不写入已支持能力说明。

## 后续问题

1. 是否需要跟踪 VS Code 后续是否公开 Search Results 菜单贡献点。
2. 是否需要跟踪 `contribSourceControlHistoryItemMenu` 是否转为稳定 API。
3. 是否需要针对 Git Graph 做独立第三方集成调研。