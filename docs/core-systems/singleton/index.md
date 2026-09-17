# 单例模式（Singleton）

框架提供两种单例基类：

| 类型 | 用途 |
| --- | --- |
| `Singleton<T>` | 纯 C# 管理器，不依赖 `GameObject` |
| `SingletonMono<T>` | 需要 Unity 生命周期函数、协程或场景对象的管理器 |

使用 `Instance` 获取实例；只想查询而不希望隐式创建时使用 `TryGetInstance()`，并可通过 `HasInstance` 判断实例是否存在。

```csharp
TimerManager.Instance.Start();

MonoManager mono = MonoManager.TryGetInstance();
if (mono != null)
    mono.AddUpdateListener(OnUpdate);
```

`SingletonMono<T>` 会处理重复实例和应用退出状态。业务单例应把资源释放、事件解绑和场景退出清理放在自身生命周期中。
