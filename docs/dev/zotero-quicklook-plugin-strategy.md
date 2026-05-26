# Zotero 与 QuickLook 联动插件开发策略

日期：2026-05-26

## 结论先行

建议采用“全新实现为主，参考旧项目为辅”的路线：新建一个独立仓库，使用现代 Zotero 7/8 插件技术栈重新实现核心能力；旧的 [ZoteroQuickLook](https://github.com/mronkko/ZoteroQuickLook) 可以作为需求、功能边界和用户心智的参考，但不建议直接把它作为主开发基础，除非能够获得维护权转移，或确认它的许可证、代码结构和发布方式都适合长期继承。

命名上，推荐使用 `QuickLook for Zotero` 作为面向用户的显示名，仓库名使用 `quicklook-for-zotero`。它比 `ZoteroQuickLook Reloaded` 更清晰、更少历史包袱，也能和当前 VS Code 项目的命名逻辑形成自然对应关系。Researchopia 更适合作为“已有 Zotero 插件工程经验和模板的来源”，暂时不建议把这个工具直接并入 Researchopia monorepo。

## 问题背景

当前项目已经验证了一件事：Windows QuickLook 可以作为一个轻量、通用、本机化的预览引擎，被接入到不同软件的文件工作流中。VS Code 场景的关键价值是“不再为每种文件格式重新做查看器”，而是把选中文件或当前文件交给 QuickLook。

Zotero 场景有类似但更聚焦的需求：研究者在文献库中经常需要快速确认附件内容，例如 PDF、图片、补充材料、压缩包、Office 文档或数据文件。Zotero 内置 PDF 阅读器很强，但它不是通用附件预览器；QuickLook 的优势正好在于低摩擦、跨格式、独立窗口、无需打开完整编辑器。

因此，这个项目的核心不应是“做另一个 Zotero 文件查看器”，而应是“把 Zotero 附件路径稳定解析出来，并把它交给用户本机已配置的 QuickLook 预览引擎”。

## 开发路线比较

### 方案 A：从现代 Zotero 插件重新实现

这是推荐方案。

优点：

- 技术债最低。Zotero 7/8 插件生态已经和旧式 XUL/XPCOM 插件时代明显不同，直接基于现代插件模板开发，能避开大量迁移成本。
- 功能边界很小。MVP 主要是解析当前选中附件、解析活动阅读器附件、调用 QuickLook、提供设置和安装检查，不需要继承复杂业务逻辑。
- 更容易沿用你已有的 Zotero 插件经验。Researchopia 已经包含 Zotero 插件、TypeScript、构建发布和版本管理经验，可以复用工程实践，而不是复用旧代码。
- 品牌和许可更干净。全新实现可以明确选择自己的许可证、命名、支持范围和发布节奏。

缺点：

- 需要重新做一遍 Zotero 菜单、快捷键、偏好设置和发布包流程。
- 旧项目中的历史兼容经验需要手动梳理，例如 Windows 自定义命令、多文件参数、macOS/Linux 行为差异等。

### 方案 B：fork 旧的 ZoteroQuickLook 后继续开发

这个方案只有在“能明确接管旧项目身份”时才值得认真考虑。

旧项目的价值包括：

- 名字直观，SEO 和用户心智很好。
- GitHub 上有长期存在的 star、fork、issue、release 历史，说明需求真实存在。
- README 已经描述了跨平台预览工具的预期行为：macOS 原生 QuickLook、Linux Gloobus/custom command、Windows QuickLook/custom command。

但它的问题也很直接：

- 公开页面显示最后主要更新已经是多年以前，README 也明确说明项目当前未活跃维护，可能不兼容当前或 beta 版本 Zotero。
- 仓库结构仍包含 `install.rdf`、`chrome.manifest` 等旧式扩展文件。即使 fork，也很可能要做近似重写级迁移。
- 如果只是 fork 但没有上游维护权转移，用户会不清楚哪个项目才是“正统维护版”。
- 复用代码前必须确认许可证和兼容性。如果许可证不清晰，或和你希望使用的许可证不兼容，最好避免直接复制旧代码。

因此，fork 更适合作为调研分支，而不是主线仓库。可以先 fork 用来阅读代码、整理功能清单和迁移笔记；真正发布时，用新仓库、新插件 ID 和新构建系统实现。

### 方案 C：并入 Researchopia monorepo

这个方案目前不建议作为首选，但可以保留为中长期选项。

Researchopia 已经是一个包含网站、浏览器扩展和 Zotero 插件的学术工具 monorepo。把 QuickLook 联动放进去的优点是：

- 可以复用 Zotero 插件模板、发布工作流、文档规范和已有用户入口。
- 如果未来 QuickLook 预览和 Researchopia 的文献共读、标注共享、论文评价深度绑定，monorepo 会降低集成成本。
- 对已有 Researchopia 用户来说，功能发现路径更短。

但短期问题更明显：

- QuickLook 联动是一个通用工具，不天然依赖 Researchopia 的平台账号、云同步、社区功能或数据库。
- 放进 Researchopia 会让一个原本可以很轻的小工具背上更大的项目语义，用户可能误以为必须使用 Researchopia 才能预览 Zotero 附件。
- 发布和支持边界会变模糊：这是 Researchopia 插件的一个功能，还是一个独立 Zotero 插件？

更稳妥的做法是：先独立仓库实现；从 Researchopia 复制或抽取工程经验；如果未来出现明确的产品耦合，再考虑把它作为 Researchopia 生态中的一个可选插件或子包。

## 命名建议

### 推荐命名

面向用户显示名：`QuickLook for Zotero`

仓库名：`quicklook-for-zotero`

插件 ID 示例：`quicklook-for-zotero@occasional16`

推荐理由：

- 一眼能看懂用途，搜索友好。
- 和当前 `quicklook-for-vscode` 仓库形成“QuickLook for X”的系列感。
- 不占用旧项目的身份，也不暗示得到旧项目维护者授权。
- 未来如果做更多软件联动，可以形成统一命名体系，例如 `quicklook-for-zotero`、`quicklook-for-obsidian`、`quicklook-for-vscode`。

README 中建议加一句免责声明：本项目不是 Zotero、QL-Win QuickLook 或旧 ZoteroQuickLook 项目的官方产品；如参考旧项目，应明确写成“inspired by the legacy ZoteroQuickLook project”。

### 可选名称

偏直白工具型：

- `QuickLook for Zotero`
- `Zotero QuickLook Bridge`
- `Zotero Attachment QuickLook`
- `Zotero Quick Preview`

偏系列品牌型：

- `Preview All-in-One with QuickLook for Zotero`
- `QuickLook Bridge for Zotero`
- `QuickLook Connector for Zotero`

偏 Researchopia 生态型：

- `Researchopia QuickLook for Zotero`
- `Researchopia Preview Bridge`
- `Researchopia Attachment Preview`

偏重启旧项目型：

- `ZoteroQuickLook Next`
- `ZoteroQuickLook Revived`
- `ZoteroQuickLook Reloaded`

不建议首发就使用 `ZoteroQuickLook Revived/Reloaded`，除非满足至少一个条件：已经 fork 并持续保留可追溯代码历史；获得原维护者认可或维护权转移；或者 README 中非常明确地说明这是非官方现代重写版。否则它会带来不必要的身份和支持预期。

## 建议的 MVP 范围

第一版应该小而完整：

- 支持在 Zotero 条目列表中预览选中附件。
- 支持选中文献条目时自动寻找最合适的本地附件，优先 PDF，其次其他附件。
- 支持从当前打开的阅读器或附件上下文菜单触发预览。
- 支持配置 QuickLook 可执行文件路径，默认优先探测常见 Windows 安装路径。
- 支持追加 QuickLook 参数，例如 `/pin`、`/top`。
- 提供 `Check QuickLook Installation` 或类似诊断入口。
- 在无法找到附件、本地文件不存在、QuickLook 未安装或命令启动失败时给出清晰提示。

第一版可以暂缓：

- 跨平台抽象。可以先聚焦 Windows QuickLook，再预留自定义命令配置，让 macOS/Linux 用户自行实验。
- 多附件批量预览。先保证单个最相关附件稳定工作。
- Researchopia 云端功能。这个插件应先保持离线、本地、轻量。
- 复杂 UI。菜单、快捷键、偏好设置和诊断输出足够支撑早期使用。

## 技术实现要点

建议基于现代 Zotero 插件模板和 TypeScript 开发，优先复用 Researchopia Zotero 插件中已经跑通的构建、热重载和发布经验。

关键模块可以拆成：

- `attachmentResolver`：从选中条目、选中附件或当前 reader 上下文解析本地文件路径。
- `quickLookLauncher`：负责 QuickLook 路径探测、参数拼接、进程启动和错误处理。
- `preferences`：保存 QuickLook 可执行文件路径、额外参数、是否启用自动探测等配置。
- `commands`：注册菜单项、快捷键和命令入口。
- `diagnostics`：输出调试日志，提供安装检查结果。

这套结构也便于未来扩展为通用 preview command：Windows 使用 QL-Win QuickLook，macOS 使用系统 QuickLook 或自定义命令，Linux 使用用户配置的预览命令。

## 许可证与项目关系

当前 VS Code 项目使用 AGPL-3.0-only，Researchopia 使用 AGPL-3.0 系列许可证。新 Zotero 插件如果作为你的开源工具矩阵的一部分，建议也使用 AGPL-3.0-only 或 AGPL-3.0-or-later，以降低维护心智成本。

如果从旧 ZoteroQuickLook 复制代码、资源或文档，需要先确认旧项目许可证，并检查是否允许对应方式的复用、改造和重新发布。若只是读取需求、学习交互方式、重新实现同等功能，风险和维护负担都更低。

## 推荐决策

综合开发成本、品牌清晰度和长期维护，建议这样定：

1. 新建独立仓库 `quicklook-for-zotero`。
2. 插件显示名使用 `QuickLook for Zotero`。
3. 使用现代 Zotero 插件模板从头实现，Researchopia 作为工程经验来源，不作为主 monorepo 容器。
4. fork 旧 ZoteroQuickLook 只用于调研和迁移笔记；不把旧代码作为主线基础，除非后续确认许可证、维护权和迁移成本都合适。
5. README 明确说明项目定位：面向 Zotero 7/8 的现代 QuickLook 联动插件，优先支持 Windows QuickLook，未来可支持自定义预览命令。

这个路径的好处是最稳：既承认旧项目证明过需求，也不给自己背上旧插件架构和旧品牌身份的包袱；既能借 Researchopia 的 Zotero 开发经验，也不会把一个通用本地工具强行塞进学术社区平台叙事里。