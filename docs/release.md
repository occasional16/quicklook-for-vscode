# Release Guide

本文档记录 `Preview All-in-One with QuickLook` 的最小发布流程。项目是个人小型 VS Code 扩展，发布文档只保留可复用步骤；阶段性需求和历史开发记录不长期维护。

## 当前发布信息

- Extension ID: `occasional16.preview-all-in-one-with-quicklook`
- Display Name: `Preview All-in-One with QuickLook`
- Package Name: `preview-all-in-one-with-quicklook`
- Publisher: `occasional16`
- License: `AGPL-3.0-only`
- Repository: <https://github.com/occasional16/quicklook-for-vscode>
- VSIX pattern: `preview-all-in-one-with-quicklook-<version>.vsix`

## 发布前检查

1. 更新 [CHANGELOG.md](../CHANGELOG.md)。
2. 更新 [package.json](../package.json) 的 `version`。
3. 同步 [package-lock.json](../package-lock.json)。
4. 运行验证：

```powershell
npm test
npm run package
```

预期结果：

- TypeScript 编译通过。
- 单元测试全部通过。
- 旧 VSIX 被自动清理。
- 生成 `preview-all-in-one-with-quicklook-<version>.vsix`。

## GitHub 发布

```powershell
git status --short
git add .
git commit -m "Prepare <version> release"
git push origin main
git tag v<version>
git push origin v<version>
```

创建 GitHub Release：

```powershell
gh release create v<version> preview-all-in-one-with-quicklook-<version>.vsix --title "Preview All-in-One with QuickLook <version>" --notes-file <notes-file>
```

如果不使用 `--notes-file`，可以直接在 GitHub Release 页面复制 [CHANGELOG.md](../CHANGELOG.md) 对应版本内容。

## Marketplace 发布

首次或 token 过期时登录：

```powershell
npx vsce login occasional16
```

终端提示输入 Azure DevOps PAT 时，直接在终端粘贴，不要写入仓库、文档或聊天消息。

发布当前版本：

```powershell
npx vsce publish --packagePath preview-all-in-one-with-quicklook-<version>.vsix
```

发布后检查：

- Marketplace 页面标题、简介和 README 正确。
- License 显示 `AGPL-3.0-only`。
- 命令可搜索。
- 资源管理器 `Space` 快捷键可用。
- 编辑器标题按钮可用。
- Source Control 变更文件右键预览可用。
- 安装检查和路径设置命令可用。
- `QuickLook` 输出通道日志正常。

## 文档保留原则

- 用户可见能力写入 [README.md](../README.md) 和 [README.zh-CN.md](../README.zh-CN.md)。
- 版本变化写入 [CHANGELOG.md](../CHANGELOG.md)。
- 发布步骤保留在本文档。
- 阶段性需求文档在实现并验收后删除；历史信息通过 Git 记录追溯。