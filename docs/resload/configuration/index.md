# 资源后端配置

资源后端用于接入需要预先构建和初始化的资源系统。只有项目使用 AssetBundle、Addressables 或自定义构建型资源方案时才需要配置。

打开方式：`Edit` → `Project Settings` → `Fink Framework` → `Resource Backend`。

## 1. 选择资源后端

| 类型 | 说明 | 建议 |
| --- | --- | --- |
| **None** | 不启用构建型资源后端，仅使用 Resources、File、Http 等即时加载方式。 | 小型项目、原型或无热更新需求的项目。 |
| **AssetBundle** | 使用 Unity 传统 AssetBundle 方案。 | 适合已有 AB 流程的旧项目，新项目通常不优先选择。 |
| **Addressables** | 使用 Unity Addressables，支持依赖、远程资源和版本管理。 | 中大型项目和长期维护项目的推荐选择。 |
| **Custom** | 接入 YooAsset 或自研资源系统。 | 已有独立资源方案，且愿意实现框架接入层的项目。 |

如果项目只使用 `ResourcesProvider`、`FileProvider` 或 `WebProvider`，保持 `None` 即可。

## 2. AssetBundle 详细设置

选择 `AssetBundle` 后，需要配置：

- **内置 AB 根路径**：通常指向 `StreamingAssets` 下的资源包目录；
- **热更 AB 根路径**：通常指向 `PersistentDataPath` 下的更新目录；
- **平台目录名**：例如 `StandaloneWindows64`、`Android` 或 `iOS`；
- **启用 Hotfix AB**：决定是否优先考虑热更资源包。

框架负责运行时加载与引用管理，不提供完整的 AssetBundle 构建、下载、版本校验或差分更新工具。项目需要自行准备对应的构建与发布流程。

## 3. Addressables 详细设置

选择 `Addressables` 后，可设置是否允许同步加载。该选项默认关闭。

同步加载可能通过等待完成的方式阻塞主线程，只建议在明确可控的初始化阶段使用；常规运行流程优先使用异步加载。

使用前请先在 Unity 项目中正确安装并配置 Addressables 包、分组、构建路径和远程服务。

## 4. 自定义后端

选择 `Custom` 后，需要提供自定义的配置 `ScriptableObject`，并实现对应的资源加载 Provider、初始化逻辑和构建流程。框架提供接入点，但不会假设第三方系统的具体实现。

## 5. 使用建议

- 在项目早期确定唯一的主要构建型资源后端，避免同时维护多套发布流程；
- 切换后端后，重新验证初始化、同步与异步加载、引用释放以及异常处理；
- 后端配置完成后，继续阅读[资源加载概述](/resload/)和[资源插件系统](/resload/provider/)。
