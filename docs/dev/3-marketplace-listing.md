# 3. Marketplace Listing Draft

This document contains draft copy for the Visual Studio Marketplace listing.

## Extension Name

QuickLook Preview for VS Code

## Short Description

Preview selected local files from VS Code with the Windows QuickLook app.

## Long Description

QuickLook Preview for VS Code connects VS Code Explorer with the Windows QuickLook app. Select a local file, press the default Explorer keybinding, or run the preview command to open the file in QuickLook without leaving VS Code.

The extension keeps the integration small and native: it resolves the selected local file path, finds your local `QuickLook.exe`, and launches QuickLook with optional command line flags such as `/pin` or `/top`.

## Key Features

- Preview selected local files with QuickLook.
- Default Explorer keybinding: `` ` ``.
- Commands for previewing files, checking installation, and setting the executable path.
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
- file-preview
- windows
- explorer

## Category

Other

## Marketplace Publisher

`occasional16`

## Marketplace Extension ID

`occasional16.quicklook-preview-for-vscode`

## Release Checklist

- Confirm `package.json` version is `0.1.0`.
- Confirm `package.json` name is `quicklook-preview-for-vscode`.
- Confirm `package.json` displayName is `QuickLook Preview for VS Code`.
- Confirm `package.json` publisher is `occasional16`.
- Confirm license is `AGPL-3.0-only`.
- Confirm icon and screenshots render correctly in README.
- Run `npm test`.
- Run `npm run package`.
- Install the generated VSIX and test preview, self-check, path setup, and output logs.
- Publish only after the final local test passes.