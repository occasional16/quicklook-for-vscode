# 2. Release Process

本文档记录将 `quicklook-for-vscode` 推送到 GitHub，并以 Marketplace 扩展 ID `occasional16.quicklook-preview-for-vscode` 发布到 Visual Studio Marketplace 的建议流程。

目标仓库：<https://github.com/occasional16/quicklook-for-vscode>

## 当前发布信息

- Extension ID: `occasional16.quicklook-preview-for-vscode`
- Display Name: `QuickLook Preview for VS Code`
- Version: `0.1.0`
- Publisher: `occasional16`
- License: `AGPL-3.0-only`
- Repository: <https://github.com/occasional16/quicklook-for-vscode>
- VSIX: `quicklook-preview-for-vscode-0.1.0.vsix`

说明：`occasional16.quicklook-for-vscode` 曾经上传后被手动删除，Marketplace 仍保留该扩展 ID，重新上传会提示 `The extension 'quicklook-for-vscode' already exists in the Marketplace`。旧展示名 `QuickLook for VS Code` 也可能继续被软删除记录占用并触发 `This extension display name is taken`。当前发布包使用新的 `package.json` `name`：`quicklook-preview-for-vscode`，新的 `displayName`：`QuickLook Preview for VS Code`。GitHub 仓库名不需要修改。

## 项目文件夹检查

建议提交到 GitHub 的核心文件：

- [README.md](../../README.md)：英文主 README。
- [README.zh-CN.md](../../README.zh-CN.md)：中文 README。
- [CHANGELOG.md](../../CHANGELOG.md)：版本变更记录。
- [LICENSE.txt](../../LICENSE.txt)：AGPL-3.0-only 许可证文本。
- [SUPPORT.md](../../SUPPORT.md)：支持信息。
- [SECURITY.md](../../SECURITY.md)：安全报告说明。
- [assets/icon.png](../../assets/icon.png)：扩展图标。
- [assets/screenshot-preview.png](../../assets/screenshot-preview.png)：预览功能截图。
- [assets/screenshot-path-setup.png](../../assets/screenshot-path-setup.png)：路径设置截图。
- [package.json](../../package.json)：扩展 manifest、命令、配置、打包脚本和发布元数据。
- [package-lock.json](../../package-lock.json)：锁定依赖版本。
- [tsconfig.json](../../tsconfig.json)：TypeScript 配置。
- [src/extension.ts](../../src/extension.ts)：VS Code 扩展入口。
- [src/quicklook.ts](../../src/quicklook.ts)：QuickLook 路径解析和启动逻辑。
- [src/test/quicklook.test.ts](../../src/test/quicklook.test.ts)：单元测试。
- [scripts/clean-vsix.js](../../scripts/clean-vsix.js)：打包前清理旧 VSIX。
- [docs/dev/1-optimization-options.md](1-optimization-options.md)：优化路线。
- [docs/dev/2-release-process.md](2-release-process.md)：本文档。
- [docs/dev/3-marketplace-listing.md](3-marketplace-listing.md)：Marketplace 文案草稿。

不建议提交或发布的内容：

- `node_modules/`
- `out/`
- `*.vsix`
- `.vscode-test/`
- `Debug/`

注意：`assets/` 需要提交并包含在 VSIX 中，因为 `package.json` 的 `icon` 和 README 截图会引用这些文件。

这些内容已通过 [.gitignore](../../.gitignore) 或 [.vscodeignore](../../.vscodeignore) 控制。

## 本地验证流程

每次发布前运行：

```powershell
npm install
npm test
npm run package
```

预期结果：

- TypeScript 编译通过。
- 单元测试全部通过。
- 旧 VSIX 被自动清理。
- 生成 `quicklook-preview-for-vscode-0.1.0.vsix`。

## GitHub 发布流程

1. 检查工作区状态。

```powershell
git status --short
```

2. 确认 remote。

```powershell
git remote -v
```

如果还没有 remote：

```powershell
git remote add origin https://github.com/occasional16/quicklook-for-vscode.git
```

如果 remote 已存在但地址不对：

```powershell
git remote set-url origin https://github.com/occasional16/quicklook-for-vscode.git
```

3. 提交代码。

```powershell
git add .
git commit -m "Prepare 0.1.0 release"
```

4. 推送主分支。

```powershell
git branch -M main
git push -u origin main
```

5. 创建版本 tag。

```powershell
git tag v0.1.0
git push origin v0.1.0
```

6. 在 GitHub Releases 中创建 `v0.1.0` release。

建议 Release 标题：

```text
QuickLook Preview for VS Code 0.1.0
```

建议 Release 内容直接引用 [CHANGELOG.md](../../CHANGELOG.md) 的 `0.1.0` 内容，并上传 `quicklook-preview-for-vscode-0.1.0.vsix`。

## Visual Studio Marketplace 发布流程

### Azure DevOps PAT 是否收费

发布 VS Code 扩展需要 Azure DevOps Personal Access Token，因为 Visual Studio Marketplace 使用 Azure DevOps 账号体系管理 Publisher 和发布权限。

一般情况下：

- 创建 Microsoft 账号不收费。
- 创建 Azure DevOps organization 不收费。
- 创建 Personal Access Token 不收费。
- 发布公开 VS Code 扩展到 Visual Studio Marketplace 通常不需要付费 Azure 订阅。

如果页面提示计费，通常是因为你进入了 Azure 云资源或付费服务页面，而不是 Marketplace Publisher/PAT 的必要流程。发布扩展不需要创建虚拟机、存储、数据库等 Azure 资源。

### 申请 Azure DevOps Personal Access Token

1. 打开 <https://dev.azure.com/> 并登录 Microsoft 账号。
2. 如果没有 organization，按提示创建一个 Azure DevOps organization。
3. 点击右上角用户头像。
4. 进入 `Personal access tokens`。
5. 点击 `New Token`。
6. Name 建议填写：`vsce-publish-quicklook-preview-for-vscode`。
7. Organization 选择用于 Marketplace Publisher 的 organization。
8. Expiration 选择一个较短周期，例如 30 或 90 天。
9. Scopes 选择 `Custom defined`。
10. 勾选 Marketplace 相关权限。通常需要 `Marketplace` 的 `Manage` 权限。
11. 创建 token 后立即复制保存。

安全注意事项：

- PAT 只显示一次。
- 不要把 PAT 写入仓库、README、脚本、issue 或聊天消息。
- 不要发给我或任何工具。
- 如果泄露，立即在 Azure DevOps 中 revoke。

### 首次登录 Publisher

确认 `occasional16` Publisher 已存在后运行：

```powershell
npx vsce login occasional16
```

终端提示输入 PAT 时，请你直接在终端里粘贴 token。

### 本地打包检查

```powershell
npm run package
```

确认生成：

```text
quicklook-preview-for-vscode-0.1.0.vsix
```

### 发布到 Marketplace

直接发布当前版本：

```powershell
npx vsce publish
```

或者发布已生成的 VSIX：

```powershell
npx vsce publish --packagePath quicklook-preview-for-vscode-0.1.0.vsix
```

发布后检查：

- Marketplace 页面标题、简介和 README 是否正确。
- License 是否显示 AGPL-3.0-only。
- 默认快捷键是否展示正确。
- 安装后命令是否可搜索。
- `QuickLook: Preview File` 是否能预览文件。
- `QuickLook: Check QuickLook Installation` 是否能正常运行。
- `QuickLook: Set QuickLook Executable Path` 是否能正常设置路径。

## 版本更新流程

后续每次发布建议：

1. 修改 [CHANGELOG.md](../../CHANGELOG.md)。
2. 更新 [package.json](../../package.json) 的 `version`。
3. 运行 `npm install` 同步 [package-lock.json](../../package-lock.json)。
4. 运行 `npm test`。
5. 运行 `npm run package`。
6. 提交、打 tag、推送。
7. 发布 GitHub Release 和 Marketplace 版本。

## 当前等待事项

- 等待你安装并测试 `quicklook-preview-for-vscode-0.1.0.vsix`。
- 等待你在本机终端执行 `npx vsce login occasional16` 并输入 PAT。