# 5. Preview All-in-One Requirements

本文档把 [4-preview-all-in-one-opportunity.md](4-preview-all-in-one-opportunity.md) 的产品判断，以及后续确认的命名、文案和功能需求，整理成待实现需求。

状态：草案，等待确认后进入实现阶段。

## 当前确认

- 展示名称优先采用 `Preview All-in-One with QuickLook`。
- 扩展尚未正式发布，可以同步修改 `package.json` 的 `name`，不需要保留旧 Marketplace Extension ID。
- GitHub 仓库名暂时保持 `quicklook-for-vscode`，不作为本轮改名范围。
- 不实现 VS Code 内部 `Open as Preview` / `Open Preview to the Side` 模式。
- 继续只使用 QuickLook 原生独立窗口预览，这是插件的核心价值和唯一预览模式。
- 新增一个专属的编辑器标题右侧快捷打开按钮，类似其他预览插件的标题栏预览按钮。

## 核心判断

这次产品定位应把 `Preview` 放在最前面。用户首先寻找的是“预览能力”，不一定知道或理解 QuickLook；QuickLook 应作为能力来源和可信背书出现，而不是把产品名称完全变成 QuickLook 的附属描述。

因此，相比 `QuickLook Preview All-in-One`，更推荐：

```text
Preview All-in-One with QuickLook
```

理由：

- `Preview All-in-One` 是用户能立即理解的核心能力。
- `with QuickLook` 说明底层依赖和差异化来源。
- 名称不再包含 `for VS Code`，更简洁，也避免把平台信息塞进产品名。
- Marketplace 中仍可通过 description、keywords 和 README 明确这是 VS Code 扩展。

`QuickLook Preview All-in-One` 的优点是 QuickLook 品牌更靠前，但如果用户没有 QuickLook 背景，它的第一识别点会弱一些；同时英文读感略像关键词堆叠。因此它更适合作为备选，而不是首选。

## 产品目标

- 把扩展定位为 VS Code 中的 Preview All-in-One 入口。
- 复用 Windows QuickLook 的原生独立窗口预览能力，而不是在 VS Code 内自研多格式渲染器。
- 通过 QuickLook README 和 supported formats 文档，说明可覆盖大量文件类型和插件生态。
- 增强 VS Code 内的启动入口，让用户在编辑器标题栏右侧就能一键调起 QuickLook 预览。
- 保持实现小而稳：路径解析、QuickLook 启动、自检、菜单和按钮体验是主要维护面。

## 非目标

- 不实现 VS Code 内部 preview tab。
- 不实现 `Open Preview to the Side`。
- 不自研图片、PDF、Office、CSV、3D、音视频等格式渲染器。
- 不把 QuickLook 原生窗口嵌入 VS Code editor tab。
- 不在本轮重命名 GitHub 仓库。
- 不承诺扩展本身内置支持所有格式；实际预览能力取决于用户本机 QuickLook 和插件。

## 命名需求

### 展示名称

推荐展示名称：

```text
Preview All-in-One with QuickLook
```

备选名称：

| 候选名称 | 判断 |
| --- | --- |
| `Preview All-in-One with QuickLook` | 推荐。Preview 优先，用户价值最清楚，同时保留 QuickLook。 |
| `QuickLook Preview All-in-One` | 备选。品牌更靠前，但对不了解 QuickLook 的用户不如首选直观。 |

### `package.json` 的 `name`

因为扩展尚未正式发布，本轮可以同步修改 `package.json` 的 `name`。建议使用 lowercase kebab-case：

```json
{
  "name": "preview-all-in-one-with-quicklook"
}
```

修改后 Marketplace Extension ID 将变为：

```text
occasional16.preview-all-in-one-with-quicklook
```

同步影响：

- VSIX 文件名会变化。
- [docs/dev/2-release-process.md](2-release-process.md) 中的 Extension ID、VSIX 名称和发布说明需要更新。
- [docs/dev/3-marketplace-listing.md](3-marketplace-listing.md) 需要更新展示名、短描述、长描述和关键词。
- [README.md](../../README.md) 和 [README.zh-CN.md](../../README.zh-CN.md) 需要同步新定位。
- [package-lock.json](../../package-lock.json) 中的包名也应通过依赖安装或手动同步保持一致。

### GitHub 仓库名

GitHub 仓库名不需要与展示名称完全一致。当前仓库名 `quicklook-for-vscode` 可以暂时保持，原因是：

- 它不会决定 Marketplace 扩展 ID。
- 它仍然清楚表达这是 QuickLook 的 VS Code 集成。
- 仓库改名会影响已有链接、文档、截图和发布说明，当前没有必要作为前置动作。

后续如果产品名稳定并完成正式发布，可以再评估是否把仓库名改为 `preview-all-in-one-with-quicklook` 或更短的 `quicklook-preview`。

## 介绍文案需求

### 核心表达

新的介绍文案要突出：这是一个 Preview All-in-One 入口，底层复用 Windows QuickLook。

```text
Preview many local file types from VS Code through Windows QuickLook.
```

中文表达：

```text
通过 Windows QuickLook，在 VS Code 中快速预览多种本地文件类型。
```

长描述候选：

```text
Preview All-in-One with QuickLook turns VS Code Explorer and editor tabs into a fast preview entry point. Select a local file and open it in the native Windows QuickLook preview window, reusing the formats and plugins supported by your local QuickLook setup.
```

中文对应：

```text
Preview All-in-One with QuickLook 把 VS Code 资源管理器和编辑器标签变成快速预览入口。选中本地文件后，即可用 Windows QuickLook 原生预览窗口打开，并复用你本机 QuickLook 已支持的格式和插件能力。
```

### QuickLook 支持格式参考

文案中可以参考 QuickLook README 和 `SUPPORTED_FORMATS.md`，但必须写成“示例”和“取决于本机 QuickLook 配置”，不要写成扩展自身的硬承诺。

参考来源：

- QuickLook README：<https://github.com/QL-Win/QuickLook>
- QuickLook supported formats：<https://github.com/QL-Win/QuickLook/blob/master/SUPPORTED_FORMATS.md>

可在 README 或 Marketplace 中列出的格式类别示例：

- Text and code：`.txt`、`.log`、`.json`、`.xml`、`.yaml`、`.md`、`.csv`、`.tsv`、`.py`、`.js`、`.ts`、`.go`、`.rs`、`.sql` 等。
- Images and design assets：`.jpg`、`.png`、`.gif`、`.webp`、`.svg`、`.psd`、`.ai`、RAW 图片、`.fig`、`.sketch`、`.xd`、`.drawio` 等。
- Documents：`.pdf`、Word、Excel、PowerPoint、OpenDocument、Visio 等。
- Archives and packages：`.zip`、`.7z`、`.rar`、`.tar`、`.vsix`、`.whl`、`.jar`、comic archive 等。
- Markdown and data：Markdown variants、Mermaid、CSV/TSV 等。
- Fonts：`.ttf`、`.otf`、`.woff`、`.woff2`、`.ttc` 等。
- Media：常见视频和音频格式，例如 `.mp4`、`.mkv`、`.avi`、`.mov`、`.mp3`、`.flac`、`.wav` 等。
- Web, mail and help：`.html`、`.mhtml`、`.url`、`.chm`、`.eml`、`.msg` 等。
- Binaries and installers：`.exe`、`.dll`、`.msi`、`.msix`、`.apk`、`.deb`、`.rpm` 等。
- QuickLook plugins：OfficeViewer、PdfViewer-Native、PostScriptViewer、CADImport 等插件可扩展更多场景。

文案必须保留边界句：

```text
Actual preview support depends on your local QuickLook installation and installed QuickLook plugins.
```

中文对应：

```text
实际可预览格式取决于你本机安装的 QuickLook 版本和 QuickLook 插件。
```

## 功能需求

### 唯一预览模式：QuickLook Window Preview

本轮确认只保留 QuickLook 原生窗口模式。

行为：

- 从 VS Code 当前资源、资源管理器选中项或当前编辑器解析本地文件路径。
- 调起本机 `QuickLook.exe`。
- 使用 QuickLook 原生独立窗口展示预览。
- 支持 QuickLook 命令行参数，例如 `/pin`、`/top`。

优势：

- 原生窗口可自由移动、调整尺寸、置顶、缩放。
- 与 QuickLook 原有使用习惯一致。
- 复用 QuickLook 和插件生态的格式覆盖面。
- 不需要为每种格式维护 VS Code 内部渲染器。
- 不占用 VS Code editor tab。

### 编辑器标题右侧快捷按钮

新增一个专属编辑器标题按钮，让用户打开某个本地文件后，可以在 editor title 右侧一键用 QuickLook 预览当前文件。

需求：

- 在 `menus.editor/title` 中贡献 `quicklook.previewFile`。
- 仅对本地文件显示，建议 `when` 条件继续使用 `resourceScheme == file`。
- 使用现有命令图标，当前可继续使用 `$(eye)`。
- 按钮 tooltip / 命令标题建议简化为 `Preview with QuickLook`。
- 点击按钮后复用现有 `previewFile` 逻辑，目标文件为当前编辑器资源。
- 不为 untitled、remote、virtual document 显示按钮。

说明：当前项目已有 `editor/title/context`，这是编辑器标题上下文菜单，不等于右侧直接可见按钮。本需求需要新增 `editor/title` 菜单贡献。

### 现有入口保留

继续保留：

- 命令面板入口。
- 资源管理器右键菜单。
- 编辑器右键菜单。
- 编辑器标题上下文菜单。
- 当前默认快捷键策略。

命令 ID 建议继续保留：

```text
quicklook.previewFile
```

这样可以避免破坏既有快捷键、测试和内部调用。可以只修改 command title，使用户看到的名称更贴合新定位。

### 快捷键需求

- 继续保留当前快捷键行为，避免额外冲突。
- 用户仍可在 VS Code Keyboard Shortcuts 中自定义 `quicklook.previewFile`。
- 本轮不新增内部 preview 相关快捷键，因为不再实现 VS Code Preview Tab 模式。

### 配置需求

保留已有配置：

```json
{
  "quicklook.executablePath": "D:\\Program Files\\QuickLook\\QuickLook.exe",
  "quicklook.previewOptions": [],
  "quicklook.useExplorerClipboardFallback": true
}
```

本轮不新增多预览模式配置，因为已经决定只保留 QuickLook 原生窗口预览。

## 实现分期

### P0：命名和文案同步

实现内容：

- `package.json`：修改 `name` 为 `preview-all-in-one-with-quicklook`。
- `package.json`：修改 `displayName` 为 `Preview All-in-One with QuickLook`。
- `package.json`：修改 `description`，突出 Preview All-in-One 和 Windows QuickLook。
- `package.json`：更新 keywords，建议加入 `all-in-one-preview`、`quicklook`、`preview`、`file-preview`、`windows`、`explorer`。
- README 英文版和中文版同步新定位、格式示例和能力边界。
- [docs/dev/3-marketplace-listing.md](3-marketplace-listing.md) 更新 Marketplace 文案草稿。
- [docs/dev/2-release-process.md](2-release-process.md) 更新 Extension ID 和 VSIX 名称。

验收标准：

- 用户打开 Marketplace 或 README 时，第一眼能看到 Preview All-in-One 定位。
- 文案明确 QuickLook 是底层能力来源。
- 文案明确实际格式支持取决于本机 QuickLook 和插件。
- GitHub 仓库名暂不变，相关链接继续可用。

### P1：编辑器标题按钮

实现内容：

- 在 `package.json` 的 `contributes.menus` 中新增 `editor/title` 菜单项。
- 菜单项绑定 `quicklook.previewFile`。
- 使用 `resourceScheme == file` 限制本地文件。
- 设置合理的 `group`，让按钮出现在编辑器标题右侧常用操作区域。
- 确认按钮点击后能预览当前编辑器文件。

验收标准：

- 打开本地文件时，编辑器标题右侧出现 QuickLook 预览按钮。
- 点击按钮能调起 QuickLook 原生窗口。
- 非本地资源不显示该按钮。
- 资源管理器右键、编辑器右键、命令面板和快捷键不退化。

### P2：发布资料和截图

实现内容：

- 更新截图，至少展示编辑器标题右侧按钮或资源管理器一键预览入口。
- Marketplace 草稿中说明 QuickLook 原生窗口优势：自由调整尺寸、位置、置顶、缩放等。
- 发布流程文档同步新 VSIX 名称。

验收标准：

- 截图和文案都能支持新的 Preview All-in-One 定位。
- 文档没有继续把内部 Preview Tab 作为本轮需求。

## 测试需求

### 自动化测试

- 每次实现后运行 `npm test`。
- 如果只修改 `package.json` 菜单贡献，至少运行 `npm run compile`，确认 TypeScript 不受影响。
- 若修改 package name，同步检查 [package-lock.json](../../package-lock.json)。

### 手工验证

至少覆盖：

- 从资源管理器右键触发 QuickLook 预览。
- 从编辑器右键触发 QuickLook 预览。
- 从编辑器标题上下文菜单触发 QuickLook 预览。
- 从新增编辑器标题右侧按钮触发 QuickLook 预览。
- 从命令面板触发 QuickLook 预览。
- 从默认快捷键触发 QuickLook 预览。
- QuickLook 未安装或路径错误时，自检和错误提示仍然正常。

## 待确认问题

1. 展示名称是否最终确定为 `Preview All-in-One with QuickLook`？当前文档建议采用它。
2. 命令标题是否使用更短的 `Preview with QuickLook`，而扩展展示名使用完整的 `Preview All-in-One with QuickLook`？当前文档建议这样处理。
3. 编辑器标题按钮的排序位置是否需要靠前，例如 `navigation@10`，还是放在更靠后的组位？
4. 是否需要在 README 中直接列出较长的格式类别示例，还是只引用 QuickLook 官方 supported formats 页面？

## 当前推荐方案

当前推荐路线：

1. 使用 `Preview All-in-One with QuickLook` 作为扩展展示名称。
2. 因为尚未正式发布，同步把 `package.json` 的 `name` 改为 `preview-all-in-one-with-quicklook`。
3. GitHub 仓库名暂时保持 `quicklook-for-vscode`。
4. 不做 VS Code 内部 Preview Tab。
5. 保持 QuickLook 原生窗口为唯一预览模式。
6. 新增编辑器标题右侧预览按钮，补齐用户在编辑器内的一键打开体验。

一句话原则：

> Preview 是用户目标，QuickLook 是能力来源；插件要做的是把这个能力放到 VS Code 最顺手的位置。