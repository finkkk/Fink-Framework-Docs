# 全局设备检测

全局设备检测用于回答一个问题：玩家最近一次有效操作来自键鼠、手柄还是触摸？

它由 `DeviceDetectionManager` 提供，与具体游戏动作无关，也不会替代新版或旧版输入映射。设备检测会根据框架最终选择的输入后端，自动使用对应的活动源。

## 基本接口

```csharp
using FinkFramework.Runtime.Input;

InputDeviceType current = DeviceDetectionManager.Instance.CurrentDevice;
bool enabled = DeviceDetectionManager.Instance.IsDetectionEnabled;
```

`CurrentDevice` 的值来自最近一次被检测到的有效活动：

| 值 | 含义 |
| --- | --- |
| `Unknown` | 尚未检测到有效输入，或设备检测已关闭 |
| `KeyboardMouse` | 键盘、鼠标按钮或符合阈值的鼠标移动 |
| `Gamepad` | 手柄按钮或摇杆活动 |
| `Touch` | 触摸按下或有效移动 |

这个状态描述的是“最近使用的设备类别”，不是连接状态。例如，手柄已经连接但玩家没有操作时，`CurrentDevice` 仍可能是 `Unknown` 或 `KeyboardMouse`。

## 监听设备切换

使用 `DeviceChanged` 监听设备类别变化。事件参数依次是旧设备和新设备，只有类别真正变化时才触发，不会因为同一设备持续输入而每帧触发。

```csharp
using FinkFramework.Runtime.Input;
using UnityEngine;

public sealed class ControlHint : MonoBehaviour
{
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
        UpdateHint(current);
    }

    private void UpdateHint(InputDeviceType device)
    {
        // 根据 device 切换键鼠、手柄或触摸提示。
    }
}
```

建议在 `OnEnable` 订阅、在 `OnDisable` 解除订阅。管理器会隔离每个订阅者的异常，但业务对象仍应及时解除监听，避免对象销毁后保留无效引用。

## 检测规则

### 新版 Input System

当项目最终使用 Unity Input System 时，框架读取以下设备：

- 触摸屏：主触摸按下，或触摸移动达到内部移动阈值；
- 鼠标：左键、右键、中键，或启用设置后的鼠标移动；
- 键盘：`Keyboard.current.anyKey.wasPressedThisFrame`；
- 手柄：常用面板按钮、肩键、扳机、方向键，以及左右摇杆首次越过激活阈值。

新版检测的优先级是触摸、指针、键盘、手柄。也就是说，同一帧同时产生多个设备活动时，优先采用前面的类别。

### 旧版 Input Manager

当项目最终使用 Unity Legacy Input Manager 时，框架读取：

- 手柄按钮：`JoystickButton0` 到 `JoystickButton19`；
- 触摸：`UnityEngine.Input.touchCount`；
- 鼠标按钮和鼠标位置；
- 键盘：`UnityEngine.Input.anyKeyDown`；
- 手柄摇杆：项目中的 `Horizontal` 或 `Vertical` 轴首次越过 `0.25` 的激活阈值。

旧版检测会优先处理明确的键鼠输入，再处理混合轴。这样可以避免 WASD 或方向键同时驱动默认轴时，被错误识别为手柄。

## 鼠标移动判定

项目设置中的“鼠标移动视为键鼠输入”决定单纯移动鼠标是否切换到 `KeyboardMouse`。开启后，单帧移动距离达到“鼠标移动检测阈值（像素）”才算有效活动，默认值为 `2`。

关闭该选项后，鼠标按钮仍然会识别为键鼠；只有鼠标移动不会改变当前设备。

## 设备检测关闭时的行为

关闭全局设备检测后：

- `IsDetectionEnabled` 返回 `false`；
- `CurrentDevice` 会回到 `Unknown`；
- 不再根据键鼠、手柄或触摸活动更新设备类型；
- 新版和旧版输入映射仍由各自后端独立负责。

因此，关闭设备检测不会关闭 `NewInputManager` 或 `LegacyInputManager`，也不会阻止游戏动作输入。

## 后端切换时的行为

设备检测器每帧确认当前最终输入后端。如果运行时环境从一个后端切换到另一个后端，检测器会先将当前设备重置为 `Unknown`，然后等待新后端产生下一次有效活动。

一般不建议在运行时切换输入后端；修改 Framework 设置后应重新进入 Play Mode。

