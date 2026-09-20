# 输入系统运行时 API

本页集中列出输入系统对业务开放的公开运行时类型。具体使用流程请先阅读：

- [全局设备检测](/input-system/device-detection/)
- [新版输入系统](/input-system/new-input-system/)
- [旧版输入系统](/input-system/legacy-input-system/)

## 公共设备检测 API

命名空间：`FinkFramework.Runtime.Input`

### `DeviceDetectionManager`

| API | 类型 | 说明 |
| --- | --- | --- |
| `Instance` | `DeviceDetectionManager` | 获取设备检测单例 |
| `CurrentDevice` | `InputDeviceType` | 最近一次有效输入的设备类别 |
| `IsDetectionEnabled` | `bool` | 当前是否启用全局设备检测 |
| `DeviceChanged` | `Action<InputDeviceType, InputDeviceType>` | 设备类别发生变化时触发，参数为旧值和新值 |

### `InputDeviceType`

```csharp
public enum InputDeviceType
{
    Unknown,
    KeyboardMouse,
    Gamepad,
    Touch
}
```

### `InputConflictMode`

```csharp
public enum InputConflictMode
{
    Warning,
    Strict
}
```

`Warning` 允许绑定继续生效并返回冲突信息；`Strict` 拒绝冲突绑定。

## 新版输入系统 API

命名空间：`FinkFramework.Runtime.InputSystem`

### `NewInputManager` 状态和事件

| API | 类型 | 说明 |
| --- | --- | --- |
| `Instance` | `NewInputManager` | 获取新版管理器单例 |
| `IsActive` | `bool` | 当前最终环境是否使用新版输入系统 |
| `IsInitialized` | `bool` | 是否已初始化运行时 Action Asset |
| `IsRebinding` | `bool` | 是否正在交互式改键 |
| `RuntimeAsset` | `InputActionAsset` | 当前管理的运行时资产，只建议读取 |
| `ActionStarted` | `Action<InputAction.CallbackContext>` | 任意受管 Action 进入 Started 阶段 |
| `ActionPerformed` | `Action<InputAction.CallbackContext>` | 任意受管 Action 进入 Performed 阶段 |
| `ActionCanceled` | `Action<InputAction.CallbackContext>` | 任意受管 Action 进入 Canceled 阶段 |
| `BindingChanged` | `Action<NewInputBindingInfo>` | 单条绑定改变或恢复后触发 |
| `BindingsChanged` | `Action` | 一批绑定覆盖改变后触发 |
| `RebindStarted` | `Action<NewInputBindingInfo>` | 改键开始监听后触发 |
| `RebindFinished` | `Action<NewInputRebindResult>` | 改键结束后触发 |

### 初始化和 Action Map

| 方法 | 说明 |
| --- | --- |
| `Initialize(InputActionAsset, bool, bool)` | 使用资产初始化；默认克隆运行时副本并启用全部 Map |
| `Initialize(PlayerInput, bool)` | 使用 `PlayerInput` 当前 Actions 初始化 |
| `Shutdown()` | 停止改键、解除回调并释放管理器创建的资产 |
| `EnableAll()` | 启用全部 Action Map |
| `DisableAll()` | 禁用全部 Action Map，不清除覆盖 |
| `SetActionMapEnabled(string, bool)` | 按名称或 GUID 字符串启用或禁用 Action Map |
| `TryGetAction(string, out InputAction)` | 按名称、GUID 字符串或 `Map/Action` 查询 Action |
| `TryGetAction(Guid, out InputAction)` | 按 Action GUID 查询 Action |

### 绑定查询和修改

| 方法 | 说明 |
| --- | --- |
| `GetBindings(string)` | 返回指定 Action 的绑定快照 |
| `GetBindings(Guid)` | 按 Action GUID 返回绑定快照 |
| `TryGetBindingInfo(Guid, Guid, out NewInputBindingInfo)` | 按 Action GUID 和 Binding GUID 查询绑定 |
| `GetBindingDisplayString(Guid, Guid, DisplayStringOptions)` | 获取适合显示给玩家的控制名称 |
| `ApplyBindingOverride(...)` | 应用控制路径覆盖 |
| `DisableBinding(Guid, Guid)` | 通过空路径覆盖禁用绑定 |
| `ResetBinding(Guid, Guid)` | 移除目标绑定覆盖；组合根节点会恢复整组部件 |
| `ResetAllBindingOverrides()` | 移除运行时资产中的全部覆盖 |
| `TryFindBindingConflict(...)` | 预检查候选路径，不修改绑定 |

### 改键和持久化

| 方法 | 说明 |
| --- | --- |
| `StartRebind(string, Action<NewInputRebindResult>, NewInputRebindOptions)` | 按 Action 名称改绑首个顶层绑定 |
| `StartRebind(string, int, Action<NewInputRebindResult>, NewInputRebindOptions)` | 按 Action 名称和绑定索引改绑 |
| `StartRebind(Guid, Guid, NewInputRebindOptions, Action<NewInputRebindResult>)` | 按 GUID 改绑普通绑定或组合根节点 |
| `CancelRebind()` | 取消当前改键并恢复会话快照 |
| `ExportBindingOverridesJson()` | 导出 Unity Input System 覆盖 JSON |
| `ImportBindingOverridesJson(string, bool?)` | 导入覆盖 JSON，并按策略检查冲突 |
| `SaveBindingOverrides(string)` | 保存到 PlayerPrefs 配置档 |
| `LoadBindingOverrides(string, bool?)` | 从 PlayerPrefs 配置档读取 |
| `ClearSavedBindingOverrides(string, bool)` | 删除配置档，可选同时清除运行时覆盖 |

### `NewInputBindingInfo`

这是用于设置界面的只读绑定快照。常用属性如下：

| 属性 | 说明 |
| --- | --- |
| `ActionId` | 所属 Action 的稳定 GUID |
| `BindingId` | 绑定的稳定 GUID，持久化时应优先使用它 |
| `ActionMapName` / `ActionName` | 所属 Map 和 Action 名称 |
| `BindingName` | 组合部件名称，普通绑定通常为空 |
| `OriginalPath` | 资产声明的默认路径 |
| `OverridePath` | 当前覆盖路径 |
| `HasPathOverride` | 是否存在路径覆盖，包括空路径禁用 |
| `EffectivePath` | 当前真正生效的路径 |
| `Groups` | Binding Group 列表 |
| `DisplayString` | 适合直接展示给玩家的控制名称 |
| `DeviceLayoutName` / `ControlPath` | 显示名称对应的设备布局和控制路径 |
| `BindingIndex` | 当前索引，仅用于本次快照，不建议持久化 |
| `IsComposite` / `IsPartOfComposite` | 是否为组合根节点或组合部件 |
| `HasOverride` | 是否存在路径、处理器或交互覆盖 |
| `HasConflict` / `Conflict` | 当前是否存在冲突及第一条冲突信息 |

### `NewInputRebindOptions`

| 属性 | 默认值 | 说明 |
| --- | --- | --- |
| `TimeoutSeconds` | `10` | 每个普通绑定或组合部件的等待秒数 |
| `ConflictMode` | `Warning` | 冲突时允许并警告，或拒绝 |
| `AllowConflicts` | `true` | 兼容旧 API 的冲突开关；设为 `false` 会转为严格模式 |
| `RespectBindingGroups` | `true` | 是否只比较 Binding Group 有交集的绑定 |
| `DisableAllActionMaps` | `true` | 改键时是否暂停全部原本启用的 Map |
| `ConflictScope` | `ActionMap` | 冲突检查范围 |
| `CancelControlPath` | `<Keyboard>/escape` | 取消改键的控制路径 |
| `ExcludedControlPaths` | 指针和触摸噪声路径 | 排除的候选控制路径 |

### 新版结果类型

`NewInputBindingResult` 包括：

```text
Success                 成功
SuccessWithConflict     成功但存在冲突警告
Inactive                当前未启用新版后端
NotInitialized          尚未初始化运行时资产
InvalidAsset            资产为空或不可用
InvalidAction           Action 不存在
InvalidBinding          绑定或控制路径无效
BindingNotFound         绑定不存在
RebindInProgress        已有改键会话
NoRebindInProgress      当前没有改键会话
Conflict                严格模式下检测到冲突
Cancelled               改键被取消
TimedOut                改键超时
InvalidData             导入数据无效
Failed                  执行失败
```

`NewInputConflictScope` 有 `Action`、`ActionMap` 和 `Asset` 三个值，分别表示只检查当前 Action、当前 Action Map 或整个资产。

## 旧版输入系统 API

命名空间：`FinkFramework.Runtime.LegacyInput`

### `LegacyInputManager` 状态

| API | 类型 | 说明 |
| --- | --- | --- |
| `Instance` | `LegacyInputManager` | 获取旧版管理器单例 |
| `IsActive` | `bool` | 当前最终环境是否使用旧版输入后端 |
| `IsInputCheckEnabled` | `bool` | 是否开启正常绑定轮询 |
| `IsRebinding` | `bool` | 是否正在交互式改键 |
| `RebindingAction` | `Enum` | 当前正在改键的行为 |

### 绑定和查询

| 方法 | 说明 |
| --- | --- |
| `ToggleInputCheck(bool)` | 开启或关闭正常绑定轮询 |
| `RegisterDefaultKeyboard(...)` | 注册默认键盘绑定 |
| `RegisterDefaultMouse(...)` | 注册默认鼠标绑定 |
| `SetKeyboardBinding(...)` | 修改当前键盘绑定，不改变默认值 |
| `SetMouseBinding(...)` | 修改当前鼠标绑定，不改变默认值 |
| `SetBinding(...)` | 使用 `LegacyInputBinding` 修改当前绑定 |
| `RemoveBinding(Enum)` | 移除当前绑定，保留默认值 |
| `ResetBinding(Enum, bool)` | 恢复一个默认绑定 |
| `ResetAllBindings(bool)` | 全量恢复默认绑定 |
| `TryGetBinding(Enum, out LegacyInputBinding)` | 查询当前绑定 |
| `TryGetDefaultBinding(Enum, out LegacyInputBinding)` | 查询默认绑定 |
| `IsUsingDefaultBinding(Enum)` | 判断当前是否仍使用默认值 |
| `HasConflict(Enum, LegacyInputBinding)` | 检查候选绑定是否冲突 |

### 改键和持久化

| 方法 | 说明 |
| --- | --- |
| `StartRebind(...)` | 开始键盘或鼠标交互式改键 |
| `CancelRebind()` | 取消当前改键 |
| `SaveBindings()` | 保存非默认绑定覆盖到 PlayerPrefs |
| `LoadBindings(bool)` | 读取已注册默认值对应的保存覆盖，返回成功数量 |
| `ClearSavedBindings()` | 清除所有旧版绑定保存项 |

### `LegacyInputBinding`

| 属性或方法 | 说明 |
| --- | --- |
| `ControlType` | `Key` 或 `MouseButton` |
| `Trigger` | `Down`、`Up` 或 `Held` |
| `Key` | 键盘 `KeyCode` |
| `MouseButton` | 鼠标按钮编号 |
| `IsValid` | 当前描述是否可执行 |
| `Keyboard(KeyCode, LegacyInputTrigger)` | 创建键盘绑定 |
| `Mouse(int, LegacyInputTrigger)` | 创建鼠标绑定 |
| `UsesSameControl(LegacyInputBinding)` | 判断是否占用同一个物理控制 |
| `MatchesCurrentInput()` | 判断当前帧是否触发 |

### 旧版结果类型

`LegacyInputBindingResult` 包括：

```text
Success                 成功
Inactive                当前未启用旧版后端
InvalidAction           行为为空或未注册
InvalidBinding          绑定无效
Conflict                检测到冲突
BindingNotFound         绑定不存在
DefaultAlreadyRegistered 默认值已注册
RebindInProgress        已有改键会话
NoRebindInProgress      当前没有改键会话
Cancelled               改键被取消
TimedOut                改键超时
```

`LegacyInputRebindResult` 提供 `Action`、`Result` 和捕获到的 `Binding`。冲突结果是改键过程中的中间结果，回调收到后会话仍然继续。

## 生命周期原则

- 先初始化或注册绑定，再查询、改键和加载保存数据；
- 订阅管理器事件后，在对象禁用或销毁时解除订阅；
- 新版绑定持久化优先使用 `BindingId`，旧版绑定持久化使用行为枚举；
- `Inactive`、`NotInitialized`、`RebindInProgress` 等结果应由业务代码明确处理；
- 输入映射负责动作和绑定，UI 导航与焦点仍由 UI 系统负责。
