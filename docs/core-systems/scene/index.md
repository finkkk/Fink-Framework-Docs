# 场景切换系统（Scene）

`ScenesManager` 是 Fink Framework 对 Unity 场景切换 API 的轻量封装，统一提供按名称或 Build Settings 索引加载场景的入口，并在真正切换前执行框架级清理。

当前模块刻意保持职责简单：

- 提供同步场景切换；
- 提供异步场景切换，并直接返回 Unity 的 `AsyncOperation`；
- 提供场景切换前事件；
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

每个同步或异步切换入口都会执行相同的清理流程，不需要业务代码重复调用：

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

## 7. 使用建议

- 场景名和索引必须对应 Build Settings 中的场景；
- 轻量场景可以使用同步接口，复杂场景和带 Loading UI 的流程建议使用异步接口；
- 使用 `AsyncOperation.completed` 处理异步加载完成，不要等待不存在的 `OnAfterSceneLoad`；
- 不要在 `OnBeforeSceneLoad` 中执行长时间阻塞操作；
- 订阅临时场景逻辑后，在对象销毁或流程结束时解绑；
- 不要在切换前手动重复调用 `CleanPool`、`ClearSound` 或 `ClearDic`；
- 需要跨场景保留的对象应明确放入持久化根节点，并管理其资源、事件和 UI 生命周期；
- 场景切换会清理旧场景资源和状态，切换后需要重新获取旧场景对象引用。
