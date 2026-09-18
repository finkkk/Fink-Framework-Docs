# 可视化工具（Gizmos）

可视化工具用于在 Unity 的 **Scene 视图**中显示运行时查询的调试范围，帮助开发者检查射线、扇形、盒体和球体等检测结果。

该模块主要服务于编辑器调试，不负责游戏运行时的实际渲染。`MathUtil` 的射线、范围和扇形检测可以自动提交绘制请求，也可以通过 `GizmosAdapter` 为自定义运行时逻辑接入可视化。

目前支持的绘制类型：

- `Sector`：扇形或简化圆锥范围
- `Ray`：射线
- `Box`：旋转盒体
- `Sphere`：球体范围

---

## 1. 工作机制

运行时程序集不能直接引用 `UnityEditor`，因此框架将运行时查询和编辑器绘制分成两层：

```text
MathUtil 或自定义运行时逻辑
        ↓
GizmosAdapter
        ↓（编辑器自动绑定）
GizmosDrawerEditorBridge
        ↓
GizmosDrawer
        ↓
MonoManager 的 Gizmos 回调
        ↓
Scene 视图
```

`GizmosDrawerEditorBridge` 使用 `[InitializeOnLoad]` 自动完成委托绑定，不需要手动挂载或初始化脚本。

运行时与编辑器的职责如下：

| 部分 | 职责 |
| --- | --- |
| `GizmosAdapter` | Runtime 与 Editor 之间的安全桥接 |
| `GizmosDrawerEditorBridge` | 编辑器启动时绑定绘制委托 |
| `GizmosDrawer` | 记录绘制请求并调用 Unity Gizmos API |
| `MonoManager` | 在 Gizmos 生命周期中执行绘制请求 |

正式构建不会包含 Editor 绘制逻辑。`GizmosAdapter` 的委托字段和 `MathUtil` 中的绘制调用都受 `UNITY_EDITOR` 条件编译保护。

---

## 2. 配合 MathUtil 使用

这是最推荐的使用方式。只要开启对应方法的 `gizmosToggle`，MathUtil 就会在编辑器中自动提交绘制请求。

### 2.1 扇形检测

```csharp
bool hit = MathUtil.IsInSectorRange(
    center,
    forward,
    targetPosition,
    8f,
    60f,
    MathUtil.PlaneType.XZ,
    gizmosToggle: true
);
```

扇形会根据检测结果显示不同颜色，并支持 `XY`、`XZ`、`YZ` 和 `XYZ` 平面。

### 2.2 射线检测

```csharp
MathUtil.RayCast<Collider>(
    ray,
    collider =>
    {
        LogUtil.Info($"命中：{collider.name}");
    },
    30f,
    gizmosToggle: true
);
```

### 2.3 盒体和球体检测

```csharp
MathUtil.OverlapBox<Collider>(
    center,
    rotation,
    halfExtents,
    collider => { },
    gizmosToggle: true
);

MathUtil.OverlapSphere<Collider>(
    center,
    3f,
    collider => { },
    gizmosToggle: true
);
```

更多检测参数和泛型返回类型请参考[数学工具](../math/)。

---

## 3. 使用 GizmosAdapter 接入自定义逻辑

如果自定义运行时系统不使用 MathUtil，也可以直接调用 `GizmosAdapter`。

由于 Adapter 的委托只在 Unity 编辑器中编译，直接调用时应放在 `#if UNITY_EDITOR` 中：

```csharp
using FinkFramework.Runtime.Utils;
using FinkFramework.Runtime.Visualization;
using UnityEngine;

public static class DebugRangeDrawer
{
    public static void Draw(Vector3 position, Vector3 forward)
    {
#if UNITY_EDITOR
        GizmosAdapter.DrawRayAction?.Invoke(
            position,
            forward,
            5f,
            hit: true
        );

        GizmosAdapter.DrawSectorAction?.Invoke(
            position,
            forward,
            8f,
            60f,
            MathUtil.PlaneType.XZ,
            result: true
        );
#endif
    }
}
```

可用的桥接委托如下：

| 委托 | 参数 |
| --- | --- |
| `DrawRayAction` | 起点、方向、长度、是否命中 |
| `DrawSectorAction` | 位置、方向、半径、角度、平面、检测结果 |
| `DrawBoxAction` | 中心、旋转、半尺寸、是否命中 |
| `DrawSphereAction` | 中心、半径、是否命中 |

`GizmosAdapter` 属于 Runtime 接口；不要在 Runtime 程序集中直接引用 `GizmosDrawer`，因为后者属于 Editor 程序集。

---

## 4. Editor 工具中直接绘制

如果代码本身就是 Editor 工具，可以直接使用 `GizmosDrawer`：

```csharp
using FinkFramework.Editor.Modules.Visualization;
using UnityEngine;

GizmosDrawer.RequestDraw(() =>
{
    GizmosDrawer.DrawSphere(
        Vector3.zero,
        3f,
        hit: true,
        segments: 20
    );
});
```

也可以直接调用：

```csharp
GizmosDrawer.DrawRay(start, direction, 5f, hit: true);
GizmosDrawer.DrawBox(center, rotation, halfExtents, hit: false);
GizmosDrawer.DrawSector(
    center,
    forward,
    8f,
    60f,
    MathUtil.PlaneType.XZ,
    result: true,
    segments: 20
);
```

这部分 API 仅适用于 Editor 程序集，不建议在普通 Runtime 脚本中使用。

---

## 5. 绘制类型开关

可以单独控制某一类图形是否显示：

```csharp
GizmosDrawer.SetFeature(
    GizmosDrawer.GizmoFeature.Sector,
    true
);

GizmosDrawer.SetFeature(
    GizmosDrawer.GizmoFeature.Ray,
    false
);
```

支持的类型为：

- `GizmoFeature.Sector`
- `GizmoFeature.Ray`
- `GizmoFeature.Box`
- `GizmoFeature.Sphere`

查询当前开关状态：

```csharp
bool enabled = GizmosDrawer.IsFeatureEnabled(
    GizmosDrawer.GizmoFeature.Sphere
);
```

重置所有类型：

```csharp
GizmosDrawer.ResetFeatures(true);  // 全部开启
GizmosDrawer.ResetFeatures(false); // 全部关闭
```

`GizmosDrawer.EnableDrawer` 当前是只读开关，不能通过赋值动态修改。实际是否启用还受 `EnvironmentState.DebugMode` 和编辑器条件编译影响。

---

## 6. 绘制结果与默认参数

### 6.1 颜色约定

| 类型 | 命中 / 成功 | 未命中 / 失败 |
| --- | --- | --- |
| 扇形 | 黄色 | 蓝色 |
| 射线 | 绿色 | 红色 |
| 盒体 | 黄色 | 灰色 |
| 球体 | 品红色 | 灰色 |

颜色只用于调试结果区分，不代表 Unity 的物理层、材质或运行时状态。

### 6.2 平面与细分

扇形支持以下平面：

- `XY`：绕 Z 轴绘制
- `XZ`：绕 Y 轴绘制，适合常见 3D 地面场景
- `YZ`：绕 X 轴绘制
- `XYZ`：绘制简化的三维边界

扇形和球体的默认 `segments` 为 `20`。通过 Runtime 的 `GizmosAdapter` 调用时，Editor 桥接层也会统一使用 `20`；只有直接调用 `GizmosDrawer` 时，Editor 工具才可以传入其他细分数。

盒体使用 `halfExtents` 表示半尺寸，并按照传入的 `Quaternion` 旋转绘制线框盒。

---

## 7. 请求队列与绘制时机

可视化请求不是永久对象，而是一次性的绘制动作：

1. 查询方法或 Editor 工具提交绘制请求。
2. `MonoManager` 在 Gizmos 生命周期中执行请求。
3. 请求执行完成后自动清空队列。

因此：

- 想要持续显示范围，需要持续调用检测方法或提交绘制请求。
- 只调用一次，通常只会看到一次绘制结果。
- 不需要在场景中额外挂载可视化 MonoBehaviour。
- Scene 视图中的 Gizmos 按钮需要处于开启状态，否则 Unity 不会显示图形。

当前 `GizmosDrawer.DrawMode` 固定为 `Always`，实际绘制通过 `OnDrawGizmos` 执行；虽然内部保留了 `Selected` 模式的回调入口，但当前版本没有开放运行时切换。

---

## 8. 使用注意事项

- `gizmosToggle`、`EnvironmentState.DebugMode` 和 Unity 编辑器环境共同决定是否提交绘制。
- Runtime 代码直接使用 `GizmosAdapter` 时，必须用 `#if UNITY_EDITOR` 包裹。
- `GizmosDrawer` 属于 Editor 程序集，不能被 Runtime 程序集引用。
- 可视化只用于调试，不要把绘制回调当作游戏逻辑执行入口。
- 细分数过大或每帧提交大量请求会增加编辑器 Scene 视图的绘制开销。
- 正式构建会剔除 Editor 绘制桥接和 Gizmos 绘制代码。

---

## 9. 总结

可视化工具提供了一条清晰的 Runtime → Editor 调试链路：

- MathUtil 可以自动可视化常用检测范围。
- 自定义运行时系统可以通过 `GizmosAdapter` 接入绘制。
- Editor 工具可以直接使用 `GizmosDrawer`。
- `SetFeature`、`ResetFeatures` 和 `IsFeatureEnabled` 可以控制绘制类型。
- 绘制请求按 Gizmos 生命周期执行，并在完成后自动清理。
- 正式构建不会保留 Editor 绘制逻辑。

它适合调试 AI 视野、攻击范围、碰撞检测、射线命中和技能判定等空间逻辑。
