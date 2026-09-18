# 事件系统（Event）

Fink Framework 的事件系统使用 `Enum` 作为事件标识，通过委托实现模块间的全局消息分发。它支持无参数、单参数和双参数事件，并可以选择是否保留最近一次触发结果。

事件系统适合用于：

- UI 与业务逻辑之间的通知；
- 输入动作广播；
- 场景流程或数据状态变化通知；
- 配置初始化、玩家数据准备完成等一次性状态同步；
- 不希望互相直接引用的模块之间的解耦通信。

事件管理器是普通 C# 单例，不依赖场景中的 GameObject。事件监听器和粘性事件状态由 `EventManager` 统一持有，使用完成后应主动移除或清理。

## 1. 声明事件类型

事件标识必须来自枚举。建议按功能模块分组，并为同一个事件标识固定一种参数签名：

```csharp
public enum GameEvent
{
    // 无参数
    UIOpened,
    PlayerDied,

    // 单参数
    SceneLoadProgress,

    // 双参数
    LoadingStep
}
```

同一个枚举值不要同时按无参数、单参数或双参数使用，也不要为同一个事件混用不同的泛型类型。例如，`SceneLoadProgress` 如果按 `float` 触发，就不要再按 `int` 注册监听。

在 Unity Editor 中注册冲突签名时，`EventManager` 会输出错误日志；事件内部实际按“事件枚举值 + 参数类型”区分记录，因此业务代码仍应保持每个事件标识的签名唯一。

## 2. 事件签名

系统提供三种事件容器：

| 类型 | 监听器 | 触发方式 |
| --- | --- | --- |
| 无参数 | `UnityAction` | `EventTrigger(eventName)` |
| 单参数 | `UnityAction<T>` | `EventTrigger<T>(eventName, value)` |
| 双参数 | `UnityAction<T1, T2>` | `EventTrigger<T1, T2>(eventName, a, b)` |

事件没有返回值。触发一个没有监听器的事件时，管理器会直接忽略，不会创建额外的事件回调。

## 3. 注册监听

### 3.1 无参数事件

```csharp
EventManager.Instance.AddEventListener(
    GameEvent.PlayerDied,
    OnPlayerDied);

private void OnPlayerDied()
{
    Debug.Log("Player died");
}
```

### 3.2 单参数事件

```csharp
EventManager.Instance.AddEventListener<float>(
    GameEvent.SceneLoadProgress,
    OnSceneLoadProgress);

private void OnSceneLoadProgress(float progress)
{
    Debug.Log($"Loading: {progress:P0}");
}
```

### 3.3 双参数事件

```csharp
EventManager.Instance.AddEventListener<float, float>(
    GameEvent.LoadingStep,
    OnLoadingStep);

private void OnLoadingStep(float current, float total)
{
    Debug.Log($"{current}/{total}");
}
```

### 3.4 粘性事件监听

将 `sticky` 设置为 `true` 后，该事件会保留最近一次触发结果：

```csharp
EventManager.Instance.AddEventListener<float>(
    GameEvent.SceneLoadProgress,
    OnSceneLoadProgress,
    sticky: true);
```

如果该事件已经触发过，新监听器注册成功后会立即收到最近一次的值。无参数事件会立即收到一次通知；单参数和双参数事件会收到最近一次参数。

重复注册同一个事件和同一个委托时，管理器会忽略重复注册并输出警告。

## 4. 触发事件

### 4.1 触发无参数事件

```csharp
EventManager.Instance.EventTrigger(GameEvent.PlayerDied);
```

### 4.2 触发单参数事件

```csharp
EventManager.Instance.EventTrigger<float>(
    GameEvent.SceneLoadProgress,
    0.5f);
```

### 4.3 触发双参数事件

```csharp
EventManager.Instance.EventTrigger<float, float>(
    GameEvent.LoadingStep,
    20f,
    100f);
```

触发时的泛型参数必须与注册监听时的签名一致，否则无法命中对应事件容器。

## 5. 移除监听

不再需要监听时，应使用与注册时完全一致的事件类型、泛型参数和委托引用移除：

```csharp
EventManager.Instance.RemoveEventListener(
    GameEvent.PlayerDied,
    OnPlayerDied);

EventManager.Instance.RemoveEventListener<float>(
    GameEvent.SceneLoadProgress,
    OnSceneLoadProgress);

EventManager.Instance.RemoveEventListener<float, float>(
    GameEvent.LoadingStep,
    OnLoadingStep);
```

如果在 `OnEnable` 或 `Start` 中手动注册，应在对应的生命周期结束时解绑，例如：

```csharp
private void OnEnable()
{
    EventManager.Instance.AddEventListener(
        GameEvent.PlayerDied,
        OnPlayerDied);
}

private void OnDisable()
{
    EventManager.Instance.RemoveEventListener(
        GameEvent.PlayerDied,
        OnPlayerDied);
}
```

不要使用内容相同但不是同一个委托引用的匿名 lambda 进行移除：

```csharp
// 不推荐：两个 lambda 不是同一个可安全移除的委托引用。
EventManager.Instance.AddEventListener(
    GameEvent.PlayerDied,
    () => Debug.Log("Died"));

EventManager.Instance.RemoveEventListener(
    GameEvent.PlayerDied,
    () => Debug.Log("Died"));
```

如果必须使用匿名回调，请先保存委托引用。

## 6. 清理事件

### 6.1 清理指定事件

```csharp
EventManager.Instance.ClearEvent(GameEvent.SceneLoadProgress);
```

`ClearEvent` 会清理该枚举值对应的**所有参数签名**，包括无参数、单参数和双参数记录，同时丢弃该事件的粘性值。

### 6.2 清理全部事件

```csharp
EventManager.Instance.ClearAllEvent();
```

场景切换系统在切换前会自动调用 `ClearAllEvent`。如果使用框架的 `ScenesManager` 切换场景，通常不需要额外重复清理；如果直接调用 Unity 的 `SceneManager`，则需要由业务自行安排事件生命周期。

## 7. 粘性事件（Sticky Event）

粘性事件在触发时保存最近一次结果，后加入的监听器可以在注册时立即获得当前状态。

### 7.1 适用场景

- 场景加载进度；
- 配置初始化完成状态；
- 玩家数据准备完成；
- 当前登录状态或连接状态。

### 7.2 不适用场景

- 高频输入事件；
- 每帧 Tick；
- 短时间大量触发的战斗事件；
- 不代表“当前状态”的瞬时通知。

粘性是事件记录级别的状态，不是某个监听器独有的选项。只要该事件记录被标记为粘性，后续注册的监听器就可能收到最近一次结果。调用 `ClearEvent` 或 `ClearAllEvent` 后，最近一次结果会一并丢失。

## 8. EventAutoBinder

对于继承 `MonoBehaviour` 的对象，可以使用 `EventAutoBinder` 自动管理事件注册和解绑。它会在对象上挂载一个内部生命周期代理组件，避免重复书写解绑代码。

工具提供两种模式：

| 方法 | 注册时机 | 解绑时机 | 适用场景 |
| --- | --- | --- | --- |
| `Bind` | 调用时立即注册 | `OnDestroy` | 常驻对象、逻辑组件 |
| `BindAuto` | `OnEnable` 注册 | `OnDisable` 解绑 | UI、临时对象、可反复启停的组件 |

### 8.1 `Bind`：立即注册，销毁时解绑

```csharp
using UnityEngine;
using FinkFramework.Runtime.Event;

public class PlayerView : MonoBehaviour
{
    private void Start()
    {
        EventAutoBinder.Bind(
            this,
            GameEvent.PlayerDied,
            OnPlayerDied);
    }

    private void OnPlayerDied()
    {
        Debug.Log("Player died");
    }
}
```

`Bind` 调用后立即生效，并在 `owner` 被销毁时自动移除监听。它不会因为 `owner.enabled` 或 GameObject 的激活状态变化而自动解绑。

### 8.2 `BindAuto`：启用时注册，禁用时解绑

`BindAuto` 应在 `Awake` 或 `Start` 中调用，用于声明对象的自动生命周期绑定：

```csharp
using UnityEngine;
using FinkFramework.Runtime.Event;

public class LoadingView : MonoBehaviour
{
    private void Awake()
    {
        EventAutoBinder.BindAuto<float>(
            this,
            GameEvent.SceneLoadProgress,
            OnProgress,
            sticky: true);
    }

    private void OnProgress(float progress)
    {
        Debug.Log($"Loading: {progress:P0}");
    }
}
```

当对象被禁用时，代理组件会自动移除监听；对象重新启用时，会重新注册监听。若对象在调用 `BindAuto` 时已经处于启用状态，工具会立即注册一次，避免错过当前启用周期。

### 8.3 不要在 `OnEnable` 中调用 `BindAuto`

当前实现明确禁止在 `OnEnable` 中调用 `BindAuto`。原因是 `BindAuto` 本身就是用于声明 `OnEnable` / `OnDisable` 托管关系的工具，在 `OnEnable` 内调用会造成时序混乱或重复绑定风险。

```csharp
// 错误用法：不要这样写
private void OnEnable()
{
    EventAutoBinder.BindAuto<float>(
        this,
        GameEvent.SceneLoadProgress,
        OnProgress);
}
```

如果确实需要在 `OnEnable` 内立即手动监听，应直接调用 `EventManager.AddEventListener`，并在 `OnDisable` 中配对移除。

### 8.4 参数事件的自动绑定

`Bind` 和 `BindAuto` 都支持 0、1、2 个参数：

```csharp
EventAutoBinder.Bind(
    this,
    GameEvent.PlayerDied,
    OnPlayerDied);

EventAutoBinder.BindAuto<float>(
    this,
    GameEvent.SceneLoadProgress,
    OnProgress);

EventAutoBinder.BindAuto<float, float>(
    this,
    GameEvent.LoadingStep,
    OnLoadingStep);
```

## 9. 触发异常与性能注意事项

`EventManager` 当前不会替每个监听器捕获异常。某个监听器抛出异常时，当前事件的触发流程可能被中断，因此事件回调应自行处理可能失败的业务逻辑，不要把长时间阻塞或高风险操作直接堆在事件回调中。

事件系统按事件枚举值和参数类型查找委托容器，不依赖字符串查找或反射分发。但事件触发会取得当前委托的调用快照，因此它适合模块通知，不建议用来替代每帧更新、超高频消息或大批量数据流。

## 10. 使用建议

- 为每个事件枚举值固定唯一的参数签名；
- 普通场景或临时对象使用 `EventAutoBinder.BindAuto`，并在 `Awake` 或 `Start` 中声明；
- 常驻对象或只需要销毁时解绑的对象使用 `EventAutoBinder.Bind`；
- 手动注册必须配对移除，尤其是场景级对象；
- 粘性事件只用于表达“当前状态”，不要用于每帧或高频事件；
- 需要清空整个事件中心时使用 `ClearAllEvent`，清理指定事件时使用 `ClearEvent`；
- 使用框架场景切换系统时，事件会在切换前统一清理；
- 事件回调中自行处理异常，避免一个监听器阻断其他业务流程。
