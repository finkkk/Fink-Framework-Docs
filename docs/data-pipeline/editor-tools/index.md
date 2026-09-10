# 面板工具使用

Fink Framework 内置了完整的数据处理工具面板，用于在 Unity 编辑器中以图形化、一键执行的方式完成：

**Excel → 自动生成 C# 代码 → 解析数据 → 导出 JSON / Binary。**

## 打开面板

在 Unity 顶部菜单选择：

```text
Fink Framework → 数据工具面板
```

![从 Unity 菜单打开数据工具面板](/images/data-pipeline/panel1.webp)

该窗口用于替代手动调用 `DataGenTool`、`DataParseTool`、`DataExportTool` 等工具，让数据管线更加自动化、可视化、可调试。

![数据工具面板](/images/data-pipeline/panel2.webp)

## 1. 面板概览

数据工具窗口主要包含三个区域：

- **主功能**：生成、解析和导出所有数据；
- **QA 验证**：对所有 Excel 表进行字段与数据合法性校验；
- **执行日志**：显示操作过程和结果，可导出为 TXT 文件。

## 2. 主功能区域

主功能区域包含四个按钮。

### 2.1 一键处理全部数据

按钮名称：`一键处理全部数据`

点击后会执行完整的数据管线流程：

1. 清空旧的导出数据；
2. 根据 Excel 表头生成对应的 C# 数据类和容器类；
3. 如果内部 C# 输出会触发 Unity 编译，则等待编译完成；
4. 读取并解析 Excel 实际数据；
5. 始终导出 JSON；
6. 如果全局数据模式为 Binary，则额外导出二进制文件；
7. 生成运行时数据清单并刷新资源数据库。

对应调用：

```csharp
DataHandleTool.HandleAllData();
```

**适用场景：**每次修改 Excel 后，建议使用此按钮更新游戏中的全部配置数据。

::: warning 清理范围
一键处理会清理 `FinkFramework_Data/AutoExport/`、持久化数据目录中的 `FinkFramework_Data/`，并在 Unity 编辑器中清理 `Assets/StreamingAssets/FinkFramework_Data/`。Excel 源文件目录 `FinkFramework_Data/DataTables/` 不会被删除。
:::

### 2.2 清空加密数据

按钮名称：`清空加密数据`

点击后会清空并重新创建以下目录：

- `Assets/StreamingAssets/FinkFramework_Data/`（Unity 编辑器环境）；
- `Application.persistentDataPath/FinkFramework_Data/`；
- `项目根目录/FinkFramework_Data/AutoExport/`。

对应调用：

```csharp
DataCleanTool.ClearExportedData();
```

**适用场景：**

- 想清理导出目录并重新开始；
- 怀疑导出的 JSON、Binary 或本地缓存过期、损坏时；
- 需要验证完整导出流程时。

这是清理操作，面板会在执行前弹出确认提示。

### 2.3 仅生成数据文件

按钮名称：`仅生成数据文件`

点击后只根据 Excel 表头生成 C# 数据类和容器类，不解析表格实际数据，也不导出 JSON 或 Binary。

对应调用：

```csharp
DataGenTool.GenerateAllData();
```

如果 C# 输出模式为内部输出，生成文件位于 `Assets` 内，Unity 会触发脚本编译；如果为外部输出，则不会触发 Unity 脚本编译。具体位置由[数据管线配置](/data-pipeline/configuration/)决定。

**适用场景：**

- 调试代码生成逻辑；
- 修改了字段名或字段类型；
- 在执行“仅解析导出数据”前，先生成或更新数据结构类。

### 2.4 仅解析导出数据

按钮名称：`仅解析导出数据`

此操作跳过 C# 数据类生成，只执行“读取现有类型 → 解析 Excel → 序列化 → 导出”阶段，适用于数据类结构已经稳定、只更新 Excel 内容的情况。

对应调用：

```csharp
DataExportTool.ExportAllData();
```

#### 2.4.1 读取已有 C# 数据结构

工具会根据 Excel 文件名查找对应的 `{ClassName}.cs` 和 `{ClassName}Container.cs`，并通过反射获取类型。如果类型不存在或无法找到，需要先点击“仅生成数据文件”。

涉及的类型包括：

- 单行数据类，例如 `TestData`；
- 数据容器类，例如 `TestDataContainer`；
- 嵌套字段所使用的自定义类型。

如果同时创建了多个包含嵌套结构的表格，请先确保所有相关数据类都已经生成并完成编译，再执行导出。

#### 2.4.2 解析 Excel 表格内容

工具会逐行读取实际数据，并执行：

- 字段类型解析；
- List、数组、Vector、Color、Dictionary 和自定义类解析；
- 解析警告与错误记录；
- 将解析结果通过反射写入数据对象；
- 创建完整的数据容器实例。

解析过程中出现错误时，该表不会写出不完整的运行时数据。

#### 2.4.3 根据全局设置导出文件

JSON 始终会导出，但位置取决于当前数据模式：

| 当前数据模式 | JSON 导出位置 |
| --- | --- |
| **JSON** | `Assets/StreamingAssets/FinkFramework_Data/DataJson/` |
| **Binary** | `项目根目录/FinkFramework_Data/AutoExport/DataJson/` |

在 Binary 模式下，工具还会导出二进制文件：

```text
Assets/StreamingAssets/FinkFramework_Data/DataBinary/
```

二进制文件的扩展名来自全局设置中的加密扩展名。JSON 由 `JsonExportTool` 处理，Binary 由 `BinaryExportTool` 处理。

#### 2.4.4 二进制加密

是否对 Binary 文件进行 AES 加密由全局设置中的“启用加密”决定：

- 开启：使用 AES 加密方式写出；
- 关闭：写出明文 Binary。

该设置只影响 Binary 文件，不影响 JSON 导出。

#### 2.4.5 导出完成后的刷新

导出成功后，工具会：

- 生成运行时数据清单，用于移动端定位 `StreamingAssets` 内的数据文件；
- 调用 `AssetDatabase.Refresh()` 刷新 Unity 资源数据库；
- 清理 `DataFilesUtil` 内部路径缓存，确保后续读取使用最新文件。

#### 2.4.6 与“一键处理全部数据”的区别

| 功能 | 仅解析导出数据 | 一键处理全部数据 |
| --- | --- | --- |
| 清空旧导出数据 | 否 | 是 |
| 生成 C# 类 | 否 | 是 |
| 等待重新编译 | 否 | 内部输出时会等待 |
| 导出 JSON | 是 | 是 |
| 导出 Binary | Binary 模式下 | Binary 模式下 |
| 生成运行时清单 | 是 | 是 |

## 3. QA 验证

按钮名称：`验证所有表格`

点击后会扫描 `FinkFramework_Data/DataTables/` 下的所有 Excel 表，并检查：

- 字段名是否为空、重复或包含非法字符；
- 字段类型是否可以解析；
- 数组、列表和字典格式是否正确；
- 每个实际数据单元格能否成功解析；
- 是否存在不支持的类型；
- 所有表格的通过、警告和错误统计。

对应调用：

```csharp
DataQATool.ValidateAllData();
```

QA 不会修改 Excel 源文件或导出运行时数据。

**适用场景：**

- 打包前的质量检查；
- Excel 调试阶段发现策划填写错误；
- 大量表格更新后，提前发现数据问题。

## 4. 执行日志区域

执行日志区域支持：

- 自动滚动；
- 富文本显示；
- 导出为 TXT 文件；
- 一键清空日志。

日志示例：

```text
[12:01:33] 执行操作：一键处理全部数据
[12:01:34] 生成所有数据成功
[12:01:34] 数据导出存储完成
```

点击“导出日志”后，选择保存位置即可生成 `DataToolLog.txt`。日志导出由面板内部的 `ExportLog()` 方法执行。

## 5. 相关工具脚本

| 模块 | 职责 |
| --- | --- |
| **DataGenTool** | 根据 Excel 表头生成 C# 数据类和容器类，不解析实际数据。 |
| **DataParseTool** | 将 Excel 单元格内容转换为实际 C# 对象，支持基础类型、集合、JSON、自定义类、Vector 和 Color 等。 |
| **DataExportTool** | 读取已有 C# 类型，解析 Excel 数据，始终导出 JSON，并在 Binary 模式下额外导出 Binary。 |
| **DataQATool** | 检查字段名、类型结构和每个数据单元格，并输出全局统计。 |
| **DataCleanTool** | 清空并重新创建导出数据、本地缓存和编辑器 StreamingAssets 数据目录。 |
| **DataHandleTool** | 组合清理、生成、等待编译、解析和导出流程，实现“一键处理全部数据”。 |
| **DataToolWindow** | 编辑器可视化入口，只负责显示面板、响应按钮和输出日志。 |

数据工具面板让 Fink Framework 的数据管线做到可视化、一键化、自动化、可调试和可验证，适合程序与策划共同使用。
