# 数学工具（Math）

`MathUtil` 提供 Unity `Mathf` 和常用 `Physics` 查询之外的轻量数学辅助方法，覆盖数值范围、百分比、区间映射、插值、角度转换、平面距离、屏幕边界、扇形检测和范围查询等场景。

```csharp
float progress = MathUtil.Percent01(current, min, max);
float value = MathUtil.Remap(input, 0f, 1f, -10f, 10f);
bool near = MathUtil.CheckObjDistance(
    player.position,
    target.position,
    5f);
```

## 1. 数值范围处理

### 1.1 Clamp

`Clamp` 将数值限制在 `[min, max]` 闭区间内，提供 `float`、`int` 和 `double` 重载：

```csharp
float value = MathUtil.Clamp(12.5f, 0f, 10f);
// value == 10f

int count = MathUtil.Clamp(12, 0, 10);
// count == 10
```

它与 `Mathf.Clamp` 的使用目的相同，但补充了 `int` 和 `double` 版本。

### 1.2 InRange

`InRange` 判断数值是否位于包含边界的 `[min, max]` 区间：

```csharp
bool valid = MathUtil.InRange(5, 0, 10);
// true

bool edge = MathUtil.InRange(0f, 0f, 1f);
// true，边界包含在内
```

该方法提供 `float`、`int` 和 `double` 重载。

## 2. 百分比与区间映射

### 2.1 Percent01

`Percent01` 将值转换为相对区间的位置：

```csharp
float percent = MathUtil.Percent01(30f, 0f, 100f);
// 0.3f
```

计算公式为：

```text
(value - min) / (max - min)
```

该方法**不会自动 Clamp**。如果 `value` 超出输入区间，结果可能小于 `0` 或大于 `1`。当 `min` 和 `max` 几乎相等时，方法返回 `0`，避免除零。

需要限制到 `0~1` 时可以组合使用：

```csharp
float percent = MathUtil.Clamp(
    MathUtil.Percent01(value, min, max),
    0f,
    1f);
```

### 2.2 PercentToValue

`PercentToValue` 根据百分比反推出目标区间中的值，并会先将百分比限制在 `0~1`：

```csharp
float value = MathUtil.PercentToValue(
    0.75f,
    0f,
    200f);
// 150f
```

传入 `-1` 会按 `0` 处理，传入 `2` 会按 `1` 处理。

### 2.3 Remap

`Remap` 将一个区间中的值线性映射到另一个区间：

```csharp
float value = MathUtil.Remap(
    5f,
    0f,
    10f,
    0f,
    1f);
// 0.5f
```

`Remap` 不会限制输入范围，因此也支持外插：

```csharp
float value = MathUtil.Remap(
    15f,
    0f,
    10f,
    0f,
    1f);
// 1.5f
```

当输入区间的两端几乎相等时，方法返回目标区间的 `toMin`。

## 3. 插值与平滑

### 3.1 LerpUnclamped

`LerpUnclamped` 执行不限制 `t` 的线性插值：

```csharp
float value = MathUtil.LerpUnclamped(
    0f,
    10f,
    1.5f);
// 15f
```

适合外插预测、过冲和回弹等效果。与 `Mathf.Lerp` 不同，`t` 不会被限制在 `0~1`。

### 3.2 SmoothProgress

`SmoothProgress` 让当前值按比例逼近目标值：

```csharp
float next = MathUtil.SmoothProgress(
    current: 0.35f,
    target: 0.9f,
    speed: 0.05f);
```

实际计算为：

```text
current + (target - current) * speed
```

默认目标值为 `0.9`，默认速度为 `0.1`。当 `speed` 位于 `0~1` 时，数值会逐步逼近目标；方法本身不会额外 Clamp，也不会强制保证不越过目标，因此不要传入大于 `1` 的速度来模拟严格的平滑限制。

常见用途包括：

- Loading 页面模拟进度；
- AI 蓄力条；
- UI 数值缓动；
- 需要逐步逼近目标的状态显示。

## 4. 平面类型

空间相关方法使用 `MathUtil.PlaneType` 指定参与计算的坐标轴：

| 类型 | 参与的坐标 | 常见用途 |
| --- | --- | --- |
| `XY` | X、Y | 2D 俯视或平面逻辑 |
| `XZ` | X、Z | 3D 地面游戏 |
| `YZ` | Y、Z | 侧向平面逻辑 |
| `XYZ` | X、Y、Z | 完整三维计算 |

未显式传入时，距离和扇形检测默认使用 `XYZ`。

## 5. 角度与弧度

```csharp
float radians = MathUtil.Deg2Rad(180f);
float degrees = MathUtil.Rad2Deg(Mathf.PI);
```

方法直接使用 Unity 的 `Mathf.Deg2Rad` 和 `Mathf.Rad2Deg` 换算，返回 `float`。

## 6. 距离计算

### 6.1 GetObjDistance

`GetObjDistance` 计算两个点之间的距离，并支持按平面忽略某个坐标轴：

```csharp
float groundDistance = MathUtil.GetObjDistance(
    player.position,
    target.position,
    MathUtil.PlaneType.XZ);

float distance3D = MathUtil.GetObjDistance(
    player.position,
    target.position);
```

`XZ` 会忽略高度差，适合地面移动和攻击范围计算。

### 6.2 CheckObjDistance

`CheckObjDistance` 判断两点距离是否小于等于指定阈值：

```csharp
bool inRange = MathUtil.CheckObjDistance(
    player.position,
    target.position,
    5f,
    MathUtil.PlaneType.XZ);
```

该方法使用平方距离比较，避免为了判断范围而执行平方根运算。距离边界包含在内；距离等于 `dis` 时返回 `true`。

## 7. 屏幕边界判断

`IsWorldPosOutScreen` 判断世界坐标点是否位于相机视口外：

```csharp
bool outside = MathUtil.IsWorldPosOutScreen(
    target.position);
```

不传相机时使用 `Camera.main`，也可以指定相机：

```csharp
bool outside = MathUtil.IsWorldPosOutScreen(
    target.position,
    uiCamera);
```

以下情况会返回 `true`：

- 点位于屏幕范围之外；
- 点位于相机背后，即投影结果 `z <= 0`；
- 没有可用相机。

屏幕边界上的点被视为可见范围内。

## 8. 扇形与圆锥范围检测

`IsInSectorRange` 同时判断目标是否在半径和角度范围内：

```csharp
bool detected = MathUtil.IsInSectorRange(
    center: enemy.position,
    forward: enemy.forward,
    targetPos: player.position,
    radius: 8f,
    angle: 60f,
    plane: MathUtil.PlaneType.XZ);
```

参数说明：

- `pos`：扇形或圆锥中心；
- `forward`：朝向；
- `targetPos`：待检测目标位置；
- `radius`：最大距离；
- `angle`：夹角，单位为度；
- `plane`：检测平面，默认 `XYZ`；
- `gizmosToggle`：是否请求调试可视化，默认 `true`。

检测同时满足以下条件时返回 `true`：

1. 目标没有超出半径；
2. 目标方向与 `forward` 的夹角不超过 `angle / 2`。

它适合敌人视野、攻击扇形、技能范围和三维视锥等判断。

## 9. Physics 射线查询

`RayCast` 和 `RayCastAll` 使用泛型回调，将命中结果转换为 `GameObject`、`Collider` 或目标物体上的组件。

### 9.1 RayCast

```csharp
Ray ray = new Ray(origin, direction);

MathUtil.RayCast<Collider>(
    ray,
    collider => Debug.Log(collider.name),
    maxDistance: 30f);
```

也可以直接获取命中的 GameObject：

```csharp
MathUtil.RayCast<GameObject>(
    ray,
    target => Debug.Log(target.name),
    30f);
```

当 `T` 不是 `GameObject` 或 `Collider` 时，方法会在命中的 GameObject 上调用 `GetComponent<T>()`：

```csharp
MathUtil.RayCast<EnemyController>(
    ray,
    enemy =>
    {
        if (enemy != null)
            enemy.Alert();
    },
    30f);
```

只有命中时才会调用回调；未命中时不会回调。当前泛型约束为 `where T : class`，需要原始 `RaycastHit` 结构体时请直接使用 Unity 的 `Physics.Raycast` API。

### 9.2 RayCastAll

```csharp
MathUtil.RayCastAll<Collider>(
    ray,
    collider => Debug.Log($"Hit: {collider.name}"),
    maxDistance: 50f);
```

命中的每个结果都会调用一次回调。方法内部使用 `Physics.RaycastNonAlloc` 和数组池，命中数量超过当前缓冲区时会自动扩容。

两个方法都支持层级遮罩：

```csharp
MathUtil.RayCast<Collider>(
    ray,
    OnHit,
    30f,
    layerMask: LayerMask.GetMask("Enemy"),
    gizmosToggle: false);
```

`layerMask` 默认值为 `~0`，表示检测所有层。

## 10. 范围查询

### 10.1 OverlapBox

```csharp
MathUtil.OverlapBox<Collider>(
    center: transform.position,
    rotation: transform.rotation,
    halfExtents: new Vector3(2f, 1f, 2f),
    callBack: collider => Debug.Log(collider.name));
```

### 10.2 OverlapSphere

```csharp
MathUtil.OverlapSphere<GameObject>(
    center: transform.position,
    radius: 3f,
    callBack: target => Debug.Log(target.name));
```

两种范围查询都支持：

- `Collider` 结果；
- `GameObject` 结果；
- 命中对象上的任意组件类型；
- `layerMask` 过滤；
- 每个命中结果调用一次回调。

当前实现使用 `QueryTriggerInteraction.Collide`，因此触发器 Collider 也会参与查询。若泛型组件在命中对象上不存在，回调可能收到 `null`。

## 11. Gizmos 调试可视化

扇形检测、射线查询和范围查询都可以将结果提交给框架的 Gizmos 可视化工具。相关方法的 `gizmosToggle` 默认值为 `true`：

```csharp
MathUtil.OverlapSphere<Collider>(
    transform.position,
    5f,
    OnHit,
    gizmosToggle: true);
```

可视化需要同时满足：

1. `gizmosToggle == true`；
2. `EnvironmentState.DebugMode == true`；
3. 当前运行环境包含 Unity Editor 的可视化代码。

绘制内容包括：

- `IsInSectorRange`：扇形或圆锥轮廓，并根据命中结果显示颜色；
- `RayCast` / `RayCastAll`：射线方向、最大距离和命中状态；
- `OverlapBox`：带旋转的盒体范围和命中状态；
- `OverlapSphere`：球体范围和命中状态。

这些图形只用于 Unity Editor 的 Scene 视图调试，不是运行时渲染效果。更多绘制控制参见[可视化工具（Gizmos）](/utilities/gizmos/)。

## 12. 使用建议

- 需要严格限制百分比时，对 `Percent01` 的结果自行 `Clamp`；
- `PercentToValue` 适合把 UI 的 `0~1` 进度转换为实际数值；
- `Remap` 不会限制输入，可用于外插，但需要边界限制时先自行 Clamp；
- `SmoothProgress` 的 `speed` 建议使用 `0~1` 范围；
- 地面游戏的距离和扇形检测通常使用 `PlaneType.XZ`；
- 范围判断优先使用 `CheckObjDistance`，避免不必要的开方；
- Physics 泛型查询使用 `Collider`、`GameObject` 或组件类型；需要 `RaycastHit` 时使用 Unity 原生 API；
- 高频查询时合理设置 `layerMask`，减少无关碰撞体参与；
- Gizmos 只用于调试，正式运行时不要依赖可视化回调；
- 射线和范围查询的回调可能收到 `null` 组件，应在业务代码中检查。
