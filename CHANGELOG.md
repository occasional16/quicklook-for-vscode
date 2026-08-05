# Changelog

Notable user-visible changes are documented here. Development details remain in Git history and `docs/dev/`.

## Unreleased

### Added

- Added workspace-level Markdown view continuity across Explorer and Source Control. Markdown files reuse the last `source`, `preview`, or `split` view; new workspaces start in native Preview by default.
- Added `quicklook.markdownViewContinuity.enabled` and `quicklook.markdownInitialView` to control the workflow and its initial view.
- Added version-aware QuickLook previews for Git Working Tree, Staged Changes, deletions, Diff, and History.

### 新增

- 新增跨 Explorer 和 Source Control 的工作区级 Markdown 视图延续：Markdown 会复用最近的 `source`、`preview` 或 `split`；新工作区默认使用原生 Preview。
- 新增 `quicklook.markdownViewContinuity.enabled` 和 `quicklook.markdownInitialView`，用于控制工作流及初始视图。
- QuickLook 可准确预览 Git 工作区、暂存区、删除、Diff 和 History 中的对应版本。

### Changed

- Markdown now opens directly in VS Code's native Preview by default. Native source, preview, and side-preview actions remain the primary controls.
- Split view follows `workbench.editor.openSideBySideDirection`; `down` is recommended when VS Code uses half of a display.
- The minimum supported VS Code version is 1.119. The obsolete `quicklook.markdownOpenMode` setting is not migrated.
- QuickLook now resolves `QuickLook.exe` from `PATH` and common Installer or Scoop locations instead of using a machine-specific default path.

### 变更

- Markdown 默认直接进入 VS Code 原生 Preview；源码、预览和侧边预览仍由原生操作控制。
- `split` 遵循 `workbench.editor.openSideBySideDirection`；VS Code 半屏使用时推荐 `down`。
- 最低支持 VS Code 1.119；过时的 `quicklook.markdownOpenMode` 不做迁移。
- QuickLook 改为从 `PATH` 和常见 Installer/Scoop 目录探测 `QuickLook.exe`，不再使用特定机器的默认路径。

### Fixed

- Kept Markdown layouts stable at exactly one group for `source` or `preview` and two groups for `split`, including right and downward splits.
- Prevented source/preview event ordering, file switches, focus changes, and closing one side from unexpectedly replacing the user's selected view.
- Preserved native Markdown Diff in the source group while showing the matching SCM version in Preview.

### 修复

- 稳定保持 `source` / `preview` 一个 Group、`split` 两个 Group，并同时支持向右和向下拆分。
- 修复源码/预览事件顺序、文件切换、焦点变化和关闭单侧导致用户视图被意外替换的问题。
- 在源码 Group 保留原生 Markdown Diff，同时在 Preview 显示匹配的 SCM 版本。

## 0.2.3 - 2026-07-10

- Added the current extension icon and improved Markdown group/focus stability.
- 新增当前扩展图标，并提高 Markdown Group 与焦点稳定性。

## 0.2.2 - 2026-07-09

- Preserved Explorer and Source Control keyboard focus while arranging Markdown source and Preview.
- 排列 Markdown 源码与 Preview 时保留 Explorer 和 Source Control 键盘焦点。

## 0.2.1 - 2026-07-09

- Added Markdown Diff and SCM virtual-document support to the dual-pane workflow.
- 为双面板工作流增加 Markdown Diff 和 SCM 虚拟文档支持。

## 0.2.0 - 2026-07-09

- Added the original automatic Markdown source-and-preview layout.
- 新增最初的 Markdown 源码加预览自动布局。

## 0.1.3 - 2026-05-27

- Improved Marketplace categories, keywords, and documentation.
- 优化 Marketplace 分类、关键词和文档。

## 0.1.2 - 2026-05-26

- Changed the default shortcut to ``Alt+` `` and added Source Control and Git History preview entry points.
- 默认快捷键改为 ``Alt+` ``，并新增 Source Control 和 Git History 预览入口。

## 0.1.1 - 2026-05-25

- Renamed the extension and added the editor-title Preview button.
- 扩展更名，并新增编辑器标题栏 Preview 按钮。

## 0.1.0 - 2026-05-20

- Initial release with Explorer, editor, and Command Palette preview entry points, QuickLook path configuration, bilingual documentation, and the AGPL-3.0-only license.
- 首发版本：提供 Explorer、编辑器和命令面板预览入口、QuickLook 路径配置、中英文文档及 AGPL-3.0-only 许可证。
