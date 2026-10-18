# v2.15.5：恢复受授权的 B2 手动永久删除

本轮只修改现有清理接口、结果反馈、相关测试和维护说明，没有重新开展全站审计。前两轮工作保留在 `codex/v2.15.3-safety-audit` 工作树；版本由 2.15.4 递增到 2.15.5，历史记录/Tag 不变。

## 行为

- 保留原有扫描列表、媒体预览、手动确认与 DELETE 流程，不再固定拒绝所有永久删除请求。
- 两个 B2 接口继续使用本轮已有的服务端 GitHub 身份及固定私有仓库授权。清理接口拒绝客户端传入 bucket/endpoint 等范围覆盖参数。
- 桶和凭据只取服务端配置；键必须符合现有键格式并出现在该桶列表中，未知/外部键不发送 DELETE。未授权、验证失败或范围无法确认时不删除。
- `server/b2-ledger.ts` 读取固定 ledger 当前引用，包含 Note、Journal、回收站及重复任务例外；兼容原有 bundle 格式和大文件 Blob 读取。客户端引用只能增加保护。每个对象删除前再次检查云端引用，重新被引用则跳过。
- DELETE 逐项处理；单项失败/超时不抹掉其他成功结果。返回 `deletedKeys`、`missingKeys`、`skippedKeys`、`failures`、`remainingKeys`，保留原有 deleted/skipped/scanned 字段。404 区分为已不存在。
- 前端沿用原弹窗和确认交互，显示成功、失败、跳过和剩余数量；失败/受保护文件留在列表，全部处理完成才关闭。断网或结果异常保留列表并提示重新扫描；取消确认不发送删除请求。
- 远端清理不再顺带全量收集本地孤儿二进制，避免部分远端失败时清掉本地附件字节。数据格式、日期偏好和 IDB schema 均未改变。

## 实际验证（2026-10-18）

新增 **21 项**（清理 API/结果校验 16，真实浏览器手动流程 5）。相关回归命令：

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=2 b2-gc-v2155.spec.ts b2-gc-ui-v2155.spec.ts b2-authorization-v2154.spec.ts b2-client-safety-v2154.spec.ts security-api.spec.ts orphan-cleanup-overlay.spec.ts attachment-lifecycle.spec.ts version-safety-v2153.spec.ts production-offline-v2153.spec.ts
```

结果：**54 通过，0 失败，0 跳过**。包括未授权/越权、范围覆盖、非法/重复键、云端引用保护、成功/404、部分失败、超时及重试、ledger/列表故障、查看和确认、取消、剩余列表、生产版本页脚及离线缓存。首轮取消确认测试的弹窗等待顺序造成超时，修正等待逻辑后通过，没有改变产品确认逻辑或放宽断言。

`npm run typecheck`、`npm run build`、`git diff --check` 通过。`npm run lint` 成功退出，0 error / 69 warning；构建有 chunk 体积警告。本轮未重新执行全量套件，不把上轮的 539 项通过报告为本轮全量结果。

## 仍未验证及操作限制

- 所有删除测试均由 Mock fetch/Mock 接口响应，没有对任何真实 B2 文件发送 DELETE，也没有写入真实 GitHub 数据。
- 服务器固定身份/仓库/桶的实际部署绑定、B2 删除及版本保留语义仍未验证。默认数据分支/路径是应用已有的 main、zing/sync-bundle.json；自定义部署需核对对应环境配置，不能把不同所有者的数据 ledger 共用该桶。见 [部署清单](B2_DEPLOYMENT.md)。
- 云端引用核验与 B2 DELETE 不存在分布式原子锁；离线设备未同步的引用不可见，核验后立即新增引用也有竞态窗口。不宣称跨设备零误删风险，应在清理前同步相关设备。没有通过重新整体禁用功能回避这一限制。
- 沿用既有 S3 对象 DELETE，不额外清理历史版本；provider 的实际物理删除/版本保留行为需另行核验，不声称已验证所有历史字节被擦除。
- 未新增提交、Tag，未 Push main 或部署；当前 HEAD 仍为 8331d93。按照本轮要求，部署配置未验证前不发布。
