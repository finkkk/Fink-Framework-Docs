# 输入系统配置

输入系统的公共配置位于 Unity 菜单：`Edit` → `Project Settings` → `Fink Framework` → `Input System`。

输入后端的强制关闭选项位于：`Edit` → `Project Settings` → `Fink Framework` → `Framework`。

![输入系统配置面板](/images/input-system/set.webp)

## 1. 全局输入设置

| 配置项 | 默认值 | 作用 |
| --- | --- | --- |
| 启用设备输入检测 | 开启 | 是否识别最近一次有效输入设备，并更新 `CurrentDevice` |
| 鼠标移动视为键鼠输入 | 开启 | 是否将鼠标移动计入键鼠活动 |
| 鼠标移动检测阈值（像素） | `2` | 单帧移动距离达到该值时才切换为键鼠 |
| 绑定冲突处理模式 | `Warning` | 新版输入系统未显式指定策略时，决定冲突绑定是警告还是拒绝 |

关闭“启用设备输入检测”后，`DeviceDetectionManager.CurrentDevice` 会回到 `Unknown`，并且不会继续发布设备活动。键盘、鼠标和手柄仍由各自的 Unity 输入后端处理；该选项只关闭框架的设备类型识别。

鼠标移动阈值用于过滤轻微抖动。阈值越小，鼠标移动越容易触发 `KeyboardMouse`；阈值越大，越不容易因为细小位移切换当前设备。鼠标按钮始终可以识别为键鼠输入，不受“鼠标移动视为键鼠输入”关闭影响。

冲突模式有两种：

| 模式 | 行为 |
| --- | --- |
| `Warning` | 应用绑定，并通过 `HasConflict`、`Conflict` 或 `SuccessWithConflict` 标记冲突 |
| `Strict` | 拒绝冲突绑定，保留修改前状态 |

该全局设置会作为 `NewInputManager` 的默认冲突策略。旧版输入系统的 `RegisterDefault`、`SetBinding` 和 `StartRebind` 都提供了自己的 `allowConflict` 参数，应以调用参数为准。

## 2. 输入后端选择

框架根据项目中是否启用 Input System Package，以及 Framework 设置中的强制选项，计算最终输入后端：

| 条件 | 最终后端 | 可用管理器 |
| --- | --- | --- |
| 已启用 Input System Package，且未强制关闭 | Unity Input System | `NewInputManager` |
| 未启用 Input System Package | Unity Legacy Input Manager | `LegacyInputManager` |
| 已安装 Input System Package，但 Framework 中强制关闭 | Unity Legacy Input Manager | `LegacyInputManager` |

输入后端强制关闭入口：`Edit` → `Project Settings` → `Fink Framework` → `Framework` → `强制关闭新输入系统`。

该选项会影响框架的最终环境判断。修改后建议重新进入 Play Mode，并检查对应管理器的 `IsActive` 属性。

## 3. 与 UI 导航的配置关系

UI Settings 中还包含“按输入设备自动管理导航交互”选项。它描述的是 UI 层如何根据设备类型管理导航交互，不是输入设备检测本身：

| 配置 | 作用 |
| --- | --- |
| Input System：启用设备输入检测 | 提供 `CurrentDevice` 和 `DeviceChanged` |
| UI Settings：按输入设备自动管理导航交互 | 允许 UI 层根据输入设备调整导航交互 |
| `UIManager.SetNavigationInteractionEnabled(...)` | 业务代码显式控制导航交互 |

如果关闭设备检测，依赖设备状态的 UI 自动策略无法根据设备变化切换；如果需要完全由业务控制 UI 导航，可以关闭 UI Settings 中的自动导航交互，并通过 `UIManager` 手动设置。

## 4. 配置检查

设备状态始终为 `Unknown` 时，按以下顺序检查：

1. `Input System` 设置中的“启用设备输入检测”是否开启；
2. `Framework` 设置是否强制关闭了新输入系统；
3. 当前平台是否实际产生了键盘、鼠标、手柄或触摸活动；
4. 鼠标移动是否小于当前检测阈值；
5. 新版后端的 `Mouse.current`、`Keyboard.current` 或 `Gamepad.current` 是否存在；
6. 是否在订阅事件前就错过了设备切换，或在 `OnDisable` 中取消了订阅。
