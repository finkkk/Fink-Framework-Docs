# 输入系统基础使用

本页介绍输入系统最常见的两种用法：监听最近一次有效输入设备，以及使用 `InputManager` 将键盘和鼠标按键绑定为业务事件。

使用入口：设备状态使用 `DeviceDetectionManager.Instance` 查询或订阅；键鼠事件使用 `InputManager.Instance` 配置，并通过 `EventManager` 注册业务回调。

## 1. 监听当前输入设备

读取当前设备：

```csharp
using FinkFramework.Runtime.Input;

InputDeviceType device = DeviceDetectionManager.Instance.CurrentDevice;
```

如果需要根据设备变化更新界面或操作提示，可以订阅 `DeviceChanged`，并在对象禁用时解除订阅：

```csharp
using FinkFramework.Runtime.Input;

private void OnEnable()
{
    DeviceDetectionManager.Instance.DeviceChanged += OnDeviceChanged;
}

private void OnDisable()
{
    DeviceDetectionManager.Instance.DeviceChanged -= OnDeviceChanged;
}

private void OnDeviceChanged(
    InputDeviceType previous,
    InputDeviceType current)
{
    UpdateControlHint(current);
}
```

事件参数依次为变化前和变化后的设备类型。事件只在设备类别发生变化时触发，不会因为同一设备持续输入而每帧触发。

## 2. 注册键盘和鼠标事件

`InputManager` 使用枚举作为业务事件标识。下面的示例将回车键绑定为确认，将鼠标左键绑定为取消：

```csharp
using FinkFramework.Runtime.Event;
using FinkFramework.Runtime.Input;
using UnityEngine;

public enum GameInputAction
{
    Confirm,
    Cancel
}

public sealed class InputExample : MonoBehaviour
{
    private void Awake()
    {
        InputManager input = InputManager.Instance;
        input.ChangeKeyboardInfo(
            GameInputAction.Confirm,
            KeyCode.Return,
            InputInfo.E_InputType.Down);
        input.ChangeMouseInfo(
            GameInputAction.Cancel,
            0,
            InputInfo.E_InputType.Down);
        input.ToggleInputCheck(true);

        EventManager.Instance.AddEventListener(
            GameInputAction.Confirm,
            OnConfirm);
        EventManager.Instance.AddEventListener(
            GameInputAction.Cancel,
            OnCancel);
    }

    private void OnDestroy()
    {
        EventManager.Instance.RemoveEventListener(
            GameInputAction.Confirm,
            OnConfirm);
        EventManager.Instance.RemoveEventListener(
            GameInputAction.Cancel,
            OnCancel);

        InputManager.Instance.RemoveInputInfo(GameInputAction.Confirm);
        InputManager.Instance.RemoveInputInfo(GameInputAction.Cancel);
    }

    private void OnConfirm() { }
    private void OnCancel() { }
}
```

`InputInfo.E_InputType` 有三种模式：

| 模式 | 触发时机 |
| --- | --- |
| `Down` | 按键按下的帧 |
| `Up` | 按键抬起的帧 |
| `Always` | 按键保持按下的每一帧 |

键盘使用 `KeyCode`，鼠标使用 `0`、`1`、`2` 分别表示鼠标左键、右键和中键。调用 `ToggleInputCheck(true)` 后，`InputManager` 才会开始轮询已注册的输入。

## 3. 运行时修改按键

同一个事件标识再次调用绑定方法会覆盖原来的按键配置，因此可以直接用于按键重绑定：

```csharp
InputManager.Instance.ChangeKeyboardInfo(
    GameInputAction.Confirm,
    KeyCode.Space,
    InputInfo.E_InputType.Down);
```

移除配置：

```csharp
InputManager.Instance.RemoveInputInfo(GameInputAction.Confirm);
```

## 4. 获取下一次输入

`GetInputInfo` 用于制作按键设置界面。调用后，框架会等待下一次键盘或鼠标按键，并通过回调返回 `InputInfo`；获取一次后监听自动结束：

```csharp
InputManager.Instance.GetInputInfo(info =>
{
    if (info.keyOrMouse == InputInfo.E_KeyOrMouse.Key)
    {
        Debug.Log($"收到按键：{info.key}");
    }
    else
    {
        Debug.Log($"收到鼠标按键：{info.mouseID}");
    }
});
```

该接口只适用于键盘和鼠标，不会返回手柄或触摸设备信息。制作完整的跨平台重绑定功能时，应使用 Unity Input System 的 Action 重绑定能力。

## 5. 使用注意

- `InputManager` 依赖 Unity Legacy Input Manager；项目最终启用 Input System Package 时不会执行 Legacy 键鼠轮询；
- `DeviceDetectionManager` 的设备检测开关与 `InputManager.ToggleInputCheck` 相互独立；
- 全局事件监听必须在对象销毁或禁用时解除，避免回调引用已销毁对象；
- UI 面板的导航、焦点和返回处理应使用 UI 系统 API，不要把面板交互直接写入 `InputManager`。

