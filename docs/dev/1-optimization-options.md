# 1. Preview All-in-One with QuickLook 优化选项

本文档记录插件在基本预览功能完成后的后续优化方向、已确认决策和执行状态。

## 当前状态

- 已实现 `QuickLook: Preview with QuickLook` 命令。
- 已支持资源管理器右键、编辑器右键、编辑器标题菜单和命令面板入口。
- 默认快捷键已改为反引号键 `` ` ``，并限制在资源管理器焦点下生效，避免影响编辑器里正常输入代码。
- 已支持 `quicklook.executablePath` 手动配置 QuickLook 可执行文件路径。
- 已增加 `QuickLook: Check QuickLook Installation` 自检命令。
- 已增加 `QuickLook: Set QuickLook Executable Path` 路径设置命令。
- 已支持常见安装路径自动探测。
- 已完成单元测试、TypeScript 编译检查和 VSIX 打包验证。

## 优先级 A：使用可靠性

优先级 A 的 1-3 已确认需要全部执行。

### 1. 路径配置双模式

目标：路径设置命令同时支持自动探测、浏览选择和手动输入。

确认后的交互流程：

1. 用户执行 `QuickLook: Set QuickLook Executable Path`。
2. 扩展先检测常见路径。
3. 弹出选项：使用检测结果、浏览选择、手动输入、打开设置。
4. 写入 `quicklook.executablePath`。
5. 自动运行一次自检并展示结果。

执行状态：已实现。

### 2. 更具体的自检结果

目标：自检命令展示更明确的状态和修复动作。

自检结果应包含：

- 当前配置路径。
- 配置来源，例如扩展默认值、用户设置、工作区设置。
- 解析后的 QuickLook 路径。
- 是否来自自动探测。
- 检查过哪些候选路径。
- 检测失败后的下一步按钮，例如设置路径、打开设置、查看日志。

执行状态：已实现。

### 3. 输出通道日志

目标：新增 `QuickLook` Output Channel，用于记录关键运行信息。

日志内容包括：

- 命令触发。
- 解析到的目标文件路径。
- 当前配置来源。
- 当前 QuickLook 可执行文件路径。
- 自动探测过程。
- 启动成功或失败的结果。

执行状态：已实现。

## 优先级 B：快捷键和选择体验

优先级 B 本轮只确认默认行为，暂不扩展额外配置。

### 4. 多选策略

确认决策：资源管理器多选文件时，默认只预览第一个本地文件。

当前状态：已符合该行为。

### 5. 文件夹策略

确认决策：文件夹默认交给 QuickLook 预览。

当前状态：已符合该行为。扩展不会主动拦截文件夹，是否能预览由 QuickLook 自身决定。

### 6. 编辑器场景快捷键

确认决策：保持现状。

当前状态：反引号键只在资源管理器焦点下生效，不在编辑器焦点下抢占输入。

用户仍可在 VS Code Keyboard Shortcuts 中为 `QuickLook: Preview with QuickLook` 设置任意按键或组合键。

## 优先级 C：测试和发布质量

优先级 C 本轮先不执行。

### 7. VS Code 集成测试

暂不执行。后续如要覆盖真实扩展行为，可引入 `@vscode/test-electron`。

### 8. 发布资料整理

暂不执行。后续如要长期维护或发布到 Marketplace，可补充 `CHANGELOG.md`、图标、截图和版本说明。

### 9. 打包产物治理

暂不执行。后续可增加脚本，在打包前自动清理旧 VSIX，只保留最新版本。

## 下一步审核点

请重点审核以下行为：

1. `QuickLook: Set QuickLook Executable Path` 的选项是否符合预期。
2. `QuickLook: Check QuickLook Installation` 的提示是否足够清楚。
3. `QuickLook` 输出通道里的日志是否便于排查问题。
4. 资源管理器多选时只预览第一个本地文件是否符合你的日常使用习惯。
5. 文件夹直接交给 QuickLook 预览是否符合预期。