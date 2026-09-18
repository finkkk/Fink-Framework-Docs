# 文本工具（Texts）

`TextsUtil` 提供配表字符串拆分、数字和时间格式化、命名文本处理、标点标准化、JSON 轻量修复以及换行符统一等通用方法。

它常用于：

- Excel 或文本配置读取；
- 数据管线中的字段预处理；
- UI 数字、时间和大数显示；
- 运行时路径和标识符清洗；
- JSON 片段与多平台文本格式兼容。

## 1. 分隔符类型

`TextsUtil.SplitType` 当前支持以下分隔符：

| 枚举值 | 分隔符 | 中文符号兼容 |
| --- | --- | --- |
| `Semicolon` | `;` | `；` 会先转换为 `;` |
| `Comma` | `,` | `，` 会先转换为 `,` |
| `Percent` | `%` | 不做额外转换 |
| `Colon` | `:` | `：` 会先转换为 `:` |
| `Space` | 空格 | 不做额外转换 |
| `Pipe` | `\|` | 不做额外转换 |
| `Underscore` | `_` | 不做额外转换 |

默认分隔符为 `Semicolon`。当前枚举中没有 `Equal`，需要拆分 `=` 时不能直接传入 `SplitType.Equal`。

## 2. 字符串拆分

### 2.1 拆分为字符串数组

```csharp
string[] values = TextsUtil.SplitStrToStrArr(
    "1;2;3",
    TextsUtil.SplitType.Semicolon);
```

中文分号也会自动兼容：

```csharp
string[] values = TextsUtil.SplitStrToStrArr(
    "1；2；3",
    TextsUtil.SplitType.Semicolon);
```

空字符串会返回空数组。方法不会自动去除每个元素内部或两端的空格；需要时应在业务层自行 `Trim`。

### 2.2 拆分为整数数组

```csharp
int[] values = TextsUtil.SplitStrToIntArr(
    "10,20,30",
    TextsUtil.SplitType.Comma);
```

该方法会先按字符串拆分，再对每个元素调用 `int.Parse`。因此输入中包含无法解析为整数的内容时会抛出格式异常，读取外部配置时建议先完成格式校验。

### 2.3 拆分整数键值对

`SplitStrToIntArrTwice` 使用两个分隔符：第一个用于拆分多组数据，第二个用于拆分每组的两个整数：

```csharp
TextsUtil.SplitStrToIntArrTwice(
    "1001:5;1002:3",
    TextsUtil.SplitType.Semicolon,
    TextsUtil.SplitType.Colon,
    (id, count) =>
    {
        LogUtil.Info($"{id} / {count}");
    });
```

上例的格式为：

```text
1001:5;1002:3
└─组间分隔符：;
    └─键值分隔符：:
```

每组数据必须至少能拆出两个整数。格式不完整时不要直接调用该方法，应在进入解析前先校验配置内容。

### 2.4 拆分字符串键值对

```csharp
TextsUtil.SplitStrToStrArrTwice(
    "HP:100|MP:50",
    TextsUtil.SplitType.Pipe,
    TextsUtil.SplitType.Colon,
    (key, value) =>
    {
        LogUtil.Info($"{key} = {value}");
    });
```

该方法适合解析简单的多组字符串键值对。每组数据必须至少包含两个拆分结果；它不是通用字典解析器，也不会处理引号、转义分隔符或嵌套结构。

`LogUtil` 的详细用法参见[日志工具（Log）](/utilities/log/)。

## 3. 数字格式化

### 3.1 固定长度补零

`GetNumStr` 使用 .NET 的 `D` 格式，将整数补齐到指定长度：

```csharp
string value = TextsUtil.GetNumStr(7, 3);
// "007"

string longValue = TextsUtil.GetNumStr(1234, 3);
// "1234"，长度不足时才补零，不会截断原数值
```

### 3.2 保留小数位

`GetDecimalStr` 使用 .NET 的 `F` 格式保留指定小数位：

```csharp
string value = TextsUtil.GetDecimalStr(3.14159f, 2);
// "3.14"
```

具体小数点和数字格式会受当前运行环境的文化设置影响。

### 3.3 大数中文单位

`GetBigDataToString` 会对达到万或亿级别的整数使用中文单位：

```csharp
string a = TextsUtil.GetBigDataToString(123456789);
// "1亿2千万"

string b = TextsUtil.GetBigDataToString(45000);
// "4万5千"

string c = TextsUtil.GetBigDataToString(9999);
// "9999"
```

当前方法主要显示“亿/千万”和“万/千”两级信息，不会输出完整的每一位数字。例如低于万的数值会直接转换为普通数字字符串。

## 4. 时间格式化

### 4.1 SecondToHMS

`SecondToHMS` 将秒数转换为带自定义单位的时分秒文本：

```csharp
string text = TextsUtil.SecondToHMS(3661);
// "1时1分1秒"
```

参数：

```csharp
string text = TextsUtil.SecondToHMS(
    s: 3661,
    ignoreZero: true,
    isKeepLen: true,
    hourStr: "h ",
    minuteStr: "m ",
    secondStr: "s");
// "01h 01m 01s"
```

- `ignoreZero`：是否忽略值为 0 的单位；
- `isKeepLen`：是否至少保留两位数字；
- `hourStr`、`minuteStr`、`secondStr`：自定义单位文本；
- 负数会按 `0` 秒处理；
- 当结果为空时，仍会返回 `0` 秒文本。

### 4.2 SecondToHMS2

`SecondToHMS2` 是 `SecondToHMS` 的固定格式封装：

```csharp
string text = TextsUtil.SecondToHMS2(3661);
// "01:01:01"
```

它默认使用两位时、分、秒，并以冒号连接。也支持 `ignoreZero` 参数：

```csharp
string text = TextsUtil.SecondToHMS2(
    3661,
    ignoreZero: true);
```

## 5. 标识符与字符串处理

### 5.1 ToCamelCase

`ToCamelCase` 会先移除非法字符，再将结果首字符转为小写：

```csharp
string name = TextsUtil.ToCamelCase("PlayerName");
// "playerName"
```

它只做首字母转换，不会把 `player_name` 自动转换成 `playerName`，也不会重新拆分多个单词。

### 5.2 ToPascalCase

`ToPascalCase` 会先移除非法字符，再将结果首字符转为大写：

```csharp
string name = TextsUtil.ToPascalCase("playerName");
// "PlayerName"
```

输入应至少包含一个字母、数字或下划线。若清洗后为空，不应继续调用首字母转换。

### 5.3 RemoveInvalidChars

`RemoveInvalidChars` 只保留 Unicode 字母、数字和下划线：

```csharp
string value = TextsUtil.RemoveInvalidChars(
    "HP%Value!");
// "HPValue"
```

它会移除空格、标点和其他符号，但会保留符合 `char.IsLetterOrDigit` 的 Unicode 字符。

### 5.4 NormalizePunctuation

`NormalizePunctuation` 将常见中文或全角符号转换为半角形式：

```csharp
string value = TextsUtil.NormalizePunctuation(
    "（测试：100）");
// "(测试:100)"
```

当前会处理括号、书名式引号、中文逗号和中文冒号等符号。它只做字符替换，不会自动删除空格、换行或修复 JSON 结构。

### 5.5 NormalizeLineEndings

`NormalizeLineEndings` 将 Windows 和旧式 Mac 换行统一为 Unix 风格 `\n`：

```csharp
string text = TextsUtil.NormalizeLineEndings(
    "line1\r\nline2\rline3");
// "line1\nline2\nline3"
```

适合在生成代码、写入文本文件或比较跨平台文本前统一换行格式。

## 6. JSON 轻量修复

### 6.1 NormalizeJsonString

`NormalizeJsonString` 用于修复 Excel 或人工填写的简单 JSON 片段，主要处理：

- 常见中文标点替换；
- 中文引号转换为英文双引号；
- 缺少最外层 `{}` 时自动补齐；
- 为简单的字母、数字和下划线 key 补双引号。

```csharp
string json = TextsUtil.NormalizeJsonString(
    "HP:100,MP:50");
// {"HP":100,"MP":50}
```

也支持带中文标点的简单输入：

```csharp
string json = TextsUtil.NormalizeJsonString(
    "HP：100，MP：50");
// {"HP":100,"MP":50}
```

它是轻量文本修复方法，不是完整 JSON Parser。对于嵌套对象、复杂字符串、转义字符、数组中的复杂对象或已经损坏的 JSON，应该使用正式 JSON 库进行解析和校验。

`NormalizeJsonString` 不会把 `=` 自动转换成 `:`，也不会把分号格式自动转换成逗号格式：

```text
HP=100;MP=50
```

这种格式需要在进入 JSON 修复前由业务代码自行转换。

## 7. Excel 数据清洗

### 7.1 NormalizeDataString

`NormalizeDataString` 面向 Excel 或外部文本输入，按以下顺序执行轻量清洗：

1. 识别并保留常见日期时间格式；
2. 统一中文和全角括号、引号、逗号、冒号、分号等符号；
3. 将外围圆括号转换为数组形式的方括号；
4. 对看起来像数组的外围大括号进行修正；
5. 尝试对简单的 `key:value` 结构调用 JSON 修复；
6. 移除回车、换行并清理首尾空白。

```csharp
string value = TextsUtil.NormalizeDataString(
    "HP：100，MP：50");
// 尝试得到：{"HP":100,"MP":50}
```

日期文本会尽量保持原内容，例如：

```csharp
string date = TextsUtil.NormalizeDataString(
    "2025/10/26 10:00:00");
// 保留为日期文本，不转换为 JSON
```

该方法适合做输入预处理，不等于完整的数据类型校验。对于外围圆括号、数组样式或复杂嵌套内容，清洗结果仍应由业务代码进一步确认；之后再根据字段类型进行 JSON、数字、日期或枚举解析。

## 8. 使用场景

`TextsUtil` 常用于：

- Excel 配表中的数组和简单键值对解析；
- 数据生成前的字符串规范化；
- UI 数字、时间和大数显示；
- 代码生成中的字段名清洗；
- JSON 片段的轻量修复；
- 跨平台文本文件的换行统一。

## 9. 使用建议

- 处理外部配置前先校验空值和格式，避免 `int.Parse` 或键值对索引异常；
- 键值对拆分使用当前 `SplitType` 支持的分隔符，不要使用不存在的 `SplitType.Equal`；
- `Percent01` 需要 `0~1` 时自行 Clamp，`Remap` 需要边界限制时也自行处理；
- 命名转换方法只负责首字母大小写和非法字符清理，不负责完整的 snake_case / kebab-case 转换；
- `NormalizeJsonString` 和 `NormalizeDataString` 只适合作为轻量预处理，正式解析仍应使用 JSON 或日期解析器；
- 在高频 UI 更新中避免重复创建不必要的格式化字符串，必要时缓存结果。
