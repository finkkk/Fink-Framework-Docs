# 运行时 API 参考

本页介绍 UIManager 的运行时 API，包括面板加载、打开、关闭、查询、Surface 管理、输入焦点和运行时事件。

运行时入口：`FinkFramework.Runtime.UI.UIManager.Instance`。泛型面板类型必须继承 `BasePanel`。

## 面板加载

| API | 返回值 | 说明 |
| --- | --- | --- |
| `Preload<T>()` | `T` | 同步加载并保持隐藏 |
| `PreloadAsync<T>()` | `UniTask<T>` | 异步加载并保持隐藏 |
| `Open<T>()` | `T` | 同步加载并打开 |
| `OpenAsync<T>()` | `UniTask<T>` | 异步加载并打开 |
| `Open<T, TArgs>(args)` | `T` | 同步打开并注入参数 |
| `OpenAsync<T, TArgs>(args)` | `UniTask<T>` | 异步打开并注入参数 |

所有加载 API 都有接收 `UIOpenOptions` 的重载。

### 选择加载 API

| 需求 | 推荐 API | 结果 |
| --- | --- | --- |
| 首次打开并立即显示 | `OpenAsync<T>()` | 等待资源、实例和进入过渡完成 |
| 预先准备资源 | `PreloadAsync<T>()` | 完成实例化和初始化，但保持隐藏 |
| Provider 支持同步加载 | `Open<T>()` / `Preload<T>()` | 在当前调用中完成操作 |
| 需要传入业务数据 | `OpenAsync<T, TArgs>(args)` | 在 `OnEnter` 前调用 `ApplyArgs` |

同步 API 适合已确认支持同步加载的资源 Provider。需要等待异步资源时，使用 `UniTask` 版本；调用方传入的 `CancellationToken` 只取消本次等待，不会取消其他调用方共享的底层加载任务。

### 预加载与打开的区别

```csharp
// 资源已实例化，但保持隐藏，不进入显示生命周期
await UIManager.Instance.PreloadAsync<SettingsPanel>();

// 复用已预加载的实例并进入显示流程
await UIManager.Instance.OpenAsync<SettingsPanel>();
```

预加载不会调用 `OnEnter`，也不会将 Page 加入导航栈。面板真正打开时，系统才应用当前的 Surface、层级、显示模式、焦点和导航选项。

## 面板查询

```csharp
MainPanel panel = UIManager.Instance.Get<MainPanel>();

if (UIManager.Instance.TryGet<MainPanel>(out MainPanel result))
{
    result.Refresh();
}

bool opened = UIManager.Instance.IsOpen<MainPanel>();

if (UIManager.Instance.TryGetState<MainPanel>(out UIPanelState state))
{
    UnityEngine.Debug.Log(state);
}
```

需要查询非默认实例或非 Main Surface 时，传入 `UIInstanceId` 和 `UISurfaceId`：

```csharp
MapPanel panel = UIManager.Instance.Get<MapPanel>(
    instanceId: "Detail",
    surfaceId: "WorldMap");
```

查询 API 不会创建面板：

- `Get<T>` 找不到实例时返回 `null`；
- `TryGet<T>` 通过返回值区分是否找到；
- `IsOpen<T>` 只对 `Opening`、`Active` 和 `Paused` 状态返回 `true`；
- `TryGetState<T>` 找不到记录时返回 `false`，输出状态为 `Disposed`。

同一类型在不同 `SurfaceId` 或 `InstanceId` 下是不同面板实例，查询时必须使用与打开时相同的标识。

## 关闭与返回

```csharp
UIManager.Instance.Close<MainPanel>();
await UIManager.Instance.CloseAsync<MainPanel>();

UIManager.Instance.Back();
await UIManager.Instance.BackAsync();

UIManager.Instance.CloseSurface("WorldMap");
UIManager.Instance.CloseAll();
UIManager.Instance.ClearAll();
```

`Close` 和 `CloseAsync` 的 `destroy` 参数可以强制销毁实例。

`CloseAsync` 会等待面板实现的退出过渡；同步 `Close` 会立即完成退出操作。关闭后是否保留实例由打开时的 `UICachePolicy` 决定，`destroy: true` 可以覆盖缓存策略并立即释放该实例。

`Back` / `BackAsync` 的处理顺序为：先让最上层 Modal 处理返回，再处理当前页面栈栈顶；如果面板实现 `IUIBackHandler` 并返回 `true`，则返回请求由面板消费，不会继续执行默认关闭。

| API | 作用 |
| --- | --- |
| `Close<T>()` | 关闭默认实例和 Main Surface 上的面板 |
| `Close<T>(instanceId, surfaceId)` | 关闭指定实例 |
| `Close(UIPanelKey)` | 按完整身份关闭面板 |
| `CloseSurface(surfaceId)` | 关闭指定 Surface 上的全部面板 |
| `CloseAll()` | 关闭所有面板，默认保留可缓存实例 |
| `ClearAll()` | 关闭并销毁所有面板实例 |

## Surface 管理

```csharp
UIManager.Instance.RegisterSurface(
    "WorldMap",
    worldCanvas,
    worldPanelRoot,
    replace: false,
    lifetime: UISurfaceLifetime.Scene);

UIManager.Instance.UnregisterSurface("WorldMap");
```

`Main` Surface 由框架保留，不能由业务覆盖或注销。

注册自定义 Surface 后，打开选项中的 `SurfaceId` 必须使用相同值。注册时如果 Canvas 没有事件相机，框架会尝试为 `ScreenSpaceCamera` 设置 UI Camera，为 `WorldSpace` 设置主相机；复杂场景建议显式配置 Canvas 的 `EventCamera`。

## 输入与焦点

```csharp
UIManager.Instance.SetInputMode(UIInputMode.Navigation);
UIManager.Instance.SetNavigationInteractionEnabled(false);
UIManager.Instance.Focus<MainPanel>();

UIInputMode mode = UIManager.Instance.InputMode;
bool navigationEnabled = UIManager.Instance.NavigationInteractionEnabled;
InputDeviceType device = UIManager.Instance.CurrentInputDevice;
```

`Focus<T>` 只会尝试将导航焦点移动到可见面板。如果面板没有有效的 `Selectable`，或者目标面板被 Modal 交互阻断，聚焦请求会失败。`NavigationInteractionEnabled` 关闭时仍可使用鼠标和触摸点击。

## 运行时事件

```csharp
UIManager.Instance.PanelStateChanged += (key, state) => { };
UIManager.Instance.InputModeChanged += mode => { };
UIManager.Instance.InputDeviceChanged += (previous, current) => { };
```

事件适合调试器、输入提示和自动化测试。业务订阅外部事件时，应在面板的 `OnDispose` 中解除订阅，避免缓存实例销毁后仍保留委托引用。

## 面板状态

`UIPanelState` 的状态含义如下：

| 状态 | 含义 |
| --- | --- |
| `Loading` | 正在加载资源或创建实例 |
| `Hidden` | 实例已准备好但当前未显示 |
| `Opening` | 正在执行进入过渡 |
| `Active` | 当前可见并处于活动状态 |
| `Paused` | Page 被上层 Page 覆盖，实例仍保留 |
| `Closing` | 正在执行退出过渡 |
| `Disposed` | 实例已释放 |
| `Failed` | 加载或打开流程失败 |

运行时排查可以同时查看 `UIPanelState`、`UIPanelKey` 和 `UIPanelSnapshot.AssetPath`，确认是资源定位问题、Surface 问题还是显示流程问题。

## 关键类型

| 类型 | 用途 |
| --- | --- |
| `UIOpenOptions` | 描述面板打开方式 |
| `UIPanelKey` | 面板类型、实例和 Surface 的完整身份 |
| `UIPanelContext` | 面板实例的运行时上下文 |
| `UIPanelState` | 面板运行时状态 |
| `UIPanelSnapshot` | 面板只读运行时快照 |
| `UISurfaceSnapshot` | Surface 只读运行时快照 |
| `UISurfaceRoot` | 将场景 Canvas 注册为 Surface |
| `IUIArgsReceiver<TArgs>` | 接收打开参数 |
| `IUIBackHandler` | 消费返回请求 |
| `IUITransition` | 接入面板过渡动画 |
| `UIModalBackdrop` | 配置 Modal 遮罩 |
| `UISafeArea` | 适配屏幕安全区域 |
