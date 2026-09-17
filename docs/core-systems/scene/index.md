# 场景切换系统（Scene）

`ScenesManager` 提供按场景名或 Build Settings 场景索引切换场景的同步入口，以及返回 `AsyncOperation` 的异步入口。

```csharp
ScenesManager.Instance.LoadScene("Battle");
AsyncOperation operation = ScenesManager.Instance.LoadSceneAsync("Battle");
```

异步加载前确认场景已经加入 Build Settings。框架会在切换前清理场景级运行时状态；跨场景对象应由业务自行放入持久化根节点，并在不再需要时释放。
