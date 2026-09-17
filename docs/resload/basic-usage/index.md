# 基础使用

## 同步加载

同步接口适合已经确认可以立即完成的本地资源：

```csharp
GameObject prefab = ResManager.Instance.Load<GameObject>("res://UI/Panels/MainPanel");
```

如果同一路径正在异步加载，同步接口不会阻塞等待，而是返回空值并记录警告；此时改用 `LoadAsync`。

## 异步、回调和句柄

```csharp
var icon = await ResManager.Instance.LoadAsync<Sprite>("res://UI/Icon");

ResManager.Instance.LoadAsyncCallback<Sprite>(
    "res://UI/Icon",
    loaded => Debug.Log(loaded));

ResOperation<Sprite> operation =
    ResManager.Instance.LoadAsyncHandle<Sprite>("res://UI/Icon");
```

`ResOperation<T>` 提供 `IsDone`、`Progress`、`Result` 和 `Completed`；Provider 不支持真实进度时，进度查询返回不可用状态。

## 批量加载与释放

```csharp
BatchOperation batch = ResManager.Instance.BatchLoadAsync(
    new List<string> { "res://UI/Icon", "res://UI/Background" });

batch.Completed += completed =>
{
    Debug.Log($"加载完成：{completed.Results.Count}");
};

await ResManager.Instance.UnloadUnusedAssets();
```

批量加载返回的结果按请求顺序保存。资源使用结束后按路径调用 `UnloadAsset<T>`；需要切换场景并清空全部缓存时调用 `ClearDicAsync`。

## 路径规则

- `Resources` 资源填写 `Resources` 目录下的相对路径，不包含扩展名；
- 协议统一使用 `scheme://path`，例如 `res://UI/Icon`、`file://D:/Game/Data/config.json`；
- AssetBundle、Addressables 和自定义 Provider 必须先在资源后端配置和运行时初始化；
- `editor://` 只用于编辑器工具链，构建前检查会阻止它进入 Player。
