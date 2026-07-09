# Changelog

All notable changes to this project are documented in this file.

## 0.2.2 - 2026-07-09

### Improved

- Focus preservation: enabled `preserveFocus: true` when arranging the source file and Markdown preview tabs. This prevents keyboard focus from being stolen from Explorer or SCM views, allowing seamless keyboard navigation (arrow keys, Delete) and editing.

### 改进

- 优化焦点保持：在排列源文件和 Markdown 预览 Tab 时启用了 `preserveFocus: true`，防止键盘焦点从资源管理器（Explorer）或 SCM 面板中被强行夺走，确保了键盘导航（方向键切换、按 `Delete` 删除）与编辑操作的流畅性。

## 0.2.1 - 2026-07-09

### Improved

- Markdown dual pane SCM support: added compatibility for virtual documents (using `git`, `gitlens`, `vscode-local-history`, `review` schemes) and Diff Editors (`TabInputTextDiff`). Opening modified, added, untracked, or historical Markdown files from the SCM panel or Git graph now triggers the dual-pane layout correctly without disrupting the diff view.

## 0.2.0 - 2026-07-09

### Added

- Markdown dual pane: opening a `.md` file automatically arranges a two-panel layout with the source editor on the left and the built-in Markdown preview on the right. Extra editor groups are collapsed to keep exactly two panels. Enabled by default; disable with `quicklook.markdownDualPane`.

## 0.1.3 - 2026-05-27

### Changed

- Updated Marketplace keywords to better reflect supported file types.
- Updated `categories` to `Visualization` for better Marketplace discoverability.
- Simplified README features section and changelog entries.

## 0.1.2 - 2026-05-26

### Changed

- Changed default keybinding from `Space` to ``Alt+` ``.

### Added

- Source Control context menu entry for previewing changed files.
- Editor title button preview for Git history files.

## 0.1.1 - 2026-05-25

### Changed

- Renamed extension to `Preview All-in-One with QuickLook`.

### Added

- Editor title button for previewing the active file.

## 0.1.0 - 2026-05-20

### Added

- Initial release with Explorer, editor, and Command Palette preview entry points.
- QuickLook executable detection and path configuration.
- English and Chinese README.
- Licensed under AGPL-3.0-only.