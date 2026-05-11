# Doubao Prompt Helper

这是一个用于豆包网页的轻量级 userscript 插件，不是 SaaS 平台。

## 项目目标

开发一个可发布到 Greasy Fork / GitHub 的油猴脚本：

- 在 doubao.com 页面注入 Prompt 模板按钮
- 打开本地 Prompt 模板面板
- 支持搜索模板
- 支持把模板渲染后插入豆包输入框
- 支持 {{selection}}、{{input}}、{{pageTitle}}、{{pageUrl}}、{{date}} 变量
- 支持本地导入 / 导出 JSON 模板
- 支持从 GitHub raw JSON 拉取远程模板，但禁止加载远程 JS

## 技术约束

- 使用 TypeScript
- 使用 Vite 打包为单个 .user.js
- 不使用 React、Vue、Next.js、NestJS
- UI 使用原生 DOM + Shadow DOM + CSS 字符串
- 不压缩、不混淆输出代码
- 尽量不引入运行时依赖
- 远程只允许加载 JSON，不允许加载远程可执行代码

## 目录结构

期望结构：

src/
  index.ts
  config.ts
  types.ts
  core/
    storage.ts
    template-engine.ts
    template-manager.ts
    selection.ts
    doubao-adapter.ts
  ui/
    panel.ts
    styles.ts
    floating-toolbar.ts
    slash-command.ts
  templates/
    default-templates.ts

scripts/
  build-userscript.ts

dist/
  doubao-prompt-helper.user.js

examples/
  templates.basic.json

## 开发原则

- 每次只实现一个小功能
- 每次修改后运行 npm run build
- 不要擅自增加后端、数据库、账号系统
- 不要把项目做成平台
- 所有 DOM selector 都集中在 doubao-adapter.ts
- 插入豆包失败时，必须提供复制到剪贴板的兜底方案

## 发布约束

Greasy Fork 对外部可执行代码有限制；远程 JSON 或 CSS 这类非可执行内容不受同样限制。
用户脚本应尽量保持源码可读，不做混淆和压缩。