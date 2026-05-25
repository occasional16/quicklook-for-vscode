# 6. Non-Explorer Preview Entry Points

本文档记录 0.1.2 的非资源管理器预览入口实现。核心思路：很多入口最终都会把文件打开到编辑器，因此不需要为每个入口强求独立右键菜单；优先保证“打开到编辑器后可以 Preview with QuickLook”。

## 实现原则

- QuickLook 原生窗口仍是唯一预览模式。
- 普通本地文件直接使用 `file` URI 预览。
- Git 历史/图形视图打开的 `git` URI 先写入临时本地副本，再交给 QuickLook。
- 不处理 remote、untitled 和无法读取内容的虚拟资源。
- 不把 proposed 或未公开的 VS Code menu contribution point 写入发布 manifest。

## 已实现入口

1. Explorer：选中文件后按 ``Alt+` ``，或右键执行 `Preview with QuickLook`。快捷键同时保留 `filesExplorerFocus` 和 `explorerViewletFocus` 条件；实际验收中仅保留 `filesExplorerFocus` 会导致 Explorer 选中文件时无法触发。
2. Editor：标题按钮、标题右键、正文右键、命令面板；当前编辑器中按 ``Alt+` `` 预览。编辑器快捷键显式传入 `{ "source": "activeEditor" }`，避免键盘触发时缺少菜单 URI 参数。
3. Search Results：点击搜索结果打开文件后，通过编辑器入口预览。
4. SCM Changes：变更文件右键菜单可直接预览，也可打开文件后通过编辑器入口预览。
5. SCM Graph / History：点击历史文件打开后，通过编辑器入口预览 `git` URI 内容。

默认快捷键只覆盖两类已验收路径：Explorer 文件树和当前编辑器。SCM、Search Results、SCM Graph / History 不单独绑定默认快捷键，避免在没有明确资源参数时误触发；这些入口打开文件后统一复用编辑器快捷键。

## SCM Graph 实现方式

VS Code 内置 Git 的 Graph / History 打开历史文件时会使用 `git` scheme，例如历史版本或 diff 中的文件。QuickLook 只能读取本地文件路径，所以扩展在执行预览时做一次转换：

1. 通过 `vscode.workspace.fs.readFile` 读取当前 `git` URI 内容。
2. 在扩展 `globalStorageUri/preview-cache` 下创建带原始扩展名的临时文件。
3. 调用 QuickLook 预览这个临时文件。
4. 临时文件在一段时间后和扩展停用时清理。

这样预览的是当前编辑器展示的 Git 历史内容，而不是简单回退到工作区当前文件。

## 调研结论

- Search Results 有内部 `SearchContext`，但没有稳定公开的 `contributes.menus` key；当前不贡献搜索结果右键菜单。
- SCM Graph / History 存在 `scm/historyItem/context` 和 `scm/historyItemRef/context`，但当前标记为 proposed；当前不贡献这些菜单。
- Git Graph 等第三方扩展如果使用 Webview，其他扩展通常无法注入菜单；打开文件后通过编辑器入口预览是更稳的集成方式。
- Problems 面板当前不纳入范围。

## 验收标准

- Explorer 中选中文件后按 ``Alt+` `` 可以调起 QuickLook。
- 编辑器正文中按 `Space` 仍然输入空格。
- 当前本地文件或 Git 历史文件编辑器中按 ``Alt+` `` 可以调起 QuickLook。
- Search Results 打开本地文件后，编辑器入口可以调起 QuickLook。
- SCM Changes 右键菜单可以调起 QuickLook。
- SCM Graph / History 打开历史文件后，编辑器入口可以调起 QuickLook。
- 不向发布 manifest 添加 proposed 或未公开菜单贡献点。