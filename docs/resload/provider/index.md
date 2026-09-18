# 资源插件系统（Provider）

Provider 是 ResLoad 的资源来源适配层，负责回答两个问题：资源从哪里来，以及如何把它加载成 Unity 资源对象。

`ResManager` 负责路径路由、缓存、异步任务合并和上层引用计数；Provider 负责具体来源的加载、存在性判断、底层释放、内部缓存清理和进度查询。

这种分层让业务代码可以保持统一：无论资源来自 `Resources`、本地文件、网络、AssetBundle 还是 Addressables，都通过 `ResManager` 调用。

---

## 1. Provider 接口

所有 Provider 都必须实现 `IResProvider`：

```csharp
public interface IResProvider
{
    T Load<T>(string path) where T : UnityEngine.Object;

    UniTask<T> LoadAsync<T>(string path)
        where T : UnityEngine.Object;

    bool Exists(string path);

    void Unload(string path);

    void Clear();

    bool TryGetProgress(string path, out float progress);
}
```

### 1.1 接口职责

| 方法 | 作用 |
| --- | --- |
| `Load<T>` | 同步加载一个资源，失败返回 `null` |
| `LoadAsync<T>` | 异步加载一个资源，失败返回 `null` 或抛出异常前应回滚底层引用 |
| `Exists` | 判断 Provider 自己的数据源中是否存在资源 |
| `Unload` | 释放一次 Provider 自己持有的底层资源、Bundle 或句柄引用 |
| `Clear` | 清理 Provider 自己维护的缓存和请求状态 |
| `TryGetProgress` | 查询正在加载资源的真实进度；不支持时返回 `false` |

Provider 的泛型入口当前约束为 `UnityEngine.Object`。因此它面向的是 Unity 资源对象，例如 `GameObject`、`Texture2D`、`AudioClip`、`TextAsset` 和 `AssetBundle`。原始字节流不属于当前 `IResProvider` 的通用返回类型，如需读取 `byte[]`，应额外设计明确的字节读取 API。

### 1.2 Provider 接收的路径

Provider 不接收完整协议，只接收去掉前缀后的实际路径：

```text
ResManager 调用：res://UI/Icon
Provider 收到：UI/Icon
```

Provider 不需要再次解析 `res://`、`file://` 或 `http://`。

### 1.3 Provider 与 ResManager 的边界

ResManager 负责：

- 规范化完整路径；
- 根据前缀选择 Provider；
- 按路径和资源类型缓存资源；
- 合并相同资源的异步请求；
- 维护业务层引用计数；
- 决定何时调用 Provider 的 `Unload`；
- 统一执行全量清理。

Provider 负责：

- 执行实际的同步或异步加载；
- 管理自己的 Bundle、句柄、请求或临时缓存；
- 在加载失败时回滚已经取得的底层引用；
- 在 `Unload` 和 `Clear` 中释放自己持有的状态；
- 提供真实进度（如果底层系统支持）。

Provider 不应自行代替 ResManager 维护业务层引用计数，也不应在每次加载失败时遗留 Bundle 或句柄引用。

---

## 2. 前缀路由

ResManager 读取路径中的第一个 `://`，将协议前缀转为小写，然后从 Provider 字典中查找对应实现：

| 路径形式 | Provider | 注册条件与说明 |
| --- | --- | --- |
| `UI/Icon` | `ResourcesProvider` | 无前缀时使用 Resources |
| `res://UI/Icon` | `ResourcesProvider` | 与无前缀共享同一个 Provider |
| `file://D:/Data/config.json` | `FileProvider` | PC 专用 |
| `http://...`、`https://...` | `WebProvider` | 两个前缀共享同一个 Provider，仅支持异步 |
| `editor://Assets/UI/Icon` | `EditorProvider` | 仅 Unity Editor 编译条件下注册 |
| `ab://bundle/asset` | `ABProvider` | 全局资源后端选择 AssetBundle 后才注册 |
| `addr://key`、`addressables://key` | `AddressablesProvider` | 选择 Addressables 后端且扩展程序集可用时注册 |

构造 `ResManager` 时会自动注册基础 Provider。AssetBundle 和 Addressables 不会无条件启用，而是根据全局资源后端配置注册；如果配置资源未加载，相关 Provider 会被跳过。

未知前缀、非法路径或未注册的资源后端会记录错误并返回空结果，不会自动回退到 Resources。

### 2.1 路径标准化

路由前，ResManager 会：

1. 统一路径分隔符；
2. 解析第一个 `://`；
3. 将前缀转为小写；
4. 保留去掉协议后的 Provider 路径；
5. 重新组合规范化完整路径，用于缓存和日志。

例如：

```text
输入：   HTTPS://example.com/icon.png
前缀：   https
路径：   example.com/icon.png
```

自定义前缀也会经过同样的标准化处理。

---

## 3. 内置 Provider

### 3.1 ResourcesProvider

`ResourcesProvider` 使用 Unity 的 `Resources.Load` 和 `Resources.LoadAsync`。

特点：

- 支持同步和异步加载；
- 资源路径填写 `Resources` 目录下的相对路径，不包含扩展名；
- 支持常见 Unity 资源类型，如 Prefab、Texture、AudioClip 和 ScriptableObject；
- 不提供真实进度，`TryGetProgress` 始终返回 `false`；
- Provider 自身不维护独立缓存；
- 具体资源释放由 ResManager 根据资源对象调用 `Resources.UnloadAsset`，不能简单依靠路径卸载。

示例：

```csharp
GameObject prefab = ResManager.Instance.Load<GameObject>(
    "res://UI/LoginPanel");

GameObject samePrefab = ResManager.Instance.Load<GameObject>(
    "UI/LoginPanel");
```

上面两个路径会路由到同一个 ResourcesProvider，但业务上仍建议统一路径写法，便于日志和资源管理。

### 3.2 FileProvider

`FileProvider` 通过 `file://` 读取 PC 本地文件，并将文件内容转换为 Unity 对象。

当前支持的主要类型：

- `TextAsset`：文本、JSON、XML、INI 等文本文件；
- `Texture2D`：通过图片字节创建纹理；
- `AudioClip`：异步支持 WAV、MP3、OGG；同步只支持有效的 16-bit PCM WAV；
- `AssetBundle`：从本地文件内存加载。

特点：

- PC 专用，移动端和 WebGL 不应使用；
- 同步和异步接口都可用，但大文件建议异步；
- Provider 不维护独立缓存；
- 不提供真实进度；
- FileProvider 创建的 Texture2D、AudioClip 等对象由 ResManager 在释放时销毁；
- AssetBundle 由 ResManager 调用 `Unload(false)`。

示例：

```csharp
TextAsset config = await ResManager.Instance.LoadAsync<TextAsset>(
    "file://D:/Game/Data/config.json");

Texture2D icon = await ResManager.Instance.LoadAsync<Texture2D>(
    "file://D:/Game/Data/icon.png");
```

### 3.3 WebProvider

`WebProvider` 使用 `UnityWebRequest` 加载网络资源，支持 `http://` 和 `https://`。

当前支持的主要类型：

- `Texture2D`；
- `AudioClip`；
- `AssetBundle`；
- `TextAsset`。

特点：

- 不支持同步加载，必须使用 `LoadAsync`、回调或句柄；
- 通过 UnityWebRequest 的异步操作提供下载进度；
- 请求结束后会移除 Provider 内部的进行中请求记录；
- Provider 不做持久化网络缓存，资源复用由 ResManager 缓存负责；
- `Exists` 不会提前验证远程文件，网络请求的成功或失败才是最终结果；
- 网络请求失败时会记录错误并返回 `null`。

示例：

```csharp
ResOperation<Texture2D> operation =
    ResManager.Instance.LoadAsyncHandle<Texture2D>(
        "https://cdn.example.com/images/icon.png");

operation.Completed += op =>
{
    if (op.Result != null)
        iconImage.texture = op.Result;
};
```

网络重试、鉴权、签名 URL、持久化缓存和版本更新不属于 WebProvider 当前职责，应由业务层或独立网络资源模块处理。

### 3.4 EditorProvider

`EditorProvider` 只在 Unity Editor 中编译和注册，底层使用 `AssetDatabase.LoadAssetAtPath`。

特点：

- 适合编辑器工具、预览窗口和开发期资源读取；
- 路径通常应包含 `Assets/`，例如 `editor://Assets/UI/Icon`；
- 同步加载直接访问 AssetDatabase；
- 异步接口只是在下一帧执行同步 AssetDatabase 加载，不是真正的异步 IO；
- 会尝试补全常见扩展名，例如 `.prefab`、`.asset`、`.mat`、`.png`、`.jpg`、`.mp3` 和 `.wav`；
- 不提供真实进度；
- 不进入 Player 构建，不能作为运行时资源后端。

示例：

```csharp
Texture2D icon = ResManager.Instance.Load<Texture2D>(
    "editor://Assets/Art/UI/Icon");
```

### 3.5 ABProvider

`ABProvider` 是本地 AssetBundle 后端，只有全局资源后端选择 `AssetBundle` 时才会由 ResManager 初始化。

路径格式必须是：

```text
ab://bundleName/assetName
```

其中 `bundleName` 是 AssetBundle 名称，`assetName` 是包内资源路径。路径不能以 `/` 开头或结尾，也不能缺少包名或资源名。

特点：

- 从本地文件加载 AssetBundle；
- 初始化时读取主包和 `AssetBundleManifest`；
- 自动加载并维护依赖 Bundle；
- 支持同步和异步加载；
- 异步加载可提供基于 `AssetBundleCreateRequest` 的进度；
- Bundle 按引用计数释放，依赖 Bundle 会随主 Bundle 一起维护；
- 启用 Hotfix 后，如果热更目录存在同名 Bundle，会优先使用热更文件；
- 不负责 Bundle 构建、下载、版本校验、签名验证或差分更新。

示例：

```csharp
GameObject prefab = await ResManager.Instance.LoadAsync<GameObject>(
    "ab://ui_bundle/MainPanel");
```

AssetBundle 后端需要先完成全局配置，包括内置根路径、热更根路径、平台目录名和 Hotfix 开关。新项目是否选择 AssetBundle，应结合项目自身的构建和发布流程评估。

### 3.6 AddressablesProvider

`AddressablesProvider` 位于独立的可选程序集，仅在项目安装 Addressables 并启用对应后端时参与运行。

路径中的实际内容是 Addressables 的 Key、Address 或可定位资源标识，不是文件路径：

```csharp
GameObject prefab = await ResManager.Instance.LoadAsync<GameObject>(
    "addr://UI/MainPanel");
```

也可以使用别名：

```csharp
GameObject prefab = await ResManager.Instance.LoadAsync<GameObject>(
    "addressables://UI/MainPanel");
```

特点：

- 支持异步加载和真实进度；
- Provider 内部按路径缓存 Addressables Handle；
- 同一路径不能在 Provider 缓存中按不同类型重复加载；
- 每次 Provider 加载会增加自己的句柄引用，归零后调用 `Addressables.Release`；
- `Exists` 通过 Addressables ResourceLocator 查询；
- 默认禁止同步加载；只有全局配置 `AllowSyncLoad` 开启后才允许同步接口；
- 分组、依赖、远程下载、构建、版本和更新由 Addressables 原生系统负责。

同步加载示例：

```csharp
// 只有 Addressables 后端配置 AllowSyncLoad = true 时才可能成功。
GameObject prefab = ResManager.Instance.Load<GameObject>(
    "addr://UI/MainPanel");
```

常规运行流程建议优先使用异步接口，避免同步等待阻塞主线程。

---

## 4. 自定义 Provider

自定义 Provider 适合接入项目已有的资源系统，例如：

- 自研二进制容器；
- 加密资源包；
- 本地数据库或资源索引；
- YooAsset 等第三方资源后端；
- 自定义 CDN 或远程资源服务。

### 4.1 实现接口

下面是一个最小结构示例：

```csharp
using Cysharp.Threading.Tasks;
using UnityEngine;
using FinkFramework.Runtime.ResLoad.Base;

public sealed class MyProvider : IResProvider
{
    public T Load<T>(string path) where T : Object
    {
        // 从自己的数据源同步读取并转换为 T。
        return null;
    }

    public async UniTask<T> LoadAsync<T>(string path)
        where T : Object
    {
        // 异步读取自己的数据源。
        await UniTask.Yield();
        return Load<T>(path);
    }

    public bool Exists(string path)
    {
        return false;
    }

    public void Unload(string path)
    {
        // 释放一次由该路径持有的 Bundle、句柄或其他底层引用。
    }

    public void Clear()
    {
        // 清理 Provider 自己维护的缓存和进行中请求。
    }

    public bool TryGetProgress(string path, out float progress)
    {
        progress = 0f;
        return false;
    }
}
```

实现时需要注意：

- `Load` 和 `LoadAsync` 收到的是去掉协议的路径；
- 返回 `null` 或抛出异常前，要回滚已经取得的底层引用；
- `TryGetProgress` 不支持真实进度时返回 `false`，不要伪造已经完成的进度；
- `Unload` 只负责 Provider 自己的底层释放，不要在这里处理 ResManager 的引用计数；
- `Clear` 必须能清理 Provider 自己的全部状态；
- 同一路径、同一类型的并发合并由 ResManager 处理，Provider 不应假设每次调用都是独立请求。

### 4.2 注册 Provider

通过 `AddProvider` 注册自定义前缀：

```csharp
ResManager.Instance.AddProvider("my", new MyProvider());
```

注册后即可使用：

```csharp
TextAsset config = await ResManager.Instance.LoadAsync<TextAsset>(
    "my://Config/main");
```

`AddProvider` 会自动清理前缀两侧空白并转为小写。相同前缀重复注册时，后注册的 Provider 会覆盖之前的映射，因此应在框架初始化阶段统一完成注册。

注意：全局配置中的 `CustomBackendSettings` 只是保存项目自定义后端配置，ResManager 不会根据它自动创建 Provider。使用自定义后端时，项目初始化代码仍需自行创建 Provider 并调用 `AddProvider`。

---

## 5. 工作流程

```text
业务调用 Load / LoadAsync / LoadAsyncHandle
                │
                ▼
       ResManager 规范化路径
                │
                ▼
          根据前缀选择 Provider
                │
                ▼
        Provider 执行实际加载
                │
                ▼
   ResManager 写入缓存并增加引用计数
                │
                ▼
       返回资源、回调或操作句柄
                │
                ▼
      使用结束后由 ResManager 释放引用
                │
                ▼
      引用归零并标记删除后调用 Unload
```

句柄进度由 ResManager 轮询 Provider 的 `TryGetProgress`。如果 Provider 不支持真实进度，ResManager 会使用平滑模拟进度；这不会改变底层加载速度，也不代表资源已经完成。

---

## 6. 选择建议

| 需求 | 推荐方案 |
| --- | --- |
| 小型项目、快速原型 | ResourcesProvider |
| PC 本地外部资源 | FileProvider |
| 网络图片、音频或远程包 | WebProvider，业务层补充重试和缓存 |
| 编辑器工具读取 Assets | EditorProvider |
| 已有成熟 AB 工作流 | ABProvider |
| 中大型项目和远程内容 | AddressablesProvider |
| 已有自研资源后端 | 自定义 Provider |

选择 Provider 后，仍需遵守统一的加载与释放配对规则。Provider 只负责底层来源，不能替代 ResManager 的资源生命周期管理。

---

## 7. 小结

Provider 系统通过统一接口隔离了资源来源差异：

- ResManager 负责路由、缓存、并发合并和上层引用计数；
- Provider 负责具体加载、底层句柄、依赖和进度；
- 内置 Provider 覆盖 Resources、本地文件、网络、Editor、AssetBundle 和 Addressables；
- AssetBundle、Addressables 和自定义 Provider 都需要满足对应的初始化或注册条件；
- Provider 失败时必须回滚底层引用，释放时必须清理自己的资源状态。

结合[资源加载概述](/resload/)、[资源后端配置](/resload/configuration/)和[基础使用](/resload/basic-usage/)，即可完成从资源来源配置到业务调用的完整流程。
