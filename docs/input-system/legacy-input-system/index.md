# 旧版输入系统

旧版输入系统对应 Unity Legacy Input Manager，运行时入口是：

```csharp
FinkFramework.Runtime.LegacyInput.LegacyInputManager
```

它使用 `UnityEngine.Input` 轮询键盘和鼠标，将逻辑行为枚举映射到 `EventManager` 事件。旧版管理器不负责手柄按键映射，也不使用 Unity Input System 的 Action Map。

## 使用前提

旧版管理器在项目最终选择 Legacy Input Manager 时才会工作：

```csharp
using FinkFramework.Runtime.LegacyInput;

if (!LegacyInputManager.Instance.IsActive)
{
    // 当前项目使用的是新版输入后端。
    return;
}
```

如果项目安装了 Unity Input System Package，但 Framework 设置勾选了“强制关闭新输入系统”，旧版管理器仍然是当前有效后端。

## 定义行为与默认绑定

旧版输入系统使用 `Enum` 作为逻辑行为标识。建议为游戏动作定义一个专用枚举：

```csharp
public enum GameInputAction
{
    Confirm,
    Cancel,
    Jump
}
```

在启动阶段注册默认绑定：

```csharp
using FinkFramework.Runtime.LegacyInput;
using UnityEngine;

LegacyInputManager manager = LegacyInputManager.Instance;

manager.RegisterDefaultKeyboard(
    GameInputAction.Confirm,
    KeyCode.Return,
    LegacyInputTrigger.Down);

manager.RegisterDefaultMouse(
    GameInputAction.Cancel,
    1,
    LegacyInputTrigger.Down);

manager.RegisterDefaultKeyboard(
    GameInputAction.Jump,
    KeyCode.Space,
    LegacyInputTrigger.Down);
```

同一个行为只能注册一次默认值。默认值会被保留，用于恢复绑定和判断是否需要保存覆盖。注册成功后，如果该行为还没有当前绑定，默认值会立即成为当前绑定。

## 绑定类型和触发时机

### 键盘

```csharp
LegacyInputBinding binding = LegacyInputBinding.Keyboard(
    KeyCode.Space,
    LegacyInputTrigger.Down);
```

### 鼠标

```csharp
LegacyInputBinding binding = LegacyInputBinding.Mouse(
    0,
    LegacyInputTrigger.Down);
```

鼠标按钮编号通常为：`0` 左键、`1` 右键、`2` 中键。

| `LegacyInputTrigger` | 触发方式 |
| --- | --- |
| `Down` | 按下的当前帧 |
| `Up` | 抬起的当前帧 |
| `Held` | 持续按住的每一帧 |

旧版绑定只接受键盘 `KeyCode` 和鼠标按钮 `0`～`2`。鼠标 `KeyCode`、手柄 `KeyCode` 和无效按钮会被判定为无效绑定。

## 开启输入轮询

注册默认绑定后，调用 `ToggleInputCheck(true)` 开启正常输入检查：

```csharp
manager.ToggleInputCheck(true);
```

输入管理器每帧检查当前生效绑定。匹配成功后调用：

```csharp
EventManager.Instance.EventTrigger(action);
```

因此还需要在事件系统中注册与行为枚举匹配的回调：

```csharp
using FinkFramework.Runtime.Event;

EventManager.Instance.AddEventListener(
    GameInputAction.Confirm,
    OnConfirm);

private void OnConfirm()
{
    // 执行确认逻辑。
}
```

关闭 `ToggleInputCheck(false)` 只会停止正常绑定轮询，不会阻止交互式改键。这样可以在暂停游戏输入时仍然允许设置界面改键。

## 修改、移除和恢复绑定

修改当前绑定不会改变默认绑定：

```csharp
manager.SetKeyboardBinding(
    GameInputAction.Confirm,
    KeyCode.Space,
    LegacyInputTrigger.Down);

manager.SetMouseBinding(
    GameInputAction.Cancel,
    0,
    LegacyInputTrigger.Down);
```

也可以直接传入 `LegacyInputBinding`：

```csharp
manager.SetBinding(
    GameInputAction.Jump,
    LegacyInputBinding.Keyboard(
        KeyCode.J,
        LegacyInputTrigger.Held));
```

恢复和移除：

```csharp
manager.RemoveBinding(GameInputAction.Jump);
manager.ResetBinding(GameInputAction.Jump);
manager.ResetAllBindings();
```

`RemoveBinding` 只移除当前绑定，不删除默认绑定；`ResetBinding` 会把行为恢复为默认绑定。

## 查询绑定

```csharp
if (manager.TryGetBinding(
        GameInputAction.Confirm,
        out LegacyInputBinding current))
{
    Debug.Log(current);
}

if (manager.TryGetDefaultBinding(
        GameInputAction.Confirm,
        out LegacyInputBinding defaultBinding))
{
    Debug.Log(defaultBinding);
}

bool isDefault = manager.IsUsingDefaultBinding(GameInputAction.Confirm);
```

`TryGetBinding` 查询当前生效绑定，`TryGetDefaultBinding` 查询最初注册的默认值。行为不存在或当前已经解除绑定时，`TryGetBinding` 返回 `false`。

## 交互式改键

```csharp
LegacyInputBindingResult result = manager.StartRebind(
    GameInputAction.Confirm,
    rebindResult =>
    {
        if (rebindResult.Result == LegacyInputBindingResult.Success)
            Debug.Log($"改键成功：{rebindResult.Binding}");
    });
```

改键开始后，管理器等待下一次键盘或鼠标按键，并沿用该行为当前绑定的触发时机。默认最多等待 `10` 秒，使用不受 `Time.timeScale` 影响的时间。

可以自定义超时、是否允许冲突和取消键：

```csharp
manager.StartRebind(
    GameInputAction.Confirm,
    OnRebindFinished,
    timeoutSeconds: 15f,
    allowConflict: false,
    cancelKey: KeyCode.Escape);
```

默认情况下，Escape 会取消改键；传入 `KeyCode.None` 可以允许把 Escape 本身绑定为行为。

回调可能收到两类结果：

- `Conflict`：候选按键冲突，但会话不会结束，用户可以继续输入其他按键；
- `Success`、`Cancelled` 或 `TimedOut`：会话结束。

调用 `CancelRebind()` 可以主动取消当前会话。改键开始的当前帧不会被当作候选按键，避免点击“修改按键”按钮的输入被立即捕获。

## 冲突处理

旧版绑定以物理控制为单位判断冲突，触发时机不参与判断。例如，同一个键分别设置为 `Down` 和 `Held`，仍然算作冲突。

```csharp
LegacyInputBinding candidate = LegacyInputBinding.Keyboard(
    KeyCode.Space,
    LegacyInputTrigger.Down);

if (manager.HasConflict(GameInputAction.Jump, candidate))
{
    // candidate 与其他当前绑定占用了同一个物理控制。
}
```

默认情况下，注册默认绑定、设置绑定和改键都会拒绝冲突。需要允许冲突时，传入 `allowConflict: true`。

## 保存与恢复

旧版管理器提供基于 PlayerPrefs 的保底保存：

```csharp
// 应在所有默认绑定注册完成后读取。
int loadedCount = manager.LoadBindings();

// 将当前非默认绑定写入 PlayerPrefs。
manager.SaveBindings();

// 清除所有已保存覆盖。
manager.ClearSavedBindings();
```

默认绑定不会写入 PlayerPrefs。恢复为默认绑定时，对应的覆盖项会被删除。

正式项目建议将绑定数据写入项目自己的 Global 存档，而不是把 PlayerPrefs 作为主要存档方案。

## 生命周期注意事项

- 默认绑定应在调用 `LoadBindings` 前全部注册；
- 事件监听应在对象禁用或销毁时移除；
- `SetBinding`、`RegisterDefault` 和 `StartRebind` 在新版后端激活时会返回 `Inactive`；
- 旧版管理器只处理键盘和鼠标，不会捕获手柄或触摸作为可绑定控制；
- UI 导航、焦点、提交和返回行为应交给 UI 系统处理。

