# 生命周期系统（Mono）

Unity 的 `Update`、`FixedUpdate`、`LateUpdate`、协程和 Gizmos 回调通常需要依附在 `MonoBehaviour` 组件上。`MonoManager` 是 Fink Framework 提供的全局生命周期桥接器，让普通 C# 类也可以注册这些 Unity 回调，而不必为每个系统额外创建一个组件。

它主要提供：

- 统一的 `Update`、`FixedUpdate` 和 `LateUpdate` 注册入口；
- `OnDrawGizmos` 与 `OnDrawGizmosSelected` 调试绘制入口；
- 继承自 `MonoBehaviour` 的协程启动与停止能力；
- 自动创建、全局唯一、跨场景常驻的运行时实例；
- 单独执行每个监听器，避免单个回调异常中断其他系统。

## 1. MonoManager 的生命周期

`MonoManager` 继承自：

```csharp
public class MonoManager : SingletonAutoMono<MonoManager>
```

首次在 Unity 运行时访问 `MonoManager.Instance` 时，框架会自动创建一个名为 `[Singleton] MonoManager` 的 GameObject，并挂载 `MonoManager` 组件。该对象会通过 `DontDestroyOnLoad` 跨场景保留。

因此，业务代码不需要提前在场景中放置 `MonoManager`。如果项目中手动创建了第二个实例，框架会输出错误并销毁重复对象。

```csharp
MonoManager monoManager = MonoManager.Instance;
```

注意：自动创建只能发生在 Unity 播放期间的主线程中。编辑器非运行状态或应用退出阶段不应依赖 `Instance` 自动创建；只想检查已有实例时可以使用：

```csharp
MonoManager existing = MonoManager.TryGetInstance();
bool exists = MonoManager.HasInstance;
```

## 2. 帧更新监听

所有帧更新监听都使用无参数的 `UnityAction`。传入 `null` 的添加或移除请求会被忽略。

### 2.1 Update

`Update` 适合普通逐帧逻辑，例如输入轮询、状态刷新和轻量的运行时检查：

```csharp
MonoManager.Instance.AddUpdateListener(OnUpdate);
MonoManager.Instance.RemoveUpdateListener(OnUpdate);

private void OnUpdate()
{
    // 每帧执行一次
}
```

### 2.2 FixedUpdate

`FixedUpdate` 按 Unity 的物理时间步执行，适合物理相关的同步逻辑：

```csharp
MonoManager.Instance.AddFixedUpdateListener(OnFixedUpdate);
MonoManager.Instance.RemoveFixedUpdateListener(OnFixedUpdate);

private void OnFixedUpdate()
{
    // 在物理帧中执行
}
```

### 2.3 LateUpdate

`LateUpdate` 在普通 `Update` 之后执行，适合摄像机跟随、动画结果读取和需要等待其他系统更新完成的逻辑：

```csharp
MonoManager.Instance.AddLateUpdateListener(OnLateUpdate);
MonoManager.Instance.RemoveLateUpdateListener(OnLateUpdate);

private void OnLateUpdate()
{
    // 在普通帧更新之后执行
}
```

## 3. 注册与解绑

监听器会被 `MonoManager` 持有。对于场景对象、临时系统或具有明确使用周期的普通类，必须在不再需要时移除监听，否则对象可能因为委托引用无法及时释放，回调也会继续执行。

推荐把注册和解绑写成成对的方法：

```csharp
using UnityEngine;
using FinkFramework.Runtime.Mono;

public sealed class EnemyTracker
{
    public void Enable()
    {
        MonoManager.Instance.AddUpdateListener(OnUpdate);
    }

    public void Disable()
    {
        MonoManager.Instance.RemoveUpdateListener(OnUpdate);
    }

    private void OnUpdate()
    {
        // 普通 C# 类也可以执行逐帧逻辑
    }
}
```

不要在匿名 lambda 注册后再尝试用另一个相同内容的 lambda 移除：

```csharp
// 不推荐：后面的 lambda 不是同一个委托实例，无法按预期解绑。
MonoManager.Instance.AddUpdateListener(() => Debug.Log("Tick"));
MonoManager.Instance.RemoveUpdateListener(() => Debug.Log("Tick"));
```

如果需要移除匿名回调，请先保存委托引用：

```csharp
UnityAction callback = () => Debug.Log("Tick");

MonoManager.Instance.AddUpdateListener(callback);
MonoManager.Instance.RemoveUpdateListener(callback);
```

## 4. Gizmos 调试绘制

`MonoManager` 会把注册的绘制回调转发到 Unity 的 `OnDrawGizmos` 和 `OnDrawGizmosSelected`。回调应使用 `Gizmos` API 绘制辅助线、范围和调试形状。

### 4.1 持续绘制：OnDrawGizmos

```csharp
using UnityEngine;
using UnityEngine.Events;
using FinkFramework.Runtime.Mono;

public sealed class RangeDebugDrawer
{
    private readonly UnityAction drawCallback;

    public RangeDebugDrawer()
    {
        drawCallback = Draw;
        MonoManager.Instance.AddGizmosListener(drawCallback);
    }

    private void Draw()
    {
        Gizmos.color = Color.yellow;
        Gizmos.DrawWireSphere(Vector3.zero, 5f);
    }

    public void Dispose()
    {
        MonoManager.Instance.RemoveGizmosListener(drawCallback);
    }
}
```

### 4.2 仅选中时绘制：OnDrawGizmosSelected

```csharp
using UnityEngine.Events;

UnityAction drawSelectedCallback = ()
{
    Gizmos.color = Color.cyan;
    Gizmos.DrawLine(Vector3.zero, Vector3.forward * 3f);
};

MonoManager.Instance.AddGizmosSelectedListener(drawSelectedCallback);

// 调试对象销毁或绘制结束时解绑
MonoManager.Instance.RemoveGizmosSelectedListener(drawSelectedCallback);
```

Gizmos 绘制只用于 Unity 编辑器的 Scene 视图调试，不应把它当作运行时渲染方案。若项目使用框架提供的 Gizmos 绘制工具，还应同时遵循项目的调试模式和绘制开关配置。

## 5. 协程

`MonoManager` 本身是 `MonoBehaviour`，因此可以直接使用 Unity 的 `StartCoroutine`、`StopCoroutine` 等协程 API。普通 C# 类可以把协程托管给它：

```csharp
using System.Collections;
using UnityEngine;
using FinkFramework.Runtime.Mono;

public sealed class DelayedAction
{
    private Coroutine coroutine;

    public void Start()
    {
        coroutine = MonoManager.Instance.StartCoroutine(Run());
    }

    public void Stop()
    {
        if (coroutine == null)
            return;

        MonoManager monoManager = MonoManager.TryGetInstance();
        if (monoManager != null)
            monoManager.StopCoroutine(coroutine);

        coroutine = null;
    }

    private IEnumerator Run()
    {
        yield return new WaitForSeconds(1f);
        Debug.Log("延迟操作完成");
        coroutine = null;
    }
}
```

计时器系统就是通过 `MonoManager` 托管计时协程。需要注意，协程的实际生命周期属于 `MonoManager`，因此如果手动清理或销毁该实例，依附其上的协程也会停止。

## 6. Unity 内部回调转发

`MonoManager` 在自身的 Unity 生命周期函数中分发已注册的监听器：

```csharp
private void Update()
{
    InvokeListeners(updateEvent);
}

private void FixedUpdate()
{
    InvokeListeners(fixedUpdateEvent);
}

private void LateUpdate()
{
    InvokeListeners(lateUpdateEvent);
}

private void OnDrawGizmos()
{
    InvokeListeners(gizmosEvent);
}

private void OnDrawGizmosSelected()
{
    InvokeListeners(gizmosSelectedEvent);
}
```

每个监听器会被单独放在异常保护中执行。某个回调抛出异常时，框架会记录异常，但同一事件中的其他监听器仍会继续执行。

## 7. 使用建议

- 将注册和解绑成对放置，尤其是场景级逻辑和临时调试逻辑；
- 不要在匿名 lambda 注册后使用另一个 lambda 解绑；
- 物理逻辑使用 `FixedUpdate`，普通逐帧逻辑使用 `Update`，跟随和收尾逻辑使用 `LateUpdate`；
- 不要在 `Update` 中执行高成本操作，必要时改用计时器、事件或批处理；
- Gizmos 仅用于编辑器 Scene 视图调试，不要用于正式运行时显示；
- 协程句柄由业务代码自行保存，并在模块停止时调用 `StopCoroutine`；
- 普通类如果不再需要 Unity 回调，应先解绑再释放自身引用。
