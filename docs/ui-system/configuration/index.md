# UI 系统配置

本页介绍 UI 系统的 Main Canvas 基础设置、自定义 Main Canvas 预制体、Main Surface 渲染模式、面板加载来源与输出目录，以及输入导航配置。

配置入口：`Edit` → `Project Settings` → `Fink Framework` → `UI Settings`，或从 `Fink Framework → UI 系统 → UI 系统配置` 打开。

![UI 系统配置面板](/images/ui-system/ui_setup.webp)

## 配置项总览

| 配置区域 | 作用 |
| --- | --- |
| Main Canvas 基础设置 | 配置 Main Surface 渲染模式、缩放、适配、像素对齐、相机距离与排序 |
| 自定义 Main Canvas | 使用已有 Canvas 预制体，复用层节点并自动补齐缺失层 |
| 输入与导航 | 控制是否根据输入设备自动管理 UI 导航交互 |
| UI 面板加载 | 选择 Resources、跟随资源后端或自定义来源，并配置 Group / 包名 |
| 面板生成路径 | 决定脚本位置，分别保存 Resources 与非 Resources 预制体目录 |
| 运行时资源路径 | 按加载来源生成 `res://`、`addr://`、`ab://` 或自定义协议地址 |

UI Settings 同时影响运行时 UI 根节点、UI Builder 和面板资源加载。它不是只用于选择 Canvas 渲染模式；面板路径或输入导航配置发生变化时，也需要在这里统一维护。

## Main Surface 渲染模式

| 配置 | MainCanvas 的渲染模式 | 适用场景 |
| --- | --- | --- |
| `ScreenSpace` | `ScreenSpaceCamera` | 桌面、移动端和传统 2D 界面 |
| `WorldSpace` | `WorldSpace` | 以空间 UI 为主的项目 |
| `Auto` | 最终 VR 环境使用 `WorldSpace`，其他环境使用 `ScreenSpaceCamera` | 由框架按当前环境自动选择 |

`Main Surface` 是框架自动创建的默认 Surface。场景中的独立世界空间 Canvas 使用 `UISurfaceRoot` 配置，不需要改变 Main Surface 的渲染模式。

`Auto` 是默认配置。运行时会根据当前环境决定 MainCanvas 的模式：VR 环境使用 `WorldSpace`，其他环境使用 `ScreenSpaceCamera`。如果项目只面向单一渲染方式，也可以显式选择 `ScreenSpace` 或 `WorldSpace`，以避免运行环境判断带来的差异。

屏幕空间模式使用框架创建的 UI Camera，而不是 `ScreenSpaceOverlay`。因此涉及排序、事件相机或 Canvas 层级时，应优先检查 MainCanvas 和 UI Camera 的配置。

## Main Canvas 基础设置

自 v1.1.3 起，可在 UI Settings 的“Main Canvas 基础设置”板块直接配置框架默认 Main Canvas。配置在 UI 系统初始化时应用，修改后需重新运行；不会批量修改场景中通过 `UISurfaceRoot` 注册的独立 Canvas。

### 默认值与生效范围

以下参数用于未开启“使用自定义 Main Canvas”时的框架内置 Canvas：

| 配置项 | 默认值 | 生效条件与含义 |
| --- | --- | --- |
| 屏幕缩放模式 | `Scale With Screen Size` | 屏幕空间 Canvas 的 CanvasScaler 缩放方式 |
| 参考分辨率 | `1920 × 1080` | 随屏幕尺寸缩放时的设计分辨率 |
| 屏幕适配模式 | `Expand` | 随屏幕尺寸缩放时选择 Expand、Shrink 或 Match Width Or Height |
| 宽高匹配 | `0` | 仅 Match Width Or Height 时显示；0 匹配宽度，1 匹配高度 |
| 缩放倍率 | `1` | 仅 Constant Pixel Size 时生效 |
| 参考每单位像素数 | `100` | 屏幕空间 Canvas 的参考像素密度 |
| 物理尺寸单位 | `Points` | 仅 Constant Physical Size 时生效 |
| 备用屏幕 DPI / 默认 Sprite DPI | `96 / 96` | 仅 Constant Physical Size 时生效 |
| 像素对齐 | 关闭 | 屏幕空间 Canvas 的 Pixel Perfect |
| 距 UI 相机距离 | `100` | ScreenSpaceCamera 的 Plane Distance，需位于 UI Camera 的 Near / Far 裁剪范围内 |
| 排序层 / 层内排序 | `Default / 0` | 默认 Main Canvas 的 Sorting Layer / Order in Layer |

世界空间模式保留预制体的布局和 CanvasScaler 设置，不套用上述屏幕缩放、像素对齐与相机距离参数；未使用自定义预制体时，排序层和层内排序仍由本板块配置。

### 自定义 Main Canvas 预制体

开启“使用自定义 Main Canvas”，然后将项目中的预制体资产拖到“Main Canvas 预制体”字段。预制体根对象必须带有 `Canvas`，不能使用场景实例；开启后未指定有效预制体会阻止 UI 初始化。

自定义预制体负责自身的缩放、布局、像素对齐、相机距离与排序等设置，基础参数不再覆盖这些值。渲染模式仍以 Main Surface 设置为准：

- ScreenSpaceCamera：框架统一设置渲染模式，并绑定框架创建的 UI Camera；
- WorldSpace：保留已有事件相机，未指定时尝试使用 `Camera.main`；
- Auto：先按最终 VR 环境解析目标模式，再使用同一套相机绑定规则。

框架按 `UILayer` 枚举名称查找 Canvas 的**直接子节点**，复用已有层并自动创建缺失层。已有层必须使用 `RectTransform`，同一层名不能有多个直接子节点，否则初始化失败。复用的层保留布局和内容，其他子物体也会保留；框架会调整层节点的兄弟顺序以保证各 UI 层的渲染顺序。

自定义 Main Canvas 会被实例化并设为跨场景对象，仍注册为 `UISurfaceId.Main`。如果只是为某个场景添加世界面板，请使用独立 Canvas + `UISurfaceRoot`，参阅 [Surface 与空间 UI](/ui-system/surfaces/)。

### 独立恢复默认设置

点击“恢复 Main Canvas 默认设置”会恢复本板块全部字段，包括 Main Surface 模式回到 Auto、关闭自定义 Canvas、清空预制体引用，以及恢复缩放与排序默认值。该按钮不会重置输入导航选项或面板生成路径，也不会修改预制体资产；面板路径仍使用其单独的“恢复默认路径”按钮。

## 面板加载来源

自 v1.1.4 起，“UI 面板加载”中的“加载来源”决定面板地址的解析方式。默认保持 `Resources`，仅切换全局资源后端不会改变旧项目的 UI 加载方式。

| 加载来源 | 全局资源后端 | `MainPanel` 的运行时地址 |
| --- | --- | --- |
| `Resources` | 任意 | `res://<Resources 相对目录>/MainPanel` |
| 跟随资源后端（`FollowResourceBackend`） | `None` | 继续使用 Resources 地址 |
| 跟随资源后端 | `Addressables` | `addr://MainPanel` |
| 跟随资源后端 | `AssetBundle` | `ab://<UI 包名>/MainPanel` |
| 跟随资源后端 | `Custom` | 由 `CustomPanelAssetPathResolver` 返回 |
| 自定义（`Custom`） | 任意 | 由 `CustomPanelAssetPathResolver` 返回 |

### Addressables

先安装 `com.unity.addressables` 并在 [Resource Backend](/resload/configuration/) 中选择 Addressables，再将 UI 加载来源设为“跟随资源后端”。`UI Addressables Group` 默认是 `UI Panels`。

生成器默认将新面板预制体加入这里指定的 Group（不存在时创建）；v1.1.5 起也可以在创建窗口为本次生成单独指定资源组。Address 设置为面板类的短名称，例如 `MainPanel`，区分大小写。不同命名空间中的同名面板也会使用相同 Address，因此面板类名需保持唯一。已有面板需要手动迁移并设置 Address。

业务仍使用 `await UIManager.Instance.OpenAsync<MainPanel>()`，不需要传入 Address。同步打开和预加载的限制见 [运行时 API](/ui-system/api/#选择加载-api)。

未安装 Addressables 包时，框架仍可编译并使用 Resources / AssetBundle；选择 Addressables 后会提示包缺失。包已安装但扩展程序集不可用时，检查 `FinkFramework.Addressables` 和 `FinkFramework.Editor.UI.Addressables` 的导入及编译错误。

### AssetBundle

跟随 AssetBundle 后端时，`UI AssetBundle 包名` 默认是 `ui`。使用小写且不含路径分隔符或非法字符的包名。生成器会为新预制体设置包名，运行时按 `ab://ui/MainPanel` 加载；资源包仍需由项目自行构建和部署。

v1.1.5 起，创建窗口可以为本次生成单独指定资源包名，但不会修改这里的运行时配置。两者不同时需同步调整本页包名，或通过自定义地址解析器返回实际资源地址。

### 自定义来源

启动时注册对应协议的 Provider，并在首次加载面板前设置地址解析器：

```csharp
// 提前通过 ResManager.Instance.AddProvider(...) 注册项目实现的 custom 协议 Provider。
UIManager.Instance.CustomPanelAssetPathResolver =
    panelType => $"custom://UI/{panelType.Name}";

await UIManager.Instance.OpenAsync<MainPanel>();
```

解析器必须返回带 `://` 且包含资源内容的完整地址，空地址会被拒绝。自定义来源的生成器只创建脚本和预制体，资源注册由项目处理。修改解析器只影响之后创建的面板记录，已有实例继续使用加载时保存的地址释放资源。

## 面板输出目录

### 脚本输出目录

脚本目录填写全局脚本根目录之后的相对路径，默认值为：

```text
UI/Panels
```

UI Builder 会将生成的面板脚本写入：

```text
Assets/<全局脚本根目录>/UI/Panels/
```

### 预制体输出目录

两类预制体目录分别保存，均填写 `Assets` 之后的相对路径。生成器根据当前加载来源选择目录，切换来源不会覆盖另一类目录。

**Resources 预制体目录**用于 Resources 来源，以及跟随 `None` 后端的情况，必须位于 `Resources` 子目录下。默认值为：

```text
Resources/UI/Panels
```

例如，配置为 `Resources/UI/Panels` 后，`MainPanel` 的运行时资源路径为：

```text
res://UI/Panels/MainPanel
```

`UIManager` 根据面板类型名称查找预制体，因此以下三项必须一致：

| 项目 | 示例 |
| --- | --- |
| C# 类型名 | `MainPanel` |
| 预制体文件名 | `MainPanel.prefab` |
| 预制体根节点组件 | `MainPanel : BasePanel` |

**非 Resources 预制体目录**用于 Addressables、AssetBundle 和自定义来源，默认值为 `GameAssets/UI/Panels`，即 `Assets/GameAssets/UI/Panels/`。目录不能位于 `Resources`、`Editor` 或 `StreamingAssets` 下，也不能指向项目外部。

UI Builder 会校验当前来源的输出路径，并显示最终脚本、预制体位置和资源注册信息。非 Resources 来源的运行时地址不从生成目录推导，而是按上面的类名或自定义解析规则生成。

### 创建窗口中的单次覆盖（v1.1.5）

本页保存项目统一配置；UI Builder 首次打开时读取这些值，默认允许为本次创建单独修改脚本目录、预制体目录，以及当前来源的资源组或包名。创建窗口显示包含 `Assets/` 的目录，而本页的目录字段仍按上述相对路径规则填写。

开启“跟随 UI 配置”后，创建窗口立即同步并锁定这些字段，之后保持同步；关闭后保留当前值并允许编辑。窗口内的手动修改不会写回本页，资源来源仍由本页配置决定。

本次覆盖只决定文件生成与资源注册，不会自动改变运行时查找规则。Resources 目录对应的加载路径或 AssetBundle 包名与本页配置不同时，创建窗口会提示需要同步调整；Addressables 改组后仍以面板类名作为 Address。具体字段和预览说明见 [UI 面板生成器](/ui-system/ui-builder/#本次设置与跟随-ui-配置-v1-1-5)。

修改输出目录后，已经生成的面板不会自动移动。新面板会使用新目录；已有面板如果仍要被 UIManager 加载，需要手动移动资源并保持资源路径与配置一致。

## 输入与导航

UI 设置提供“按输入设备自动管理导航交互”选项：

- 开启时，输入设备检测策略可以根据最近一次有效输入调整导航交互；
- 关闭时，导航交互保持开启；
- 设备输入检测在 `Project Settings > Fink Framework > Input` 中关闭时，自动策略不参与设备切换。

业务代码可以通过 `UIManager` 直接控制导航交互：

```csharp
UIManager.Instance.SetNavigationInteractionEnabled(false);
UIManager.Instance.SetNavigationInteractionEnabled(true);
UIManager.Instance.SetInputMode(UIInputMode.Navigation);
```

关闭导航交互只影响键盘、手柄的导航、提交和取消事件，鼠标和触摸指针交互仍可用。

输入模式和导航交互是两个独立概念：`UIInputMode.Navigation` 表示当前使用导航输入，`NavigationInteractionEnabled` 表示导航事件是否允许驱动 UI。可以在设置中启用按输入设备自动管理，也可以在业务流程中显式切换，例如进入文本输入、暂停菜单或手柄操作界面时自行设置。

设备检测相关选项位于 `Project Settings > Fink Framework > Input`。如果关闭设备检测，UI Settings 中的自动导航策略不会根据设备变化切换交互状态。

## 配置建议

| 项目 | 建议 |
| --- | --- |
| Main Surface 渲染模式 | 屏幕 UI 使用 `ScreenSpace`；空间 UI 使用 `WorldSpace`；由环境自动选择时使用 `Auto` |
| 脚本输出目录 | 使用项目统一的脚本根目录下的 `UI/Panels` |
| 预制体输出目录 | Resources 使用 `Resources/UI/Panels`；其他来源使用 `GameAssets/UI/Panels` |
| 自动导航交互 | 同时支持指针和键盘/手柄时开启；完全由业务接管输入时关闭 |

配置页在字段发生变化时会自动写入 `Global Settings` 资产。运行时 UI 根节点读取这份配置，UI Builder 将其用于初始值或开启跟随时的同步值。

## 配置检查

面板无法打开时，按以下顺序检查：

1. 加载来源是否正确：Resources 检查相对目录；Addressables 检查 Group 和 Address；AssetBundle 检查包名及构建结果；自定义来源检查解析器和 Provider；
2. 预制体文件名是否与 C# 面板类型名一致；
3. 面板脚本是否挂在预制体根节点；
4. 面板类型是否继承 `BasePanel`；
5. 目标 `UISurfaceId` 是否已注册；
6. 面板的 `UIPanelLifetime.Persistent` 是否挂载到了持久级 Surface。
