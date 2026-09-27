# 项目上下文

**模板版本：** 7.0

本文件位于目标工程根目录并由目标工程 Git 管理，只记录 AI Framework 无法推断的共享项目事实。`<agent-workspace>` 由 `./tools/ai-framework path` 定位；角色职责和流程规则以其中的 `agents/AGENTS.md` 与 `governance/` 为准，不在这里重复。

不得记录个人绝对路径、密码、token、个人偏好或仅对单台设备有效的配置。

## 项目

- **产品 / 服务：** bahar 收银系统（Electron 桌面客户端，productName `bahar收银系统`，appId `cn.bahar.cashier`）
- **主要用户：** 门店收银员 / 商户
- **仓库、模块与目录结构：** Electron + Vue（electron-vue 结构）。主进程产物 `dist/electron/main.js`；渲染层源码在 `src/`，构建脚本在 `.electron-vue/`，打包配置在 `build/`，升级服务端在 `server/`，静态资源在 `static/`，业务库在 `lib/`。
- **现有架构与依赖方向：** 主进程（Electron）+ 渲染进程（Vue）分离，`server/` 为桌面端升级用的本地服务；依赖方向以各模块 import 为准，不臆断。

## 工程命令

- **语言与框架：** JavaScript / Vue，Electron（electron-vue 脚手架），包管理器 **yarn**（仓库含 `yarn.lock`，不要用 npm 混装）
- **构建命令：** 完整打包 `yarn build`（当前平台）；分平台 `yarn build:win64` / `yarn build:win32` / `yarn build:mac`；仅构建 web 资源 `yarn build:web`
- **快速测试命令：** `yarn dev`（本地开发运行）
- **模块 / 集成测试命令：** 未配置自动化测试；改动需手工验证并说明验证步骤
- **Lint / 格式化命令：** 未配置，遵循 `governance/java-code-style.md` 之外的项目现有风格，不改无关格式
- **本地开发前置条件：** Node + yarn；`postinstall` 会执行 `electron-builder install-app-deps`，首次安装耗时较长

## Git 与交付

- **稳定 / 受保护分支：** `main`
- **日常集成分支：** `main`
- **Task 分支命名：** 建议 `task/<task-id>-<slug>`（待团队确认后固化）
- **Worktree 或等价隔离方式：** 遵循 `governance/git-worktree-governance.md`；`agent_bootstrap/` 只存在于主工作树，不得复制到 worktree
- **必需的 CI 检查：** 待补充
- **合并、发布与回滚流程：** 桌面端安装包发布流程待补充；`yarn pack:resources` 与 `server/` 负责热更新资源

## 人工授权

- **授权记录方式：** 当前对话，或本地 DP / Task 中记录授权来源与范围
- **必须单独授权的操作：** 生产发布安装包、热更新资源推送、涉及支付/交易链路的改动；其余待补充

## 环境与部署

不存在的示例环境应删除；存在多个同类环境时分别使用唯一且稳定的 `Environment ID`。

| Environment ID | Type | Platform / Location | Purpose | Deployment Entry | Protection |
| --- | --- | --- | --- | --- | --- |
| `desktop-dev` | development | 本机 Electron 客户端 | 开发联调 | `yarn dev` | 无 |
| `desktop-prod` | production | 门店 Windows 客户端 | 正式运行 | `yarn build:win64` 产出安装包 | 需要人工授权 |

- 部署 Task 必须引用具体的 `Environment ID`。
- 新增环境或改变环境保护规则时更新本节。
- 本节只记录长期稳定事实；单次部署目标、执行边界、授权、attempt 和结果记录在对应 Task。
- 生产部署、资源删除、数据迁移和权限扩大需要明确人工授权。

## 风险与敏感边界

- **认证 / 授权：** 收银端登录与后端鉴权联动，改动按 High 风险处理
- **数据库与迁移：** 桌面端不直接持有库表脚本；数据变更通过后端接口，需评估兼容性
- **外部 API / 队列 / 存储：** 调用后端 bahar 系服务接口；`build.publish.url` 指向本地升级地址（当前为 `http://127.0.0.1`），正式升级地址待确认
- **不得读取或提交的敏感位置：** 支付 / 收银相关配置与密钥、商户凭据、真实交易数据，不得提交或外传
- **部署与运行环境限制：** 桌面端为 Windows 客户端，mac 包仅在需要时构建；热更新推送会影响存量门店客户端

## 项目覆盖项

- **现有命名、代码或模块约定：** 包管理器固定 yarn，勿引入 npm 混装导致 lockfile 冲突
- **项目专属 Gate 或更严格规则：** 涉及支付、交易金额、订单与打印的改动按 High 风险处理，需定向失败路径验证，适用时走硬件 / 目标环境 Gate（真实客户端）
