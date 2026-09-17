# 生命周期系统（Mono）

`MonoManager` 是框架统一的 Unity 回调代理，可注册 `Update`、`FixedUpdate`、`LateUpdate`、`OnDrawGizmos` 和 `OnDrawGizmosSelected` 监听。

```csharp
MonoManager.Instance.AddUpdateListener(OnUpdate);
MonoManager.Instance.RemoveUpdateListener(OnUpdate);
```

注册监听后必须在不再需要时移除，尤其是场景级对象或临时调试逻辑。计时器系统也通过 `MonoManager` 托管协程。
