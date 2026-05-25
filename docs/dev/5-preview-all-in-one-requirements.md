# 5. Preview All-in-One Requirements

本文档记录下一轮实现需求。展示名称已确定为 `Preview All-in-One with QuickLook`，后续实现以这个名称和单一 QuickLook 原生窗口预览模式为准。

状态：已确认，待实现。

## 最终决策

- Display Name：`Preview All-in-One with QuickLook`。
- Package Name：`preview-all-in-one-with-quicklook`。
- Marketplace Extension ID：`occasional16.preview-all-in-one-with-quicklook`。
- GitHub 仓库名：暂时保持 `quicklook-for-vscode`。
- 预览模式：只保留 QuickLook 原生独立窗口预览。
- 不实现 VS Code 内部 preview tab。
- 不实现 `Open Preview to the Side`。
- 本轮新增重点：编辑器标题右侧的 QuickLook 预览按钮。

## 产品定位

`Preview` 是用户目标，`QuickLook` 是能力来源。扩展的核心价值是把 Windows QuickLook 的通用预览能力放到 VS Code 最顺手的位置，而不是在 VS Code 内重新实现各类格式的渲染器。

对外表达应突出：

- All-in-One preview entry point for VS Code。
- Native Windows QuickLook preview window。
- Many local file types through the user's local QuickLook setup。
- Actual preview support depends on the installed QuickLook version and plugins。

中文表达应突出：

- VS Code 中的通用预览入口。
- 使用 Windows QuickLook 原生预览窗口。
- 复用本机 QuickLook 和插件支持的文件类型。
- 实际可预览格式取决于本机 QuickLook 版本和已安装插件。

## 命名和发布元数据

需要同步修改：

- [package.json](../../package.json) 的 `name` 改为 `preview-all-in-one-with-quicklook`。
- [package.json](../../package.json) 的 `displayName` 改为 `Preview All-in-One with QuickLook`。
- [package.json](../../package.json) 的 `description` 改为强调 Preview All-in-One 和 Windows QuickLook。
- [package.json](../../package.json) 的 `keywords` 增加 `all-in-one-preview`、`quicklook`、`preview`、`file-preview`、`windows`、`explorer`。
- [package-lock.json](../../package-lock.json) 中的包名同步更新。
- [docs/dev/2-release-process.md](2-release-process.md) 中的 Extension ID 和 VSIX 文件名同步更新。
- [docs/dev/3-marketplace-listing.md](3-marketplace-listing.md) 同步新名称、短描述、长描述、关键词和发布清单。

最佳实践：扩展尚未正式发布，因此可以直接修改 `package.json` 的 `name`。GitHub 仓库名不影响 Marketplace Extension ID，本轮暂不重命名仓库，避免引入额外链接迁移成本。

## README 和 Marketplace 文案

建议短描述：

```text
Preview many local file types from VS Code through Windows QuickLook.
```

建议长描述核心段落：

```text
Preview All-in-One with QuickLook turns VS Code Explorer and editor tabs into a fast preview entry point. Select a local file and open it in the native Windows QuickLook preview window, reusing the formats and plugins supported by your local QuickLook setup.
```

必须保留的边界句：

```text
Actual preview support depends on your local QuickLook installation and installed QuickLook plugins.
```

README 中可以列出少量格式类别示例，并链接 QuickLook 官方资料，不维护一份过长且容易过期的完整格式清单：

- QuickLook README：<https://github.com/QL-Win/QuickLook>
- QuickLook supported formats：<https://github.com/QL-Win/QuickLook/blob/master/SUPPORTED_FORMATS.md>

建议格式类别示例：

- Text and code。
- Images and design assets。
- PDF and Office documents。
- Archives and packages。
- Markdown, CSV and data files。
- Fonts, media, web, mail, binaries and installers。
- Additional formats through QuickLook plugins。

## 功能需求

### 1. 保留 QuickLook 原生窗口预览

现有 `quicklook.previewFile` 继续作为唯一预览命令。

行为要求：

- 从资源管理器选中项、命令参数或当前编辑器解析本地文件路径。
- 只处理 `file` scheme 的本地资源。
- 调起本机 `QuickLook.exe`。
- 继续支持 `quicklook.previewOptions`，例如 `/pin` 和 `/top`。
- 继续使用 `QuickLook` 输出通道记录路径解析、启动参数和错误信息。

### 2. 新增编辑器标题右侧按钮

在用户打开本地文件时，编辑器标题右侧应出现一个 QuickLook 预览按钮。

实现要求：

- 在 [package.json](../../package.json) 的 `contributes.menus.editor/title` 中贡献 `quicklook.previewFile`。
- `when` 使用 `resourceScheme == file`。
- 图标继续使用命令上的 `$(eye)`。
- group 建议使用 `navigation@10`，使按钮出现在常用操作区域。
- 命令标题建议简化为 `Preview with QuickLook`。
- 点击按钮后复用现有 `previewFile` 逻辑，目标文件为当前编辑器资源。

当前已有 `editor/title/context`，它是编辑器标题上下文菜单；本需求新增的是直接显示在编辑器标题右侧的 `editor/title` 按钮。

### 3. 保留现有入口

不得回退以下入口：

- 命令面板。
- 资源管理器右键菜单。
- 编辑器右键菜单。
- 编辑器标题上下文菜单。
- 当前默认快捷键。
- QuickLook 安装检查命令。
- QuickLook 可执行路径设置命令。

## 非目标

- 不实现 VS Code 内部 preview tab。
- 不实现旁侧 preview tab。
- 不嵌入 QuickLook 原生窗口到 VS Code editor。
- 不自研多格式渲染器。
- 不在本轮重命名 GitHub 仓库。
- 不承诺扩展自身内置支持所有格式。

## 实现顺序

### P0：元数据和文案

- 更新 [package.json](../../package.json)。
- 同步 [package-lock.json](../../package-lock.json)。
- 更新 [README.md](../../README.md)。
- 更新 [README.zh-CN.md](../../README.zh-CN.md)。
- 更新 [docs/dev/2-release-process.md](2-release-process.md)。
- 更新 [docs/dev/3-marketplace-listing.md](3-marketplace-listing.md)。

验收标准：Marketplace 名称、Extension ID、VSIX 文件名、README 标题和文案均使用新定位，且保留 QuickLook 依赖边界。

### P1：编辑器标题按钮

- 新增 `contributes.menus.editor/title` 菜单贡献。
- 调整命令展示标题为 `Preview with QuickLook`。
- 确认按钮只在本地文件编辑器中显示。

验收标准：打开本地文件时，编辑器标题右侧出现按钮；点击后调起 QuickLook 原生窗口；其他现有入口不退化。

### P2：发布资料

- 更新截图，优先展示编辑器标题按钮或资源管理器一键预览。
- 检查 Marketplace 草稿是否突出原生窗口优势：可移动、可调整尺寸、可置顶、可缩放。
- 打包前确认旧名称残留已清理。

## 测试要求

自动化验证：

```powershell
npm test
npm run package
```

手工验证：

- 从资源管理器右键触发预览。
- 从编辑器右键触发预览。
- 从编辑器标题上下文菜单触发预览。
- 从新增编辑器标题按钮触发预览。
- 从命令面板触发预览。
- 从默认快捷键触发预览。
- QuickLook 未安装或路径错误时，自检和错误提示正常。

## 完成定义

- 扩展名、包名、发布文档和 README 均完成同步。
- 只有 QuickLook 原生窗口预览模式，没有内部 preview tab 残留。
- 编辑器标题右侧按钮可用。
- 自动化验证通过。
- 手工验证清单完成。