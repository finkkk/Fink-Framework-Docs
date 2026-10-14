# 场景切换系统（Scene）

`ScenesManager` 是 Fink Framework 对 Unity 场景切换 API 的轻量封装，统一提供按名称或 Build Settings 索引加载场景的入口，并在普通单场景切换前执行框架级清理；同时提供以场景实例句柄管理的叠加加载与卸载。

当前模块刻意保持职责简单：

- 提供同步场景切换；
- 提供异步场景切换，并直接返回 Unity 的 `AsyncOperation`；
- 提供叠加加载、活动场景设置和按句柄卸载；
- 提供普通场景切换前事件；
- 在切换前清理音频、对象池、场景级 UI、事件和资源缓存。

它不负责自定义进度条、加载状态机、并发请求锁、参数传递或 Loading UI。需要这些能力时，应由上层流程代码基于返回的 `AsyncOperation` 自行组织。

## 1. 管理器与前置条件

`ScenesManager` 是不继承 `MonoBehaviour` 的普通 C# 单例：

```csharp
public class ScenesManager : Singleton<ScenesManager>
```

首次访问 `ScenesManager.Instance` 时自动创建单例，不需要在场景中挂载组件。场景名和场景索引都遵循 Unity `SceneManager` 的规则，因此目标场景必须加入 **Build Settings**：

```text
File → Build Settings → Scenes In Build
```

## 2. 同步切换场景

### 2.1 按场景名加载

```csharp
ScenesManager.Instance.LoadScene("GameScene");
```

### 2.2 按 Build Settings 索引加载

```csharp
ScenesManager.Instance.LoadScene(1);
```

同步方法没有自定义回调参数，也不返回操作句柄。调用时会先触发场景切换前事件并执行框架清理，然后调用 Unity 的：

```csharp
UnityEngine.SceneManagement.SceneManager.LoadScene(...);
```

同步切换适合启动场景、菜单场景、轻量场景和编辑器工具。需要 Loading UI 或避免主线程停顿时，应使用异步接口。

## 3. 异步切换场景

### 3.1 按场景名加载

```csharp
AsyncOperation operation = ScenesManager.Instance.LoadSceneAsync(
    "GameScene");
```

### 3.2 按 Build Settings 索引加载

```csharp
AsyncOperation operation = ScenesManager.Instance.LoadSceneAsync(1);
```

该方法直接返回 Unity 官方的 `AsyncOperation`，`ScenesManager` 不会对它进行二次封装，也不会替调用方判断完成状态。

可以使用 `isDone` 轮询：

```csharp
if (operation.isDone)
{
    Debug.Log("场景加载完成");
}
```

也可以使用 Unity 提供的 `completed` 事件：

```csharp
AsyncOperation operation = ScenesManager.Instance.LoadSceneAsync(
    "GameScene");

operation.completed += _ =>
{
    Debug.Log("场景加载完成");
};
```

需要自定义加载界面时，可以读取 `operation.progress`：

```csharp
AsyncOperation operation = ScenesManager.Instance.LoadSceneAsync(
    "GameScene");

while (!operation.isDone)
{
    float progress = Mathf.Clamp01(operation.progress / 0.9f);
    loadingView.SetProgress(progress);
    await UniTask.Yield();
}
```

这里的进度换算和 UI 展示属于业务代码，`ScenesManager` 不会替你处理。若需要手动控制激活时机，也可以在返回的 `AsyncOperation` 上设置 `allowSceneActivation`。

## 4. 场景切换前事件

当前版本只提供 `OnBeforeSceneLoad`：

```csharp
ScenesManager.Instance.OnBeforeSceneLoad += BeforeSceneLoad;

void BeforeSceneLoad()
{
    Debug.Log("即将切换场景，当前仍处于旧场景");
}
```

它会在 `LoadScene` 或 `LoadSceneAsync` 调用 Unity 场景 API 之前触发，执行顺序是：

```text
调用 ScenesManager.LoadScene(...)
        ↓
触发 OnBeforeSceneLoad
        ↓
执行框架场景清理
        ↓
调用 Unity SceneManager.LoadScene(...)
```

当前代码没有实现 `OnAfterSceneLoad`。异步场景加载完成后的逻辑应通过返回的 `AsyncOperation.completed` 注册；同步场景切换后的逻辑则由目标场景自己的初始化流程处理。

事件订阅会被单例持有。临时系统或场景级逻辑在不再需要时应主动解绑：

```csharp
ScenesManager.Instance.OnBeforeSceneLoad -= BeforeSceneLoad;
```

`OnBeforeSceneLoad` 当前没有额外异常隔离。如果订阅回调抛出异常，可能会中断后续清理和场景加载，因此回调中应只放简短、可靠的准备逻辑。

## 5. 场景切换前清理

普通单场景切换入口 `LoadScene` / `LoadSceneAsync` 都会执行以下清理流程，不需要业务代码重复调用。叠加加载和卸载不执行这套全局清理：

```text
AudioManager.TryGetInstance()?.ClearSound()
        ↓
PoolManager.TryGetInstance()?.CleanPool()
        ↓
UIManager.TryGetInstance()?.CloseScenePanels(activeScene)
        ↓
EventManager.TryGetInstance()?.ClearAllEvent()
        ↓
ResManager.TryGetInstance()?.ClearDic()
        ↓
非 Unity Editor 构建中执行 GC.Collect()
```

### 5.1 音效清理

如果音频管理器已经创建，框架会停止并回收当前音效，释放音效资源引用。全局背景音乐播放器不属于 `ClearSound` 的音效列表，不会因为该步骤被清理。

### 5.2 对象池清理

如果对象池管理器已经创建，框架会销毁池中缓存和正在使用的 GameObject，释放池持有的预制体引用，并清空泛型对象池。切换场景前不要再继续使用这些池化对象。

### 5.3 场景级 UI 清理

框架调用的是 `UIManager.CloseScenePanels(SceneManager.GetActiveScene())`，只关闭并销毁归属于当前旧场景的场景级面板：

- 场景级面板会被关闭和销毁；
- 持久级面板不会被这一步清理；
- 其他场景的面板不受影响。

### 5.4 事件与资源清理

场景切换前会清空 `EventManager` 中的事件记录，并调用 `ResManager.ClearDic()` 清理资源缓存。跨场景对象如果仍需要使用资源，应由业务自行设计持久化和重新加载策略。

在非 Unity Editor 构建中，框架还会手动调用一次 `System.GC.Collect()`；编辑器环境不会执行这一步，避免影响编辑器调试体验。

## 6. 一个完整的异步切换示例

```csharp
using Cysharp.Threading.Tasks;
using UnityEngine;
using FinkFramework.Runtime.Scene;

public class SceneFlow
{
    public async UniTask LoadGameSceneAsync()
    {
        AsyncOperation operation = ScenesManager.Instance.LoadSceneAsync(
            "GameScene");

        while (!operation.isDone)
        {
            float progress = Mathf.Clamp01(operation.progress / 0.9f);
            Debug.Log($"Loading: {progress:P0}");
            await UniTask.Yield();
        }

        Debug.Log("GameScene loaded");
    }
}
```

如果 Loading UI 需要跨场景保留，应由业务将它放在持久化对象或持久级 UI Surface 中，并自行处理场景加载前后的显示状态。

## 7. 叠加场景加载与卸载

v1.1.2 新增以下 API，位于 `FinkFramework.Runtime.Scene` 命名空间。与普通切换返回 `AsyncOperation` 不同，叠加接口返回 `System.Threading.Tasks.Task`：

```csharp
public Task<SceneHandle> LoadAdditiveAsync(
    string sceneName,
    CancellationToken cancellationToken = default);

public bool SetActiveScene(SceneHandle handle);

public Task UnloadAsync(
    SceneHandle handle,
    SceneCleanupOptions options,
    CancellationToken cancellationToken = default);
```

### 加载与活动场景

`LoadAdditiveAsync` 以 Additive 模式加载，不卸载已有场景，不触发 `OnBeforeSceneLoad`，也不执行全局音频、对象池、事件或资源缓存清理。加载成功后，框架会将新场景设为活动场景，再返回代表本次加载实例的句柄。

需要切换到另一个已加载的场景时，可以调用 `SetActiveScene(handle)`。活动场景与场景是否加载是不同概念；调用方应自行管理多个场景之间的业务流程。

### SceneHandle

| 属性 | 类型 | 含义 |
| --- | --- | --- |
| `Scene` | `UnityEngine.SceneManagement.Scene` | 本次加载得到的 Unity 场景实例 |
| `Name` | `string` | 场景名 |
| `InstanceId` / `Handle` | `int` | 同一个 Unity 场景实例句柄值 |
| `IsLoaded` | `bool` | 场景是否仍有效且已加载 |

卸载时保存并传入对应 `SceneHandle`，不要仅靠场景名识别实例。空句柄会抛出 `ArgumentNullException`；设置活动场景或卸载已失效句柄会抛出 `InvalidOperationException`。

### 局部清理与 SceneCleanupOptions

`UnloadAsync` 先关闭该场景的场景级 UI，再卸载句柄对应的 Unity 场景，最后按选项执行内存整理。它不会清空全局事件、对象池、音频或资源缓存。业务持有的事件订阅、实体、计时器和资源引用应在调用前自行释放。

| 选项 | 卸载后的行为 |
| --- | --- |
| `None` / `Default` | 只做场景级 UI 清理和场景卸载 |
| `ReleaseUnusedAssets` | 额外请求释放未使用资源 |
| `ReleaseUnusedAssetsAndCollectGarbage` | 额外释放未使用资源，并在非 Editor 环境执行 GC |

也可以用 `new SceneCleanupOptions(unloadUnusedAssets: true, collectGarbage: false)` 组合选项。`UnloadAsync` 的 `options` 参数必须显式传入。

卸载时应保留至少一个其他已加载场景，例如常驻启动场景；不能依赖此接口卸载 Unity 中最后一个已加载场景。若后续逻辑依赖某个活动场景，可在卸载前对另一个有效句柄调用 `SetActiveScene`。

### 完整示例

```csharp
using System.Threading;
using System.Threading.Tasks;
using FinkFramework.Runtime.Scene;

public sealed class AdditiveSceneFlow
{
    private SceneHandle loadedScene;

    public async Task LoadAsync(CancellationToken cancellationToken)
    {
        loadedScene = await ScenesManager.Instance.LoadAdditiveAsync(
            "GameScene", cancellationToken);
        // GameScene 现在已经是活动场景。
    }

    public async Task UnloadAsync(CancellationToken cancellationToken)
    {
        if (loadedScene == null || !loadedScene.IsLoaded)
            return;

        // 在这里先释放业务自己持有的事件、计时器和资源引用。
        await ScenesManager.Instance.UnloadAsync(
            loadedScene, SceneCleanupOptions.Default, cancellationToken);
        loadedScene = null;
    }
}
```

### 取消与异常

空白场景名会抛出 `ArgumentException`；无法启动操作、无法定位加载实例或无法设置活动场景时会抛出 `InvalidOperationException`。调用方还应处理 Unity 场景 API 抛出的加载错误。

取消通过 `OperationCanceledException` 报告。Unity 已启动的底层加载不能真正中止：在等待加载时取消，框架会安排加载结束后卸载本次产生的场景；这项补偿卸载可能晚于取消异常返回。已经开始的底层卸载也不会被取消令牌撤销，取消后不要假定场景仍存在，应检查句柄状态。框架不提供并发请求锁，业务流程应避免对同一场景同时发起相互冲突的加载与卸载。

## 8. 使用建议

- 场景名和索引必须对应 Build Settings 中的场景；
- 轻量场景可以使用同步接口，复杂场景和带 Loading UI 的流程建议使用异步接口；
- 使用 `AsyncOperation.completed` 处理异步加载完成，不要等待不存在的 `OnAfterSceneLoad`；
- 不要在 `OnBeforeSceneLoad` 中执行长时间阻塞操作；
- 订阅临时场景逻辑后，在对象销毁或流程结束时解绑；
- 不要在切换前手动重复调用 `CleanPool`、`ClearSound` 或 `ClearDic`；
- 需要跨场景保留的对象应明确放入持久化根节点，并管理其资源、事件和 UI 生命周期；
- 场景切换会清理旧场景资源和状态，切换后需要重新获取旧场景对象引用。
