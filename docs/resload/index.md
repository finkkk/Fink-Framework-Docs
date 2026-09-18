# 资源加载（ResLoad）概述

ResLoad 是 Fink Framework 的统一资源访问层。业务代码只需要提供一个带协议前缀的路径和目标资源类型，`ResManager` 就会负责选择 Provider、复用缓存、合并异步请求、维护引用计数，并在资源不再使用时交给对应 Provider 释放。

运行时入口位于 `FinkFramework.Runtime.ResLoad`：

```csharp
using FinkFramework.Runtime.ResLoad;

Texture2D icon = ResManager.Instance.Load<Texture2D>("res://UI/Icon");
```

`ResManager` 是普通 C# 单例，不继承 `MonoBehaviour`，不需要在场景中挂载组件。它会在首次访问时注册基础 Provider，并根据全局资源后端配置注册 AssetBundle 或 Addressables Provider。

---

## 1. ResLoad 解决什么问题

直接在业务代码中混用 `Resources.Load`、文件读取、`UnityWebRequest`、AssetBundle 和 Addressables，容易造成：

- 每种资源来源都有一套不同的调用方式；
- 相同资源重复加载，引用释放责任不清晰；
- 同一资源的并发异步请求重复发起；
- 网络或文件加载的进度和错误处理不统一；
- 切换资源后端时需要修改大量业务代码；
- 场景切换时难以统一清理缓存。

ResLoad 将这些差异集中在 `ResManager` 和 Provider 层，业务层只依赖统一的加载、释放和批量操作接口。

---

## 2. 核心结构

### `ResManager`

负责：

- 解析和规范化资源路径；
- 根据协议前缀路由到 Provider；
- 建立“规范化路径 + 资源类型”的缓存键；
- 合并同一路径、同一类型的异步加载任务；
- 维护上层引用计数和待删除标记；
- 提供同步、`await`、回调、句柄和批量加载接口；
- 执行单资源释放、未使用资源释放和全量清理。

### `ResInfo<T>` / `BaseResInfo`

每个缓存记录保存：

- 已加载的 Unity 资源对象；
- 当前底层异步任务；
- 上层引用计数；
- 是否允许在引用归零后删除；
- 创建该记录的 Provider；
- Provider 使用的实际路径；
- 规范化后的完整路径。

因此卸载时不需要再从缓存 Key 反推原始路径，Provider 也可以正确释放自己的 Bundle 或句柄。

### `IResProvider`

Provider 只负责具体来源的底层行为：

```csharp
public interface IResProvider
{
    T Load<T>(string path) where T : UnityEngine.Object;
    UniTask<T> LoadAsync<T>(string path) where T : UnityEngine.Object;
    bool Exists(string path);
    void Unload(string path);
    void Clear();
    bool TryGetProgress(string path, out float progress);
}
```

Provider 接收的是**去掉协议前缀后的路径**。上层引用计数由 `ResManager` 维护，Provider 负责自己的底层缓存、句柄和依赖释放。

### `ResOperation<T>` / `BatchOperation`

- `ResOperation<T>`：单个异步资源的进度、结果和完成事件；
- `BatchOperation`：多个资源的整体进度、按输入顺序排列的结果列表和完成事件。

它们适合不使用 `async/await` 的 UI、加载页和旧业务代码。

---

## 3. Provider 路由

`ResManager` 会读取路径中的第一个 `://`，将前缀转为小写后查找 Provider。当前内置路由如下：

| 路径形式 | Provider | 可用条件与说明 |
| --- | --- | --- |
| `UI/Icon`、`res://UI/Icon` | `ResourcesProvider` | 从 `Resources` 目录加载，不包含扩展名 |
| `file://D:/Game/Data/config.json` | `FileProvider` | PC 专用，读取本地文件 |
| `http://...`、`https://...` | `WebProvider` | 只支持异步网络请求 |
| `editor://Assets/UI/Icon` | `EditorProvider` | 仅 Unity Editor，使用 AssetDatabase |
| `ab://bundle/asset` | `ABProvider` | 需配置 AssetBundle 后端 |
| `addr://key`、`addressables://key` | `AddressablesProvider` | 需安装 Addressables 并启用对应后端 |

无前缀路径和 `res://` 共享同一个 `ResourcesProvider`；`http://` 与 `https://` 共享同一个 `WebProvider`。

AssetBundle 和 Addressables Provider 不是无条件注册：只有对应全局后端配置生效时，相关前缀才可使用。Addressables 扩展还需要项目安装 `com.unity.addressables` 包。

未知前缀、未注册后端和非法路径会记录错误并返回空结果，不会自动回退到 `ResourcesProvider`。

---

## 4. 路径与缓存键

路径进入 `ResManager` 后会先做以下处理：

1. 统一路径分隔符；
2. 查找第一个 `://` 解析协议和真实路径；
3. 协议前缀转为小写；
4. 重新组合成规范化完整路径；
5. 使用完整路径和资源类型生成缓存键。

缓存键相当于：

```text
normalizedPath + "_" + typeof(T).AssemblyQualifiedName
```

因此缓存不仅区分路径，也区分请求的资源类型。相同的资源路径应始终使用一致的目标类型，避免 Provider 内部出现类型冲突。

### Provider 路径与资源路径

Provider 收到的路径不包含协议：

```text
ResManager 调用：res://UI/Icon
ResourcesProvider 收到：UI/Icon
```

AssetBundle 路径还必须符合 `bundle/asset` 结构；`bundle` 是包名，`asset` 是包内资源名。`editor://` 则通常应把 `Assets/` 路径写入协议后，例如：

```text
editor://Assets/UI/Icon
```

---

## 5. 加载与并发行为

### 同步加载

同步 `Load<T>` 适合本地、已确认能够立即完成的资源。

如果同一路径同一类型已经加载完成，调用会复用缓存并增加引用计数；如果该资源正在异步加载，`Load<T>` 不会阻塞等待，而是返回 `null` 并记录警告，此时应改用 `LoadAsync<T>`。

`WebProvider` 不支持同步网络加载；Addressables 的同步加载还受后端配置中的 `AllowSyncLoad` 控制。

### 异步加载

```csharp
Texture2D texture = await ResManager.Instance.LoadAsync<Texture2D>(
    "https://example.com/icon.png");
```

同一路径、同一类型的并发 `LoadAsync` 会共享同一个 Provider 加载任务，而不是重复发起底层请求。每个成功的调用方都会持有一份上层引用。

### 句柄进度

```csharp
ResOperation<Texture2D> operation =
    ResManager.Instance.LoadAsyncHandle<Texture2D>("https://example.com/icon.png");

operation.Completed += op =>
{
    if (op.Result != null)
        Debug.Log("资源加载完成");
};
```

网络、AssetBundle 和 Addressables 等 Provider 可以提供真实进度；Resources、File 和 Editor Provider 不提供真实进度时，句柄会使用平滑模拟进度，完成时统一变为 `1`。

---

## 6. 引用计数与释放

每次成功的 `Load`、`LoadAsync` 或批量加载都会为对应缓存记录增加一份引用。使用结束后应释放对应引用：

```csharp
ResManager.Instance.UnloadAsset<Texture2D>(
    "res://UI/Icon",
    isDel: true);
```

`UnloadAsset` 的两个关键参数：

- `isSub`：是否减少一次上层引用，默认 `true`；
- `isDel`：是否标记为可删除，默认 `false`。

只有在 `refCount == 0` 且 `isDel == true` 时，资源记录才会真正从缓存移除并调用 Provider 的释放逻辑。只减少引用、不标记删除，可以让资源继续留在缓存中供后续请求复用。

全量清理：

```csharp
await ResManager.Instance.UnloadUnusedAssets();
await ResManager.Instance.ClearDicAsync();
```

`ClearDic` / `ClearDicAsync` 会清理当前缓存和 Provider 缓存；如果存在进行中的请求，会先等待请求结束，再完成释放和 `Resources.UnloadUnusedAssets`。场景切换等需要彻底清空资源状态的流程适合使用全量清理。

---

## 7. 不同 Provider 的释放差异

ResManager 统一管理上层引用计数，但底层资源的释放方式由 Provider 决定：

- `ResourcesProvider`：普通资源调用 `Resources.UnloadAsset`；`GameObject`、`Component` 和 `AssetBundle` 等对象交给 Unity 的未使用资源清理流程；
- `FileProvider`：文件读取生成的 `Texture2D`、`AudioClip` 等对象由框架销毁，AssetBundle 使用 `Unload(false)`；
- `WebProvider`：网络请求结束后移除请求记录，创建的 Unity 对象由框架释放；
- `ABProvider`：按 Bundle 及其依赖的引用计数释放 Bundle；
- `AddressablesProvider`：按路径缓存句柄，并在引用归零后调用 `Addressables.Release`；
- `EditorProvider`：编辑器资源不执行运行时卸载，交由 AssetDatabase 管理。

---

## 8. 设计边界

ResLoad 解决的是“统一入口、路由、缓存、引用计数和释放”，不负责：

- AssetBundle 的构建、下载、版本校验和差分更新；
- Addressables 的分组、构建路径和远程服务器配置；
- 网络资源的重试策略、鉴权和业务缓存；
- 任意文件类型到 `byte[]` 的通用运行时 API；
- 业务对象生命周期和场景切换流程。

这些能力应由对应 Provider、资源后端配置或业务层单独负责。

---

## 9. 下一步

- [资源后端配置](/resload/configuration/)：配置 AssetBundle、Addressables 或自定义后端；
- [基础使用](/resload/basic-usage/)：查看同步、异步、句柄、批量加载和释放示例；
- [资源插件系统](/resload/provider/)：实现或注册自定义 Provider。
