# UI 系统配置

UI 系统配置用于决定框架创建和管理 UI 时采用的渲染空间。

打开方式：`Edit` → `Project Settings` → `Fink Framework` → `UI Settings`。

## 1. UI 渲染模式

| 模式 | 说明 | 适用场景 |
| --- | --- | --- |
| **ScreenSpace** | 使用普通屏幕空间 UI。 | 传统 2D 界面、非 VR 游戏。 |
| **WorldSpace** | 使用放置在 3D 世界中的空间 UI。 | VR、世界内面板、3D 交互界面。 |
| **Auto（默认推荐）** | 根据框架检测到的 XR 环境自动选择；XR 环境使用 WorldSpace，否则使用 ScreenSpace。 | 希望同一套项目配置适应普通与 VR 环境。 |

## 2. 如何选择

- 普通游戏项目可以选择 `ScreenSpace`，或直接保持 `Auto`；
- 只运行在 VR / XR 环境中的项目可以明确选择 `WorldSpace`；
- 同时支持桌面与 VR 模式时，优先使用 `Auto`，并分别验证两种环境下的 Canvas 与交互表现。

`Auto` 会受到 Framework 设置中“强制关闭 XR”的影响：如果强制关闭 XR，框架会按非 VR 环境处理，自动模式最终使用 ScreenSpace。

完成配置后，可继续阅读[平面 UI 的使用](/ui-system/screen/)或[空间 UI 的使用](/ui-system/world/)。
