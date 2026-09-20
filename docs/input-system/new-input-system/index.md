# 新版输入系统

新版输入系统对应 Unity Input System Package，运行时入口是：

```csharp
FinkFramework.Runtime.InputSystem.NewInputManager
```

它围绕 `InputActionAsset` 管理 Action Map、Action、Binding Override、交互式改键、冲突检测和绑定持久化。

## 使用前提

新版管理器只有在以下条件同时满足时才会工作：

1. 项目已安装并启用 Unity Input System Package；
2. Framework 设置没有勾选“强制关闭新输入系统”；
3. 已通过 `Initialize` 绑定一个运行时 `InputActionAsset` 或 `PlayerInput`。

可以先检查当前后端：

```csharp
using FinkFramework.Runtime.InputSystem;

if (!NewInputManager.Instance.IsActive)
{
    // 当前项目使用的是旧版输入后端。
    return;
}
```

## 初始化管理器

### 使用 InputActionAsset

```csharp
using FinkFramework.Runtime.Input;
using FinkFramework.Runtime.InputSystem;
using UnityEngine.InputSystem;

public sealed class GameInputBootstrap
{
    public NewInputBindingResult Initialize(InputActionAsset inputActions)
    {
        return NewInputManager.Instance.Initialize(inputActions);
    }
}
```

`Initialize(InputActionAsset)` 默认会创建源资产的运行时副本，并在初始化成功后启用全部 Action Map。绑定覆盖只写入运行时副本，不会修改项目中的源 `.inputactions` 资产。

如果需要自己控制启用时机，可以关闭初始化后的自动启用：

```csharp
NewInputManager manager = NewInputManager.Instance;
NewInputBindingResult result = manager.Initialize(
    inputActions,
    enableAfterInitialization: false,
    cloneAsset: true);

if (result == NewInputBindingResult.Success)
    manager.EnableAll();
```

### 使用 PlayerInput

```csharp
using FinkFramework.Runtime.InputSystem;
using UnityEngine.InputSystem;

NewInputBindingResult result = NewInputManager.Instance.Initialize(playerInput);
```

`Initialize(PlayerInput)` 默认直接管理 `PlayerInput` 当前使用的 Actions，不额外克隆。传入 `cloneActions: true` 时，管理器会创建副本并暂时替换 `playerInput.actions`；调用 `Shutdown` 后会恢复原始资产。

### 关闭管理器

```csharp
NewInputManager.Instance.Shutdown();
```

`Shutdown` 会停止改键、解除 Action 事件转发，并释放管理器创建的运行时资产。外部传入且没有克隆的资产不会被销毁。

## Action Map 与 Action

初始化后可以启用或禁用全部 Action Map，也可以单独控制一个 Map：

```csharp
NewInputManager manager = NewInputManager.Instance;

manager.EnableAll();
manager.SetActionMapEnabled("Gameplay", true);
manager.SetActionMapEnabled("UI", false);
```

Action 可以按名称、GUID 字符串或 `Map/Action` 路径查询。需要长期保存引用或用于设置界面时，建议使用 Action GUID：

```csharp
if (manager.TryGetAction("Gameplay/Jump", out InputAction jump))
{
    Debug.Log(jump.name);
}
```

`IsInitialized` 表示是否已经有运行时资产；`RuntimeAsset` 提供当前管理的 `InputActionAsset`，主要用于读取，不建议绕过管理器直接修改绑定覆盖。

## 查询和显示绑定

绑定查询返回 `NewInputBindingInfo` 快照，包含 Action GUID、Binding GUID、默认路径、覆盖路径、生效路径、Binding Group、组合绑定信息、显示字符串和冲突信息。

```csharp
using System;
using System.Collections.Generic;
using FinkFramework.Runtime.InputSystem;

IReadOnlyList<NewInputBindingInfo> bindings =
    NewInputManager.Instance.GetBindings("Gameplay/Jump");

foreach (NewInputBindingInfo binding in bindings)
{
    Debug.Log($"{binding.BindingName}: {binding.DisplayString}");
}
```

设置界面应使用 `BindingId` 定位绑定，不要把 `BindingIndex` 当作持久化标识。索引只代表快照生成时绑定在 Action 中的位置。

需要单独获取显示文本时：

```csharp
string display = manager.GetBindingDisplayString(actionId, bindingId);
```

## 直接修改 Binding Override

新版输入系统不会修改源资产中的默认路径，而是对运行时绑定应用覆盖：

```csharp
NewInputBindingResult result = manager.ApplyBindingOverride(
    actionId,
    bindingId,
    "<Keyboard>/space");
```

`controlPath` 使用 Unity Input System 控制路径，例如：

- `<Keyboard>/space`
- `<Mouse>/leftButton`
- `<Gamepad>/buttonSouth`
- `<Gamepad>/leftStick`

组合绑定根节点不能直接应用路径覆盖，应修改组合部件，或使用交互式改键让管理器依次捕获各部件。

禁用和恢复绑定：

```csharp
manager.DisableBinding(actionId, bindingId);
manager.ResetBinding(actionId, bindingId);
manager.ResetAllBindingOverrides();
```

禁用绑定是应用空路径覆盖，默认路径仍保留，因此可以通过 `ResetBinding` 恢复。

## 交互式改键

最简单的改键方式是按 Action 名称开始监听：

```csharp
NewInputBindingResult startResult = manager.StartRebind(
    "Gameplay/Jump",
    result =>
    {
        if (result.Succeeded)
            Debug.Log($"改键成功：{result.AppliedPath}");
        else
            Debug.Log($"改键结束：{result.Result}");
    });
```

也可以按 Action 的绑定索引，或直接使用 Action GUID 和 Binding GUID：

```csharp
using FinkFramework.Runtime.Input;
using FinkFramework.Runtime.InputSystem;

manager.StartRebind(
    actionId,
    bindingId,
    options: new NewInputRebindOptions
    {
        TimeoutSeconds = 15f,
        ConflictMode = InputConflictMode.Strict,
        ConflictScope = NewInputConflictScope.ActionMap
    },
    callback: OnRebindFinished);
```

改键期间可以调用：

```csharp
manager.CancelRebind();
```

默认使用 Escape 取消，并排除指针位置、指针位移、触摸位置、触摸位移和鼠标点击计数等噪声控制。`NewInputRebindOptions` 在会话开始时会复制快照，之后修改原对象不会影响当前会话。

### 组合绑定

如果目标是组合绑定根节点，例如 `2DVector` 的 `Up`、`Down`、`Left`、`Right`，管理器会依次改绑所有组合部件。整个会话具有事务性：

- 全部部件成功后才提交会话结果；
- 取消、超时、严格冲突或失败会恢复会话开始前的完整覆盖；
- 警告模式允许冲突并继续改绑。

改键期间默认暂停资产中原本已启用的 Action Map，避免改键按键同时触发游戏动作；会话结束后只恢复原先启用的 Map。

## 冲突处理

可以在修改前预检查候选路径：

```csharp
if (manager.TryFindBindingConflict(
        actionId,
        bindingId,
        "<Keyboard>/space",
        out NewInputConflictInfo conflict))
{
    Debug.Log($"与 {conflict.ActionMapName}/{conflict.ActionName} 冲突");
}
```

冲突范围由 `NewInputConflictScope` 决定：

| 范围 | 检查范围 |
| --- | --- |
| `Action` | 目标 Action 的其他绑定 |
| `ActionMap` | 目标 Action Map 中的所有 Action |
| `Asset` | 整个运行时 `InputActionAsset` |

默认范围是 `ActionMap`。如果 `RespectBindingGroups` 为 `true`，只有 Binding Group 有交集的绑定才会被视为冲突；没有组信息的绑定会按可冲突处理。

冲突模式的结果如下：

| 结果 | 含义 |
| --- | --- |
| `Success` | 成功应用且没有检测到冲突 |
| `SuccessWithConflict` | 已应用，但存在冲突警告 |
| `Conflict` | 严格模式拒绝应用，目标绑定保持不变 |

## 事件

管理器会转发运行时资产中所有 Action 的三个阶段：

```csharp
manager.ActionStarted += OnActionStarted;
manager.ActionPerformed += OnActionPerformed;
manager.ActionCanceled += OnActionCanceled;

private void OnActionPerformed(InputAction.CallbackContext context)
{
    if (context.action.name == "Jump")
        Jump();
}
```

绑定改变时可以监听：

```csharp
manager.BindingChanged += OnBindingChanged;
manager.BindingsChanged += RefreshAllBindingLabels;
manager.RebindStarted += OnRebindStarted;
manager.RebindFinished += OnRebindFinished;
```

`BindingChanged` 适合刷新单条绑定，`BindingsChanged` 适合统一刷新整个设置界面。对象禁用或销毁时应解除事件订阅。

## 保存与恢复

### 推荐：由业务存档管理

导出和导入使用 Unity Input System 原生的 Binding Override JSON：

```csharp
string json = manager.ExportBindingOverridesJson();

// 将 json 写入项目自己的 Global 存档后，在启动时恢复。
manager.ImportBindingOverridesJson(json);
```

导入时会检查冲突。严格模式发现冲突会恢复导入前状态。

### 保底：PlayerPrefs

框架提供按 profile 保存的保底接口：

```csharp
manager.SaveBindingOverrides("Default");
manager.LoadBindingOverrides("Default");
manager.ClearSavedBindingOverrides("Default");
```

正式项目建议把 `ExportBindingOverridesJson()` 的结果写入项目的 Global 存档，而不是把输入配置作为 PlayerPrefs 的主要存储方案。
