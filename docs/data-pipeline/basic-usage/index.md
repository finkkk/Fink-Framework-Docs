# 数据管线基础使用

本页介绍数据管线的完整日常流程：创建 Excel、执行 QA 校验、生成 C# 类型、导出 JSON / Binary，并在运行时读取强类型数据。

使用前提：先完成[安装与初始化](/getting-started/setup/)，确认全局设置中的数据模式、C# 输出位置和加密配置，再按照“创建 Excel → QA 校验 → 生成代码 → 导出数据 → 运行时读取”的顺序操作。

## 1. 创建 Excel 配置表

所有 Excel 源文件都放在项目根目录的：

```text
FinkFramework_Data/DataTables/
```

该目录通常会在框架首次导入时自动创建；如果不存在，也可以手动创建。

新建一张表，例如 `SimpleTestData.xlsx`：

| id | name | price | rewards | position |
| --- | --- | --- | --- | --- |
| int | string | float | int[] | Vector3 |
| 道具 ID | 名称 | 价格 | 奖励列表 | 坐标 |
| 1001 | Wood | 5.5 | 1,2,3 | (0.5,1,2) |
| 1002 | Stone | 8.0 | 4,5,6 | (1,3,4) |

表格前三行含义固定：

1. 第一行：C# 字段名；
2. 第二行：字段类型；
3. 第三行：字段说明；
4. 第四行起：实际数据。

第三行的单元格可以留空，但应保留这一行，否则第一行实际数据会被当作字段说明读取。

`DataTables` 下可以建立任意层级的子目录，例如：

```text
FinkFramework_Data/DataTables/Test/Example.xlsx
```

工具会递归扫描这些目录，并在生成代码和导出数据时保留相对目录结构。完整的命名、类型和单元格写法参见 [Excel 配表规则](/data-pipeline/excel-rules/)。

## 2. 打开数据工具面板

在 Unity 顶部菜单选择：

```text
Fink Framework → 数据管线系统 → 数据工具面板
```

![从 Unity 菜单打开数据工具面板](/images/data-pipeline/panel1.webp)

打开后可以看到“主功能”“QA 验证”和“执行日志”三个区域。

## 3. 执行 QA 验证

点击“**验证所有表格**”。工具会扫描 `DataTables` 中的全部 `.xlsx` 文件并检查：

- 字段名是否为空、重复或包含非法字符；
- 声明的字段类型能否正确识别；
- 每个非空数据行能否逐格解析；
- 每张表的警告、错误和最终通过状态；
- Excel 文件是否正被其他程序占用。

QA 不会修改源表或导出运行时文件，因此适合在正式处理前单独执行。控制台显示错误和未通过数量均为 `0` 时，表示当前表格全部通过。

![数据 QA 通过结果](/images/data-pipeline/console.webp)

::: tip 建议
QA 是独立检查步骤，不是“一键处理全部数据”的组成阶段。修改表头、字段类型或复杂数据后，建议先运行一次 QA。
:::

## 4. 一键处理全部数据

点击“**一键处理全部数据**”并确认后，工具会按以下顺序执行：

### 4.1 清理旧数据

工具会重新创建以下由框架维护的目录：

- `FinkFramework_Data/AutoExport/`；
- `Assets/StreamingAssets/FinkFramework_Data/`；
- `Application.persistentDataPath/FinkFramework_Data/` 中的本地数据缓存（如果存在）。

Excel 源文件所在的 `FinkFramework_Data/DataTables/` 不会被删除。

::: warning 清理范围
一键处理会清理运行时数据和本地数据副本。请勿在上述自动导出目录中存放需要手动维护的文件。
:::

### 4.2 生成 C# 类型

每张 Excel 表会生成两个文件：

- `{ClassName}.cs`：单行数据结构；
- `{ClassName}Container.cs`：整张表的数据容器，内部通过 `items` 保存所有数据行。

默认情况下，`SimpleTestData.xlsx` 会生成 `SimpleTestData` 和 `SimpleTestDataContainer`。

| C# 输出设置 | 默认输出路径 |
| --- | --- |
| **内部输出（默认）** | `Assets/Scripts/Data/AutoGen/DataClass/` |
| **外部输出** | `FinkFramework_Data/AutoGen/DataClass/` |

内部输出位于 `Assets` 中，会触发 Unity 脚本编译；工具会记录当前处理阶段，并在编译完成后继续执行导出。外部输出位于项目根目录，不参与 Unity 脚本编译。具体路径可以在 Data Pipeline 设置中调整。

### 4.3 导出 JSON

JSON 始终会生成，但位置取决于运行时数据模式：

| 数据模式 | JSON 输出位置 | 用途 |
| --- | --- | --- |
| **JSON** | `Assets/StreamingAssets/FinkFramework_Data/DataJson/` | 直接作为运行时数据源 |
| **Binary** | `FinkFramework_Data/AutoExport/DataJson/` | 供开发者检查和外部调试 |

### 4.4 导出 Binary

只有全局数据模式设为 `Binary` 时才会生成二进制文件：

```text
Assets/StreamingAssets/FinkFramework_Data/DataBinary/
```

是否使用 AES 加密以及文件扩展名由全局设置决定，默认扩展名为 `.fink`。框架还会生成 `data-manifest.json`，用于 Android、iOS 等无法直接遍历 `StreamingAssets` 的平台定位数据文件。

## 5. 检查处理结果

流程结束后，数据工具面板和 Console 会分别显示代码生成数、数据导出数以及成功或失败信息。

如果处理失败，可以依次检查：

1. Excel 是否仍在其他程序中打开；
2. 表格前三行是否符合规范；
3. 字段类型是否已正确拼写；
4. Console 中最先出现的 `DataGenTool`、`DataParseTool` 或 `DataExportTool` 错误。

不要只检查 JSON 是否存在；只有全部表格导出成功，框架才会生成新的运行时数据清单。

## 6. 在运行时读取数据

运行时通过生成的**容器类**读取整张表。业务代码不需要手动拼接路径、判断扩展名、解密或反序列化。

在 Editor 和桌面平台中，可以根据需要选择同步或异步读取默认数据：

Editor 和桌面 PC 可以选择同步或异步读取；Android、iOS 等 `StreamingAssets` 为 URI 的平台使用异步读取。如果项目面向多个平台，统一使用异步接口即可。

```csharp
using Data.AutoGen.DataClass;
using FinkFramework.Runtime.Data;
using FinkFramework.Runtime.Utils;

SimpleTestDataContainer container =
    DataFilesUtil.LoadDefaultData<SimpleTestDataContainer>();

if (container?.items == null || container.items.Count == 0)
{
    LogUtil.Warn("DataExample", "SimpleTestData 没有可用数据");
    return;
}

SimpleTestData firstItem = container.items[0];
LogUtil.Info("DataExample", firstItem.name);
LogUtil.Info("DataExample", firstItem.id.ToString());
LogUtil.Info("DataExample", firstItem.position.ToString());
```

成功时，以上示例会依次输出类似内容：

```text
Wood
1001
(0.50, 1.00, 2.00)
```

### 移动平台读取

Android 和 iOS 的 `StreamingAssets` 通常不能通过普通文件 API 同步遍历，应使用跨平台异步接口：

```csharp
SimpleTestDataContainer container =
    await DataFilesUtil.LoadDefaultDataAsync<SimpleTestDataContainer>();
```

异步接口会读取数据清单，通过 UnityWebRequest 获取文件内容，然后按照当前 JSON / Binary 模式完成解析。

::: info 默认数据与本地数据
`LoadDefaultData` / `LoadDefaultDataAsync` 读取随游戏发布的默认配置；需要保存玩家可修改的数据时，请使用 `LoadLocalData`、`LoadLocalDataAsync` 和 `SaveLocalData`。
:::

更多读取、保存及路径参数说明参见[数据管线运行时 API](/data-pipeline/api/)，日志用法参见[日志工具](/utilities/log/)。
