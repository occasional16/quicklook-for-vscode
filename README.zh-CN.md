# Preview All-in-One with QuickLook

这个扩展把 Windows [QuickLook](https://github.com/QL-Win/QuickLook) 接入 VS Code，让你通过 QuickLook 原生预览窗口快速预览多种本地文件类型。

英文主文档：[README.md](README.md)

## 功能

- 使用 QuickLook 原生窗口预览选中或当前打开的本地文件。
- 支持编辑器标题右侧按钮，一键预览当前本地文件。
- 默认在资源管理器焦点下按反引号键 `` ` `` 快速预览。
- 支持资源管理器右键菜单、编辑器右键菜单、编辑器标题菜单和命令面板。
- 使用 `QuickLook: Check QuickLook Installation` 检查 QuickLook 安装状态。
- 使用 `QuickLook: Set QuickLook Executable Path` 配置 QuickLook 可执行文件路径。
- 支持自动探测路径、浏览选择 `QuickLook.exe`、手动输入路径。
- 支持 QuickLook 官方命令行参数，例如 `/pin` 和 `/top`。
- 支持 `QuickLook` 输出通道日志，便于排查启动问题。

## Preview All-in-One 覆盖面

这个扩展使用本机 QuickLook 作为预览引擎。因此，VS Code 资源管理器和编辑器标签可以变成快速的通用预览入口，而不是又一个单格式查看器。

以下是 QuickLook 官方支持格式中的部分示例：

| 类别 | 示例 |
| --- | --- |
| 文本和代码 | `.txt`、`.log`、`.json`、`.xml`、`.yaml`、`.md`、`.csv`、`.py`、`.js`、`.ts`、`.go`、`.rs`、`.sql` |
| 图片和设计素材 | `.jpg`、`.png`、`.gif`、`.webp`、`.svg`、RAW 图片、`.psd`、`.ai`、`.fig`、`.sketch`、`.xd`、`.drawio` |
| 文档 | `.pdf`、Word、Excel、PowerPoint、OpenDocument、Visio |
| 压缩包和软件包 | `.zip`、`.7z`、`.rar`、`.tar`、`.vsix`、`.whl`、`.jar`、漫画压缩包 |
| Markdown 和数据 | Markdown 变体、Mermaid、`.csv`、`.tsv` |
| 字体 | `.ttf`、`.otf`、`.woff`、`.woff2`、`.ttc` |
| 音视频、网页和邮件 | 常见视频/音频格式、`.html`、`.mhtml`、`.url`、`.eml`、`.msg` |
| 二进制和安装包 | `.exe`、`.dll`、`.msi`、`.msix`、`.apk`、`.deb`、`.rpm` |
| QuickLook 插件 | OfficeViewer、PdfViewer-Native、PostScriptViewer、CADImport 等 |

实际可预览格式取决于你本机安装的 QuickLook 版本和 QuickLook 插件。最新格式范围请参考 QuickLook 官方资料：

- [QuickLook README](https://github.com/QL-Win/QuickLook)
- [QuickLook supported formats](https://github.com/QL-Win/QuickLook/blob/master/SUPPORTED_FORMATS.md)

## 截图

![使用 QuickLook 预览选中文件](assets/screenshot-preview.png)

![设置 QuickLook 可执行文件路径](assets/screenshot-path-setup.png)

## 使用要求

- Windows。
- VS Code 1.91.0 或更高版本。
- 本地已安装并启动 QuickLook。

QuickLook 官方仓库：<https://github.com/QL-Win/QuickLook>

## 使用方式

1. 安装并启动 QuickLook。
2. 在 VS Code 资源管理器里选中一个本地文件，或在编辑器中打开一个本地文件。
3. 按 `` ` ``、点击编辑器标题右侧预览按钮，或从命令面板运行 `QuickLook: Preview with QuickLook`。

默认反引号快捷键只在资源管理器焦点下生效，不会影响编辑器里正常输入代码。你也可以在 VS Code Keyboard Shortcuts 中给 `QuickLook: Preview with QuickLook` 设置任意快捷键或组合键。

## 命令

| 命令 | 说明 |
| --- | --- |
| `QuickLook: Preview with QuickLook` | 使用 QuickLook 预览选中或当前打开的本地文件。 |
| `QuickLook: Check QuickLook Installation` | 检查配置路径、探测路径和安装状态。 |
| `QuickLook: Set QuickLook Executable Path` | 使用探测路径、浏览选择、手动输入或打开设置。 |

## 配置

```json
{
  "quicklook.executablePath": "D:\\Program Files\\QuickLook\\QuickLook.exe",
  "quicklook.previewOptions": [],
  "quicklook.useExplorerClipboardFallback": true
}
```

`quicklook.executablePath` 是 QuickLook 可执行文件命令或完整路径。当前本地构建默认值为：

```text
D:\Program Files\QuickLook\QuickLook.exe
```

如果 QuickLook 安装在其他位置，可以运行 `QuickLook: Set QuickLook Executable Path`，然后选择自动探测结果、浏览选择 `QuickLook.exe`、手动输入完整路径或打开设置。

`quicklook.previewOptions` 会追加到文件路径后面，官方支持的参数包括 `/pin` 和 `/top`。

```json
{
  "quicklook.previewOptions": ["/top"]
}
```

`quicklook.useExplorerClipboardFallback` 用于支持资源管理器焦点下的快捷键预览。VS Code 稳定 API 不直接暴露资源管理器当前选中项，因此扩展会临时调用 VS Code 的 Copy Path 命令读取选中路径，并立即恢复原剪贴板文本。

## 故障排查

1. 运行 `QuickLook: Check QuickLook Installation`。
2. 如果没有找到 QuickLook，选择 `Set Path` 并选择或输入 `QuickLook.exe` 路径。
3. 打开 `QuickLook` 输出通道查看路径解析和启动日志。

如果仍无法预览，请先确认 QuickLook 在 VS Code 外部可以正常预览同一个文件。

## 开发

```powershell
npm install
npm test
npm run package
```

`npm run package` 会先清理旧 VSIX，再生成最新安装包。

按 `F5` 可启动 Extension Development Host 调试扩展。

## 发布流程

见 [docs/dev/2-release-process.md](docs/dev/2-release-process.md)。

## 许可证

本项目使用 GNU Affero General Public License v3.0 only 许可证。详见 [LICENSE.txt](LICENSE.txt)。