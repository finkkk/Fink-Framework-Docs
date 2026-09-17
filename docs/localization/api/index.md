# 本地化运行时 API

本页介绍 `FinkFramework.Runtime.Localization` 命名空间中的运行时入口。业务代码通常只需要使用 `LocalizationManager`；场景中的文本、图片、音频和字体则可以使用对应的本地化绑定组件。

## 1. 初始化

### 同步初始化

```csharp
using FinkFramework.Runtime.Localization;

bool initialized = LocalizationManager.Initialize();
```

该入口从固定 `Resources` 路径加载 `LocalizationSettingsAsset`，然后按照配置的加载模式执行同步预加载。桌面文件系统上可以使用；如果平台的 `StreamingAssets` 是 URI，语言表预加载应改用异步入口。

### 优先使用系统语言

```csharp
bool initialized = LocalizationManager.InitializeFromSystemLanguage();
```

系统语言只有在配置的支持语言列表中才会被使用；不支持时仍使用配置中的默认语言。

### 异步初始化

```csharp
using Cysharp.Threading.Tasks;

private async UniTask<bool> PrepareLocalizationAsync(
    CancellationToken cancellationToken)
{
    return await LocalizationManager.InitializeAsync(cancellationToken);
}
```

移动端、WebGL 或使用 `OnDemandLocalePackage` 时，建议在启动阶段等待异步初始化完成。`InitializeAsync` 会共享同一轮异步预加载，避免多个启动任务重复读取同一批文件。

使用自定义配置资产时：

```csharp
LocalizationManager.Initialize(localizationSettingsAsset);
LocalizationManager.InitializeFromSystemLanguage(localizationSettingsAsset);
```

自定义配置仍需保证分类、语言 JSON 和运行时副本已经按同一配置生成。

## 2. 状态和事件

| API | 说明 |
| --- | --- |
| `LocalizationManager.IsInitialized` | 当前是否已初始化 |
| `LocalizationManager.Settings` | 当前使用的配置资产 |
| `LocalizationManager.CurrentLocale` | 当前语言 ID，例如 `zh-Hans` |
| `LocalizationManager.SupportedLocales` | 当前配置支持的语言列表 |
| `LocalizationManager.IsCurrentLocaleRightToLeft` | 当前语言是否启用 RTL 适配 |
| `LocalizationManager.LoadedEntryCount` | 当前已加载的文本条目数 |
| `LocalizationManager.LoadedTableCount` | 当前已加载的“语言 + 分类”表数量 |
| `LocalizationManager.OnLocaleChanged` | 语言切换成功后触发，参数为旧语言和新语言 |

读取当前语言：

```csharp
string current = LocalizationManager.CurrentLocale;
IReadOnlyList<LocaleInfo> locales =
    LocalizationManager.GetSupportedLocales();
```

订阅语言变化：

```csharp
private void OnEnable()
{
    LocalizationManager.OnLocaleChanged += HandleLocaleChanged;
}

private void OnDisable()
{
    LocalizationManager.OnLocaleChanged -= HandleLocaleChanged;
}

private void HandleLocaleChanged(string previousLocale, string currentLocale)
{
    // 刷新业务侧缓存或重新布局
}
```

框架会隔离单个订阅者的异常，避免一个 UI 组件出错后阻止其他组件刷新。

## 3. 查询文本

### Get

```csharp
string value = LocalizationManager.Get("ui.main.test1");
```

查找顺序为当前语言 → 默认 Fallback。两者都没有时返回传入的 Key，并记录一次缺失警告。Key 为空时返回空字符串。

### TryGet

```csharp
if (LocalizationManager.TryGet("ui.main.test1", out string value))
{
    label.text = value;
}
```

`TryGet` 不会因为缺失 Key 输出日志，适合可选文本或需要自行处理缺失的业务逻辑。按需模块模式下，查询会先尝试加载 Key 对应的分类。

### 异步查询

```csharp
string value = await LocalizationManager.GetAsync(
    "ui.main.test1",
    cancellationToken);
```

异步查询会等待必要的语言包或分类加载，并支持取消。组件销毁、页面关闭或请求过期时，应传入对应的取消令牌。

## 4. 格式化文本

### 位置参数

语言表：

```text
ui.battle.defeated = Defeated {0} enemies
```

代码：

```csharp
string value = LocalizationManager.Format(
    "ui.battle.defeated",
    3);
```

### 命名参数

语言表：

```text
ui.battle.defeated = Defeated {count} enemies
```

代码：

```csharp
string value = LocalizationManager.Format(
    "ui.battle.defeated",
    ("count", 3));
```

也可以传入匿名对象：

```csharp
string value = LocalizationManager.Format(
    "ui.battle.defeated",
    new { count = 3 });
```

异步格式化：

```csharp
string value = await LocalizationManager.FormatAsync(
    "ui.battle.defeated",
    cancellationToken,
    3);
```

位置占位符使用 `{0}`、`{1}`；命名占位符使用 `{name}`，可带基础格式说明。一个模板不要混用两种占位符；缺少参数时会保留模板原文并记录警告。字面量大括号使用 `&#123;&#123;` 和 `&#125;&#125;`。

## 5. 查询本地化资源

资源表中的资源通过同一个 Key 查询：

```csharp
using UnityEngine;

Sprite sprite = LocalizationManager.GetAsset<Sprite>("ui.item.icon");
AudioClip clip = LocalizationManager.GetAsset<AudioClip>("battle.voice.start");
```

不确定具体类型时可以获取 `UnityEngine.Object`：

```csharp
UnityEngine.Object asset = LocalizationManager.GetAsset("ui.banner");
```

需要自行处理缺失时使用泛型 `TryGetAsset`：

```csharp
if (LocalizationManager.TryGetAsset<Sprite>(
        "ui.item.icon",
        out Sprite sprite))
{
    image.sprite = sprite;
}
```

资源查询顺序同样是当前语言 → 默认 Fallback。资源表不存在、Key 不存在、资源槽为空或实际类型不匹配时，泛型查询返回 `null` / `false`，并由非 `Try` 入口记录可定位的警告。

## 6. 加载和卸载

### 显式加载分类

`OnDemandModule` 下可以在进入模块时主动加载：

```csharp
bool loaded = LocalizationManager.LoadCategory("Battle");
```

异步版本：

```csharp
bool loaded = await LocalizationManager.LoadCategoryAsync(
    "Battle",
    cancellationToken);
```

模块按需模式会同时加载当前语言和默认 Fallback 的同一分类。分类名称必须是配置中存在的安全分类名。

### 卸载分类或语言

```csharp
LocalizationManager.UnloadCategory("Battle");

int removedTableCount =
    LocalizationManager.UnloadLocale(LocaleIds.EnglishUS);
```

`UnloadCategory` 会按当前加载模式移除当前语言及必要的 Fallback 分类；`UnloadLocale` 移除指定语言的全部已加载分类。卸载不会删除磁盘文件，也不会修改配置。

### 清空运行时状态

```csharp
LocalizationManager.Clear();
```

`Clear` 会清空内存数据库、取消本地化运行时资源持有并重置初始化状态。重新使用前需要再次调用初始化入口。

## 7. 切换语言

### 同步切换

```csharp
bool changed = LocalizationManager.SwitchLocale(
    LocaleIds.ChineseSimplified);
```

同步入口返回时，语言上下文和当前加载策略所需的语言表已经更新。URI 平台不能同步读取 `StreamingAssets`，此时返回失败并提示使用异步入口。

### 异步切换

```csharp
bool changed = await LocalizationManager.SwitchLocaleAsync(
    LocaleIds.EnglishUS,
    cancellationToken);
```

异步语言切换会等待所需语言包加载完成后再提交当前语言并触发 `OnLocaleChanged`。并发切换时，只有仍然有效的最后一次请求可以提交，旧请求不会覆盖新语言。

切换语言必须使用配置支持的内置 ID：

```csharp
LocalizationManager.SwitchLocale(LocaleIds.ZhHans);
LocalizationManager.SwitchLocale(LocaleIds.EnUS);
```

## 8. 本地化绑定组件

绑定组件会在启用时刷新，并订阅 `OnLocaleChanged`：

| 组件 | 目标组件 | 主要 API |
| --- | --- | --- |
| `FinkLocalizedText` | Unity `Text` 或 TMP `TMP_Text` | `Key`、`Refresh`、`RefreshAsync` |
| `FinkLocalizedImage` | `Image` | `Key`、`Refresh` |
| `FinkLocalizedAudio` | `AudioSource` | `Key`、`Refresh` |
| `FinkLocalizedFont` | Unity Legacy `Text` | `Key`、`Refresh` |
| `FinkLocalizedTMPFont` | TMP `TMP_Text` | `Key`、`Refresh` |

文本组件示例：

```csharp
FinkLocalizedText localizedText =
    GetComponent<FinkLocalizedText>();

localizedText.Key = "ui.main.test1";
await localizedText.RefreshAsync(cancellationToken);
```

资源组件的 `Key` 同样使用资源表的完整 Key：

```csharp
FinkLocalizedImage localizedImage =
    GetComponent<FinkLocalizedImage>();
localizedImage.Key = "ui.item.icon";
localizedImage.Refresh();
```

当 Key 为空、资源缺失或模块关闭时，资源绑定组件会把目标资源设置为 `null`；文本绑定组件会显示查询结果，缺失时通常显示 Key。组件只操作同一 GameObject 上的目标组件，因此需要先满足对应的 `RequireComponent` 条件。

## 9. RTL 文字方向

开启配置中的 RTL 支持，并切换到 `ar-SA`、`ar-EG`、`he-IL` 或 `fa-IR` 等语言时：

- `FinkLocalizedText` 会镜像 Legacy Text 的左右对齐；
- TMP 文本会设置 `isRightToLeftText` 并镜像左右对齐；
- 其他布局、图片方向和业务数据不会自动翻转。

请为 RTL 语言配置合适的 Font / TMP Font Asset，并在真实设备上检查数字、标点和混排效果。

## 10. 常用 API 速览

| 需求 | API |
| --- | --- |
| 初始化 | `Initialize()` / `InitializeAsync()` |
| 使用系统语言初始化 | `InitializeFromSystemLanguage()` |
| 读取文本 | `Get()` / `TryGet()` / `GetAsync()` |
| 格式化文本 | `Format()` / `FormatAsync()` |
| 读取资源 | `GetAsset()` / `GetAsset<T>()` / `TryGetAsset<T>()` |
| 读取分类 | `LoadCategory()` / `LoadCategoryAsync()` |
| 切换语言 | `SwitchLocale()` / `SwitchLocaleAsync()` |
| 卸载数据 | `UnloadCategory()` / `UnloadLocale()` |
| 清空内存状态 | `Clear()` |
| 监听语言变化 | `OnLocaleChanged` |

::: warning 同步与异步选择
桌面文件系统可以使用同步 API；Android、WebGL 或无法直接访问 `StreamingAssets` 的平台应使用 `InitializeAsync`、`GetAsync`、`LoadCategoryAsync` 和 `SwitchLocaleAsync`。如果业务代码需要跨平台复用，建议统一使用异步入口。
:::

更多目录、占位符和表格维护规则参见[本地化配表](/localization/tables/)，完整接入流程参见[本地化基础使用](/localization/basic-usage/)。
