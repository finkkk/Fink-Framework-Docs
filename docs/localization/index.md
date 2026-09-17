# 本地化系统概述

本页介绍 Fink Framework 本地化系统的整体结构、编辑器工作流、文本与资源两种配表模式，以及运行时的语言切换和回退规则。

本地化系统将“翻译文本”和“多语言 Unity 资源”分开管理：文本保存在按分类、按语言拆分的 JSON 语言表中；图片、音频、字体、Prefab 等资源保存在资源本地化表资产中。业务代码只需要使用统一的 Key，不需要自己判断当前语言、拼接路径或处理 Fallback。

::: tip 一句话理解
策划在本地化工作台维护语言表和资源表，保存时同步运行时副本；运行时由 `LocalizationManager` 按当前语言查询文本或资源，缺失时自动使用默认 Fallback。
:::

## 1. 核心工作流

<div class="ff-flow-grid">
  <div class="ff-card">
    <span class="ff-step">01</span>
    <h3>配置（Config）</h3>
    <p>在 Project Settings 的 Localization 页面启用模块，选择默认语言、Fallback、加载模式和主分类。</p>
  </div>
  <div class="ff-card">
    <span class="ff-step">02</span>
    <h3>建表（Create）</h3>
    <p>保存配置后，框架会创建每个分类与支持语言对应的 JSON 文件；语言表和资源表分别维护文本与 Unity 资源。</p>
  </div>
  <div class="ff-card">
    <span class="ff-step">03</span>
    <h3>编辑与检查（Edit / QA）</h3>
    <p>在可视化表格中新增 Key、填写翻译、绑定资源，并通过缺失筛选、占位符检查和工程引用检查发现问题。</p>
  </div>
  <div class="ff-card">
    <span class="ff-step">04</span>
    <h3>同步与使用（Sync / Use）</h3>
    <p>保存语言表或配置后将源 JSON 同步到 StreamingAssets 并生成 Manifest；运行时通过 API 或本地化组件读取。</p>
  </div>
</div>

## 2. 系统组成

| 组成 | 作用 | 默认位置 |
| --- | --- | --- |
| `LocalizationSettingsAsset` | 保存模块开关、支持语言、默认语言、Fallback、加载模式和分类 | `Assets/FinkFramework_Assets/Resources/FinkFramework/Settings/Localization/` |
| 文本语言表 | 保存每个 Key 在各语言下的字符串 | `FinkFramework_Data/Localization/{分类}/{语言}.json` |
| 资源本地化表 | 保存每个资源 Key 在各语言下的 Unity 资源引用 | `Assets/FinkFramework_Assets/Resources/FinkFramework/Localization/LocalizationAssetTable.asset` |
| 运行时副本 | Player 中实际读取的语言 JSON | `Assets/StreamingAssets/FinkFramework_Data/Localization/` |
| 运行时清单 | 索引“完整 Key → 分类”，帮助移动端和按需加载定位文件 | `Assets/StreamingAssets/FinkFramework_Data/localization-manifest.json` |
| 绑定组件 | 将文本、Sprite、AudioClip、Font 或 TMP Font 自动应用到场景对象 | 挂载在场景或 Prefab 的 GameObject 上 |

源目录是版本控制中的编辑数据，`StreamingAssets` 下的内容是自动同步的运行时副本。不要直接编辑运行时副本；修改应回到本地化工作台或源 JSON。

## 3. 文本与资源两种模式

### 语言表模式

语言表保存字符串，适合按钮、标题、提示、任务描述和带参数的动态文本。每个分类对应一组语言 JSON，例如：

```text
FinkFramework_Data/Localization/
└─ UI/
   ├─ en_us.json
   └─ zh_hans.json
```

编辑器的 Key 列显示分类内相对 Key，例如分类为 `UI` 时显示 `main.test1`；保存到 JSON 和运行时数据库后会统一成为完整 Key：

```text
ui.main.test1
```

截图中的语言表带有两个测试字段：`main.test1` / `main.test2`。示例值分别为 `Test 1`、`Test 2` 和 `测试 1`、`测试 2`，用于确认两种语言列和运行时切换是否正常。

### 资源表模式

资源表保存 Unity 对象引用，同一个资源 Key 可以为不同语言绑定不同资源。当前支持的资源类型包括：

| 类型 | 常见用途 |
| --- | --- |
| `Sprite` | 多语言图片、图标、宣传图 |
| `AudioClip` | 多语言语音、音效或音乐 |
| `Font` | Legacy `Text` 使用的字体 |
| `TMPFontAsset` | TextMeshPro 使用的字体资产 |
| `Prefab` | 不同语言使用不同 UI 或演出预制体 |
| `ScriptableObject` | 多语言配置资产 |
| `Other` | 其他 Unity 对象引用 |

文本和资源可以使用相同的 Key 命名空间，但资源 Key 必须在资源表中单独建立条目。

## 4. Key、分类与语言

分类既是目录名，也是完整 Key 的前缀。例如配置分类 `UI`、`Common`、`Battle` 后：

| 编辑器输入 | 运行时完整 Key |
| --- | --- |
| 分类 `UI` + `main.start` | `ui.main.start` |
| 分类 `Common` + `confirm` | `common.confirm` |
| 已输入 `ui.main.start` | 保持为 `ui.main.start`，不会重复添加前缀 |

运行时 Key 对比较大小写不敏感，但质量检查推荐并要求保存后的规范形式为小写英文、数字、下划线和点号，例如 `ui.main.start_game`。分类应使用单层安全目录名，不要包含 `/`、反斜杠或路径穿越片段。

语言 ID 来自框架内置语言目录，常用语言包括 `en-US`、`zh-Hans`、`zh-Hant`、`ja-JP`、`ko-KR`、`fr-FR`、`de-DE`、`es-ES` 等。配置页中的“支持语言”决定语言表列和资源表列；语言 ID 不能在此处手写新增。

## 5. 运行时语言流程

初始化时，系统按照“系统语言（如果显式使用系统语言初始化且在支持列表中）→ 默认语言”的顺序确定当前语言。查询文本或资源时按以下顺序查找：

```text
当前语言的 Key
    └─ 找不到 → 默认 Fallback 语言的 Key
                    └─ 仍找不到 → 文本返回 Key，资源返回 null，并记录一次警告
```

切换语言成功后触发 `LocalizationManager.OnLocaleChanged`。`FinkLocalizedText`、`FinkLocalizedImage`、`FinkLocalizedAudio`、`FinkLocalizedFont` 和 `FinkLocalizedTMPFont` 会自动订阅并刷新。

## 6. 三种加载模式

| 模式 | 初始化行为 | 适用场景 |
| --- | --- | --- |
| `LoadAll` | 启动时加载所有支持语言、所有分类 | 数据量较小、切换语言频繁 |
| `OnDemandLocalePackage` | 启动时加载当前语言与 Fallback；切换语言时加载新的完整语言包 | 语言较多，希望减少初始内存 |
| `OnDemandModule` | 首次查询某分类或显式调用 `LoadCategory` 时加载；只加载实际使用的分类 | 大型项目、模块化内容或 DLC |

Android、WebGL 等平台的 `StreamingAssets` 可能是 URI，不能依赖同步文件读取。移动端启动流程建议使用 `InitializeAsync`，文本查询和语言切换使用异步 API。

## 下一步

1. 先阅读[基础使用](/localization/basic-usage/)，完成一次配置、建表、编辑和运行时读取。
2. 需要调整模块开关、语言或加载策略时，阅读[本地化配置](/localization/configuration/)。
3. 需要维护 JSON、占位符、资源引用或 Excel 时，阅读[本地化配表](/localization/tables/)。
4. 接入代码和场景组件时，阅读[运行时 API](/localization/api/)。

<style>
.ff-flow-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 24px 0;
}

.ff-card {
  position: relative;
  padding: 18px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  transition: border-color 0.25s, background-color 0.25s;
}

.ff-card:hover {
  border-color: var(--vp-c-brand-1);
}

.ff-card h3 {
  margin: 4px 0 8px;
  font-size: 16px;
}

.ff-card p {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

.ff-step {
  color: var(--vp-c-brand-1);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

@media (max-width: 640px) {
  .ff-flow-grid {
    grid-template-columns: 1fr;
  }
}
</style>
