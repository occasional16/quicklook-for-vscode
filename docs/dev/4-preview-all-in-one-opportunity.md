# 4. Preview All-in-One Opportunity

本文档记录对 `Preview All-in-One with QuickLook` 的产品定位判断：它不应该只被理解为一个“从 VS Code 调起 QuickLook 的小工具”，而可以被包装为一个以 QuickLook 为底层能力的 Preview All-in-One 入口。

## 核心判断

这个方向值得做，而且是当前插件最有潜力的差异化叙事。

VS Code Marketplace 里有大量 Preview 类扩展，常见形态是按格式拆分：图片预览、PDF 预览、CSV 预览、Markdown 增强预览、Office 文档预览、3D 模型预览、字体预览、音视频预览、压缩包预览等。它们的下载量高，说明用户确实有一个长期需求：在编辑器里快速确认文件内容，而不是频繁切换到外部应用。

但逐个格式维护预览能力有天然问题：

- 每一种格式都要单独找扩展、装扩展、学入口。
- 同类扩展之间能力重叠，用户选择成本高。
- 预览质量取决于每个扩展各自的解析和渲染实现。
- 新格式、新文件变体、新系统依赖会持续增加维护成本。

QuickLook 的优势正好在这里。它本身就是面向“选中文件后快速预览”的系统级工具，并且已经通过主程序和插件生态覆盖了大量文件类型。我们的 VS Code 扩展如果只做一件事：把 VS Code 里的文件选择稳定、低摩擦地交给 QuickLook，那么它就可以绕过逐个格式实现预览器的路线，成为一个轻量的通用预览入口。

## 更准确的定位

建议把插件定位成：

> A native QuickLook bridge for previewing many local file types from VS Code.

中文可以表达为：

> 面向 VS Code 的 QuickLook 通用预览入口。

这里的关键词不是“我们支持所有格式”，而是“我们连接 QuickLook，尽可能复用 QuickLook 已经支持的格式和插件生态”。这能避免过度承诺，也能把真实优势讲清楚。

## 与格式专用预览插件的区别

格式专用 Preview 插件通常把重点放在某一种文件类型的深度体验上，例如 Markdown 的编辑联动、CSV 的表格交互、PDF 的页码导航、图片的缩放和标注等。这类扩展并不是我们的直接替代对象。

我们的差异化更适合放在“快速查看”和“覆盖面”上：

- 用户不知道文件内容是什么时，先用 QuickLook 迅速确认。
- 用户面对不常见格式时，优先尝试 QuickLook，而不是临时搜索扩展。
- 用户在项目里浏览素材、文档、截图、压缩包、二进制产物时，不需要离开 VS Code 文件树。
- 用户已经在 Windows 上习惯 QuickLook 时，VS Code 内入口补齐了最后一段工作流。

因此，这个插件更像一个“预览路由器”，不是一个“大而全的内置渲染器”。这句话很重要：它决定了我们后续应该追求稳定调起、路径解析、安装检测、快捷入口和文案包装，而不是把每种格式的渲染逻辑搬进扩展。

## 可讲的用户价值

### 1. 少装很多格式插件

对于只需要快速查看内容的用户，QuickLook 可能已经覆盖了他们原本会安装多个 Preview 插件的场景。一个统一入口可以减少扩展数量、减少配置成本，也减少不同扩展之间的菜单和快捷键冲突。

### 2. 使用系统级预览能力

QuickLook 运行在 VS Code 外部，预览窗口更接近原生桌面体验。它适合查看图片、PDF、Office 文档、音视频、字体、压缩包、设计素材等不一定需要在编辑器 tab 内打开的文件。

### 3. VS Code 文件树变成通用浏览器

很多项目目录不只有代码，还包含素材、文档、导出文件、测试数据、截图、日志、压缩包和构建产物。把 QuickLook 接入资源管理器后，VS Code 文件树可以承担更强的项目资产浏览能力。

### 4. 维护成本更低

扩展本身不承担每种格式的解析和渲染。长期维护重点变成：

- 更可靠地找到 `QuickLook.exe`。
- 更准确地拿到用户当前选中文件。
- 更清楚地提示安装和配置问题。
- 更顺手地提供快捷键、右键菜单和命令入口。
- 更诚实地说明能力边界。

这比维护多个格式解析器更符合当前项目体量。

## 必须保留的边界说明

Preview All-in-One 是一个很强的市场叙事，但不能写成无限能力承诺。建议在 README、Marketplace 和后续文案中持续保留这些边界：

- 当前只面向 Windows，因为依赖 Windows QuickLook 应用。
- 预览能力取决于用户本地 QuickLook 及其插件。
- 扩展不在 VS Code Web、远程容器或远程 SSH 环境中直接提供内置渲染。
- 对需要深度编辑、结构化交互或格式专属操作的文件，专用 Preview 插件仍然有价值。
- 本扩展的目标是快速预览本地文件，而不是替代 VS Code editor tab 或每一种专业查看器。

这种边界不会削弱定位，反而能提升可信度。

## Marketplace 文案方向

后续可以把 Marketplace 叙事从“Preview selected local files with QuickLook”升级为更有辨识度的表达：

短描述候选：

```text
Preview many local file types from VS Code through Windows QuickLook.
```

长描述核心段落候选：

```text
Preview All-in-One with QuickLook turns the Explorer into a lightweight all-in-one preview entry point. Instead of installing a separate VS Code preview extension for every file format, select a local file and hand it to Windows QuickLook, including the file types and plugins supported by your local QuickLook setup.
```

关键词建议补充：

- `quicklook`
- `preview`
- `file-preview`
- `all-in-one-preview`
- `windows`
- `explorer`

README 中也可以增加一个小节，标题可选：

```text
Why QuickLook as an All-in-One Preview Entry
```

中文 README 对应：

```text
为什么它可以作为通用预览入口
```

## 后续产品路线建议

### 优先级 A：把“通用预览入口”做稳

- 保持命令、右键菜单和快捷键入口简单直接。
- 继续强化 QuickLook 安装检测和路径设置体验。
- 在错误提示中区分“扩展没有找到 QuickLook”和“QuickLook 无法预览该文件”。
- 输出通道记录目标文件、QuickLook 路径、启动参数和失败原因。

### 优先级 B：让 All-in-One 叙事可感知

- README 增加“通用预览入口”说明。
- Marketplace 文案突出“many local file types”和“through Windows QuickLook”。
- 截图中展示文件树里不同类型文件的预览场景，而不仅是单一格式。
- 补充 QuickLook 插件生态说明，但只链接官方资源，不承诺具体格式清单。

### 优先级 C：增强重度使用体验

- 支持更明确的 Preview Options UI，例如 pin/top 的设置入口。
- 考虑多选文件时提供可配置策略：只预览第一个、逐个打开、交给 QuickLook 默认行为。
- 评估是否需要为常见失败场景提供 Quick Fix 按钮。
- 收集用户最常用于预览的文件类型，用于后续截图、文案和测试样例。

## 结论

这个插件的机会不在于重新实现一个 VS Code 内置万能预览器，而在于把 QuickLook 已经成熟的桌面预览能力放到 VS Code 最常用的文件浏览路径上。

如果后续发布和推广时只说“从 VS Code 调起 QuickLook”，它会显得很小；如果准确地说“用 QuickLook 把 VS Code 文件树变成轻量的通用预览入口”，它的价值会更清楚，也更容易从大量单格式 Preview 插件中区分出来。

建议后续产品、README 和 Marketplace 都围绕这个判断收敛：

> 不做每种格式的渲染器，做 QuickLook 能力在 VS Code 里的稳定入口。