# 本地化配置

本页介绍本地化模块在 Project Settings 中的全部配置项、语言与分类规则、运行时文件路径以及保存应用流程。

配置入口：

```text
Edit → Project Settings → Fink Framework → Localization
```

也可以使用菜单：

```text
Fink Framework → 本地化系统 → 本地化配置
```

![本地化配置面板](/images/localization/local_setup.webp)

## 1. 模块设置

| 配置项 | 作用 |
| --- | --- |
| **启用本地化模块** | 关闭后运行时不会加载语言表；本地化组件不会应用翻译结果 |
| **启用 RTL 文字方向适配** | 对阿拉伯语、希伯来语等常见从右向左语言镜像对齐，并为 TMP 设置 RTL 文本标志 |

RTL 只影响被本地化组件应用的文本。中文、英文等从左向右语言不会受到影响。项目如果支持 RTL 语言，仍需在字体、字形、数字显示和布局上做额外验证；该开关不会自动翻译或重排所有场景中的静态文本。

## 2. 语言设置

### 默认语言

本地化系统初始化时使用的首选语言。默认值为 `en-US`。使用 `InitializeFromSystemLanguage` 时，设备系统语言只有在支持列表中才会覆盖默认语言，否则仍回退到默认语言。

### 默认 Fallback

当前语言缺少某个文本或资源时查询的备用语言。默认值为 `en-US`。Fallback 最好保证拥有完整、可发布的文本；如果 Fallback 自身也缺 Key，文本查询最终返回 Key。

### 支持语言

支持语言列表由框架内置目录提供，配置页只允许选择和启用内置语言。它同时决定：

- 语言表编辑器显示哪些语言列；
- 资源表显示哪些语言列；
- 保存配置时为每个分类创建哪些语言 JSON；
- 运行时可以切换到哪些语言。

语言 ID 使用标准形式，例如 `en-US`、`zh-Hans`、`zh-Hant`。文件名默认将其转换为小写下划线形式：`en_us.json`、`zh_hans.json`。

默认语言和 Fallback 会自动补入支持语言列表；重复语言会被移除。框架不会因为删除支持语言配置而自动删除旧数据，涉及数据删除的配置变更会显示确认提示。

## 3. 数据与加载

### JSON 文件名格式

默认值为：

```text
{0}.json
```

`{0}` 会被替换为小写下划线格式的语言名，例如 `zh_hans`。格式必须包含 `{0}`；如果格式无效或可能造成文件名冲突，框架会回退到默认语言文件名。

不要在格式中加入目录分隔符。语言文件始终位于分类目录的一级子目录中。

### 运行时加载模式

| 模式 | 行为 | 推荐场景 |
| --- | --- | --- |
| `LoadAll` | 初始化时加载所有支持语言和所有分类 | 小型项目或语言切换频繁 |
| `OnDemandLocalePackage` | 初始化时加载当前语言与 Fallback 的全部分类；切换语言时再加载新语言包 | 语言较多、需要降低初始内存 |
| `OnDemandModule` | 第一次查询某分类时才加载该分类；也可显式加载分类 | 大型项目、模块化内容、DLC |

`OnDemandModule` 会使用完整 Key 的分类前缀或运行时 Manifest 定位分类。建议始终使用完整 Key，例如 `ui.main.start`，这样可以避免首次查询时扫描多个分类。

## 4. 语言表分类

在“主分类”列表中配置顶层分类。每个分类对应：

```text
FinkFramework_Data/Localization/{Category}/{LocaleFile}.json
```

例如配置 `UI`、`Common`、`Battle` 后：

```text
FinkFramework_Data/Localization/
├─ UI/
│  ├─ en_us.json
│  └─ zh_hans.json
├─ Common/
│  ├─ en_us.json
│  └─ zh_hans.json
└─ Battle/
   ├─ en_us.json
   └─ zh_hans.json
```

分类名称会保留编辑器中的显示大小写，但完整 Key 的分类前缀统一使用小写。例如 `UI` 分类对应 `ui.main.start`。分类只能是安全的单层名称，不能包含 `/`、反斜杠、`.`、`..` 或系统非法文件名字符。

保存配置时：

- 缺少的目录会自动创建；
- 缺少的语言 JSON 会写入空对象 `{}`；
- 已有语言 JSON 不会被覆盖；
- 源目录和运行时副本会同步；
- Manifest 会重新生成。

## 5. 文件路径与资产

| 内容 | 路径 |
| --- | --- |
| 本地化配置资产 | `Assets/FinkFramework_Assets/Resources/FinkFramework/Settings/Localization/LocalizationSettingsAsset.asset` |
| 资源本地化表资产 | `Assets/FinkFramework_Assets/Resources/FinkFramework/Localization/LocalizationAssetTable.asset` |
| 源语言表 | `FinkFramework_Data/Localization/` |
| 运行时语言表 | `Assets/StreamingAssets/FinkFramework_Data/Localization/` |
| 运行时清单 | `Assets/StreamingAssets/FinkFramework_Data/localization-manifest.json` |

配置资产和资源表资产位于固定 `Resources` 路径，运行时由资源系统加载。语言 JSON 不生成额外 C# 文件，Key 直接从语言表读取。

## 6. 保存与应用

点击配置页底部的“保存并应用配置”后，框架会先规范化并检查配置，再执行数据初始化和同步。配置发生以下变化时可能触发删除确认：

- 移除主分类；
- 移除支持语言；
- 修改语言文件名格式导致现有文件不再匹配。

确认删除后，受影响的源文件和运行时副本会被清理；取消则保留文件并放弃本次可能造成数据删除的配置应用。重要翻译数据应通过版本控制或备份恢复。

仅在配置页中修改字段但没有点击保存时，语言表和质量检查不会使用这份草稿。请先保存并应用，再打开语言表或执行检查。

## 7. 配置检查

### 语言表文件缺失

配置页会提示缺失的分类目录或语言文件。点击“保存并应用配置”可以补齐缺失文件，但不会填充翻译内容。

### 默认语言不完整

质量检查会把默认语言缺失 Key 或空值标记为错误；目标语言缺失通常标记为警告。正式构建前建议让默认语言和所有发布语言都通过检查。

### 运行时副本不同步

源 JSON 修改后必须通过语言表或配置页保存来同步；资源表保存只会保存 `LocalizationAssetTable.asset`，不会改写语言 JSON。构建前检查会比较源目录、运行时 JSON 文件集合以及 Manifest 的 Key 索引。

### 关闭模块

关闭“启用本地化模块”后，运行时初始化仍会成功，但不会加载语言数据，也不会执行本地化查询。重新开启后需要再次保存应用配置，并确保运行时副本存在。

## 推荐配置

| 项目 | 建议 |
| --- | --- |
| 默认语言 | 选择项目最完整、可作为发布兜底的语言 |
| 默认 Fallback | 通常与默认语言相同 |
| 加载模式 | 小型项目使用 `LoadAll`；内容较多使用 `OnDemandLocalePackage` 或 `OnDemandModule` |
| 文件名格式 | 保持 `{0}.json`，避免自定义路径或重复文件名 |
| 分类 | 按系统或内容模块划分，例如 `UI`、`Common`、`Battle` |
| RTL | 只有实际支持 RTL 语言和对应字体布局时开启 |

完成配置后继续阅读[本地化配表](/localization/tables/)或[本地化基础使用](/localization/basic-usage/)。
