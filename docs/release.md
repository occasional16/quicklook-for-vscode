# Release Guide

`Preview All-in-One with QuickLook` 的最小发布流程。用户能力写入 README，版本变化写入中英对照 CHANGELOG；阶段性开发文档在 Git 留档后于发布前清理。

## 发布信息

- Extension ID：`occasional16.preview-all-in-one-with-quicklook`
- Publisher：`occasional16`
- License：`AGPL-3.0-only`
- VSIX：`preview-all-in-one-with-quicklook-<version>.vsix`

## 1. 准备发布

1. 确认目标版本已经完成功能和人工验收，相关功能提交已包含最终开发工作文档。
2. 审查 `docs/dev/`：保留仍在进行或后续版本继续使用的文档；列出已完成、已取代或过期文档，并在确认可由 Git 追溯且获得删除授权后移除。永久保留 `docs/dev/README.md`。
3. 将 `package.json` 和 `package-lock.json` 的版本同步为目标版本。
4. 将 CHANGELOG 的 `Unreleased` 改为 `<version> - YYYY-MM-DD`；英文条目后提供含义对应的中文条目，只保留用户可感知变化和必要迁移说明。
5. 检查 README、设置说明、截图、最低 VS Code 版本和支持链接。

## 2. 验证

```powershell
npm ci
npm test
npm run package
npx vsce ls
```

检查：

- 测试、TypeScript 编译和 VSIX 打包均成功。
- VSIX 文件名和清单版本一致，且不包含 `src/`、`docs/`、测试、源码映射或旧 VSIX。
- 在当前稳定版 VS Code 安装 VSIX，冒烟测试 Explorer、编辑器、Source Control、Git History 和 Markdown 三种视图。
- 涉及最低版本能力时，在声明的最低 VS Code 版本再执行一次核心冒烟测试。
- QuickLook 路径设置、安装检查命令和输出日志不暴露本机敏感信息。

## 3. 提交与标签

提交、推送和标签均需明确授权：

```powershell
git add <release-files>
git commit -m "chore(release): v<version>"
git push origin main
git tag v<version>
git push origin v<version>
```

发布提交应只包含版本号、锁文件、CHANGELOG、README、已确认的开发文档删除或其他明确的发布材料。删除前的文档最终版本必须已存在于更早的功能提交中。

## 4. GitHub Release

从该版本 CHANGELOG 生成简短的中英对照 Release Notes，并上传 VSIX。英文和中文使用对应的 `Added / 新增`、`Changed / 变更`、`Fixed / 修复` 分类，不把开发过程和测试流水写入发布说明。

```powershell
gh release create v<version> preview-all-in-one-with-quicklook-<version>.vsix `
  --title "Release v<version>" `
  --notes-file <notes-file>
```

## 5. Visual Studio Marketplace

首次使用或 token 过期时：

```powershell
npx vsce login occasional16
```

PAT 只粘贴到终端，不写入仓库、文档或聊天。发布：

```powershell
npx vsce publish --packagePath preview-all-in-one-with-quicklook-<version>.vsix
```

发布后确认 Marketplace 的版本、README、License、命令、快捷键和 Source Control 菜单均正确，再关闭发布任务。
