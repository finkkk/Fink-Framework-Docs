# 数学工具（Math）

`MathUtil` 提供范围、插值、角度、距离、屏幕边界和 Physics 查询等常用方法。

```csharp
float t = MathUtil.Percent01(current, min, max);
float value = MathUtil.Remap(input, 0f, 1f, -10f, 10f);
bool near = MathUtil.CheckObjDistance(player.position, target.position, 5f);
bool inside = MathUtil.IsInSectorRange(player.position, player.forward, target.position, 8f, 90f);
```

距离和扇形方法支持 `PlaneType.XY`、`XZ`、`YZ` 或 `XYZ`。`RayCast`、`RayCastAll`、`OverlapBox` 和 `OverlapSphere` 提供泛型回调，并可通过 `gizmosToggle` 请求在 Scene 视图中绘制调试图形。
