# 输入系统概述

Fink Framework 输入系统由一层公共设备检测能力和两套输入映射后端组成：

```text
输入设备
   ↓
Unity Input System / Unity Legacy Input Manager
   ├─ DeviceDetectionManager：识别最近使用的设备类型
   ├─ NewInputManager：管理新版 Action 与 Binding
   └─ LegacyInputManager：管理旧版键鼠绑定并触发框架事件
```

本模块的文档按以下顺序组织：

1. [输入系统配置](/input-system/configuration/)：配置设备检测、鼠标移动阈值、冲突策略和输入后端。
2. [全局设备检测](/input-system/device-detection/)：读取当前主要设备，或监听设备类型变化。
3. [新版输入系统](/input-system/new-input-system/)：使用 Unity Input System 的 `InputActionAsset`、Action Map、Binding Override 和交互式改键。
4. [旧版输入系统](/input-system/legacy-input-system/)：使用 Unity `Input` API 管理键盘、鼠标绑定和框架事件。
5. [运行时 API](/input-system/api/)：集中查询两套后端和公共类型的完整公开接口。

## 两套输入后端

框架根据项目环境决定最终使用的输入后端：

| 后端 | 管理器 | 依赖 | 适合场景 |
| --- | --- | --- | --- |
| 新版 | `NewInputManager` | Unity Input System Package | 使用 `InputActionAsset`、多设备控制方案和跨平台改键 |
| 旧版 | `LegacyInputManager` | Unity Legacy Input Manager | 只需要键盘、鼠标和基于 `Enum` 的轻量事件映射 |

新版输入系统可用且没有被框架设置强制关闭时，`NewInputManager.IsActive` 为 `true`，`LegacyInputManager.IsActive` 为 `false`。没有安装新版输入系统，或在 Framework 设置中强制关闭新版输入系统时，情况相反。

两套管理器不会同时处理同一套业务输入。业务代码应根据项目选择的后端使用对应管理器，不要在同一个行为上同时注册两套绑定。

## 公共设备检测

`DeviceDetectionManager` 不负责定义游戏动作，只记录最近一次有效输入来自哪一类设备：

| `InputDeviceType` | 含义 |
| --- | --- |
| `Unknown` | 尚未检测到有效输入，或设备检测已关闭 |
| `KeyboardMouse` | 键盘按键、鼠标按钮或符合阈值的鼠标移动 |
| `Gamepad` | 手柄按钮或摇杆活动 |
| `Touch` | 触摸按下或有效移动 |

`CurrentDevice` 表示最近的操作来源，不表示设备是否连接。需要切换操作提示、控制器图标或 UI 交互模式时，应使用 [全局设备检测](/input-system/device-detection/) 中的接口。

## 如何选择

- 项目已经使用 `.inputactions`、`PlayerInput` 或 Action Map：使用 [新版输入系统](/input-system/new-input-system/)。
- 项目只需要按键按下、抬起或持续按住，并希望用枚举触发 `EventManager`：使用 [旧版输入系统](/input-system/legacy-input-system/)。
- 只需要判断玩家当前使用键鼠、手柄还是触摸：使用 [全局设备检测](/input-system/device-detection/)，不必注册输入映射。
- 需要 UI 导航、焦点、提交和返回：使用 [UI 系统的输入与焦点 API](/ui-system/basic-usage/#返回与输入)，不要用输入映射管理器替代 UI 导航系统。
