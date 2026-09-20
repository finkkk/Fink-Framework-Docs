# 单例模式（Singleton）

Fink Framework 提供三种单例基类，分别对应三种不同的生命周期和创建方式：

| 基类 | 创建方式 | 是否继承 `MonoBehaviour` | 是否跨场景常驻 |
| --- | --- | --- | --- |
| `Singleton<T>` | 首次访问 `Instance` 时通过私有无参构造函数创建 | 否 | 不适用 |
| `SingletonMono<T>` | 由场景或其他 Unity 对象挂载 | 是 | 否，基类不自动调用 `DontDestroyOnLoad` |
| `SingletonAutoMono<T>` | 首次运行时访问 `Instance` 时自动创建 GameObject | 是 | 是 |

这三种类型不是同一个实现的不同写法，而是对“是否需要 Unity 生命周期”和“对象由谁创建”这两个问题的明确区分。

---

## 1. 共同访问接口

三种单例基类都提供以下访问方式：

### 1.1 `Instance`

获取单例实例：

```csharp
TimerManager timer = TimerManager.Instance;
```

不同基类的行为不同：

- `Singleton<T>`：实例不存在时创建；
- `SingletonMono<T>`：实例不存在时不会创建，只记录错误并返回 `null`；
- `SingletonAutoMono<T>`：运行时实例不存在时创建 GameObject 和组件。

### 1.2 `TryGetInstance()`

只获取已经存在的实例，不触发创建：

```csharp
MonoManager mono = MonoManager.TryGetInstance();
if (mono != null)
{
    mono.AddUpdateListener(OnUpdate);
}
```

这是场景清理、可选依赖和退出流程中更安全的访问方式。

### 1.3 `HasInstance`

判断当前是否已经存在可用实例，也不会触发创建：

```csharp
if (ResManager.HasInstance)
{
    ResManager.Instance.ClearDic();
}
```

对于 Mono 单例，应用退出阶段会额外考虑退出状态，避免把即将销毁的对象当作有效实例返回。

---

## 2. 纯 C# 单例：`Singleton<T>`

`Singleton<T>` 不继承 `MonoBehaviour`，不需要 GameObject，也不需要挂载到场景中。

### 2.1 基本结构

继承类需要满足以下条件：

- `T` 必须是引用类型；
- 必须显式提供**私有无参构造函数**；
- 通过 `Instance` 获取实例；
- 构造函数只会在第一次访问 `Instance` 时执行。

```csharp
public class ExampleManager : Singleton<ExampleManager>
{
    private ExampleManager()
    {
        // 初始化纯 C# 状态
    }
}
```

框架通过反射查找非公开无参构造函数。如果没有找到，会抛出异常并提示必须显式实现私有无参构造函数。

### 2.2 当前框架中的使用者

当前 Runtime 代码中，以下模块使用 `Singleton<T>`：

- `AudioManager`
- `DeviceDetectionManager`
- `EventManager`
- `NewInputManager`
- `LegacyInputManager`
- `PoolManager`
- `ResManager`
- `SaveManager`
- `ScenesManager`
- `TimerManager`
- `UIManager`

这里的“纯 C#”表示它们不继承 `MonoBehaviour`、不需要场景组件，并不表示这些管理器完全不能调用 Unity API。具体管理器仍应遵守 Unity API 的主线程限制。

### 2.3 线程与初始化注意事项

单例基类使用锁保护实例创建过程，但这不等于所有继承类都可以从任意线程访问：

- 继承类构造函数中的 Unity API 仍应在主线程调用；
- 资源加载、场景、GameObject、AudioSource 等 Unity 对象不能因为使用 `Singleton<T>` 就变成线程安全；
- 多线程代码如需访问管理器，应先确认对应管理器的方法本身支持跨线程。

---

## 3. 手动挂载单例：`SingletonMono<T>`

`SingletonMono<T>` 适用于必须由场景明确控制生命周期的 `MonoBehaviour` 系统。

```csharp
public class SceneGameManager : SingletonMono<SceneGameManager>
{
    protected override void Awake()
    {
        base.Awake();
        // 场景级初始化
    }
}
```

然后将 `SceneGameManager` 挂载到场景中的 GameObject 上。

### 3.1 实例查找规则

- 场景对象执行 `Awake` 后成为当前实例；
- 如果场景中存在多个实例，后续重复实例会输出错误并销毁自身；
- `Instance` 不会自动创建 GameObject；
- 场景中没有实例时，`Instance` 会输出错误并返回 `null`；
- `TryGetInstance()` 在没有实例时直接返回 `null`；
- 基类不会自动调用 `DontDestroyOnLoad`。

### 3.2 适用场景

选择 `SingletonMono<T>` 的主要原因是：

- 希望在 Hierarchy 中明确看到对象；
- 需要在 Inspector 中配置字段；
- 希望由场景决定它是否存在；
- 不希望访问属性时隐式创建场景对象；
- 生命周期只属于当前场景或由场景自行管理。

---

## 4. 自动创建单例：`SingletonAutoMono<T>`

`SingletonAutoMono<T>` 适用于框架级、运行时必须存在，并且需要 Unity 生命周期函数或协程的全局服务。

```csharp
public class ExampleMonoManager : SingletonAutoMono<ExampleMonoManager>
{
    private void Update()
    {
        // Unity 生命周期
    }
}
```

首次在运行时访问：

```csharp
ExampleMonoManager.Instance.DoSomething();
```

如果当前没有实例，框架会：

1. 创建名为 `[Singleton] ExampleMonoManager` 的 GameObject；
2. 将 `ExampleMonoManager` 添加到该对象；
3. 通过 `Awake` 设置单例实例；
4. 调用 `DontDestroyOnLoad` 使对象跨场景常驻。

### 4.1 运行条件

自动创建只能在 Unity 播放或运行期间进行，并且应在 Unity 主线程调用。

在编辑器非运行状态访问 `Instance` 时，框架会输出错误并返回 `null`，不会创建编辑器场景对象。

### 4.2 挂载规则

继承 `SingletonAutoMono<T>` 的类不需要手动挂载到场景。

如果场景中或其他流程中已经存在一个实例，基类会保留先完成初始化的实例；检测到重复实例时会输出错误并销毁重复对象。

当前框架中的 `MonoManager` 使用此类型：

```csharp
public class MonoManager : SingletonAutoMono<MonoManager>
```

它需要承载 `Update`、`FixedUpdate`、`LateUpdate`、协程和 Gizmos 等 Unity 生命周期，因此不适合使用纯 C# 单例。

---

## 5. 三种单例的选择

可以按以下顺序判断：

```text
是否需要 MonoBehaviour 生命周期函数、协程或 Unity 组件？
├─ 否 → Singleton<T>
└─ 是
   ├─ 是否希望首次访问时自动创建并跨场景常驻？
   │  ├─ 是 → SingletonAutoMono<T>
   │  └─ 否 → SingletonMono<T>
```

| 需求 | 推荐基类 |
| --- | --- |
| 纯状态、数据、集合或服务对象 | `Singleton<T>` |
| 必须使用 `Update`、协程或 Unity 组件，框架自动创建 | `SingletonAutoMono<T>` |
| 需要场景挂载、Inspector 配置或场景级生命周期 | `SingletonMono<T>` |

不要因为类名包含 `Manager` 就自动选择某一种单例。真正的判断标准是它是否需要 Unity 生命周期，以及实例是否应由场景或代码创建。

---

## 6. 生命周期与重复实例处理

### 6.1 运行时重置

三种基类都注册了统一的静态重置入口：

```csharp
[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
```

在进入新的运行时子系统时，框架会清理已经初始化的泛型单例静态字段。这样可以支持关闭 Domain Reload 的编辑器播放模式，避免上一次 Play 的实例引用残留到下一次 Play。

### 6.2 应用退出

两个 Mono 单例都会记录应用退出状态：

- 退出阶段访问 `Instance` 不会重新返回正在销毁的对象；
- `TryGetInstance()` 会返回 `null`；
- `HasInstance` 会返回 `false`；
- 对象销毁时，如果当前实例指向自身，会清空静态引用。

### 6.3 重复对象

`SingletonMono<T>` 和 `SingletonAutoMono<T>` 都会在 `Awake` 中检查重复实例：

- 输出错误日志；
- 销毁重复实例的 GameObject；
- 保留原有实例。

因此场景中不应手动放置多个相同的单例组件，也不应额外通过代码重复创建自动单例对象。

---

## 7. 使用建议

### 推荐

- 只为语义上全局唯一的服务使用单例；
- 对可选依赖使用 `TryGetInstance()`，避免意外创建；
- 在场景级逻辑中优先考虑 `SingletonMono<T>`；
- 在框架级生命周期桥接器中使用 `SingletonAutoMono<T>`；
- 让管理器暴露清晰、有限的公共接口；
- 在切场景、销毁或退出时主动解绑事件、释放句柄和清理资源。

### 避免

- 把普通数据对象、UI 面板和临时玩法对象都做成单例；
- 在 `SingletonMono<T>` 不存在时假设 `Instance` 一定非空；
- 在自动单例的构造或初始化流程中访问尚未准备好的其他系统；
- 通过单例互相持有大量业务状态，形成隐藏依赖；
- 用单例替代合理的参数传递、接口抽象或依赖注入。

---

## 8. 总结

Fink Framework 的单例基类分别解决不同问题：

- `Singleton<T>`：不需要 `MonoBehaviour` 的纯 C# 单例，首次访问时构造；
- `SingletonMono<T>`：由场景手动挂载，不会隐式创建；
- `SingletonAutoMono<T>`：运行时自动创建并跨场景常驻；
- `Instance`：按类型规则获取或创建实例；
- `TryGetInstance()` / `HasInstance`：只查询当前实例，不触发创建；
- 统一运行时重置：兼容关闭 Domain Reload 的播放模式。

单例只是实例访问和生命周期管理方式。是否使用它，仍应由对象的全局唯一语义、Unity 生命周期需求和创建责任共同决定。
