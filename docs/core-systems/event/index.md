# 事件系统（Event）

`EventManager` 使用 `Enum` 作为事件标识，支持无参数、单参数和双参数事件。事件签名由事件名与参数类型共同决定，同一事件名不要混用不同参数签名。

```csharp
public enum GameEvent { PlayerDied }

EventManager.Instance.AddEventListener<PlayerData>(
    GameEvent.PlayerDied,
    OnPlayerDied);

EventManager.Instance.EventTrigger(
    GameEvent.PlayerDied,
    playerData);

EventManager.Instance.RemoveEventListener<PlayerData>(
    GameEvent.PlayerDied,
    OnPlayerDied);
```

监听器支持 `sticky: true`。粘滞事件会保留最近一次触发结果，之后注册的监听器可以立即收到该结果。场景或模块卸载时调用对应的移除方法，或使用 `ClearEvent` / `ClearAllEvent` 清理。
