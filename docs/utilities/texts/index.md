# 文本工具（Texts）

`TextsUtil` 集中处理配表字符串、命名转换、数字格式化和换行标准化。

```csharp
string[] tags = TextsUtil.SplitStrToStrArr("a;b;c");
int[] values = TextsUtil.SplitStrToIntArr("1,2,3", SplitType.Comma);
string className = TextsUtil.ToPascalCase("player_data");
string display = TextsUtil.SecondToHMS(3661);
```

常用能力包括：

- `SplitStrToStrArr`、`SplitStrToIntArr`：按分隔符读取 Excel 单元格；
- `ToCamelCase`、`ToPascalCase`：生成字段名、类型名；
- `RemoveInvalidChars`、`NormalizePunctuation`、`NormalizeDataString`：清理输入文本；
- `GetNumStr`、`GetDecimalStr`、`SecondToHMS`：统一数字和时间显示。
