# B2 服务端授权与部署前检查（v2.15.5 候选）

本轮没有部署或读取线上 Vercel 配置。本地进程没有下列配置，不能据此断言线上是否已有相应配置。不要在聊天、源码或前端 VITE_* 中提供密钥。

## 需要部署管理员操作的项目

在 Vercel 对应项目的服务端 Environment Variables 中，配置并核对以下非密钥信息；若 Preview 用于验证，应使用隔离数据仓库及隔离桶，不连接正式用户数据。

| 名称 | 由管理员填写/核验的内容 |
| --- | --- |
| `ZING_B2_GITHUB_USER_IDS` | 允许访问该桶的 GitHub **数字用户 ID**，逗号分隔，不是显示名或登录名。只授权实际数据所有者，不默认授权任意 GitHub 用户。 |
| `ZING_B2_GITHUB_REPOSITORY` | 与该桶对应的私有数据仓库 `owner/repo`，不是本项目源码仓库；不要猜测或自动采用浏览器填写的仓库。 |
| `ZING_B2_GITHUB_REPOSITORY_ID` | 上述私有数据仓库的数字 ID，用于拒绝仓库改名、删除后同名重建等导致的错误绑定。 |
| `ZING_B2_GITHUB_BRANCH` / `ZING_B2_GITHUB_BUNDLE_PATH` | 服务端核验当前引用使用的固定分支和文件，默认沿用应用的 `main`、`zing/sync-bundle.json`。若正式同步自定义了分支/路径，管理员必须配置为同一个实际数据 ledger；客户端不能覆盖。 |
| `ZING_B2_CONDITIONAL_PUT_VERIFIED` | **默认不设置**。只有独立确认该 B2 endpoint 实际执行 `If-None-Match: *` 的 create-only 语义后才可设为字符串 `true`。未验证时 PUT 签名返回 503，保留本地附件并提示同步警告；GET/HEAD 仍需通过身份授权。 |

核对现有服务端 `B2_KEY_ID`、`B2_APPLICATION_KEY`、`B2_BUCKET_NAME`、`B2_ENDPOINT` 的绑定；不要复制到源码或聊天。确认这是一个与上述私有 ledger 绑定的独立桶，不应把不同数据所有者的多个 ledger 共享到同一桶。B2 Application Key 应限制在该桶，具备既有读/写/列表及对象删除所需的最小权限，不能将客户端传入的 bucket、endpoint 或 URL 作为操作目标。本轮恢复既有对象 DELETE，不扫描或清理历史对象版本；provider 对版本保留的实际行为需部署前核验。

设备继续使用现有的 GitHub Token 输入/本地保存机制，无需新增 B2 登录密钥。Token 需能访问 GitHub `/user`、固定私有仓库元数据及数据文件 Contents/大文件 Git Blob 读取；服务端要求身份在允许列表、仓库 ID/名称一致、仓库为 private，且用户有 `permissions.push === true`。无法获得元数据或当前引用数据时不执行删除，不会回退到同源头或 Preview Protection。请只在设备现有设置或安全管理页面配置，不在对话中发送 Token。

允许服务端访问 `https://api.github.com/user` 和固定仓库的元数据 endpoint。不设置调用方可控的上游域名。不缓存身份/权限结果，授权请求有 10 秒期限；GitHub 不可用时拒绝访问。签名 URL 仍有最长 300 秒有效期，已签发的 URL 不会因随后撤销 GitHub Token 而立即失效。

## 必须完成的隔离验证

- 在只使用模拟 GitHub 数据和模拟附件的隔离环境核对允许/拒绝身份及仓库绑定；检查两个端点都执行服务端授权，不能只测试 Preview 访问密码。
- 启用 PUT 前核验 B2 对条件写的实际支持：不存在键可创建；同键再次写不同模拟字节必须返回条件失败，原字节必须保持；去掉或改变签名绑定的 If-None-Match 必须不能成功。不要用任何真实用户对象做试验。若无法独立确认，保持关闭，不能假设 S3 兼容即支持此能力。
- 核对隔离桶 CORS 允许应用所需 GET/HEAD/PUT、Content-Type 和 If-None-Match 请求头，来源限制为实际应用 origin；不得通过放开任意来源或绕过签名解决失败。
- 清理接口已恢复 `action: delete`，必须验证身份并重新读取当前云端引用与固定桶列表。客户端引用只能增加保护，不能移除云端引用。逐项返回删除、已不存在、引用保护跳过、失败及剩余键；只有确认成功/已不存在的条目从界面移除。使用 Mock 验证上述路径，不使用真实用户文件做删除测试。
- 当前引用检查与 B2 DELETE 不具备跨 GitHub/B2 的原子锁，离线设备尚未同步的引用也不可见。保留原有手动查看/确认流程；操作前同步所有设备并核验分支/路径绑定。不能把该检查宣传为全设备无竞态保证。

本轮自动化只使用 Mock，没有执行真实 B2/GitHub 写入、覆盖或删除。上述线上/实际 provider 验证尚未完成，不能因测试通过而自动发布 main。
