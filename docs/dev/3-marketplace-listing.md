# 3. Marketplace Listing Draft

This document contains draft copy for the Visual Studio Marketplace listing.

## Extension Name

Preview All-in-One with QuickLook

## Short Description

Preview many local file types from VS Code through Windows QuickLook.

## Long Description

Preview All-in-One with QuickLook turns VS Code Explorer and editor tabs into a fast preview entry point. Select a local file and open it in the native Windows QuickLook preview window, reusing the formats and plugins supported by your local QuickLook setup.

The extension keeps the integration small and native: it resolves the selected local file path, finds your local `QuickLook.exe`, and launches QuickLook with optional command line flags such as `/pin` or `/top`. The QuickLook window remains a native desktop preview window, so users can move it, resize it, keep it on top, and use QuickLook's own preview behavior.

Actual preview support depends on the user's local QuickLook installation and installed QuickLook plugins.

## Preview All-in-One Coverage

Use one VS Code entry point for many local file categories supported by QuickLook:

| Category | Examples |
| --- | --- |
| Text and code | `.txt`, `.log`, `.json`, `.xml`, `.yaml`, `.md`, `.csv`, `.py`, `.js`, `.ts`, `.go`, `.rs`, `.sql` |
| Images and design assets | `.jpg`, `.png`, `.gif`, `.webp`, `.svg`, RAW images, `.psd`, `.ai`, `.fig`, `.sketch`, `.xd`, `.drawio` |
| Documents | `.pdf`, Word, Excel, PowerPoint, OpenDocument, Visio |
| Archives and packages | `.zip`, `.7z`, `.rar`, `.tar`, `.vsix`, `.whl`, `.jar`, comic archives |
| Markdown and data | Markdown variants, Mermaid, `.csv`, `.tsv` |
| Fonts | `.ttf`, `.otf`, `.woff`, `.woff2`, `.ttc` |
| Media, web and mail | Common video/audio formats, `.html`, `.mhtml`, `.url`, `.eml`, `.msg` |
| Binaries and installers | `.exe`, `.dll`, `.msi`, `.msix`, `.apk`, `.deb`, `.rpm` |
| QuickLook plugins | OfficeViewer, PdfViewer-Native, PostScriptViewer, CADImport, and more |

Official references:

- QuickLook README: <https://github.com/QL-Win/QuickLook>
- QuickLook supported formats: <https://github.com/QL-Win/QuickLook/blob/master/SUPPORTED_FORMATS.md>

## Key Features

- Preview selected or active local files with QuickLook.
- Editor title button for one-click preview of the active local file.
- Default Explorer keybinding: `` ` ``.
- Commands for previewing files, checking installation, and setting the executable path.
- Supports many file categories through the user's local QuickLook setup, including text and code, images, design assets, documents, archives, Markdown, CSV, fonts, media, web files, mail files, binaries, installers, and plugin-provided formats.
- Automatic detection for common QuickLook installation paths.
- Manual path setup through detected paths, file browsing, manual input, or VS Code settings.
- Troubleshooting logs in the `QuickLook` output channel.
- English and Chinese documentation.

## Visual Assets

- Icon: `assets/icon.png`
- Screenshot: `assets/screenshot-preview.png`
- Screenshot: `assets/screenshot-path-setup.png`

## Tags

- quicklook
- preview
- all-in-one-preview
- file-preview
- windows
- explorer

## Category

Other

## Marketplace Publisher

`occasional16`

## Marketplace Extension ID

`occasional16.preview-all-in-one-with-quicklook`

## Release Checklist

- Confirm `package.json` version is `0.1.1`.
- Confirm `package.json` name is `preview-all-in-one-with-quicklook`.
- Confirm `package.json` displayName is `Preview All-in-One with QuickLook`.
- Confirm `package.json` publisher is `occasional16`.
- Confirm license is `AGPL-3.0-only`.
- Confirm icon and screenshots render correctly in README.
- Run `npm test`.
- Run `npm run package`.
- Install the generated VSIX and test preview, editor title button, self-check, path setup, and output logs.
- Publish only after the final local test passes.