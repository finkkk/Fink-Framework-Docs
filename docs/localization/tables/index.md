# 本地化配表

本页介绍本地化语言表和资源表的文件格式、Key 命名、编辑器操作、Excel 交换以及常见校验规则。

本地化配表与[数据管线 Excel 配表](/data-pipeline/excel-rules/)是两套独立格式：本地化文本不生成 C# 数据类，资源引用也不写入语言 JSON。

## 1. 两种表的职责

| 表类型 | 保存内容 | 保存位置 | 运行时读取入口 |
| --- | --- | --- | --- |
| **语言表** | `Key → 字符串` | `FinkFramework_Data/Localization/{分类}/{语言}.json` | `LocalizationManager.Get` / `Format` |
| **资源表** | `Key → 语言 → Unity Object` | `LocalizationAssetTable.asset` | `LocalizationManager.GetAsset<T>` |

语言表和资源表共享支持语言列表、分类和 Key 约定，但保存方式不同：语言表保存后会同步 JSON 与 Manifest；资源表保存为 ScriptableObject 资产，运行时按需加载该资产。

## 2. 语言表目录与 JSON 格式

源语言表位于项目根目录：

```text
FinkFramework_Data/Localization/{Category}/{LocaleFile}.json
```

默认配置下，`UI` 分类的英语和简体中文文件为：

```text
FinkFramework_Data/Localization/UI/en_us.json
FinkFramework_Data/Localization/UI/zh_hans.json
```

一个 JSON 文件是平铺对象，Value 必须是字符串：

```json
{
  "ui.main.test1": "Test 1",
  "ui.main.test2": "Test 2",
  "ui.button.confirm": "Confirm"
}
```

JSON 文件必须使用有效 UTF-8 编码，不能有重复属性名。空字符串可以暂时保存，但会在质量检查中报告；默认语言的缺失或空翻译会被视为错误，目标语言通常会被视为警告。

::: warning 不要把语言表当作数据管线 Excel
语言 JSON 不需要前三行字段名、字段类型和字段说明，也不需要生成 C# 文件。每个属性就是一个完整 Key，每个 Value 都是翻译字符串。
:::

## 3. Key 规则

### 编辑器中的相对 Key

语言表窗口为了减少重复输入，会按当前分类显示相对 Key。例如分类为 `UI` 时，表格中显示：

| 编辑器 Key | 保存后的完整 Key |
| --- | --- |
| `main.test1` | `ui.main.test1` |
| `button.confirm` | `ui.button.confirm` |

如果输入已经带有当前分类前缀，例如 `ui.button.confirm`，编辑器不会重复添加 `ui.`。

### 运行时的完整 Key

运行时建议始终使用完整 Key，并使用规范小写形式：

```text
{category}.{group}.{name}
```

例如：

```text
ui.main.test1
common.button.confirm
battle.result.defeated
```

质量检查要求完整 Key 的分类前缀存在，并且只允许小写英文、数字、下划线和点号。运行时查询虽然对大小写不敏感，但不要依赖大小写变体来区分不同 Key。

### 分类不能重复占用 Key

同一语言中，一个完整 Key 只能属于一个分类。下面的配置会被拒绝：

```text
UI     → ui.button.confirm
Common → ui.button.confirm
```

如需不同模块各自拥有同名功能，应使用各自分类前缀，例如 `ui.button.confirm` 和 `common.button.confirm`。

## 4. 编辑语言表

在 Unity 顶部菜单打开：

```text
Fink Framework → 本地化系统 → 本地化语言表
```

![语言表编辑器](/images/localization/text_e.webp)

窗口主要区域如下：

| 区域 | 作用 |
| --- | --- |
| 表类型 | 在语言表和资源表之间切换 |
| 分类 | 选择当前编辑的主分类 |
| 搜索 | 按 Key 筛选 |
| 仅看缺失 | 只显示至少有一个空翻译的 Key |
| 语言列 | 隐藏或显示语言列，不修改配置 |
| 差异预览 | 查看当前未保存的新增、删除和翻译变化 |
| 撤销 / 重做 | 管理当前编辑器会话内的修改 |
| 重新读取 | 放弃当前编辑器未保存内容，重新从磁盘读取 |

### 自带测试字段

语言表示例包含两个测试字段。以 `UI` 分类和默认的两个语言为例：

| Key | `en-US（美国英语）` | `zh-Hans（简体中文）` |
| --- | --- | --- |
| `main.test1` | `Test 1` | `测试 1` |
| `main.test2` | `Test 2` | `测试 2` |

这两个字段可以直接用于验证：

```csharp
LocalizationManager.Get("ui.main.test1");
LocalizationManager.SwitchLocale(LocaleIds.ChineseSimplified);
```

### 保存流程

1. 选择分类并编辑各语言单元格；
2. 需要时点击“差异预览”确认修改；
3. 点击“保存并同步运行时副本”；
4. 框架校验占位符并写回当前分类的全部语言 JSON；
5. 源文件同步到 `StreamingAssets`，并重新生成 Manifest。

如果检测到 JSON 被外部程序修改，保存前必须选择重新载入或明确覆盖外部修改。重新载入会丢失当前编辑器中尚未保存的内容。

## 5. 占位符与格式化文本

语言之间必须拥有相同的占位符集合，但语序可以不同。

### 位置参数

```text
en-US: Defeated {0} enemies
zh-Hans: 已击败 {0} 个敌人
```

```csharp
string message = LocalizationManager.Format("ui.battle.defeated", 3);
```

### 命名参数

```text
en-US: Defeated {count} enemies
zh-Hans: 已击败 {count} 个敌人
```

```csharp
string message = LocalizationManager.Format(
    "ui.battle.defeated",
    ("count", 3));
```

也可以传入匿名对象：

```csharp
string message = LocalizationManager.Format(
    "ui.battle.defeated",
    new { count = 3 });
```

同一个模板不能混合位置占位符和命名占位符。需要显示字面量大括号时使用 `&#123;&#123;` 和 `&#125;&#125;`。保存和 Excel 导入会比较各语言的占位符签名，避免翻译后运行时格式化失败。

## 6. 编辑资源表

在 Unity 顶部菜单打开：

```text
Fink Framework → 本地化系统 → 本地化资源表
```

![资源表编辑器](/images/localization/assets_e.webp)

资源表每行表示一个资源 Key，列结构为：

```text
Key | 类型 | en-US | zh-Hans | 操作
```

编辑步骤：

1. 输入资源 Key 并点击“新增”；
2. 选择资源类型；
3. 在各语言单元格中拖入对应 Unity 资源；
4. 点击“保存资源表”。

资源类型决定 ObjectField 接受的类型：

| 类型 | 资源字段类型 |
| --- | --- |
| `Sprite` | `Sprite` |
| `AudioClip` | `AudioClip` |
| `Font` | `Font` |
| `TMPFontAsset` | TextMeshPro `TMP_FontAsset` |
| `Prefab` | `GameObject` |
| `ScriptableObject` | `ScriptableObject` |
| `Other` | `UnityEngine.Object` |

资源表不会把 Unity 资源转换为 JSON；它保留对象引用，并作为 `Resources` 下的 ScriptableObject 随 Player 打包。当前语言的槽位为空时会使用默认 Fallback 的槽位。

## 7. Excel 交换

文本语言表顶部提供 **Excel 工具** 菜单，方便在本地化编辑器与翻译人员之间交换多语言文本。

![文本表 Excel 工具](/images/localization/excel.webp)

Excel 只是交换格式，不会取代项目中的 JSON 源文件。导入前可以预览差异，导出时使用项目中已经保存的 JSON 内容。

### 工作簿结构

- 一个工作簿可以包含多个 Sheet；
- 一个已配置主分类对应一个 Sheet；
- Sheet 名称需要与本地化配置中的分类对应，不区分大小写；
- 导出时会自动处理 Excel 不允许的 Sheet 名称字符、31 字符长度限制和重名后缀；
- 第一列固定为 `Key`；
- 后续列使用已配置语言 ID，例如 `en-US`、`zh-Hans`；
- 未匹配到已配置语言的列不会作为翻译列读取；
- Key 使用当前分类内相对 Key 或完整 Key 均可，导入后会规范化为完整 Key。

示例：

| Key | en-US | zh-Hans |
| --- | --- | --- |
| `main.test1` | `Test 1` | `测试 1` |
| `main.test2` | `Test 2` | `测试 2` |

导出生成的工作簿会为每个分类创建一个 Sheet，首行为 `Key` 和语言列，后续按 Key 排序写入翻译。空翻译单元格会使用高亮样式，方便翻译人员补齐。

### Excel 工具菜单

语言表窗口的“Excel 工具”菜单提供：

| 操作 | 说明 |
| --- | --- |
| 导入当前分类 | 选择一个 `.xlsx` 文件，只读取当前选中分类对应的 Sheet |
| 导入全部分类 | 选择一个 `.xlsx` 工作簿，批量读取与配置分类匹配的 Sheet |
| 导出全部语言表 | 将已保存的全部语言 JSON 导出为一个多 Sheet `.xlsx` 工作簿 |

### 导入当前分类

适合只处理某一个分类，例如只把 `UI` 分类交给翻译人员修改。

1. 在表格中选择目标分类；
2. 点击 **Excel 工具 → 导入当前分类**；
3. 选择 `.xlsx` 文件；
4. 工具读取名称匹配的分类 Sheet，并检查表头、语言列、Key 和重复行；
5. 在“Excel 导入预览”中查看新增 Key、更新翻译和未变化翻译；
6. 点击“应用导入”载入当前编辑器；
7. 回到语言表点击“保存并同步运行时副本”写回 JSON。

这个流程不会在“应用导入”时直接修改磁盘 JSON，必须完成最后的保存步骤才会写入源语言表。

### 导入全部分类

适合一次处理包含多个分类的工作簿。

1. 点击 **Excel 工具 → 导入全部分类**；
2. 选择包含多个分类 Sheet 的 `.xlsx` 文件；
3. 工具读取与当前配置匹配的 Sheet，并报告未找到的分类或未匹配的 Sheet；
4. 预览整个工作簿相对于磁盘 JSON 的变化；
5. 确认后批量写入对应分类的 JSON，并同步运行时副本和 Manifest。

批量导入时，Excel 中没有出现的旧 Key 会保留，不会因为工作簿缺少某一行就自动删除项目中的 Key。所有分类会先完成校验，再开始写盘，以减少批量导入中途出现部分写入的风险。

### 导入校验

以下情况会阻止导入：

- 第一列表头不是 `Key`；
- 没有匹配到任何已配置语言列；
- Key 重复；
- 某一行没有 Key，但包含翻译内容；
- 占位符集合校验失败；
- 工作簿中出现重复的分类 Sheet。

空白 Key 行如果没有任何翻译内容会被忽略。读取阶段校验失败时，当前编辑器数据和磁盘 JSON 不会修改。

### 导出全部语言表

点击 **Excel 工具 → 导出全部语言表** 后，选择输出位置即可生成 `Localization.xlsx`。导出内容来自磁盘上已经保存的 JSON。

如果当前编辑器存在未保存修改，工具会先提示；继续导出仍会使用磁盘内容，不会把尚未保存的编辑器修改混入 Excel。若目标文件已存在，还需要确认覆盖。

导入和导出都只支持本地化语言表格式，不是通用的 Excel 转 JSON 工具，也不会处理资源表或数据管线的 Excel 格式。

## 8. 常见校验问题

| 问题 | 处理方式 |
| --- | --- |
| 缺少语言文件 | 在配置页点击“保存并应用配置”补齐空文件 |
| 默认语言缺少 Key | 在默认语言列补齐内容，再执行快速检查 |
| 目标语言缺少翻译 | 使用“仅看缺失”筛选并补齐，或确认该语言是否暂未交付 |
| Value 不是字符串 | 将 JSON 值改为字符串；数组、对象不能直接放进语言表 |
| Key 缺少分类前缀 | 使用编辑器保存一次，或手动改为完整小写 Key |
| 占位符不一致 | 保持各语言 `{0}` / `{name}` 集合一致 |
| 资源类型不匹配 | 修改资源类型或替换为对应 Unity 资源 |
| 语言表与运行时副本不一致 | 通过语言表或配置页保存并同步，不要直接改副本 |
| 工程仍引用已删除 Key | 重新选择有效 Key，或恢复该 Key 后再删除引用 |

质量检查分为快速和完整两种。完整检查还会扫描场景和 Prefab 中未接入本地化组件的静态 Text/TMP 文本，适合发布前使用。

## 下一步

完成配表后，参见[运行时 API](/localization/api/)接入查询、格式化、语言切换和本地化组件。
