# 安装与初始化（Install & Setup）

本页将带你安装 Fink Framework，并完成 v1.0.0 所需的初始化设置。

## 1. 下载文件

Fink Framework 推荐使用 **UnityPackage** 进行安装，这是最简单、最稳定的方式。

- [GitHub Release 页面](https://github.com/finkkk/Fink-Framework/releases)
- [百度网盘（提取码：2333）](https://pan.baidu.com/s/1obZYHwBI4ZVnavCiCPE8BA?pwd=2333)

## 2. 框架依赖说明

Fink Framework 在发行包中提供以下依赖，导入后直接使用 `Assets/FinkFramework/Plugins/` 下的程序集或源码。

| 依赖库 | 用途 | 版本 | 备注 |
| --- | --- | --- | --- |
| **UniTask** | 异步加载、任务系统支持 | 源码版 | 必需，提供性能优于协程的 `async/await` |
| **Odin Serializer** | 数据序列化与反射支持 | 源码版 | 必需，数据管线核心依赖 |
| **Newtonsoft.Json** | JSON 解析与调试输出 | DLL | 数据与本地化 JSON 使用 |
| **ExcelDataReader** | Excel 配表读取 | DLL | 数据管线必需 |

请确保项目中不存在同名的重复程序集，否则 Unity 可能出现类型重复或命名空间冲突。框架依赖由发行包统一提供，不需要额外安装同名版本。

## 3. 导入到 Unity 项目

下载完成后，将 `.unitypackage` 文件拖入 Unity 的 Project 窗口，Unity 会自动导入。

![Unity 导入完成示意图](/images/getting-started/import.webp)

导入并编译完成后会自动弹出欢迎使用窗口。看到该窗口即表示框架已安装完成。

![Fink Framework 欢迎窗口](/images/getting-started/welcome_panel.webp)

## 4. 检查与更新框架

欢迎窗口中的“立即检查更新”用于主动检查 Fink Framework 的最新版本。

![Fink Framework 项目配置与检查更新入口](/images/getting-started/set.webp)

点击按钮后，框架会访问 [GitHub Releases](https://github.com/finkkk/Fink-Framework/releases)，将当前版本与最新 Release 进行比较：

- 已是最新版本时，会直接给出提示；
- 发现新版本时，会显示版本号并询问是否更新；
- 确认更新后，框架会自动下载对应的 UnityPackage，完成文件校验、当前框架目录备份和新版本导入；
- 如果更新失败或被中断，更新器会尝试恢复更新前的框架文件。

自动更新只替换 `Assets/FinkFramework` 目录，不会修改框架配置、数据文件或项目中已经生成的业务脚本。框架源码目录属于发行内容，不应直接放置项目业务修改。

> 欢迎窗口中的手动检查不受自动检查开关和检查间隔限制，随时都可以使用。

### 4.1 手动从 GitHub 更新

如果自动更新不可用，进入 [GitHub Releases](https://github.com/finkkk/Fink-Framework/releases) 下载对应的 `FinkFramework-v版本号.unitypackage`，再导入项目。

## 5. Framework 全局设置

通过以下任一方式可以打开框架配置：

- 点击欢迎窗口中的“打开框架设置”；
- 点击 `Edit` → `Project Settings` → `Fink Framework` 下的对应页面。

![Framework 全局设置](/images/getting-started/set_framework.webp)

### 5.1 设置脚本根目录

“全局脚本根目录”决定框架各类代码生成工具默认将脚本放在 `Assets` 下的哪个目录。输入框只需要填写 `Assets/` 后面的相对路径。

例如填写 `Scripts`，最终根目录就是：

```text
Assets/Scripts
```

建议在首次生成数据类、UI 脚本等内容前完成设置，并尽量保持路径稳定。这里不能填写绝对路径，也不要使用跳出 `Assets` 的路径。

### 5.2 设置更新检查

“启用版本更新检查”控制 Unity 编辑器是否自动从 GitHub 检查框架新版本；“检查间隔（天）”可设置自动检查的频率，默认每 1 天检查一次。

关闭自动检查后，欢迎窗口中的“立即检查更新”仍然可用，需要时可以手动检查。

### 5.3 其他全局选项

其余选项通常保持默认即可：

- **启用音频模块**：项目完全不使用框架音频系统时可以关闭；
- **强制关闭 XR / 新输入系统 / URP**：默认关闭，让框架自动检测项目环境。只有项目明确不使用已安装的功能时才开启；
- **启用编辑器加载打包检测**：建议保持开启。构建前会检查 `editor://` 路径引用，避免编辑器专用资源被错误带入运行时。

这些选项不需要额外初始化，按项目实际情况调整即可。

## 6. 各系统的初始化配置

安装页只负责完成框架级别的基础设置。各模块的初始化与详细选项已分别放到对应系统中，使用某个模块前再阅读即可：

| 配置内容 | 对应文档 |
| --- | --- |
| 数据源、代码生成路径与数据加密 | [数据管线配置](/data-pipeline/configuration/) |
| UI 渲染、面板生成、输入导航与面板资源路径 | [UI 系统配置](/ui-system/configuration/) |
| 输入设备检测与设备切换策略 | [输入系统配置](/input-system/configuration/) |
| AssetBundle、Addressables 与自定义资源后端 | [资源后端配置](/resload/configuration/) |
| 本地化初始化 | [本地化配置](/localization/configuration/) |

完成全局脚本根目录设置后，就可以按项目实际需要进入相应模块继续配置和使用。
