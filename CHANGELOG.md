# Changelog

All notable changes to this project are documented in this file.

## 0.2.3 - 2026-07-10

### Added

- New Extension Icon: Redesigned the extension icon with a modern, minimalist fluid gradient logo.

### Improved

- Markdown active group sync: Refactored the layout logic to keep Group 1 as the active group and restore the sidebar focus dynamically, eliminating the right-pane flashing issue when clicking files in the explorer/SCM without locking the editor group.

### 新增

- 全新插件图标：重新设计了更加美观现代的极简流光渐变插件图标。

### 改进

- Markdown 活跃组同步：重构了布局聚焦逻辑，在重排后强制重置 Group 1 为活跃组并在单次点击时无缝还原侧边栏焦点，在不锁定编辑器组的前提下消除了在 Explorer/SCM 单击 Markdown 文件导致的右侧闪现问题。

## 0.2.2 - 2026-07-09

### Improved

- Focus preservation: enabled `preserveFocus: true` when arranging the source file and Markdown preview tabs. This prevents keyboard focus from being stolen from Explorer or SCM views, allowing seamless keyboard navigation (arrow keys, Delete) and editing.

### 改进

- 优化焦点保持：在排列源文件和 Markdown 预览 Tab 时启用了 `preserveFocus: true`，防止键盘焦点从资源管理器（Explorer）或 SCM 面板中被强行夺走，确保了键盘导航（方向键切换、按 `Delete` 删除）与编辑操作的流畅性。

## 0.2.1 - 2026-07-09

### Improved

- Markdown dual pane SCM support: added compatibility for virtual documents (using `git`, `gitlens`, `vscode-local-history`, `review` schemes) and Diff Editors (`TabInputTextDiff`). Opening modified, added, untracked, or historical Markdown files from the SCM panel or Git graph now triggers the dual-pane layout correctly without disrupting the diff view.

### 改进

- 支持 SCM 面板中 Markdown 双面板排版：增加了对虚拟文档（使用 `git`、`gitlens`、`vscode-local-history`、`review` 等 Scheme）以及 Diff 编辑器 (`TabInputTextDiff`) 的兼容。现在，从 SCM 面板或 Git Graph 中打开已修改、已添加、未跟踪或历史版本的 Markdown 文件能够正确触发双面板布局，且不会破坏或冲掉 Diff 对比视图。

## 0.2.0 - 2026-07-09

### Added

- Markdown dual pane: opening a `.md` file automatically arranges a two-panel layout with the source editor on the left and the built-in Markdown preview on the right. Extra editor groups are collapsed to keep exactly two panels. Enabled by default; disable with `quicklook.markdownDualPane`.

### 新增

- Markdown 智能双面板：打开 `.md` 文件时自动安排左右双面板布局（左侧为源码编辑器，右侧为内置 Markdown 预览）。额外分出的编辑器组将被自动合并折叠，以保持严格的双面板格局。默认开启，可通过设置 `quicklook.markdownDualPane` 禁用。

## 0.1.3 - 2026-05-27

### Changed

- Updated Marketplace keywords to better reflect supported file types.
- Updated `categories` to `Visualization` for better Marketplace discoverability.
- Simplified README features section and changelog entries.

### 变更

- 更新了 Marketplace 关键字以更好地反映支持的文件类型。
- 将 `categories` 更新为 `Visualization` 以提高 Marketplace 中的可发现性。
- 简化了 README 功能介绍和变更日志。

## 0.1.2 - 2026-05-26

### Changed

- Changed default keybinding from `Space` to ``Alt+` ``.

### Added

- Source Control context menu entry for previewing changed files.
- Editor title button preview for Git history files.

### 变更

- 将默认快捷键从 `Space` 改为 ``Alt+` ``。

### 新增

- 源代码管理（SCM）右键菜单中增加了预览变更文件的入口。
- 针对 Git 历史文件的编辑器标题栏增加预览按钮。

## 0.1.1 - 2026-05-25

### Changed

- Renamed extension to `Preview All-in-One with QuickLook`.

### Added

- Editor title button for previewing the active file.

### 变更

- 插件重命名为 `Preview All-in-One with QuickLook`。

### 新增

- 编辑器标题栏增加用于预览活动文件的按钮。

## 0.1.0 - 2026-05-20

### Added

- Initial release with Explorer, editor, and Command Palette preview entry points.
- QuickLook executable detection and path configuration.
- English and Chinese README.
- Licensed under AGPL-3.0-only.

### 新增

- 首发版本，包含资源管理器、编辑器、和命令面板等预览触发入口。
- QuickLook 可执行文件路径自动检测与自定义配置。
- 英文和中文双语 README。
- 开源协议采用 AGPL-3.0-only。