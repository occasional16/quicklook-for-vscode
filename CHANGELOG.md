# Changelog

All notable changes to this project are documented in this file.

## 0.1.2 - 2026-05-26

### Changed

- Changed the default preview keybinding from `Space` to ``Alt+` `` for Explorer and active editor preview flows.
- Kept the Explorer viewlet focus fallback for ``Alt+` `` so selected Explorer files can still trigger QuickLook when `filesExplorerFocus` is not active.

### Added

- Added a Source Control changed file context menu entry for previewing local SCM resources with QuickLook.
- Added editor preview support for Git history resources opened from SCM Graph / History by materializing `git` URI content into temporary local files.
- Added default ``Alt+` `` keybindings for active local and Git history editor preview flows while preserving normal text input.
- Added explicit active-editor keybinding arguments so keyboard-triggered previews use the same current editor target as the editor title button.
- Added broader URI-like command resource parsing for SCM resource states and Search-like result objects.

## 0.1.1 - 2026-05-25

### Changed

- Renamed the extension to `Preview All-in-One with QuickLook`.
- Renamed the package to `preview-all-in-one-with-quicklook`.
- Updated English and Chinese README content to highlight Preview All-in-One coverage through QuickLook-supported file categories.
- Updated Marketplace and release documentation for the new extension ID and VSIX name.

### Added

- Added an editor title button for previewing the active local file with QuickLook.
- Added `QuickLook: Preview with QuickLook` as the command display title.

## 0.1.0 - 2026-05-20

### Added

- Added `QuickLook: Preview File` for previewing selected local files with Windows QuickLook.
- Added Explorer, editor context, editor title context, and Command Palette entry points.
- Added the default Explorer keybinding `` ` ``.
- Added `QuickLook: Check QuickLook Installation`.
- Added `QuickLook: Set QuickLook Executable Path`.
- Added QuickLook executable detection from common installation paths.
- Added path setup options for detected paths, browsing, manual input, and settings.
- Added support for QuickLook command line options such as `/pin` and `/top`.
- Added the `QuickLook` output channel for troubleshooting logs.
- Added English and Chinese README documents.
- Added release process documentation and VSIX package cleanup.

### License

- Licensed under AGPL-3.0-only.