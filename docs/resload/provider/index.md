# 资源插件系统（Provider）

Provider 实现 `IResProvider`，负责一种资源后端的具体加载、存在性检查、底层卸载、缓存清理和进度查询。

## 内置 Provider

| 前缀 | Provider | 说明 |
| --- | --- | --- |
| 无前缀、`res://` | `ResourcesProvider` | 读取 Unity `Resources` 目录，支持同步和异步加载 |
| `file://` | `FileProvider` | 读取 PC 本地文件，支持文本、图片、音频和 AssetBundle |
| `http://`、`https://` | `WebProvider` | 通过网络请求加载资源 |
| `ab://` | `ABProvider` | 由 AssetBundle 后端配置提供 |
| `addr://`、`addressables://` | `AddressablesProvider` | 需要启用 Addressables 后端和 Unity Addressables 包 |
| `editor://` | `EditorProvider` | 编辑器专用资源访问，不能进入正式构建 |

## 自定义 Provider

```csharp
public sealed class MyProvider : IResProvider
{
    public T Load<T>(string path) where T : UnityEngine.Object { /* ... */ }
    public UniTask<T> LoadAsync<T>(string path) where T : UnityEngine.Object { /* ... */ }
    public bool Exists(string path) { /* ... */ }
    public void Unload(string path) { }
    public void Clear() { }
    public bool TryGetProgress(string path, out float progress) { /* ... */ }
}

ResManager.Instance.AddProvider("my", new MyProvider());
var asset = await ResManager.Instance.LoadAsync<TextAsset>("my://Config/main");
```

Provider 的 `Load` / `LoadAsync` 只接收去除协议前缀后的路径。Provider 自己维护的 Bundle、句柄或网络缓存应在 `Unload` 与 `Clear` 中释放；ResManager 负责上层引用计数和并发请求合并。
