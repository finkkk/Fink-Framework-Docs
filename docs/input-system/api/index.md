# 输入系统运行时 API

本页列出输入系统对业务开放的运行时 API，包括设备状态查询、设备变化事件、键鼠事件配置和下一次输入捕获。

运行时入口：`FinkFramework.Runtime.Input` 命名空间下的 `DeviceDetectionManager`、`InputManager` 和 `InputInfo`。

## 1. 设备检测 API

| API | 类型 | 说明 |
| --- | --- | --- |
| `DeviceDetectionManager.Instance` | `DeviceDetectionManager` | 获取设备检测单例 |
| `CurrentDevice` | `InputDeviceType` | 最近一次有效输入设备 |
| `IsDetectionEnabled` | `bool` | 当前是否启用全局设备检测 |
| `DeviceChanged` | `Action<InputDeviceType, InputDeviceType>` | 设备类别发生变化时触发 |

设备枚举：

```csharp
public enum InputDeviceType
{
    Unknown,
    KeyboardMouse,
    Gamepad,
    Touch
}
```

## 2. 键鼠绑定 API

| API | 说明 |
| --- | --- |
| `InputManager.Instance` | 获取键鼠输入管理单例 |
| `ToggleInputCheck(bool)` | 开启或关闭已注册输入的轮询 |
| `ChangeKeyboardInfo(Enum, KeyCode, E_InputType)` | 注册或修改键盘按键 |
| `ChangeMouseInfo(Enum, int, E_InputType)` | 注册或修改鼠标按键 |
| `RemoveInputInfo(Enum)` | 移除指定业务事件的输入配置 |
| `GetInputInfo(UnityAction<InputInfo>)` | 获取下一次键盘或鼠标输入 |

`InputManager` 检测到输入后，会调用 `EventManager.Instance.EventTrigger(eventType)`。因此还需要使用 `EventManager.AddEventListener(...)` 注册与事件标识匹配的回调。

## 3. InputInfo

`InputInfo` 描述一次键鼠输入配置或捕获结果：

| 字段 | 说明 |
| --- | --- |
| `keyOrMouse` | 输入来源，`Key` 或 `Mouse` |
| `inputType` | 触发方式，`Down`、`Up` 或 `Always` |
| `key` | 键盘 `KeyCode` |
| `mouseID` | 鼠标按键编号，通常为 `0`、`1` 或 `2` |

## 4. 事件与生命周期

事件注册和输入配置不是同一件事：

1. 使用 `ChangeKeyboardInfo` 或 `ChangeMouseInfo` 配置输入；
2. 使用 `EventManager.AddEventListener` 注册业务回调；
3. 使用 `ToggleInputCheck(true)` 开始检测；
4. 对象销毁时移除事件监听和输入配置。

如果只移除输入配置而没有移除 `EventManager` 监听，事件中心仍可能保留业务回调；如果只移除事件监听而保留输入配置，输入仍会被轮询但不会触发有效业务逻辑。

