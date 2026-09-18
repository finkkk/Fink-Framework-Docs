# 定时系统（Timer）

Fink Framework 的定时系统提供以毫秒为单位的倒计时、间隔回调、一次性回调和暂停/恢复控制。`TimerManager` 负责统一调度计时器，`TimerItem` 保存单个计时器的数据，并通过对象池自动复用。

计时系统适合处理技能冷却、延迟执行、周期检查、UI 倒计时和网络心跳等中小型项目中的常规定时需求。

## 1. 核心组成

计时系统主要由以下两个类组成：

- **`TimerManager`**：创建、调度、暂停、恢复、重置和移除计时器；
- **`TimerItem`**：保存计时器 ID、剩余时间、间隔时间和回调委托。

`TimerManager` 是普通 C# 单例，不继承 `MonoBehaviour`。它在首次访问时启动调度协程，并把协程托管给[生命周期系统（Mono）](/core-systems/mono/)的 `MonoManager`，因此不需要手动在场景中挂载计时器组件。

## 2. 计时器类型

### 2.1 受时间缩放影响的计时器

传入 `isRealTimer: false` 时，计时器使用 `WaitForSeconds` 调度，会受到 `Time.timeScale` 影响：

| `Time.timeScale` | 计时表现 |
| --- | --- |
| `1` | 正常计时 |
| `0.5` | 游戏时间相关的计时速度约减半 |
| `0` | 暂停计时 |

适合技能冷却、角色动作、游戏逻辑和战斗倒计时等内容。

### 2.2 真实时间计时器

传入 `isRealTimer: true` 时，计时器使用 `WaitForSecondsRealtime`，不受 `Time.timeScale` 影响。

适合暂停游戏时仍要继续执行的 UI 倒计时、网络心跳和本地超时检测。

## 3. 创建计时器

`CreateTimer` 的完整签名如下：

```csharp
public int CreateTimer(
    bool isRealTimer,
    int allTime,
    UnityAction onOver,
    int intervalTime = 0,
    UnityAction onInterval = null,
    bool isRunning = true);
```

所有时间参数的单位都是毫秒：

- `allTime`：总计时长度；
- `intervalTime`：间隔回调的周期；
- `onOver`：总计时结束时调用；
- `onInterval`：每次间隔结束时调用；
- `isRunning`：创建后是否立即开始计时。

### 3.1 创建一次性倒计时

```csharp
int timerId = TimerManager.Instance.CreateTimer(
    isRealTimer: false,
    allTime: 3000,
    onOver: () => Debug.Log("3 秒倒计时结束"));
```

计时结束后，`onOver` 会执行一次，计时器随后自动从管理字典中移除并回收到对象池。

### 3.2 创建有限时长的间隔计时器

```csharp
int timerId = TimerManager.Instance.CreateTimer(
    isRealTimer: false,
    allTime: 5000,
    onOver: () => Debug.Log("计时全部结束"),
    intervalTime: 1000,
    onInterval: () => Debug.Log("每秒执行一次"));
```

这个计时器会在总时长内执行间隔回调，到期后执行 `onOver` 并自动回收。

只有在 `intervalTime > 0` 且 `onInterval` 不为空时，间隔回调才会启用；否则该计时器只执行总时间逻辑。

`CreateTimer` 只有在 `allTime > 0` 时才会进入总时间倒计时。传入 `allTime <= 0` 不会触发 `onOver`；需要立即执行请使用 `SetTimeout`，需要持续间隔执行请使用 `CreateInfiniteTimer`。

### 3.3 创建无限间隔计时器

使用 `CreateInfiniteTimer` 创建只执行间隔回调、不会自动结束的计时器：

```csharp
int timerId = TimerManager.Instance.CreateInfiniteTimer(
    isRealTimer: true,
    intervalTime: 500,
    onInterval: () => Debug.Log("每 500 毫秒执行一次"));
```

该方法内部使用负数总时间表示“不设置结束时间”，必须主动调用 `StopTimer` 或 `RemoveTimer` 控制它。

### 3.4 创建一次性延迟回调

`SetTimeout` 适合只关心“延迟后执行一次”的场景：

```csharp
int timerId = TimerManager.Instance.SetTimeout(
    delay: 2000,
    callback: () => Debug.Log("两秒后执行一次"));
```

也可以让它不受时间缩放影响：

```csharp
TimerManager.Instance.SetTimeout(
    delay: 2000,
    callback: OnTimeout,
    isRealTimer: true);
```

当 `delay <= 0` 时，回调会立即执行，方法返回 `-1`，不会创建计时器。

## 4. 控制单个计时器

### 4.1 暂停与恢复

`StopTimer` 只会把计时器标记为暂停，保留当前剩余时间；`StartTimer` 会从暂停的位置继续计时：

```csharp
TimerManager.Instance.StopTimer(timerId);
TimerManager.Instance.StartTimer(timerId);
```

这两个方法不会重置已经经过的时间，也不会删除计时器。

### 4.2 重置

```csharp
TimerManager.Instance.ResetTimer(timerId);
```

重置会将总时间和间隔时间恢复到创建时的初始值，并默认重新开始计时。需要重置后保持暂停时传入 `false`：

```csharp
TimerManager.Instance.ResetTimer(
    timerId,
    isRunning: false);
```

重置不会替换原有的结束回调和间隔回调。

### 4.3 删除

```csharp
TimerManager.Instance.RemoveTimer(timerId);
```

删除会立即从管理字典移除计时器，并将 `TimerItem` 回收到对象池，不会再执行结束回调。对于无限计时器，结束使用后必须主动删除。

对不存在的 ID 调用控制方法时，管理器不会创建新计时器，也不会抛出额外异常。

## 5. 控制全部计时器

### 5.1 暂停全部计时器

```csharp
TimerManager.Instance.PauseAll();
```

`PauseAll` 会把受时间缩放和真实时间两类计时器全部设为暂停，但不会停止底层调度协程。

### 5.2 恢复全部计时器

```csharp
TimerManager.Instance.ResumeAll();
```

`ResumeAll` 会恢复所有现存计时器，包括调用 `CreateTimer(..., isRunning: false)` 创建的计时器。

### 5.3 停止和启动调度器

`Stop` 与 `Start` 控制的是整个计时系统的调度协程，不是某一个计时器：

```csharp
TimerManager.Instance.Stop();
TimerManager.Instance.Start();
```

调用 `Stop` 后，计时器仍保留在管理字典中，已有的 `isRunning` 状态也不会被清除。重新调用 `Start` 后，系统会继续调度这些计时器。

通常业务代码只需要使用 `StopTimer`、`StartTimer`、`PauseAll` 和 `ResumeAll`。只有在需要整体停止或重新启动定时调度时才使用 `TimerManager.Stop()`。

## 6. TimerItem 数据结构

`TimerItem` 是实现 `IPoolable` 的普通 C# 类，主要字段如下：

| 字段 | 说明 |
| --- | --- |
| `keyID` | 当前计时器的唯一 ID |
| `onOver` | 总时间结束回调 |
| `onInterval` | 间隔回调 |
| `allTime` | 当前剩余总时间，单位为毫秒 |
| `maxAllTime` | 创建时记录的总时间，用于重置 |
| `intervalTime` | 当前剩余间隔时间，单位为毫秒 |
| `maxIntervalTime` | 创建时记录的间隔时间，用于重置 |
| `isRunning` | 当前是否处于运行状态 |

`TimerItem` 由 `PoolManager` 自动创建和回收，业务代码不需要手动 `new TimerItem()`，也不应该自行调用 `ResetInfo()`。回收到对象池时，框架会清除回调引用、时间数据和运行状态，避免旧回调被下一次复用继续持有。

## 7. 调度机制与精度

计时系统不会为每个计时器创建一条协程，而是维护两条共享调度协程：

```text
受 Time.timeScale 影响的计时器
└── WaitForSeconds(0.1 秒)

不受 Time.timeScale 影响的计时器
└── WaitForSecondsRealtime(0.1 秒)
```

每次调度时，系统会：

1. 遍历当前类型的计时器；
2. 跳过处于暂停状态的计时器；
3. 扣减间隔剩余时间并执行到期的间隔回调；
4. 扣减总剩余时间并执行到期的结束回调；
5. 将已经结束的 `TimerItem` 从字典移除并回收到对象池。

内部调度间隔为 100 毫秒，因此它适合游戏逻辑级的定时，不适合高精度计时、音频节拍或网络协议级超时。实际回调时间还会受到 Unity 帧调度和协程唤醒时机影响。

当一次调度中间隔时间跨过多个周期时，系统会通过循环补齐间隔，间隔回调可能在同一轮调度中执行多次。间隔回调本身应保持轻量，并避免依赖“每次回调之间一定经过精确的 intervalTime 毫秒”。

## 8. 回调异常与回收安全

`onInterval` 和 `onOver` 回调都会单独捕获异常并输出日志。某个计时器回调报错时，不会直接中断其他计时器的调度。

结束回调可以主动调用 `RemoveTimer`。管理器会检查当前字典中是否仍然持有同一个 `TimerItem`，避免同一个对象被重复回收到对象池。

## 9. 示例：技能冷却

```csharp
using UnityEngine;
using FinkFramework.Runtime.Timer;

public class SkillController
{
    private int cooldownId = -1;

    public void StartSkillCooldown()
    {
        if (cooldownId > 0)
            TimerManager.Instance.RemoveTimer(cooldownId);

        cooldownId = TimerManager.Instance.CreateTimer(
            isRealTimer: false,
            allTime: 3000,
            onOver: OnCooldownComplete,
            intervalTime: 1000,
            onInterval: OnCooldownInterval);
    }

    private void OnCooldownInterval()
    {
        Debug.Log("技能冷却进行中");
    }

    private void OnCooldownComplete()
    {
        cooldownId = -1;
        Debug.Log("技能可以再次使用");
    }
}
```

## 10. 使用建议

- 所有时间参数使用毫秒，不要把秒数直接传入 API；
- 需要受暂停影响的游戏逻辑使用 `isRealTimer: false`；
- 需要在暂停期间继续运行的逻辑使用 `isRealTimer: true`；
- 无限计时器必须保存 ID，并在不再需要时调用 `RemoveTimer`；
- `StopTimer` 是暂停，不是删除；需要释放计时器时使用 `RemoveTimer`；
- `ResetTimer` 会恢复创建时的总时间和间隔时间；
- 100 毫秒是内部调度粒度，不要用该系统实现高精度计时；
- 回调中不要长时间阻塞主线程，也不要假设回调间隔绝对精确；
- 计时器内部依赖 `MonoManager` 的协程，不需要额外挂载场景组件。
