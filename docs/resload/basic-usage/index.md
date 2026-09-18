# 基础使用

本章节介绍 ResLoad 在实际项目中的常用用法，包括路径写法、同步加载、异步加载、句柄进度、批量加载、引用计数和资源释放。

所有示例都通过 `ResManager.Instance` 访问。ResManager 会根据路径前缀选择 Provider，并按“规范化路径 + 资源类型”复用缓存。

---

## 1. 资源路径

ResLoad 使用协议前缀区分资源来源：

| 路径形式 | 加载来源 | 说明 |
| --- | --- | --- |
| `UI/LoginPanel` | Resources | 无前缀时默认使用 Resources |
| `res://UI/LoginPanel` | Resources | `Resources` 目录下的相对路径，不包含扩展名 |
| `file://D:/Game/Data/config.json` | 本地文件 | PC 专用 |
| `http://...` / `https://...` | 网络资源 | 只能异步加载 |
| `editor://Assets/UI/Icon` | Unity Editor | 仅编辑器可用 |
| `ab://bundle/asset` | AssetBundle | 需要启用 AssetBundle 后端 |
| `addr://key` / `addressables://key` | Addressables | 需要 Addressables 包和对应后端配置 |

路径进入 ResManager 后会统一处理分隔符和协议前缀。资源缓存键相当于：

```text
normalizedPath + "_" + typeof(T).AssemblyQualifiedName
```

因此：

- 同一路径请求不同类型时，会被视为不同缓存记录；
- 同一路径、同一类型的同步与异步请求可以复用同一份缓存；
- 业务代码应保持同一资源的请求类型一致，避免类型不匹配。

Provider 实际收到的是去掉协议后的路径。例如：

```text
ResManager 调用：res://UI/Icon
ResourcesProvider 收到：UI/Icon
```

---

## 2. 同步加载

同步加载适合本地、体量较小且不需要展示加载进度的资源，例如 UI Prefab、小图标和少量本地配置。

```csharp
using FinkFramework.Runtime.ResLoad;

GameObject prefab = ResManager.Instance.Load<GameObject>(
    "res://UI/Panels/MainPanel");

if (prefab == null)
{
    LogUtil.Error("MainPanel 加载失败");
    return;
}
```

同步加载的处理规则：

1. 缓存不存在时，调用对应 Provider 的同步接口；
2. 首次加载成功后创建缓存记录，并增加一份引用；
3. 缓存已加载完成时直接返回资源，并增加一份引用；
4. 如果同一资源正在异步加载，`Load` 不会阻塞等待，而是返回 `null` 并记录警告；
5. WebProvider 不支持同步网络加载，Addressables 是否支持同步加载取决于 `AllowSyncLoad` 配置。

如果资源可能正在异步加载，应统一使用 `LoadAsync`，不要在同步接口和异步接口之间做“等待托底”的假设。

---

## 3. 异步加载

### 3.1 `async/await`

这是业务代码中最直接的异步写法：

```csharp
Texture2D icon = await ResManager.Instance.LoadAsync<Texture2D>(
    "res://UI/Icon");

if (icon == null)
{
    LogUtil.Error("图标加载失败");
    return;
}
```

异步加载会自动处理缓存和并发：

- 首次请求会创建缓存记录并启动 Provider 加载任务；
- 缓存命中时直接返回已加载资源，并增加引用；
- 同一路径、同一类型正在加载时，后续请求会等待同一个任务，不会重复发起加载；
- 每个成功的调用方都对应一份引用，使用结束后需要释放自己的引用。

### 3.2 回调形式

不使用 `async/await` 的代码可以使用回调接口：

```csharp
ResManager.Instance.LoadAsyncCallback<Sprite>(
    "res://UI/Icon",
    sprite =>
    {
        if (sprite == null)
        {
            LogUtil.Error("图标加载失败");
            return;
        }

        iconImage.sprite = sprite;
    });
```

回调会在加载成功或失败后执行，失败时参数为 `null`。回调异常会被 ResManager 捕获并记录，不会破坏资源加载任务。

### 3.3 句柄形式

需要进度条、完成事件或不能使用 `async/await` 时，可以使用 `ResOperation<T>`：

```csharp
ResOperation<Texture2D> operation =
    ResManager.Instance.LoadAsyncHandle<Texture2D>(
        "https://example.com/icon.png");

operation.Completed += op =>
{
    if (op.Result == null)
    {
        LogUtil.Error("网络图片加载失败");
        return;
    }

    iconImage.texture = op.Result;
};

// 在 Loading UI 中读取：
float progress = operation.Progress;
```

`ResOperation<T>` 提供：

| 成员 | 说明 |
| --- | --- |
| `IsDone` | 加载流程是否结束，成功和失败都会变为 `true` |
| `Progress` | `0~1` 的加载进度 |
| `Result` | 成功时的资源对象，失败时通常为 `null` |
| `Completed` | 加载结束事件 |

网络、AssetBundle 和 Addressables Provider 可以提供真实进度；Resources、File 和 Editor Provider 没有真实进度时，ResManager 会使用平滑模拟进度，完成时统一设置为 `1`。

---

## 4. 批量异步加载

批量加载适合场景切换预加载、Loading 页面、大型 UI 初始化和章节资源准备。

### 4.1 指定统一资源类型

当列表中的资源类型一致时，推荐使用泛型重载：

```csharp
var paths = new List<string>
{
    "res://UI/Icon",
    "res://UI/Background"
};

BatchOperation operation =
    ResManager.Instance.BatchLoadAsync<Texture2D>(paths);

operation.Completed += op =>
{
    for (int i = 0; i < op.Results.Count; i++)
    {
        Texture2D texture = op.Results[i] as Texture2D;
        if (texture == null)
            LogUtil.Warn($"批量资源加载失败：{paths[i]}");
    }
};
```

### 4.2 无类型重载

也可以使用无类型重载：

```csharp
BatchOperation operation = ResManager.Instance.BatchLoadAsync(paths);
```

此时结果保存在 `Results` 中，元素类型为 `object`。对于 FileProvider、WebProvider 等需要明确资源类型的 Provider，应使用泛型重载，避免以 `UnityEngine.Object` 请求导致 Provider 无法判断具体解析方式。

### 4.3 批量行为

当前批量加载具有以下语义：

- 按输入列表顺序逐项加载，不会并行发起全部请求；
- 每完成一项，按完成数量更新 `Progress`；
- 成功结果和失败结果都会加入 `Results`；
- 失败项使用 `null` 占位，因此 `Results` 与输入路径保持相同顺序；
- 空列表会异步完成，并触发 `Completed`；
- 批量加载成功的每一项都会增加一份引用，使用结束后需要逐项释放。

批量句柄完成后，`Progress` 为 `1`，但这不代表每个结果都非空，业务代码仍应检查 `Results`。

---

## 5. 引用计数

ResLoad 为每条“路径 + 类型”缓存记录维护引用计数：

| 操作 | 引用计数行为 |
| --- | --- |
| `Load` 成功 | `+1` |
| `LoadAsync` 成功 | `+1` |
| 回调、句柄和批量加载 | 内部复用 `LoadAsync` 的计数规则 |
| `UnloadAsset` 默认调用 | `-1` |

可以通过 `GetRefCount` 查看当前引用数：

```csharp
int count = ResManager.Instance.GetRefCount<GameObject>(
    "res://UI/Panels/MainPanel");
```

引用计数代表框架当前记录的使用方数量。每一次成功加载都应与一次对应的卸载配对，重复卸载会记录错误，计数不会继续减到负数。

---

## 6. 释放单个资源

### 6.1 推荐写法

资源使用结束后，通常应减少引用并标记为可删除：

```csharp
ResManager.Instance.UnloadAsset<Texture2D>(
    "res://UI/Icon",
    isDel: true);
```

当引用计数归零且 `isDel == true` 时，ResManager 会移除缓存记录，并调用对应 Provider 的释放逻辑。

### 6.2 默认卸载行为

`isDel` 默认为 `false`：

```csharp
ResManager.Instance.UnloadAsset<Texture2D>("res://UI/Icon");
```

这种调用只减少引用，不会标记缓存删除。资源仍可能保留在缓存中，后续再次加载可以直接复用。若之后要清除该记录，需要再次传入 `isDel: true`，或在合适的清理阶段调用全量清理接口。

删除标记是单向的：一旦传入 `isDel: true`，后续普通卸载不会撤销该标记。

### 6.3 异步加载中的释放

如果资源尚未加载完成：

- `UnloadAsset` 不会中断底层请求；
- 引用和删除标记会先记录下来；
- 请求完成后，若引用已经归零且标记为可删除，ResManager 会自动释放结果。

因此可以在面板销毁或流程取消时安全地释放正在加载的资源。

---

## 7. 清理未使用资源

### 7.1 `UnloadUnusedAssets`

```csharp
await ResManager.Instance.UnloadUnusedAssets();
```

该接口只处理同时满足以下条件的记录：

- `refCount == 0`；
- `isDel == true`。

处理完成后还会调用 Unity 的 `Resources.UnloadUnusedAssets`。只调用默认的 `UnloadAsset`、但没有标记 `isDel` 的缓存记录，不会被这个接口移除。

### 7.2 `ClearDicAsync`

需要彻底清空资源缓存时：

```csharp
await ResManager.Instance.ClearDicAsync();
```

它会：

1. 捕获当前缓存记录；
2. 释放已完成的记录；
3. 等待进行中的加载任务结束，不强行中断 Provider 请求；
4. 清理各 Provider 的内部状态；
5. 清空 ResManager 缓存；
6. 调用 `Resources.UnloadUnusedAssets`。

适用场景包括场景切换、切换资源后端前的清理，以及大型资源重载前的内存整理。

### 7.3 `ClearDic`

同步入口如下：

```csharp
ResManager.Instance.ClearDic(() =>
{
    LogUtil.Info("资源缓存清理完成");
});
```

没有进行中请求时会直接完成；如果存在进行中的请求，清理会在请求结束后继续执行，并通过回调通知最终完成。

---

## 8. Provider 使用建议

| 场景 | 建议 |
| --- | --- |
| 小型 UI Prefab、图标 | `res://` 同步加载或异步加载 |
| 大图片、模型、音频 | 异步加载，必要时使用 `ResOperation` 显示进度 |
| 本地文本、图片和音频 | `file://`，注意 FileProvider 只支持 PC |
| 网络图片、音频和 AssetBundle | `http://` 或 `https://` 异步加载 |
| 编辑器工具读取 Assets | `editor://`，不能用于 Player |
| AssetBundle 资源 | `ab://bundle/asset`，先完成资源后端配置 |
| Addressables 资源 | `addr://key` 或 `addressables://key`，先完成 Addressables 配置 |

使用 `editor://`、`ab://` 或 Addressables 路径前，应先确认对应 Provider 已注册。未注册的后端不会自动回退到 Resources。

---

## 9. 常见问题

### 同步加载返回 `null`

先确认路径和资源类型正确，再检查资源是否正在异步加载。资源正在加载时，`Load` 不会等待，应改用 `LoadAsync`。网络资源必须使用异步接口。

### 句柄进度没有真实变化

Resources、File 和 Editor Provider 当前没有真实进度，句柄会使用模拟进度。网络、AssetBundle 和 Addressables 才能提供 Provider 层的真实进度。

### 资源没有被释放

依次检查：

1. 加载和卸载的路径是否完全一致；
2. 卸载时的泛型类型是否一致；
3. `GetRefCount<T>` 是否已经归零；
4. 是否传入了 `isDel: true`；
5. 是否仍有其他业务模块持有同一资源引用。

### 批量加载完成但仍有空结果

批量操作的完成只代表所有路径都已处理，不代表全部成功。失败项会以 `null` 保留在 `Results` 中，使用前应逐项检查。

---

## 10. 小结

ResLoad 的基础使用可以概括为：

- 用协议前缀选择资源来源；
- 用 `Load` 处理确定快速完成的本地资源；
- 用 `LoadAsync`、回调或 `ResOperation` 处理异步场景；
- 用 `BatchOperation` 顺序预加载并跟踪整体进度；
- 每次成功加载都要配对释放引用；
- 需要真正移除缓存时传入 `isDel: true`；
- 场景切换或大型重载时使用 `ClearDicAsync` 做完整清理。

下一步可以阅读[资源插件系统](/resload/provider/)，了解内置 Provider 的差异和自定义 Provider 的接入方式。
