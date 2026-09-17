# 统计与归档工具

统计与归档工具用于查看项目代码规模、资源构成，以及把统计报告和指定目录源码导出为留档文件。

入口：

```text
Fink Framework → 统计与归档 → 项目统计面板
Fink Framework → 统计与归档 → 项目归档面板
```

## 项目统计面板

![打开统计与归档工具](/images/utilities/tong_ui.webp)

项目统计面板按选项扫描 `Assets`，统计结果会同时显示在窗口和 Console 中。统计项分为两组：

- **代码统计**：C# 行数；可选统计 Shader 行数，也可限制到 `Assets/` 下的指定脚本目录；
- **资产统计**：材质、模型（`.fbx` / `.obj` / `.glb`）、音频（`.wav` / `.mp3` / `.ogg`）、Prefab、场景、图片/纹理、Addressables 组和 AssetBundle 资源。

勾选至少一个项目后点击“重新统计”。选项会保存到编辑器偏好设置，下次打开时继续使用上一次选择。

![项目统计面板](/images/utilities/tong_win.webp)

统计报告是当前扫描结果，不会修改项目资源。Addressables 组和 AssetBundle 资源的统计依赖项目中对应的资源配置。

## 项目归档面板

![打开项目归档工具](/images/utilities/gui_ui.webp)

归档面板需要先启用“项目归档”，然后选择要导出的内容：

| 选项 | 输出内容 |
| --- | --- |
| 导出统计报告 | 输出纯文本统计报告，文件名为 `ProjectStat_yyyyMMdd_HHmmss.txt` |
| 导出项目源码 | 按源码读取路径合并导出 C# 文件，文件名为 `SourceCode_yyyyMMdd_HHmmss.txt` |
| 包含 Editor 代码 | 源码归档时包含路径中的 `Editor` 目录 |
| 在源码前写入文件路径 | 每段源码前写入其 `Assets/...` 路径 |

![项目归档面板](/images/utilities/gui_win.webp)

源码读取路径填写 `Assets` 下的相对目录，不需要填写 `Assets/` 前缀，例如：

```text
Scripts
FinkFramework
```

点击“执行项目归档”后，工具会按时间戳写入指定目录并刷新 Unity 资源数据库。统计报告和源码归档是独立选项，至少启用其中一项并填写对应目录后才能执行。

## 归档建议

- 将导出目录放在项目外部，避免归档文件被统计工具再次纳入扫描；
- 源码归档前确认读取路径只包含希望公开或留档的代码；
- 归档文件使用 UTF-8 无 BOM 文本格式，适合提交到版本库或交给外部存档系统。
