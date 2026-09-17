# 基础使用

本页介绍 UI 系统的完整日常使用流程：创建面板、配置预制体、打开面板、传递参数、管理页面导航，以及在面板生命周期中编写业务逻辑。

使用入口：通过 `Fink Framework > UI 系统 > 创建 UI 面板` 创建资源，通过 `UIManager.Instance` 在运行时预加载、打开、关闭和查询面板。

推荐按照“配置路径 → 创建预制体 → 编写面板脚本 → 选择 Surface 和显示模式 → 打开面板 → 在生命周期回调中刷新数据”的顺序接入 UI。

## 创建一个面板

面板由 `BasePanel` 脚本和对应的 uGUI 预制体组成。假设面板类型为 `SettingsPanel`：

```text
脚本：Assets/<脚本根目录>/UI/Panels/SettingsPanel.cs
预制体：Assets/<Resources 目录>/UI/Panels/SettingsPanel.prefab
资源路径：res://UI/Panels/SettingsPanel
```

预制体根节点必须挂载 `SettingsPanel : BasePanel`。C# 类型名、预制体文件名和根节点脚本类型需要保持一致。

这是运行时加载面板时的最小约束。UIManager 根据面板类型生成资源路径，并从预制体根节点获取 `BasePanel` 实例；子节点名称不会参与资源定位，但会参与控件缓存和事件回调识别。

## 一次完整接入

以 `SettingsPanel` 为例，实际接入可以按以下步骤完成：

1. 在 UI Settings 中确认脚本和预制体输出目录；
2. 使用 UI Builder 创建 `SettingsPanel.cs` 和 `SettingsPanel.prefab`；
3. 在预制体中添加业务控件，并为需要通过代码访问的节点设置稳定名称；
4. 确认预制体根节点挂载 `SettingsPanel`，且脚本编译无错误；
5. 选择默认 Main Surface，或先注册目标 Surface；
6. 调用 `Open` / `OpenAsync` 打开面板；
7. 在 `OnInitialize` 中获取控件，在 `OnEnter` 或 `OnResume` 中刷新显示数据；
8. 在 `OnExit`、`OnDispose` 中停止任务并解除外部事件订阅。

## 编写面板脚本

```csharp
using FinkFramework.Runtime.UI;
using FinkFramework.Runtime.UI.Base;
using UnityEngine.UI;

public sealed class SettingsPanel : BasePanel
{
    private Button closeButton;

    protected override void OnInitialize(UIPanelContext context)
    {
        closeButton = GetControl<Button>("CloseButton");
    }

    protected override void OnEnter()
    {
        // 面板进入显示状态
    }

    protected override void OnButtonClicked(string controlName)
    {
        if (controlName == "CloseButton")
            UIManager.Instance.Close<SettingsPanel>();
    }
}
```

`BasePanel` 会在 `Awake` 中扫描子节点并建立控件缓存。控件通过组件类型和 GameObject 名称获取：

```csharp
Button button = GetControl<Button>("CloseButton");

if (TryGetControl<Button>("OptionalButton", out Button optionalButton))
{
    optionalButton.interactable = true;
}
```

自动绑定的业务事件包括：

```csharp
protected override void OnButtonClicked(string controlName) { }
protected override void OnSliderValueChanged(string controlName, float value) { }
protected override void OnToggleValueChanged(string controlName, bool value) { }
protected override void OnInputValueChanged(string controlName, string value) { }
```

Dropdown、ScrollRect、Image 和布局组件会被缓存，但业务事件需要自行订阅。

## 打开与关闭

默认情况下，面板进入 Main Surface 的 Middle 层，以 Page 方式打开：

```csharp
SettingsPanel panel = UIManager.Instance.Open<SettingsPanel>();
```

异步打开：

```csharp
SettingsPanel panel = await UIManager.Instance.OpenAsync<SettingsPanel>();
```

关闭面板：

```csharp
UIManager.Instance.Close<SettingsPanel>();
await UIManager.Instance.CloseAsync<SettingsPanel>();

// 关闭并销毁实例
UIManager.Instance.Close<SettingsPanel>(destroy: true);
```

默认缓存策略为 `KeepAlive`。关闭后保留的实例再次打开时会复用；需要关闭后销毁时，将打开选项设置为 `DestroyOnClose`。

同一类型面板是否为同一个实例，由 `SurfaceId` 和 `InstanceId` 共同决定。需要同时打开多个同类型面板时，使用不同实例标识：

```csharp
var first = UIOpenOptions.Default.WithInstance("First");
var second = UIOpenOptions.Default.WithInstance("Second");

await UIManager.Instance.OpenAsync<NoticePanel>(first);
await UIManager.Instance.OpenAsync<NoticePanel>(second);
```

同步接口不会阻塞等待正在进行的异步加载。如果同一个面板实例已经处于异步加载状态，继续调用同步 `Open` 或 `Preload` 会记录错误并返回空值；需要等待时应使用 `OpenAsync` 或 `PreloadAsync`。

## 预加载

预加载会完成资源加载、实例化和初始化，但保持面板隐藏：

```csharp
await UIManager.Instance.PreloadAsync<SettingsPanel>();
await UIManager.Instance.OpenAsync<SettingsPanel>();
```

同步预加载和同步打开要求资源 Provider 支持同步加载。异步 API 适合需要异步资源后端的项目。

预加载得到的实例仍然处于隐藏状态，不会进入 Page 栈，也不会触发 `OnEnter`。第一次真正打开时，系统才根据 `UIOpenOptions` 处理挂载层、显示模式、焦点和页面导航。

## 打开选项

使用 `UIOpenOptions` 指定 Surface、实例、层级、显示模式和生命周期：

```csharp
var options = UIOpenOptions.Default
    .WithSurface("WorldMap")
    .WithInstance("Detail")
    .WithLayer(UILayer.Top)
    .WithPresentation(UIPresentationMode.Modal)
    .WithCachePolicy(UICachePolicy.DestroyOnClose);

await UIManager.Instance.OpenAsync<MapDetailPanel>(options);
```

常用预设：

```csharp
UIOpenOptions.Default;      // Middle + Main + Page + Push
UIOpenOptions.ReplacePage;  // 替换当前页面
UIOpenOptions.PopToPage;    // 返回到目标页面
UIOpenOptions.ResetPage;    // 清空当前页面栈
UIOpenOptions.Modal;        // Top + Modal
UIOpenOptions.Overlay;      // Top + Overlay
```

## 页面、Modal 和 Overlay

### Page

Page 进入当前 Surface 的页面栈。打开新 Page 时，当前页面执行 `OnPause`；上层页面关闭后，原页面执行 `OnResume`：

```csharp
await UIManager.Instance.OpenAsync<HomePanel>();
await UIManager.Instance.OpenAsync<SettingsPanel>();
await UIManager.Instance.BackAsync();
```

页面支持 `Push`、`Replace`、`PopTo` 和 `Reset` 四种导航操作。

页面导航只在同一个 Surface 内生效。不同 Surface 分别维护自己的页面栈；关闭一个 Surface 不会改变其他 Surface 的导航状态。

### Modal

Modal 显示在当前内容之上，阻止下层面板交互，并自动创建全区域遮罩：

```csharp
await UIManager.Instance.OpenAsync<ConfirmPanel>(UIOpenOptions.Modal);
```

在 Modal 根节点添加 `UIModalBackdrop`，可以配置遮罩颜色和点击遮罩后的行为。

Modal 显示期间，当前 Surface 的页面内容会被交互控制器阻止接收点击和射线事件。Modal 关闭后，系统恢复被阻止的面板交互状态。需要确认、设置、二次操作或临时阻断页面时，使用 Modal；需要提示但不打断当前操作时，使用 Overlay。

### Overlay

Overlay 显示在上层，不进入页面栈，也不阻止下层交互：

```csharp
await UIManager.Instance.OpenAsync<NotificationPanel>(UIOpenOptions.Overlay);
```

## 参数注入

实现 `IUIArgsReceiver<TArgs>` 后，面板可以接收强类型参数：

```csharp
public sealed class ProductPanel
    : BasePanel, IUIArgsReceiver<int>
{
    private int productId;

    public void ApplyArgs(int value)
    {
        productId = value;
    }
}

await UIManager.Instance.OpenAsync<ProductPanel, int>(1001);
```

UIManager 会在 `OnEnter` 之前调用 `ApplyArgs`。缓存面板再次打开时会重新注入参数。

参数注入只负责把打开时的数据交给面板，不会替代面板自己的刷新逻辑。建议在 `ApplyArgs` 中保存参数，在 `OnEnter` 或 `OnResume` 中根据参数更新控件；这样缓存实例再次打开时可以得到一致的显示结果。

## 生命周期

```csharp
protected override void OnInitialize(UIPanelContext context) { }
protected override void OnEnter() { }
protected override void OnPause() { }
protected override void OnResume() { }
protected override void OnExit() { }
protected override void OnDispose() { }
```

| 回调 | 调用时机 |
| --- | --- |
| `OnInitialize` | 面板实例加载后，每个实例一次 |
| `OnEnter` | 面板进入显示状态 |
| `OnPause` | Page 被上层 Page 覆盖 |
| `OnResume` | 上层 Page 关闭，当前页面恢复 |
| `OnExit` | 面板开始关闭 |
| `OnDispose` | 面板实例销毁前 |

`OnInitialize` 是实例级初始化，只执行一次；`OnEnter`、`OnPause`、`OnResume`、`OnExit` 属于显示和导航状态变化，会随着面板反复打开、暂停和关闭而执行。若子类重写 `Awake`，必须调用 `base.Awake()`，否则 `BasePanel` 不会建立控件缓存。

典型调用关系如下：

```text
实例化
  └─ Awake（扫描控件）
      └─ OnInitialize（一次）

打开：OnEnter
Page 被覆盖：OnPause
Page 恢复：OnResume
关闭：OnExit
销毁：OnDispose → Unity OnDestroy
```

`UIPanelContext.VisibilityToken` 会在面板关闭或销毁时取消，适合绑定面板显示周期内的异步任务：

```csharp
protected override void OnEnter()
{
    RefreshAsync(Context.VisibilityToken).Forget();
}

private async UniTask RefreshAsync(CancellationToken cancellationToken)
{
    try
    {
        await RefreshDataAsync(cancellationToken);
    }
    catch (OperationCanceledException)
    {
        // 面板关闭后结束刷新任务
    }
}
```

## 返回与输入

面板实现 `IUIBackHandler` 后可以处理返回请求：

```csharp
public bool TryHandleBack()
{
    if (HasUnsavedChanges())
    {
        ShowConfirmDialog();
        return true;
    }

    return false;
}
```

`true` 表示面板已经处理返回；`false` 表示继续执行默认关闭逻辑。

默认返回处理会优先检查当前 Surface 的最上层 Modal，然后再处理页面栈。Overlay 不进入页面栈，因此不会作为 Page 返回目标。

键盘和手柄导航可以指定默认焦点控件，也可以通过 UIManager 控制：

```csharp
UIManager.Instance.SetInputMode(UIInputMode.Navigation);
UIManager.Instance.Focus<SettingsPanel>();
UIManager.Instance.DisableNavigationInteraction();
UIManager.Instance.EnableNavigationInteraction();
```

## 过渡动画与安全区

在面板根节点添加 `CanvasGroup` 和 `UICanvasGroupTransition`，即可获得淡入淡出、缩放和缓动过渡。同步 API 直接完成过渡，异步 API 会等待过渡完成。

需要避开刘海、圆角或系统手势区域时，在内容容器上添加 `UISafeArea`。该组件仅调整屏幕空间 Canvas 的布局。

面板根节点上的过渡组件由 UIManager 统一调用。同步打开和关闭会立即完成过渡；异步打开和关闭会等待过渡任务结束，适合需要等待动画完成后继续执行的流程。`UISafeArea` 建议挂在内容容器而不是背景节点上，使背景保持全屏、内容避让系统安全区域。
