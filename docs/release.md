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

## 发布流程与职责分离最佳实践

为了保持 Git 提交历史的可读性与维护性，项目遵循以下**职责分离**原则：

1. **开发阶段 (Feature Commits)**：
   - 所有的功能开发、Bug 修复代码及对应的**阶段性开发设计文档**（如 `docs/dev/` 下的临时文档）应合并在对应的功能提交中（例如 `feat: ...` 或 `fix: ...`）。
   - **优势**：此时设计文档被写入 Git 历史。即使后续在发布时被删除，未来任何人也可以通过该 feature commit 追溯并查看完整的设计文档。
2. **发布准备阶段 (Release Commit)**：
   - 创建一个专门的提交，其 Message 采用行业标准的 **`chore(release): v<version>`**（例如 `chore(release): v0.2.0`）。
   - 该提交**只包含**以下发布杂务：
     - 删除已验收的阶段性开发文档（例如 `docs/dev/*`）。
     - 更新 `package.json` 中的 `version`。
     - 同步 `package-lock.json`。
     - 整理并更新 `CHANGELOG.md`。
   - **优势**：符合 Conventional Commits 规范，确保功能代码的 commit 非常纯粹，不混入版本元数据和日志变动，便于未来进行 Cherry-pick（樱桃挑选）或回滚。

---

## 详细发布步骤

### 1. 发布前准备与检查

在确认功能开发完毕，且设计文档已就绪并提交后，开始进行发布准备：

1. **删除开发文档**：删除 `docs/dev/` 下已验收的阶段性设计文档。
2. **更新版本号**：修改 `package.json` 中的 `version` 为新版本号（例如 `0.2.0`）。
3. **更新 CHANGELOG**：在 `CHANGELOG.md` 中为新版本添加一条记录，写明更新日期和变更内容。
4. **验证构建**：在根目录下运行以下命令，确保测试通过且打包成功：

   ```powershell
   npm install --package-lock-only  # 同步 lock 文件
   npm test                        # 运行单元测试
   npm run package                 # 清理并重新打包 VSIX 资产
   ```

### 2. GitHub 发布

1. **提交发布准备**：
   将版本号更新、CHANGELOG 整理和开发文档的删除一并进行提交：

   ```powershell
   git status --short
   git add .
   git commit -m "chore(release): v<version>"
   ```

2. **推送与打标签**：
   将发布 commit 推送至主分支，并在该 commit 上创建对应版本的 Git Tag：

   ```powershell
   git push origin main
   git tag v<version>
   git push origin v<version>
   ```

3. **创建 GitHub Release**：
   使用 GitHub CLI 创建 Release 并上传生成的 `.vsix` 文件作为发布资产：

   ```powershell
   gh release create v<version> preview-all-in-one-with-quicklook-<version>.vsix --title "Release v<version>" --notes-file <notes-file>
   ```

   *注：为了保持项目文档的双语一致性，Release Notes 建议使用中英文的标准化分类标题（例如：英文使用 `### Added` / `### Changed` / `### Improved`，中文相应使用 `### 新增` / `### 变更` / `### 改进`），依次排列英文和中文内容。请避免使用像“### English / ### 中文”这种无意义的语言标题。*

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
- 资源管理器 ``Alt+` `` 快捷键可用。
- 编辑器标题按钮可用。
- Source Control 变更文件右键预览可用。
- 安装检查和路径设置命令可用。
- `QuickLook` 输出通道日志正常。

## 文档保留原则

- 用户可见能力写入 [README.md](../README.md) 和 [README.zh-CN.md](../README.zh-CN.md)。
- 版本变化写入 [CHANGELOG.md](../CHANGELOG.md)。
- 发布步骤保留在本文档。
- 阶段性需求文档在实现并验收后删除；历史信息通过 Git 记录追溯。