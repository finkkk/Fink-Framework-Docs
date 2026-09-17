# 输入系统概述

本页介绍 Fink Framework 输入系统的组成、输入后端选择、设备类型检测和键鼠事件绑定方式，帮助你区分“识别当前使用的设备”和“监听具体输入行为”这两类功能。

系统入口：设备类型检测使用 `DeviceDetectionManager.Instance`；需要注册键盘或鼠标按键事件时使用 `InputManager.Instance`。项目设置入口为 `Edit` → `Project Settings` → `Fink Framework` → `Input`。

## 1. 系统组成

输入系统包含两个相互独立的运行时能力：

| 能力 | 入口 | 用途 |
| --- | --- | --- |
| 设备类型检测 | `DeviceDetectionManager` | 判断最近一次有效操作来自键鼠、手柄还是触摸 |
| 键鼠事件绑定 | `InputManager` | 将键盘按键或鼠标按键映射为框架事件 |

设备类型检测会根据项目最终启用的输入后端选择适配器：项目启用 Input System Package 时读取新输入系统设备；否则读取 Unity Legacy Input Manager。`InputManager` 的键鼠事件绑定依赖 Unity Legacy Input Manager，适合项目已经采用 `UnityEngine.Input` 的场景。

## 2. 输入设备状态

框架使用 `InputDeviceType` 表示最近一次有效操作的设备类别：

| 值 | 含义 |
| --- | --- |
| `Unknown` | 尚未识别到有效输入，或设备检测已关闭 |
| `KeyboardMouse` | 键盘按键、鼠标按键或符合阈值的鼠标移动 |
| `Gamepad` | 手柄按键或摇杆首次越过激活阈值 |
| `Touch` | 触摸按下或有效移动 |

该状态表示“最近一次有效输入来自哪里”，不表示设备是否已连接。业务可以读取 `CurrentDevice`，也可以订阅 `DeviceChanged` 处理 UI 导航、提示图标或操作说明切换。

## 3. 输入事件流

`InputManager` 的事件流程如下：

```text
键盘 / 鼠标输入
      ↓
InputManager 按 InputInfo 检测 Down / Up / Always
      ↓
EventManager.EventTrigger(eventType)
      ↓
业务代码注册的 UnityAction
```

这种方式不负责定义游戏动作本身。业务需要先选择一个 `Enum` 作为事件标识，再通过 `ChangeKeyboardInfo` 或 `ChangeMouseInfo` 配置对应按键。

## 4. 与 UI 系统的关系

输入系统负责提供设备活动和基础键鼠事件；UI 系统负责将输入转换为指针交互、键盘/手柄导航、提交、取消和返回行为。

需要控制 UI 导航时，请使用 [UI 系统的输入与焦点 API](/ui-system/basic-usage/#返回与输入) 或 `UIManager.SetInputMode(...)`，不要直接通过 `InputManager` 控制 UI 面板。

## 5. 使用建议

- 需要切换键鼠、手柄和触摸提示时，使用 `DeviceDetectionManager`；
- 需要绑定确认、取消、攻击等离散键鼠行为时，使用 `InputManager` 与 `EventManager`；
- 需要支持移动端或跨平台读取设备活动时，优先使用设备检测 API；
- 需要使用 Input System Package 的 Action、Action Map 或重绑定工作流时，应直接使用 Unity Input System API，框架输入系统不替代完整的 Action 管理器。

