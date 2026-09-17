# Excel 配表规则

本页介绍数据管线对 Excel 文件位置、表格行结构、字段命名、数据类型和单元格格式的要求，是创建和维护配置表时的规范参考。

适用范围：`FinkFramework_Data/DataTables/` 下由数据管线扫描的全部 `.xlsx` 文件。遵循本页规则可确保：

- 自动生成的数据类结构清晰、无歧义；
- QA 校验顺利通过；
- 运行时读取稳定可靠；
- 支持复杂字段类型（数组、列表、字典、结构体、Vector、Color 等）。

如果希望让策划和程序都能轻松维护数据，本章是必读内容。

## 1. Excel 表格位置要求

所有 Excel 文件必须放在项目根目录下的：

```text
FinkFramework_Data/DataTables/
```

这里的项目根目录是 `Assets` 目录的上一级。支持任意层级的子文件夹，例如：

```text
FinkFramework_Data/DataTables/Test/TestData.xlsx
```

工具会递归扫描全部 `.xlsx` 文件，并在生成代码和导出数据时保留相对目录结构。

## 2. 表格基础结构

每张 Excel 的前三行必须严格遵循以下结构：

| 行号 | 内容 | 描述 |
| --- | --- | --- |
| 第 1 行 | 变量名 | 映射到 C# 字段名，必须是合法标识符 |
| 第 2 行 | 变量类型 | 由 `DataParseTool` 解析 |
| 第 3 行 | 注释（可空） | 写入生成代码中的字段说明 |
| 第 4 行起 | 数据行 | 每一行对应一条数据 |

第三行的单元格可以留空，但必须保留这一行，否则第一行实际数据会被当作字段说明读取。

## 3. 字段名规则（第 1 行）

字段名必须满足：

- 只能包含字母、数字和下划线；
- 不能以数字开头；
- 不能为空；
- 不能重复；
- 不要使用 C# 关键字，例如 `class`、`namespace`。

错误示例：

| 字段名 | 原因 |
| --- | --- |
| `dmg%` | 包含非法字符 |
| `1level` | 以数字开头 |
| `item-name` | 包含 `-` |

字段名不规范时，QA 会给出警告或错误，生成代码也可能无法通过编译。字段名应直接使用合法的 C# 标识符，不要依赖自动清洗。数据单元格中的中文标点、全角符号和部分空格则会在解析时自动规范化。

## 4. 字段类型规则（第 2 行）

Fink Framework 支持基础类型、Unity 常用类型、数组、`List&lt;T&gt;`、`Dictionary&lt;TKey, TValue&gt;`、枚举以及可通过类型查找到的自定义数据结构。复杂类型通常使用 JSON 格式填写。

### 基础类型

| 类型 | Excel 示例 |
| --- | --- |
| `int` | `100` |
| `float` | `1.5` |
| `double` | `3.1415` |
| `long` | `9999999999` |
| `bool` | `true`、`false`、`0`、`1` |
| `string` | `Wood` |
| `short` | `12` |
| `ushort` | `12` |
| `byte` | `255` |
| `sbyte` | `-10` |
| `uint` | `123` |
| `ulong` | `12345` |
| `decimal` | `9.99` |
| `char` | `A` |
| `DateTime` | `2024-01-01 12:30:00` |

### DateTime 类型

支持多种常见时间格式：

| Excel 写法 | 解析结果 |
| --- | --- |
| `2024-01-01` | `DateTime` |
| `2024/01/01 12:30:00` | `DateTime` |
| `2024年1月1日 8:00` | `DateTime`（会先规范化文本） |
| `2024-01-01T12:00:00` | `DateTime` |

### Unity 类型

支持 Unity 常用的结构类型：

| 类型 | Excel 示例 |
| --- | --- |
| `Vector2` | `(1,2)` |
| `Vector3` | `(1,2,3)` |
| `Vector4` | `(1,2,3,4)` |
| `Color` | `(1,0.5,0,1)` 或 `#FFAA33` |
| `Matrix4x4` | 使用下方 JSON 格式 |

`Matrix4x4` 可以填写为：

```json
{
  "m00": 1, "m01": 0, "m02": 0, "m03": 0,
  "m10": 0, "m11": 1, "m12": 0, "m13": 0,
  "m20": 0, "m21": 0, "m22": 1, "m23": 0,
  "m30": 0, "m31": 0, "m32": 0, "m33": 1
}
```

说明：

- Vector 支持括号简写，例如 `(1,2,3)`；
- Color 支持 `0~1` 分量格式和 Hex 格式；
- 复杂类型中的 JSON 必须保持结构完整；
- 数据解析会自动规范化部分中文标点和全角符号，但不能修复结构错误。

### 数组与 List&lt;T&gt;

数组与 `List&lt;T&gt;` 的单元格写法基本一致，区别在于第 2 行声明的字段类型不同。理论上，已支持的类型都可以作为数组或列表元素。

数组示例：

| 类型 | Excel 写法 |
| --- | --- |
| `int[]` | `1,2,3` |
| `float[]` | `1.2,3.5` |
| `string[]` | `A,B,C` |
| `Vector3[]` | `(1,2,3),(2,3,4)` |

List 示例：

| 类型 | Excel 写法 |
| --- | --- |
| `List&lt;int&gt;` | `1,3,5,7` |
| `List&lt;string&gt;` | `A,B,C` |

分隔符规则：

- 简单数组使用逗号分隔；
- 多个 Vector 等结构体元素时，每个元素用括号包裹，再用逗号分隔；
- 嵌套类、自定义类等复杂类型使用标准 JSON 格式；
- Excel 单元格不能换行；
- 不要在数组中使用多余逗号，例如 `1,,2`。

### Dictionary&lt;TKey, TValue&gt;

字典建议使用标准 JSON 格式。值可以是基础类型、Unity 类型、自定义类、数组、列表或其他嵌套结构。

基础键值对：`Dictionary&lt;string, int&gt;`

```json
{
  "speed": 100,
  "attack": 50
}
```

多结构字典：`Dictionary&lt;string, Vector3&gt;`

```json
{
  "pos1": { "x": 1, "y": 2, "z": 3 },
  "pos2": { "x": 2, "y": 1, "z": 0 }
}
```

数组字典：`Dictionary&lt;string, int[]&gt;`

```json
{
  "enemy1": [1, 2, 3],
  "enemy2": [4, 5, 6]
}
```

### 自定义数据结构类

表格中可以填写项目内可被框架查找到的自定义数据结构类型。自定义数据通常使用 JSON 格式保存。

示例数据类：

```csharp
public class DropItem
{
    public int id;
    public int count;
}
```

单个 `DropItem`：

```json
{ "id": 1001, "count": 3 }
```

`List&lt;DropItem&gt;` 或 `DropItem[]`：

```json
[
  { "id": 1, "count": 2 },
  { "id": 3, "count": 5 }
]
```

`Dictionary&lt;string, DropItem&gt;`：

```json
{
  "rewardA": { "id": 1001, "count": 2 },
  "rewardB": { "id": 1002, "count": 5 }
}
```

所有结构体字段都会按照字段类型继续解析。

### 嵌套结构

结构体、字典和数组可以任意组合。例如，定义：

```csharp
public class DropInfoData
{
    public int id;
    public int value;
}
```

`Dictionary&lt;string, DropInfoData&gt;`：

```json
{
  "drop": { "id": 1, "value": 5 }
}
```

`DropInfoData[]`：

```json
[
  { "id": 1, "value": 2 },
  { "id": 3, "value": 4 }
]
```

`Dictionary&lt;string, Dictionary&lt;string, DropInfoData[]&gt;&gt;`：

```json
{
  "outer": {
    "floor1": {
      "drops": [
        { "id": 1, "value": 2 },
        { "id": 2, "value": 3 }
      ]
    },
    "floor2": {
      "drops": [
        { "id": 5, "value": 9 }
      ]
    }
  }
}
```

## 5. 注释规则（第 3 行）

- 注释可以留空；
- 注释会写入生成代码中的字段说明，例如 `/// <summary>注释</summary>`；
- 不建议使用 `{`、`}`、`:`、`,`、`;` 等特殊字符；
- 注释内容不参与数据解析。

## 6. 数据行（第 4 行起）

每一行数据会映射为容器中的 `items[i]`。

规则：

- 空行会自动跳过；
- 空字段使用对应类型的默认值；
- 类型不匹配时，QA 会报告错误或解析失败；
- 数据内容中的部分中文标点、全角符号和空格会在解析时规范化；
- Excel 单元格不能换行，复杂值必须在一个单元格内完成。

## 7. 不支持的情况

| 格式 | 错误原因 |
| --- | --- |
| `(1,2` | 括号不完整 |
| `1,,2` | 多余逗号 |
| `{ "id": 1 "count": 2 }` | 缺少逗号 |
| 单元格换行 | 不允许 |

## 8. 完整示例

下面的示例使用两个表：`TestData.xlsx` 保存主要数据，`DropInfoData.xlsx` 演示可独立生成的数据结构表。

### TestData.xlsx

| id | name | damage | tags | pos | color | drop | drops | stats | extra | nested | items | dictList |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| int | string | int[] | string[] | Vector3 | Color | DropInfoData | DropInfoData[] | Dictionary&lt;string,int&gt; | Dictionary&lt;string,Vector3&gt; | Dictionary&lt;string,DropInfoData[]&gt; | List&lt;int&gt; | Dictionary&lt;string,List&lt;int&gt;&gt; |
| 唯一 ID | 名称 | 伤害数组 | 标签 | 位置 | 颜色 | 单个掉落 | 多个掉落 | 属性表 | 坐标表 | 多层嵌套掉落 | ID 列表 | 字典数组 |
| 1 | Wolf | 10,20,30 | A,B,C | (1,2,3) | #FFAA33 | { "id":1001,"value":5 } | [{ "id":1,"value":2 },{ "id":2,"value":5 }] | { "atk":10,"def":5 } | { "p1":{ "x":1,"y":1,"z":1 },"p2":{ "x":2,"y":2,"z":2 } } | { "boss":[{ "id":5,"value":9 }],"elite":[{ "id":2,"value":3 }] } | 1,3,5,7 | { "group1":[1,2,3],"group2":[4,5] } |
| 2 | Goblin | 5,6 | X,Y | (2,3,4) | (0,1,0,1) | { "id":1002,"value":1 } | [{ "id":5,"value":1 },{ "id":8,"value":2 }] | { "atk":4,"def":1 } | { "p1":{ "x":5,"y":5,"z":1 } } | { "floor1":[{ "id":1,"value":1 }] } | 2,4 | { "teamA":[9],"teamB":[8,7] } |

### DropInfoData.xlsx

| id | value |
| --- | --- |
| int | int |
| 掉落 ID | 对应数值 |
| 1 | 5 |
| 2 | 10 |
| 3 | 20 |

将这两个 `.xlsx` 文件放入：

```text
FinkFramework_Data/DataTables/Test/
```

然后在 Unity 顶部菜单选择 `Fink Framework → 数据管线系统 → 数据工具面板`，点击“**一键处理全部数据**”。运行后会生成数据类、容器类以及对应的 JSON 或 Binary 运行时数据文件。

在任意脚本中，可以通过数据容器类的泛型读取数据：

```csharp
using Data.AutoGen.DataClass;
using FinkFramework.Runtime.Data;
using FinkFramework.Runtime.Utils;

TestDataContainer testDataContainer =
    DataFilesUtil.LoadDefaultData<TestDataContainer>();

LogUtil.Info("DataExample", testDataContainer.items[0].name);
LogUtil.Info("DataExample", testDataContainer.items[0].id.ToString());
LogUtil.Info("DataExample", testDataContainer.items[0].drop.id.ToString());
```

如果依次打印 `Wolf`、`1`、`1001`，说明数据读取成功。移动端或不确定目标平台时，建议使用 `LoadDefaultDataAsync`，详见[数据管线基础使用](/data-pipeline/basic-usage/)。

更多运行时读取、保存和路径参数说明参见[数据管线运行时 API](/data-pipeline/api/)。
