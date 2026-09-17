# 日志工具（Log）

`LogUtil` 统一输出框架日志，并自动附加模块标签。日志默认遵循 `EnvironmentState.DebugMode`：开发环境输出信息，正式构建中普通日志可被关闭；警告和错误默认保留。

```csharp
using FinkFramework.Runtime.Utils;

LogUtil.Info("开始加载配置");
LogUtil.Info("Data", "数据表加载完成");
LogUtil.Success("Data", "导出成功");
LogUtil.Warn("Data", "未找到可选配置");
LogUtil.Error("Data", "数据解析失败");
```

所有级别都提供“自动识别模块”和“指定模块”两种重载。需要在非调试环境强制输出 `Log`、`Info` 或 `Success` 时，将最后一个 `force` 参数设为 `true`。
