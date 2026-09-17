# Surface 与空间 UI

本页介绍 `UISurface` 的作用、场景 Canvas 注册方式、面板层级、Surface 生命周期以及世界空间 UI 的配置要求。

配置入口：在场景 Canvas 上添加 `UISurfaceRoot`，或通过 `UIManager.RegisterSurface(...)` 注册自定义 Surface。

一个 Surface 对应一个可独立挂载面板的 Canvas。面板的 `SurfaceId`、层级、导航栈和 Modal 状态彼此关联，因此需要把具有独立空间、独立交互或独立生命周期的 UI 放到不同 Surface 中。

## Main Surface

UIManager 首次初始化时创建并注册 `UISurfaceId.Main`。Main Surface 包含框架默认的 MainCanvas：

- 屏幕项目通常使用 `ScreenSpaceCamera`；
- 世界空间项目可以将 MainCanvas 设置为 `WorldSpace`；
- Main Surface 为持久级 Surface；
- 面板默认挂载到 Main Surface。

```csharp
await UIManager.Instance.OpenAsync<PausePanel>();
```

## 创建场景 Surface

在场景中创建带 Canvas 的 GameObject，添加 `UISurfaceRoot`。组件提供以下配置：

| 配置 | 说明 |
| --- | --- |
| `SurfaceId` | Surface 的唯一标识，例如 `WorldMap`、`WristMenu` |
| `PanelRoot` | 面板挂载容器，留空时使用当前 Canvas |
| `Lifetime` | `Scene` 或 `Persistent` |
| `EventCamera` | Canvas 的事件相机 |

注册成功后，业务代码通过 `SurfaceId` 选择目标 Canvas：

```csharp
var options = UIOpenOptions.Default
    .WithSurface("WorldMap")
    .WithLayer(UILayer.Middle);

await UIManager.Instance.OpenAsync<MapPanel>(options);
```

推荐的场景结构如下：

```text
WorldMapCanvas（Canvas + UISurfaceRoot）
└── PanelRoot
    ├── Bottom
    ├── Middle
    ├── Top
    └── System
```

`PanelRoot` 可以留空并直接使用 Canvas，也可以指定一个独立的 RectTransform。指定后，面板和层级节点都在该节点下查找，不会挂到 Canvas 的其他内容节点中。

同一个 Surface Id 只能同时注册一个 Canvas。`Main` 是框架保留的 Surface Id，外部 Canvas 不能覆盖它。

## 通过代码注册

不使用 `UISurfaceRoot` 时，可以直接调用：

```csharp
bool registered = UIManager.Instance.RegisterSurface(
    surfaceId: "WristMenu",
    canvas: wristCanvas,
    panelRoot: wristPanelRoot,
    lifetime: UISurfaceLifetime.Persistent);
```

注销 Surface：

```csharp
UIManager.Instance.UnregisterSurface("WristMenu");
```

注销前，系统会关闭并释放该 Surface 上的面板。

代码注册适合运行时创建或动态切换的 Canvas。注册失败时通常表示 Surface Id 已被占用、Canvas 为空或正在尝试覆盖 `Main`；只有明确需要替换已有注册时才传入 `replace: true`。

## 面板层级

Surface 会从 `PanelRoot` 下查找四个可选层节点：

```text
PanelRoot
├── Bottom
├── Middle
├── Top
└── System
```

面板打开时通过 `UIOpenOptions.Layer` 选择挂载层：

```csharp
var options = UIOpenOptions.Default.WithLayer(UILayer.System);
UIManager.Instance.Open<SystemMessagePanel>(options);
```

某个层节点不存在时，该层使用 `PanelRoot` 作为挂载点。

层级只决定面板在目标 Surface 中的挂载位置，不改变 Page、Modal、Overlay 的显示模式。显示模式负责导航和交互关系，层级负责同一 Canvas 下的前后顺序；通常将页面放在 `Middle`，Modal 和重要系统提示放在 `Top` 或 `System`。

## 生命周期关系

Surface 和面板分别拥有生命周期配置：

- `UISurfaceLifetime.Scene`：Canvas 所属场景卸载时注销 Surface，并释放其面板；
- `UISurfaceLifetime.Persistent`：Canvas 根节点跨场景保留；
- `UIPanelLifetime.Scene`：面板随所属场景释放；
- `UIPanelLifetime.Persistent`：面板跨场景保留。

跨场景面板必须挂载到持久级 Surface：

```csharp
var options = UIOpenOptions.Default
    .WithSurface("WristMenu")
    .WithLifetime(UIPanelLifetime.Persistent);
```

场景级 Surface 不接受 `UIPanelLifetime.Persistent` 的面板配置。

持久级 Surface 本身会跨场景保留，但面板是否跨场景仍由 `UIPanelLifetime` 决定。面板和 Surface 的生命周期应成对规划：需要跨场景保留的面板必须挂载到持久级 Surface；场景内的临时面板使用 `Scene` 生命周期，避免场景卸载后继续持有旧场景对象。

## 世界空间 Canvas

世界空间 UI 的基础要求：

1. Canvas 的 `Render Mode` 设置为 `World Space`；
2. Canvas 配置正确的 `Event Camera`；
3. Canvas 上存在可接收指针事件的 Graphic Raycaster；
4. 场景中存在框架创建的 EventSystem；
5. 面板通过对应的 Surface 打开。

世界空间 Canvas 不需要为每个面板单独创建 UIManager。手部菜单、世界地图、设备面板等均可以使用独立 Surface。

### 世界空间接入检查

如果面板已经成功加载但在空间中不可见或无法交互，按以下顺序检查：

1. `Canvas.renderMode` 是否为 `World Space`，并确认 Transform 位于摄像机可见范围内；
2. `EventCamera` 是否指向用于射线检测的相机；
3. Canvas 是否启用 `GraphicRaycaster`，交互控件的 Graphic 是否允许 Raycast；
4. `UISurfaceRoot.SurfaceId` 是否与打开选项中的 `WithSurface(...)` 完全一致；
5. 面板是否被 Modal 遮罩或其他交互控制器阻止；
6. 面板的 `UILayer` 挂载点是否位于当前 Canvas 的可见区域。

世界空间 UI 与屏幕空间 UI 共用同一套 `Open`、`Close`、缓存和生命周期 API，差异主要来自 Canvas 的渲染模式、事件相机和挂载 Transform。
