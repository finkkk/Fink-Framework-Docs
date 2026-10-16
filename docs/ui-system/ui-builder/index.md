# UI 面板生成器

本页介绍 UI 面板生成器和运行时 UI 调试器的使用方式，包括面板资源生成、输出路径、运行时状态查看和调试操作。

功能入口：`Fink Framework` → `UI 系统` → `创建 UI 面板`；运行时调试器位于同级菜单下的 `运行时 UI 调试器`。

![创建 UI 面板窗口](/images/ui-system/ui_create.webp)

## 生成流程

1. 输入面板名称；
2. 选择文本组件类型；
3. 选择默认过渡、安全区和示例控件；
4. 在“输出设置”中确认目录和资源注册参数，可为本次创建单独修改，或开启“跟随 UI 配置”；
5. 检查“输出预览”中的最终文件路径、资源来源及提示，再点击“创建 UI 面板”；
6. Unity 编译生成的脚本；
7. 编译完成后自动创建预制体、挂载面板脚本，并根据创建时的参数完成资源注册，最后定位生成的预制体。

面板名称同时作为 C# 类名和预制体文件名。建议使用 PascalCase，例如 `SettingsPanel`。

创建流程包含一次脚本编译。生成器会先写入脚本并等待 Unity 完成编译，再通过已编译的类型挂载 `BasePanel` 脚本并保存预制体。编译期间不要移动或重命名生成的脚本，也不要重复点击创建按钮。

## 面板设置

### 面板名称

面板名称必须同时满足 C# 类型名和 Unity 资源名的要求：

- 不能为空，并且只能使用字母、数字和下划线；
- 不能以数字开头；
- 不能使用 C# 关键字；
- 目标脚本目录和预制体目录中不能已经存在同名文件。

例如输入 `InventoryPanel` 后，生成器会创建：

```text
<脚本输出目录>/InventoryPanel.cs
<预制体输出目录>/InventoryPanel.prefab
```

### 文本组件

“使用 TextMeshPro 文本组件”默认勾选，生成器使用 TextMeshPro 版本的示例控件；取消勾选则使用 Unity UGUI 的 `Text` / `InputField` 组件。输入框的生成脚本会分别引用 `TMP_InputField` 或 `InputField`。

### 默认过渡与安全区

- **默认过渡**：在面板根节点添加 `UICanvasGroupTransition`，并由该组件使用 `CanvasGroup` 执行进入和退出过渡；
- **屏幕安全区**：在 `Content` 节点添加 `UISafeArea`，适合避让刘海、圆角和系统手势区域。

这两个选项默认开启，只影响初始预制体结构，生成后仍可以在 Inspector 中调整或移除。按钮、输入框、开关和滑动条等示例控件默认全部不选，正式面板可以直接从空的内容容器开始搭建。

## 可选内容

| 选项 | 生成内容 |
| --- | --- |
| TextMeshPro | 使用 `TextMeshProUGUI` 和 `TMP_InputField` |
| 默认过渡 | 添加 `CanvasGroup` 和 `UICanvasGroupTransition` |
| 屏幕安全区 | 添加 `UISafeArea` |
| Button | 添加示例 Button 和回调代码 |
| InputField | 添加示例输入框和回调代码 |
| Toggle | 添加示例 Toggle 和回调代码 |
| Slider | 添加示例 Slider 和回调代码 |

## 输出设置与预览

### 本次设置与跟随 UI 配置（v1.1.5）

首次打开时，生成器从 `Project Settings > Fink Framework > UI Settings` 填入输出目录和资源注册参数。“跟随 UI 配置”默认关闭，可以直接为本次创建修改这些值。

| 配置项 | 作用 |
| --- | --- |
| 脚本输出目录 | 本次生成面板脚本的目录，例如 `Assets/Scripts/UI/Panels` |
| 预制体输出目录 | 本次生成面板预制体的目录，根据当前加载来源校验 |
| 资源组 | 仅 Addressables 来源显示，指定新预制体加入的 Group |
| 资源包名 | 仅 AssetBundle 来源显示，指定新预制体的 AssetBundle 包名 |
| 跟随 UI 配置 | 开启后立即同步并锁定上述字段，持续使用 UI Settings 中的值；关闭后保留当前值，恢复手动编辑 |
| 打开 UI 配置 | 跳转到项目的 UI Settings，修改统一配置 |

窗口中的手动修改用于本次生成，不会写回 UI Settings；关闭跟随时，切换窗口焦点或脚本重编译不会用全局配置覆盖已自定义的目录及资源注册参数。资源来源仍由 UI Settings 和全局资源后端决定，不能在生成器中单独切换。

### 输出目录 {#输出路径}

UI Settings 提供以下默认目录，生成器中的目录字段会显示包含 `Assets/` 的项目资源路径：

- 脚本目录：全局脚本根目录下的 UI 面板目录；
- Resources 预制体目录：默认 `Assets/Resources/UI/Panels/`；
- 非 Resources 预制体目录：默认 `Assets/GameAssets/UI/Panels/`，不能位于 `Resources`、`Editor` 或 `StreamingAssets` 下。

脚本目录仍按全局脚本根目录及 UI 面板相对目录规则校验；预制体目录也必须符合当前来源的限制，不能通过本次自定义绕过校验。生成器会在目标脚本或预制体已存在时停止生成。

UI Settings 分别保存两类预制体目录，当前加载来源决定默认填入哪一个；跟随 `None` 后端仍使用 Resources 目录。切换来源或修改目录不会移动已有资源，也不会修改已有 Address，迁移时需手动整理。

### 输出预览与加载一致性

“输出预览”只读显示最终的脚本文件、面板预制体路径和资源来源；Addressables 还显示资源组与 Address，AssetBundle 显示资源包名。路径或资源注册参数无效时会显示错误，创建按钮下方也会提示不可创建的原因。

自定义输出参数后，应检查生成资源是否仍符合运行时加载规则：

- **Resources**：若预制体目录对应的 Resources 加载路径与 UI Settings 不同，窗口会显示警告。创建后需同步调整 UI Settings 的加载目录，才能通过 `UIManager` 打开该面板。例如改为 `Assets/Resources/UI/Dialogs` 后，`InventoryPanel` 的地址是 `res://UI/Dialogs/InventoryPanel`；原配置仍指向 `UI/Panels` 时无法找到它。
- **Addressables**：可以为本次生成指定不同 Group，Address 仍固定为面板类名，业务继续通过 `OpenAsync<T>()` 打开。
- **AssetBundle**：若本次包名与 UI Settings 不同，窗口会显示警告。运行时默认仍按 UI Settings 中的包名加载，需要同步调整加载配置，或使用 `CustomPanelAssetPathResolver` 返回实际地址；资源包仍需另行构建和部署。
- **自定义来源**：只生成文件，需要项目自行注册资源并提供地址解析器。

Resources 加载目录和默认 AssetBundle 包名是统一配置。调整它们时也应确认已有面板的资源位置，避免已有面板继续留在旧目录或旧包中。

### 资源注册（v1.1.4）

| 当前来源 | 生成器行为 |
| --- | --- |
| Resources / 跟随 None | 保存预制体，由 Resources 路径加载 |
| 跟随 Addressables | 加入本次指定的资源组（初始取自 `UI Addressables Group`，默认 `UI Panels`，不存在时创建），Address 设置为面板类名 |
| 跟随 AssetBundle | 设置本次指定的资源包名（初始取自 `UI AssetBundle 包名`，默认 `ui`），资源包需另行构建 |
| 自定义 / 跟随 Custom | 只生成脚本和预制体，项目自行注册资源并配置地址解析器 |

创建时的输出目录、后端、Group 和包名会跨脚本编译保存，后续生成与注册使用点击创建时的参数。Addressables 生成扩展需要安装 `com.unity.addressables`；缺失或存在编译错误时会提示不可用。

Address 使用区分大小写的面板类短名称。若该 Address 已被其他资源占用，生成器会拒绝注册；同名面板即使命名空间不同也会冲突。已有目标 Group 必须可写，并包含 `BundledAssetGroupSchema` 和 `ContentUpdateGroupSchema`。AssetBundle 包名必须小写且不含路径分隔符或非法字符。

代码模板位于框架编辑器资源中的：

```text
Assets/FinkFramework/Editor/EditorResources/UI/template_ui_panel.txt
```

生成器会根据本次脚本输出目录计算命名空间；因此建议使用项目统一的脚本目录，不要将生成脚本放到临时目录。

## 生成结果

默认预制体结构如下：

```text
InventoryPanel（根节点，挂载 InventoryPanel : BasePanel）
├── Background（全屏 Image，用于背景或拦截射线）
└── Content（全屏内容容器）
    ├── DemoButton（可选）
    ├── DemoInput（可选）
    ├── DemoToggle（可选）
    └── DemoSlider（可选）
```

勾选至少一个示例控件时，`Content` 会添加 `VerticalLayoutGroup`，用于排列示例控件。示例控件仅用于快速验证面板结构和事件回调，正式界面可以直接替换、移动或删除。

生成脚本会包含与示例控件对应的字段、`GetControl<T>` 查找代码和回调示例。控件名称与查找字符串必须保持一致，例如 `DemoButton` 对应：

```csharp
demoButton = GetControl<Button>("DemoButton");

protected override void OnButtonClicked(string controlName)
{
    if (controlName == "DemoButton")
    {
        LogUtil.Info("UI", "点击了 DemoButton");
    }
}
```

生成器不会替业务代码自动合并到已有文件。目标脚本或预制体已存在时，流程会停止并提示冲突。

## 运行时 UI 调试器

运行时调试器入口位于：

```text
Fink Framework > UI 系统 > 运行时 UI 调试器
```

![UI 运行时调试器](/images/ui-system/runtime_debugger.webp)

进入 Play Mode 后，调试器可以查看：

- 已注册的 Surface；
- 面板实例、实例标识和资源路径；
- 面板状态；
- 显示模式、层级、缓存策略和生命周期；
- 面板所属场景。

调试器支持按面板类型、实例标识、Surface 和资源路径搜索，并提供以下操作：

- 复制完整 `UIPanelKey`；
- 定位导航焦点；
- 关闭面板并保留实例；
- 关闭面板并释放实例。

调试器还可以通过 `GetPanelSnapshots()` 和 `GetSurfaceSnapshots()` 为自动化测试提供运行时只读数据。

### 调试面板状态

面板状态包括 `Loading`、`Hidden`、`Opening`、`Active`、`Paused`、`Closing`、`Disposed` 和 `Failed`。调试时可以结合以下信息判断问题：

| 信息 | 用途 |
| --- | --- |
| `UIPanelKey` | 区分面板类型、实例标识和 Surface |
| `AssetPath` | 检查资源路径是否与 UI Settings 一致 |
| `State` | 判断面板处于加载、显示、暂停还是关闭流程 |
| `Options` | 检查层级、显示模式、缓存策略和生命周期 |
| `OwnerSceneName` | 判断场景级面板的归属场景 |

### 常见问题

| 现象 | 检查项 |
| --- | --- |
| 创建按钮不可用 | 检查按钮下方与输出预览中的提示，确认名称、目录及资源注册参数有效，且目标文件不存在 |
| 输出字段无法编辑 | 检查是否开启“跟随 UI 配置”；关闭后保留当前值并恢复编辑，或点击“打开 UI 配置”修改统一配置 |
| 只有脚本没有预制体 | 查看 Console，确认脚本编译成功且类型继承 `BasePanel` |
| 面板能生成但无法打开 | 检查自定义 Resources 目录或 AssetBundle 包名是否与运行时配置一致，并确认 Address、名称与类型、根节点脚本正确；非 Resources 首次打开使用 `OpenAsync<T>()` |
| Addressables 注册失败 | 确认包与生成扩展可用、Address 未被其他资源占用、目标 Group 可写且包含所需 Schema |
| 示例控件没有回调 | 检查控件名称是否被修改，以及脚本中的类型和 `GetControl<T>` 是否匹配 |
