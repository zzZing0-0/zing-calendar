# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.


## v2.9.33

- 修复 v2.9.32 的构建残留：移除不再使用的 `boundedInteger` import；更新 contextual FocusSession 回归测试，使其保护“编辑时间/标签但保留 context”的 invariant，而不依赖旧实现的精确源码形状；同步修正应用版本号。

## v2.9.32

- Focus 历史编辑统一改为“开始日期时间 + 结束日期时间”，时长只由区间计算；自由专注、笔记和任务共用同一规则，跨午夜记录仍保持单一 FocusSession。

## v2.9.31
Task compact detail now exposes derived focus total and raw task-context FocusSession history with per-session edit/delete. Today Focus remains a summary/navigation surface.
