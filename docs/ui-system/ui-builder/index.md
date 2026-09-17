# UI 面板生成器

本页介绍 UI 面板生成器和运行时 UI 调试器的使用方式，包括面板资源生成、输出路径、运行时状态查看和调试操作。

功能入口：`Fink Framework` → `UI 系统` → `创建 UI 面板`；运行时调试器位于同级菜单下的 `运行时 UI 调试器`。

![创建 UI 面板窗口](/images/ui-system/ui_create.webp)

## 生成流程

1. 输入面板名称；
2. 选择文本组件类型；
3. 选择默认过渡、安全区和示例控件；
4. 点击“创建 UI 面板”；
5. Unity 编译生成的脚本；
6. 编译完成后自动创建预制体并挂载面板脚本。

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

勾选“使用 TextMeshPro 文本组件”后，生成器使用 TextMeshPro 版本的示例控件；取消勾选则使用 Unity UGUI 的 `Text` / `InputField` 组件。输入框的生成脚本会分别引用 `TMP_InputField` 或 `InputField`。

### 默认过渡与安全区

- **默认过渡**：在面板根节点添加 `UICanvasGroupTransition`，并由该组件使用 `CanvasGroup` 执行进入和退出过渡；
- **屏幕安全区**：在 `Content` 节点添加 `UISafeArea`，适合避让刘海、圆角和系统手势区域。

这两个选项只影响初始预制体结构，生成后仍可以在 Inspector 中调整或移除。

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

## 输出路径

脚本和预制体路径来自 `Project Settings > Fink Framework > UI Settings`：

- 脚本目录：全局脚本根目录下的 UI 面板目录；
- 预制体目录：`Assets` 下且位于 `Resources` 中的 UI 面板目录。

生成器窗口会显示最终输出路径，并在目标脚本或预制体已存在时停止生成。

代码模板位于框架编辑器资源中的：

```text
Assets/FinkFramework/Editor/EditorResources/UI/template_ui_panel.txt
```

生成器会根据脚本输出目录计算命名空间；因此建议在 UI Settings 中使用项目统一的脚本目录，不要将生成脚本放到临时目录。

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
| 创建按钮不可用 | 面板名称、脚本路径或预制体路径不合法，或目标文件已存在 |
| 只有脚本没有预制体 | 查看 Console，确认脚本编译成功且类型继承 `BasePanel` |
| 面板能生成但无法打开 | 检查预制体是否在 `Resources` 下、名称是否与类型一致、脚本是否挂在根节点 |
| 示例控件没有回调 | 检查控件名称是否被修改，以及脚本中的类型和 `GetControl<T>` 是否匹配 |
