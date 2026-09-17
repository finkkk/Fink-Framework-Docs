# 可视化工具（Gizmos）

编辑器可视化工具用于在 Scene 视图绘制运行时查询的调试范围。通过 `GizmosDrawer.RequestDraw` 提交一次绘制请求，再使用 `DrawRay`、`DrawBox`、`DrawSphere` 或 `DrawSector` 绘制结果。

```csharp
using FinkFramework.Editor.Modules.Visualization;

GizmosDrawer.RequestDraw(() =>
{
    GizmosDrawer.DrawSphere(transform.position, 3f, true);
});
```

`MathUtil` 的 Physics 查询可以将 `gizmosToggle` 设为 `true`，由框架自动把查询范围交给可视化工具。`SetFeature` 和 `ResetFeatures` 可控制不同绘制类型是否显示；这些 API 只在 Unity 编辑器环境下有意义。
