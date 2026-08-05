# Preview All-in-One with QuickLook

通过 Windows [QuickLook](https://github.com/QL-Win/QuickLook) 在 VS Code 中快速预览文件。

[![Visual Studio Marketplace Version](https://badgen.net/vs-marketplace/v/occasional16.preview-all-in-one-with-quicklook)](https://marketplace.visualstudio.com/items?itemName=occasional16.preview-all-in-one-with-quicklook)
[![Visual Studio Marketplace Installs](https://badgen.net/vs-marketplace/i/occasional16.preview-all-in-one-with-quicklook)](https://marketplace.visualstudio.com/items?itemName=occasional16.preview-all-in-one-with-quicklook)
[![Visual Studio Marketplace Rating](https://badgen.net/vs-marketplace/rating/occasional16.preview-all-in-one-with-quicklook)](https://marketplace.visualstudio.com/items?itemName=occasional16.preview-all-in-one-with-quicklook)
[![GitHub License](https://img.shields.io/github/license/occasional16/quicklook-for-vscode?logo=github)](LICENSE.txt)

> English: [README.md](README.md)

## 主要功能

- 按 ``Alt+` `` 或点击编辑器标题栏按钮，预览当前聚焦文件。
- 支持 Explorer、编辑器标签、Search Results、Source Control、Git Diff / History 和命令面板。
- 复用本机 QuickLook 及其已安装的格式插件。
- 为工作区、暂存区、删除、Diff 和 History 文件选择正确的 Git 版本。
- Markdown 延续工作区最近使用的仅源码、仅预览或源码加预览视图。

## 截图

![使用 QuickLook 预览选中文件](assets/screenshot-preview.png)

![设置 QuickLook 可执行文件路径](assets/screenshot-path-setup.png)

## 使用要求

- Windows
- VS Code 1.119.0 或更高版本
- 已安装并启动 [QuickLook for Windows](https://github.com/QL-Win/QuickLook)

## 快速开始

1. 安装并启动 QuickLook。
2. 在 Explorer 或 Source Control 中选中文件，或聚焦已打开的本地/Git 文件。
3. 按 ``Alt+` ``、点击 Preview 按钮，或运行 `QuickLook: Preview with QuickLook`。

如果未检测到 QuickLook，请运行 `QuickLook: Set QuickLook Executable Path`。

### Source Control 版本

| 位置 | 预览版本 |
| --- | --- |
| Changes 和 Untracked | 工作区版本 |
| Staged Changes | Git 暂存区版本 |
| 删除文件 | 最后仍存在的版本 |
| Diff 和 History 编辑器 | 当前聚焦侧 |

SCM 多选时以实际右键触发的条目为准。Git 版本会写入带版本名称的临时文件，并在十分钟后或扩展停止时清理。

## Markdown 工作流

Markdown 文件会延续当前工作区最近选择的视图：

| 视图 | 布局 |
| --- | --- |
| `preview` | 一个 Group，显示 VS Code 原生渲染预览 |
| `source` | 一个 Group，显示源码编辑器或原生 SCM Diff |
| `split` | Group 1 显示源码/Diff，Group 2 显示实时预览 |

使用 VS Code 原生 **Open as Preview**、**Reopen as source file** 和 **Open Preview to the Side** 选择视图。关闭 `split` 的任一侧后保留另一侧。非 Markdown Diff、Untitled、Merge Editor 和不支持的自定义编辑器保持原生行为。

该工作流默认开启。将 `quicklook.markdownViewContinuity.enabled` 设为 `false` 可停止视图记忆和自动布局。VS Code 原生 `*.md` Preview 默认关联仍然生效；若还希望默认使用源码编辑器，请在 `workbench.editorAssociations` 中将 `*.md` 显式关联为 `default`。

`split` 遵循 `workbench.editor.openSideBySideDirection`：

- `right`：源码在左，预览在右。
- `down`：源码在上，预览在下；推荐用于 VS Code 占据半屏的情况。

设置上下布局：按 `Ctrl+,` 打开设置，搜索 `workbench.editor.openSideBySideDirection`，选择 `down`。

## 命令

| 命令 | 用途 |
| --- | --- |
| `QuickLook: Preview with QuickLook` | 预览选中或当前文件。 |
| `QuickLook: Check QuickLook Installation` | 检查路径解析和安装状态。 |
| `QuickLook: Set QuickLook Executable Path` | 探测、浏览选择或输入 `QuickLook.exe`。 |

## 设置

| 设置 | 默认值 | 用途 |
| --- | --- | --- |
| `quicklook.executablePath` | `QuickLook.exe` | 从 `PATH` 和常见 Installer/Scoop 目录探测，或使用显式自定义路径。 |
| `quicklook.previewOptions` | `[]` | `/pin`、`/top` 等额外选项。 |
| `quicklook.useExplorerClipboardFallback` | `true` | 通过临时 Copy Path 获取 Explorer 键盘选中项，随后恢复剪贴板。 |
| `quicklook.markdownViewContinuity.enabled` | `true` | 记住并延续工作区 Markdown 视图。 |
| `quicklook.markdownInitialView` | `preview` | 工作区无历史视图时使用 `preview`、`source` 或 `split`。 |

## 支持格式

QuickLook 通常支持文本和代码、图片、PDF 和 Office 文档、压缩包、字体、音视频、邮件、设计素材等格式。实际范围取决于 QuickLook 版本和已安装插件，请以官方[支持格式列表](https://github.com/QL-Win/QuickLook/blob/master/SUPPORTED_FORMATS.md)为准。

## 故障排查

1. 运行 `QuickLook: Check QuickLook Installation`。
2. 必要时修正可执行文件路径。
3. 打开 `QuickLook` 输出通道查看启动详情。
4. 确认 QuickLook 在 VS Code 外部可以预览同一文件。

支持方式见[支持指南](https://github.com/occasional16/quicklook-for-vscode/blob/main/SUPPORT.md)。

## 开发与发布

运行 `npm test` 编译并测试。打包和发布流程见[发布指南](https://github.com/occasional16/quicklook-for-vscode/blob/main/docs/release.md)。

## 许可证

[GNU Affero General Public License v3.0 only](LICENSE.txt)
