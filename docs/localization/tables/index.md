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

语言表支持导入和导出 Excel，方便交给翻译人员处理。Excel 是交换格式，不会取代项目中的 JSON 源文件。

### 工作簿结构

- 一个工作簿可以包含多个 Sheet；
- 一个已配置主分类对应一个 Sheet；
- Sheet 名称必须与分类名称匹配，不区分大小写；
- 第一列固定为 `Key`；
- 后续列使用配置中的语言 ID，例如 `en-US`、`zh-Hans`；
- Key 使用当前分类内相对 Key 或完整 Key 均可，导入后会规范化为完整 Key。

示例：

| Key | en-US | zh-Hans |
| --- | --- | --- |
| `main.test1` | `Test 1` | `测试 1` |
| `main.test2` | `Test 2` | `测试 2` |

### 导入方式

语言表窗口的“Excel 工具”菜单提供：

| 操作 | 说明 |
| --- | --- |
| 导入当前分类 | 只读取当前 Sheet |
| 导入全部分类 | 根据配置批量读取整个工作簿 |
| 导出全部语言表 | 将项目中已保存的语言表导出为一个多 Sheet 工作簿 |

导入先进行完整读取和预览，不会立即写盘。确认预览后，内容会载入编辑器；还需要点击“保存并同步运行时副本”才会写回 JSON。Excel 读取失败时，当前编辑器数据和磁盘 JSON 均不会被修改。

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
