# 资源加载（ResLoad）

`ResManager` 是统一资源入口，通过路径协议选择 Provider，并为同步、异步、回调和批量加载维护缓存与引用计数。

```csharp
Texture2D icon = ResManager.Instance.Load<Texture2D>("res://UI/Icon");
Texture2D remote = await ResManager.Instance.LoadAsync<Texture2D>(
    "https://example.com/icon.png");

ResManager.Instance.UnloadAsset<Texture2D>("res://UI/Icon");
```

无协议路径和 `res://` 使用 `ResourcesProvider`；`file://` 使用本地文件；`http://` / `https://` 使用网络 Provider；启用构建型资源后端后，`ab://`、`addr://` 和 `addressables://` 分别路由到对应 Provider。

资源加载是引用计数模型：每次成功加载都会增加引用，业务完成使用后应调用 `UnloadAsset`。不再需要全部缓存时使用 `ClearDic` 或 `ClearDicAsync`。
