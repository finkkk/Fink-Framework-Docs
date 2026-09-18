# 本地化基础使用

本页介绍本地化系统的完整日常流程：配置项目语言、创建语言表、填写测试文本、绑定本地化资源、同步运行时文件，并在 Unity 运行时读取和切换语言。

推荐按照“保存配置 → 创建语言表 → 编辑文本 → 编辑资源 → 质量检查 → 运行时初始化 → 读取 / 切换”的顺序接入。

## 1. 打开本地化配置

在 Unity 顶部菜单选择：

```text
Fink Framework → 本地化系统 → 本地化配置
```

也可以从 `Edit → Project Settings → Fink Framework → Localization` 打开。

![本地化配置面板](/images/localization/local_setup.webp)

首次打开时，框架会自动创建本地化配置资产和资源表资产。默认支持语言为：

| 语言 ID | 显示名称 |
| --- | --- |
| `en-US` | 美国英语 |
| `zh-Hans` | 简体中文 |

在“语言表分类”的“主分类”列表中先填写至少一个分类，例如 `UI`。然后点击“保存并应用配置”。保存动作会：

- 规范化默认语言、Fallback 和分类名称；
- 创建缺少的分类目录和语言 JSON 文件；
- 保留已经存在的翻译内容，不覆盖已有文件；
- 将源 JSON 同步到 `Assets/StreamingAssets/FinkFramework_Data/Localization/`；
- 重新生成 `localization-manifest.json`。

## 2. 创建并编辑语言表

在 Unity 顶部菜单选择：

```text
Fink Framework → 本地化系统 → 本地化语言表
```

![本地化语言表](/images/localization/text_e.webp)

窗口顶部可以选择“语言表”模式、分类、搜索条件和“仅看缺失”。点击“语言列”可以隐藏暂时不需要编辑的语言列；“差异预览”用于查看当前未保存修改；“重新读取”会重新从磁盘载入当前分类。

### 2.1 使用自带的两个测试字段

语言表示例已经准备两个测试字段，当前分类为 `UI` 时在编辑器中显示：

| Key | `en-US（美国英语）` | `zh-Hans（简体中文）` |
| --- | --- | --- |
| `main.test1` | `Test 1` | `测试 1` |
| `main.test2` | `Test 2` | `测试 2` |

编辑器显示的是分类内相对 Key；保存到 `UI/en_us.json` 和 `UI/zh_hans.json` 后，文件中的完整 Key 会是：

```json
{
  "ui.main.test1": "Test 1",
  "ui.main.test2": "Test 2"
}
```

在其他分类中新增 Key 时，只输入分类内部分，例如在 `Common` 分类中输入 `button.confirm`，不要重复输入 `common.`。

### 2.2 新增和删除 Key

在表格上方“新增 Key”输入框中输入相对 Key，点击“新增”。系统会为所有支持语言建立空值槽位。填完所有语言后，点击右侧“保存并同步运行时副本”。

删除 Key 会同时从当前分类的所有语言文件中删除该 Key。删除前建议使用“差异预览”确认影响；旧的场景、Prefab 或脚本引用不会自动改写，删除后应重新执行质量检查。

### 2.3 占位符

不同语言的同一个 Key 必须保留相同的占位符集合。下面的写法可以翻译语序，但不能丢失 `{0}` 或 `{count}`：

```text
en-US: Defeated {count} enemies
zh-Hans: 已击败 {count} 个敌人
```

保存语言表和导入 Excel 时都会执行占位符校验。位置参数和命名参数不能在同一模板中混用；字面量大括号使用 `&#123;&#123;` 和 `&#125;&#125;` 转义。

## 3. 编辑资源表

在 Unity 顶部菜单选择：

```text
Fink Framework → 本地化系统 → 本地化资源表
```

或在语言表窗口顶部将“表类型”切换为“资源表”。

![本地化资源表](/images/localization/assets_e.webp)

资源表的每一行包含 `Key`、`类型`、每个支持语言的资源列和`操作`列：

1. 在“新增 Key”输入框中输入完整资源 Key 或当前分类内相对 Key；
2. 点击“新增”；
3. 选择资源类型；
4. 在各语言列中拖入对应的 Sprite、AudioClip、Font、TMP Font Asset、Prefab 或 ScriptableObject；
5. 点击“保存资源表”。

资源单元格为空时会以缺失状态显示。运行时当前语言没有资源时，会尝试读取默认 Fallback；两者都没有时，`GetAsset` 返回 `null`，绑定组件也会清空目标引用。

## 4. 绑定到场景和 Prefab

### 文本

在带有 Unity `Text` 或 TextMeshPro `TMP_Text` 的 GameObject 上添加 `FinkLocalizedText`，然后在 Inspector 的“主分类 → 功能分组 → Key”选择器中选择文本 Key。组件在启用时刷新，并在语言切换后自动刷新。

### 图片、音频和字体

根据目标组件添加对应绑定组件：

| 组件 | 要求 | 应用结果 |
| --- | --- | --- |
| `FinkLocalizedImage` | 同一 GameObject 有 `Image` | 设置 `Image.sprite` |
| `FinkLocalizedAudio` | 同一 GameObject 有 `AudioSource` | 设置 `AudioSource.clip` |
| `FinkLocalizedFont` | 同一 GameObject 有 Legacy `Text` | 设置 `Text.font` |
| `FinkLocalizedTMPFont` | 同一 GameObject 有 `TMP_Text` | 设置 `TMP_Text.font` |

编辑器会从语言表和资源表收集有效 Key，并提供分组下拉选择。若一个组件绑定的 Key 已被删除，Inspector 会显示错误提示；质量检查也会列出该引用。

## 5. 运行时初始化

桌面平台可以在启动流程中同步初始化：

```csharp
using FinkFramework.Runtime.Localization;

if (!LocalizationManager.Initialize())
{
    // 配置资产缺失或配置无法读取
    return;
}
```

如果希望优先使用设备系统语言：

```csharp
LocalizationManager.InitializeFromSystemLanguage();
```

移动端或使用 URI 形式 `StreamingAssets` 的平台建议使用异步初始化：

```csharp
using Cysharp.Threading.Tasks;

private async UniTask InitializeLocalizationAsync()
{
    bool ready = await LocalizationManager.InitializeAsync();
    if (!ready)
        return;
}
```

如果场景中已经启用了 `FinkLocalizedText` 等绑定组件，它们会在启用时自动确保系统初始化并刷新；对于启动阶段需要明确等待语言包的逻辑，仍建议显式调用 `InitializeAsync`。

## 6. 读取文本和资源

```csharp
string title = LocalizationManager.Get("ui.main.test1");
Debug.Log(title);

string enemyText = LocalizationManager.Format(
    "ui.battle.defeated",
    ("count", 3));

Sprite icon = LocalizationManager.GetAsset<Sprite>("ui.item.icon");
```

移动端按需读取：

```csharp
string title = await LocalizationManager.GetAsync(
    "ui.main.test1",
    cancellationToken);

AudioClip voice = LocalizationManager.GetAsset<AudioClip>("battle.voice.start");
```

同步查询不到文本时返回 Key 并记录一次警告；异步查询会先根据加载模式完成必要的语言表加载。业务代码不要自己读取 JSON，也不要把 `StreamingAssets` 路径写死。

## 7. 切换语言

```csharp
bool switched = LocalizationManager.SwitchLocale(LocaleIds.ChineseSimplified);
```

在移动端或 URI 平台使用：

```csharp
bool switched = await LocalizationManager.SwitchLocaleAsync(
    LocaleIds.EnglishUS,
    cancellationToken);
```

语言切换只接受当前“支持语言”列表中的内置语言 ID。切换成功后会触发 `OnLocaleChanged`，已挂载的本地化组件自动更新。

## 8. 保存后的检查

在配置页依次执行：

1. **快速质量检查**：检查配置、语言 JSON、资源表、脚本引用和已挂载的本地化组件；
2. **完整质量检查**：在快速检查基础上，额外扫描场景和 Prefab 中未接入本地化的静态 `Text` / `TMP_Text`；
3. 确认运行时副本和 Manifest 与源目录同步。

正式构建前框架还会自动执行本地化构建校验；如果源文件、运行时副本或清单不一致，构建会被阻止并提示重新保存同步。

::: warning 修改源 JSON 后
如果直接在外部编辑器修改源 JSON，请回到本地化语言表点击“重新读取”，确认差异后再保存。不要只修改 `StreamingAssets` 下的自动副本。
:::

## 9. 详细介绍

详细字段、目录、命名和 Excel 交换格式参见[本地化配表](/localization/tables/)；代码 API 和所有绑定组件参见[运行时 API](/localization/api/)。
