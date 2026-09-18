# 日志工具（Log）

`LogUtil` 为 Fink Framework 提供统一的日志输出入口，支持模块标签、日志级别、彩色富文本标记和基于 `EnvironmentState.DebugMode` 的环境过滤。

相比直接调用 `Debug.Log`，`LogUtil` 可以让框架和业务日志保持统一格式，并在没有显式传入模块名时尝试从调用栈识别调用类。

## 1. 日志级别

| 方法 | Unity 输出类型 | 默认行为 | 标记 |
| --- | --- | --- | --- |
| `Log` | `Debug.Log` | DebugMode 关闭时默认不输出 | 蓝色模块标签 |
| `Info` | `Debug.Log` | DebugMode 关闭时默认不输出 | 蓝色模块标签 |
| `Success` | `Debug.Log` | DebugMode 关闭时默认不输出 | 绿色模块标签和 `✓` |
| `Warn` | `Debug.LogWarning` | 默认强制输出 | 橙色模块标签和 `!` |
| `Error` | `Debug.LogError` | 始终输出 | 红色模块标签和 `✗` |

所有日志都会带有模块标签：

```text
[DataFilesUtil] 已初始化本地数据
```

标签颜色使用 Unity Console 支持的 Rich Text 标签；日志窗口关闭 Rich Text 显示时，颜色可能不会呈现，但日志内容仍然保留。

## 2. 基本用法

```csharp
using FinkFramework.Runtime.Utils;

LogUtil.Log("开始执行");
LogUtil.Info("开始加载配置");
LogUtil.Success("配置加载完成");
LogUtil.Warn("缺少可选配置，将使用默认值");
LogUtil.Error("配置加载失败");
```

`Log` 和 `Info` 当前使用相同的输出通道和过滤规则，保留两个名称主要是为了适配不同语义的调用场景。

## 3. 指定模块名

当日志来自公共工具、异步回调或复杂调用链时，可以显式传入模块名，让输出标签稳定可控：

```csharp
LogUtil.Info(
    "DataLoader",
    "数据表加载完成");

LogUtil.Success(
    "ExcelTool",
    "表格解析完成");

LogUtil.Warn(
    "ResManager",
    "资源缓存未找到");

LogUtil.Error(
    "SaveManager",
    "存档写入失败");
```

所有日志级别都同时提供自动模块名和显式模块名两种重载。

## 4. DebugMode 与 force

`EnvironmentState.DebugMode` 根据 Unity 编译环境决定：

- Unity Editor 或 `DEVELOPMENT_BUILD`：`DebugMode = true`；
- 正式构建：`DebugMode = false`。

### 4.1 Info、Log 和 Success

这三类日志默认遵循 DebugMode。发布环境需要保留时传入 `force: true`：

```csharp
LogUtil.Info(
    "构建完成，必须保留此日志",
    force: true);

LogUtil.Success(
    "Build",
    "数据导出完成",
    force: true);
```

### 4.2 Warn

`Warn` 的 `force` 默认值是 `true`，因此以下调用在发布环境也会输出：

```csharp
LogUtil.Warn("连接失败，将在下次重试");
```

如果某个警告只希望在 DebugMode 下显示，需要显式传入 `force: false`：

```csharp
LogUtil.Warn(
    "调试",
    "临时状态检查未通过",
    force: false);
```

### 4.3 Error

`Error` 没有 `force` 参数，始终使用 `Debug.LogError` 输出：

```csharp
LogUtil.Error(
    "DataLoader",
    "关键数据读取失败");
```

## 5. 自动识别模块名

没有传入模块名时，`LogUtil` 会扫描调用栈，尝试找到第一个不属于 `LogUtil` 自身的类型，并使用其类名作为标签：

```csharp
public class DataLoader
{
    public void Load()
    {
        LogUtil.Info("开始加载");
    }
}
```

输出标签通常为：

```text
[DataLoader] 开始加载
```

实现会对以下常见编译生成类型进行外层类名恢复：

- lambda 生成的匿名类；
- 闭包 `DisplayClass`；
- `async/await` 状态机类型；
- 通过委托执行的普通回调。

## 6. 自动识别的边界

调用栈解析属于尽力识别，不应当当作稳定的业务标识。以下场景可能出现 `Unknown`、编译生成类型或无法还原到预期类名：

- 通过 Reflection 或 `MethodInfo.Invoke` 调用；
- Unity Inspector 绑定的 UnityEvent 方法；
- Unity 引擎内部回调；
- IL2CPP Release 构建中的栈帧优化；
- 某些 AOT wrapper 或平台生成代码；
- 复杂的异步、任务和原生边界调用。

如果模块名用于线上排查、自动化日志检索或跨层公共代码，建议显式传入模块名：

```csharp
LogUtil.Error(
    "InventoryService",
    "物品扣除失败");
```

这样不会依赖调用栈结构，也不会影响日志的其他行为。

## 7. 调用方缓存

自动模块识别会根据调用栈签名缓存解析结果，缓存使用 `ConcurrentDictionary<int, string>`，可避免相同调用路径重复解析类型名称。

这只说明调用方名称缓存容器支持并发访问，不代表 Unity 的所有日志输出场景都适合从任意线程调用。涉及 Unity 对象、场景状态或其他 Unity API 的日志，仍应遵循项目自身的主线程约束。

如果调用频率很高，建议：

- 直接传入固定模块名；
- 避免在每帧循环中大量输出日志；
- 将高频调试信息放在 DebugMode 条件下；
- 发布版本只保留必要的强制日志、警告和错误。

## 8. 格式示例

下面是各级别的逻辑输出形式：

```text
[PlayerSystem] 开始初始化
[PlayerSystem] 资源加载完成 ✓
[PlayerSystem] 缺少可选配置 !
[PlayerSystem] 初始化失败 ✗
```

实际模块标签和消息会通过 Unity Rich Text 颜色显示：

- `Log` / `Info`：`#87CEFA`；
- `Success`：`#00FF7F`；
- `Warn`：`#FFA500`；
- `Error`：`#FF4500`。

## 9. 使用建议

- 框架模块和公共服务优先显式传入模块名；
- 普通业务类可以使用自动识别模块名；
- 发布环境需要保留普通信息时使用 `force: true`；
- `Warn` 默认会输出，如需受 DebugMode 控制必须传 `force: false`；
- `Error` 始终输出，不要用它代替普通流程信息；
- 不要在高频循环中持续打印日志，以免影响 Console 和运行性能；
- 不要把自动识别出的类名当作线上稳定标识；
- 需要统一关闭普通日志时，应依赖 DebugMode，而不是在每个调用点手动判断。
