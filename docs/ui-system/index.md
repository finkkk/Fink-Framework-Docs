# UI 系统概述

本页介绍 Fink Framework UI 系统的整体架构、核心对象、面板模型、Surface、生命周期、导航、输入和编辑器工具，为后续使用 UI 系统提供整体认识。

系统入口：运行时通过 `FinkFramework.Runtime.UI.UIManager.Instance` 管理面板；编辑器中通过 `Fink Framework → UI 系统` 访问 UI 配置、面板生成器和运行时调试器。

UI 系统以 `UIManager` 为公共入口，以 `UISurface` 作为 UI 的挂载表面，以 `BasePanel` 作为面板基类，统一管理普通屏幕 UI、世界空间 UI、面板资源加载、面板状态和页面交互。

## 1. 核心模型

UI 系统由以下对象协作完成：

```text
UIManager
├── UIRuntimeRoot       框架默认 Camera、MainCanvas、EventSystem
├── UISurfaceRegistry   注册和查找 UI 挂载表面
├── UIPanelRepository   保存面板实例记录
├── UIPanelLoader       解析路径，并通过 ResManager 加载面板预制体
├── UINavigationController 维护每个 Surface 的页面栈
├── UIModalController   维护每个 Surface 的模态栈
├── UIInputRouter       管理指针/键盘/手柄焦点
└── UITransitionCoordinator 管理异步进入和退出过渡
```

`UIManager` 是不继承 `MonoBehaviour` 的泛型单例。第一次访问 `UIManager.Instance` 时完成运行时 UI 根节点的创建，并注册框架保留的 `Main` Surface。

面板实例的身份由三个部分共同决定：

```text
UIPanelKey = UIPanelId + UIInstanceId + UISurfaceId
```

- `UIPanelId`：面板类型的完整名称，例如 `Example.MainPanel`；
- `UIInstanceId`：同一类型面板的实例标识，默认值为 `Default`；
- `UISurfaceId`：面板所属的挂载表面，默认值为 `Main`。

因此，同一个面板类型可以在同一个 Surface 上创建多个实例，也可以同时挂载到不同 Surface。面板缓存键由 `UIPanelKey` 统一定义。

## 2. 运行时根节点与 Main Surface

首次创建 `UIManager` 时，`UIRuntimeRoot` 会通过资源系统加载并实例化框架内置资源：

- 非 VR 环境：创建框架 UI Camera；
- 所有环境：创建框架 `MainCanvas`；
- 当前场景没有 `EventSystem` 时：按环境选择 Legacy Input、Input System 或 XR EventSystem 预制体；
- Camera、MainCanvas 和 EventSystem 都设置为跨场景对象；
- MainCanvas 注册为 `UISurfaceId.Main`，并且是持久级 Surface。

Main Surface 的渲染模式由 `Project Settings > Fink Framework > UI Settings` 中的 `CurrentUIMode` 决定：

| 配置 | MainCanvas 实际模式 |
| --- | --- |
| `ScreenSpace` | `ScreenSpaceCamera` |
| `WorldSpace` | `WorldSpace` |
| `Auto` | VR 使用 `WorldSpace`，非 VR 使用 `ScreenSpaceCamera` |

这里的“屏幕 UI”不是 `ScreenSpaceOverlay`，而是由框架 UI Camera 输出的 `ScreenSpaceCamera` Canvas。

## 3. Surface：面板的挂载表面

`UISurface` 表示一个可独立承载面板的 Canvas。它可以是屏幕空间 Canvas，也可以是世界空间 Canvas；UIManager 对两者采用相同的打开、关闭和缓存逻辑。

场景中的自定义 Canvas 可以添加 `UISurfaceRoot` 自动注册：

```csharp
// 将 UISurfaceRoot 挂到带 Canvas 的 GameObject 上，
// 然后在 Inspector 中填写唯一的 Surface Id。
```

`UISurfaceRoot` 提供以下配置：

- `SurfaceId`：同一时刻必须唯一，`Main` 是框架保留值，不能覆盖；
- `PanelRoot`：面板挂载根节点，留空时使用当前 Canvas；
- `Lifetime`：`Scene` 或 `Persistent`；
- `EventCamera`：可选的 Canvas 事件相机，留空时由注册逻辑尝试使用主相机。

如果 `PanelRoot` 下存在名为 `Bottom`、`Middle`、`Top`、`System` 的子节点，系统会将它们分别作为四个 `UILayer` 的挂载点；缺少某一层时回退到 `PanelRoot`。也可以直接调用以下 API 注册 Surface：

```csharp
UIManager.Instance.RegisterSurface(
    "WorldMap",
    worldCanvas,
    panelRoot,
    lifetime: UISurfaceLifetime.Scene);
```

持久级 Surface 会将其根节点设置为 `DontDestroyOnLoad`。场景级 Surface 在所属场景卸载时注销，并释放其挂载的面板。

## 4. 面板资源加载与缓存

所有运行时面板都必须继承 `BasePanel`，并且面板脚本必须挂在预制体根节点。面板预制体名称必须与面板类型名称一致。

UI 面板资源路径由 UI Settings 中的预制体输出目录决定，运行时最终按以下规则生成资源路径：

```text
res://<UI 面板 Resources 目录>/<面板类型名称>
```

面板由 `UIPanelLoader` 统一通过 `ResManager` 加载、实例化和释放，业务代码不需要传入资源路径。

UIManager 提供两类加载操作：

```csharp
// 只加载并保持隐藏，不触发面板显示生命周期
MainPanel panel = UIManager.Instance.Preload<MainPanel>();
MainPanel asyncPanel = await UIManager.Instance.PreloadAsync<MainPanel>();

// 加载并打开
MainPanel opened = UIManager.Instance.Open<MainPanel>();
MainPanel openedAsync = await UIManager.Instance.OpenAsync<MainPanel>();
```

同步 API 要求底层 Provider 支持同步加载。如果面板正在异步加载，`Preload` 或 `Open` 不会阻塞等待，而是记录错误并返回 `null`；此时应继续使用对应的异步 API。

异步 API 返回 `Cysharp.Threading.Tasks.UniTask<T>`。多个调用方访问同一个面板时共享底层加载任务；某个调用方取消自己的等待，只会取消自己的等待，不会取消其他调用方或系统正在执行的加载。

关闭时的实例保留策略由 `UICachePolicy` 决定：

- `KeepAlive`：关闭后保留实例，再次打开时复用；
- `DestroyOnClose`：关闭完成后销毁实例并释放面板资源。

也可以在 `Close` / `CloseAsync` 中传入 `destroy: true`，强制销毁指定实例。

## 5. 打开选项与显示关系

打开面板时通过 `UIOpenOptions` 描述面板的挂载、显示和生命周期策略：

```csharp
var options = new UIOpenOptions(
    layer: UILayer.Top,
    surfaceId: "WorldMap",
    instanceId: "Detail",
    cachePolicy: UICachePolicy.DestroyOnClose,
    presentation: UIPresentationMode.Modal,
    takeFocus: true,
    lifetime: UIPanelLifetime.Scene);

await UIManager.Instance.OpenAsync<DetailPanel>(options);
```

`UIOpenOptions` 的主要字段如下：

| 字段 | 作用 |
| --- | --- |
| `Layer` | 选择 `Bottom`、`Middle`、`Top` 或 `System` 挂载层； |
| `SurfaceId` | 指定面板进入哪个 Surface； |
| `InstanceId` | 区分同类型面板的多个实例； |
| `CachePolicy` | 决定关闭后保留还是销毁； |
| `Presentation` | 决定面板作为页面、模态窗口还是叠加层； |
| `TakeFocus` | 面板激活后是否成为当前导航焦点目标； |
| `Lifetime` | 面板跟随场景释放，还是跨场景保留； |
| `Navigation` | 页面打开时对页面栈执行何种操作。 |

面板的显示关系分为三种：

- `Page`：加入当前 Surface 的页面栈，打开新页面时暂停上一页；
- `Modal`：显示在当前内容之上，自动生成可拦截下层点击的遮罩，并阻止下层面板交互；
- `Overlay`：显示在上层，不进入页面栈，也不阻止下层交互。

页面模式支持四种导航操作：

- `Push`：压入栈顶，返回时恢复上一页；
- `Replace`：替换当前栈顶页面；
- `PopTo`：关闭目标页面上方的页面并返回目标；目标不在栈中时按 `Push` 处理；
- `Reset`：清理当前 Surface 的其他页面，只保留目标页面。

`Modal` 和 `Overlay` 不参与页面栈，`Navigation` 选项对它们不起作用。当前 Surface 存在 Modal 时，系统禁止在 Modal 下方打开新的 Page。

## 6. 面板生命周期

`BasePanel` 的业务生命周期由 `UIManager` 驱动：

```csharp
public sealed class MainPanel : BasePanel
{
    protected override void OnInitialize(UIPanelContext context) { }
    protected override void OnEnter() { }
    protected override void OnPause() { }
    protected override void OnResume() { }
    protected override void OnExit() { }
    protected override void OnDispose() { }
}
```

调用顺序和用途是：

1. `OnInitialize`：面板实例加载后调用一次，接收 `UIPanelContext`；
2. `OnEnter`：面板从隐藏状态进入显示状态时调用；
3. `OnPause`：页面被上层 Page 覆盖时调用，并将面板暂时隐藏；
4. `OnResume`：上层页面关闭后恢复当前页面时调用；
5. `OnExit`：面板开始关闭时调用；
6. `OnDispose`：面板实例真正销毁前调用一次。

预加载只完成加载、实例化和初始化，面板保持隐藏，不触发 `OnEnter`。同步打开会直接完成进入/退出过渡；异步打开和关闭会等待面板实现的过渡任务。

`UIPanelContext` 提供面板身份、挂载层、资源路径以及当前显示周期的 `VisibilityToken`。面板关闭或销毁时该令牌会取消；面板被页面栈暂停时不会取消。面板中的可见周期异步任务应使用此令牌，避免关闭后继续刷新 UI。

## 7. 参数注入与返回处理

需要接收打开参数的面板实现 `IUIArgsReceiver<TArgs>`：

```csharp
public sealed class ItemPanel : BasePanel, IUIArgsReceiver<ItemArgs>
{
    private ItemArgs args;

    public void ApplyArgs(ItemArgs value) => args = value;
}

await UIManager.Instance.OpenAsync<ItemPanel, ItemArgs>(
    new ItemArgs { Id = 42 });
```

参数通过泛型约束与面板类型绑定，并在 `OnEnter` 之前注入。面板再次打开时也会重新执行 `ApplyArgs`。

如果面板需要自行处理返回请求，可以实现 `IUIBackHandler`：

```csharp
public bool TryHandleBack()
{
    // 返回 true 表示面板已经消费返回请求；
    // 返回 false 才会继续执行默认关闭与页面恢复。
    return false;
}
```

业务可以调用 `Back` / `BackAsync`。系统会先处理最上层 Modal，再处理页面栈栈顶页面。

## 8. 控件查找与事件绑定

`BasePanel` 在 `Awake` 中递归扫描子节点，并按“组件类型 + GameObject 名称”建立内部控件缓存。业务通过以下 API 获取控件：

```csharp
private Button confirmButton;

protected override void OnInitialize(UIPanelContext context)
{
    confirmButton = GetControl<Button>("ConfirmButton");
}
```

当前自动缓存的主要控件包括 `Button`、`Toggle`、`Slider`、`Scrollbar`、`InputField`、`TMP_InputField`、`Dropdown`、`TMP_Dropdown`、`ScrollRect`、`ToggleGroup`、`Text`、`TextMeshProUGUI`、`Image`、`RawImage` 以及常用 Layout Group。

当前自动绑定事件的控件只有：

- `Button` → `OnButtonClicked(string controlName)`；
- `Slider` → `OnSliderValueChanged(string controlName, float value)`；
- `Toggle` → `OnToggleValueChanged(string controlName, bool value)`；
- `InputField` / `TMP_InputField` → `OnInputValueChanged(string controlName, string value)`。

`Dropdown`、`ScrollRect`、`Image` 等控件会被缓存，但不会自动绑定业务事件。名称为 Unity 模板控件的节点，例如 `Background`、`Label`、`Fill`、`Handle`、`Viewport` 等，会从缓存中排除。重复的“类型 + 名称”控件会输出警告，并使用层级中先扫描到的对象。

## 9. 过渡、模态遮罩与安全区

面板根节点可以挂载实现 `IUITransition` 的组件。框架自带的 `UICanvasGroupTransition` 使用 `CanvasGroup`，支持淡入淡出、缩放、缓动曲线、进入/退出时长以及是否使用非缩放时间。

同步 `Open` / `Close` 会直接调用过渡的完成方法；异步 `OpenAsync` / `CloseAsync` 会等待 `PlayEnterAsync` / `PlayExitAsync` 完成。过渡组件必须位于面板根节点，因为系统从面板根对象获取 `IUITransition`。

以 `Modal` 方式打开的面板会自动创建全区域遮罩。未挂载 `UIModalBackdrop` 时仍会创建透明且可拦截点击的遮罩；挂载后可以配置遮罩颜色，以及点击遮罩是否等同于调用 `Back`。

`UISafeArea` 用于将屏幕空间内容限制在 `Screen.safeArea` 内，可分别选择需要避让的屏幕边缘。它对 `WorldSpace` Canvas 不修改锚点布局；常见用法是只给内容容器添加安全区组件，让背景仍然铺满屏幕。

## 10. 输入、焦点与运行时查询

输入路由区分两种模式：

- `Pointer`：鼠标和触摸等指针交互；
- `Navigation`：键盘和手柄导航、提交与取消。

`UIInputRouter` 会记住每个面板最近一次的选中控件。进入导航模式时，优先恢复该控件；如果控件不可用，则使用 `BasePanel` 的 `defaultSelectable`，再回退到面板内第一个可用的 `Selectable`。

`UIManager` 提供以下相关能力：

```csharp
UIManager.Instance.SetInputMode(UIInputMode.Navigation);
UIManager.Instance.Focus<MainPanel>();
UIManager.Instance.DisableNavigationInteraction();
UIManager.Instance.EnableNavigationInteraction();
```

鼠标和触摸点击不受 `NavigationInteractionEnabled` 关闭影响。面板状态、Surface 状态和输入设备变化也可以通过 `GetPanelSnapshots`、`GetSurfaceSnapshots`、`PanelStateChanged`、`InputModeChanged` 以及 `InputDeviceChanged` 读取或订阅，适合运行时调试器和自动化测试。

## 11. 编辑器工具

UI Builder 位于 `Fink Framework/UI 系统/创建 UI 面板`，根据 UI Settings 中的输出目录生成面板脚本和预制体。脚本编译完成后，工具会继续创建预制体并挂载生成的面板脚本。

生成器可以选择：

- TextMeshPro 或 Unity Legacy 文本组件；
- 默认 `UICanvasGroupTransition`；
- `UISafeArea`；
- Button、InputField、Toggle、Slider 示例控件及对应示例代码。

运行时 UI 调试器可以读取 UIManager 的面板和 Surface 快照，查看状态、挂载表面、导航配置、资源路径及场景归属，并对可操作的面板执行聚焦、关闭或销毁操作。

## 12. 常用 API 速览

| 需求 | API |
| --- | --- |
| 同步打开 | `UIManager.Instance.Open<T>()` |
| 异步打开 | `UIManager.Instance.OpenAsync<T>()` |
| 带参数打开 | `Open<T, TArgs>(args)` / `OpenAsync<T, TArgs>(args)` |
| 预加载 | `Preload<T>()` / `PreloadAsync<T>()` |
| 查询实例 | `Get<T>()` / `TryGet<T>()` |
| 查询状态 | `IsOpen<T>()` / `TryGetState<T>(out state)` |
| 关闭面板 | `Close<T>()` / `CloseAsync<T>()` |
| 返回上一页 | `Back()` / `BackAsync()` |
| 关闭一个 Surface | `CloseSurface(surfaceId)` |
| 关闭全部 UI | `CloseAll()` |
| 销毁全部面板 | `ClearAll()` |
| 注册自定义 Surface | `RegisterSurface(...)` |
| 注销自定义 Surface | `UnregisterSurface(surfaceId)` |
