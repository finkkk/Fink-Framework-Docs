<p align="center">
  <img src="/images/brand/f_logo.webp" width="120" alt="Fink Framework Logo">
</p>

<h1 align="center">Fink Framework</h1>
<p align="center">面向 Unity 项目的轻量开发框架与编辑器工具集</p>

<div style="display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap;margin:16px 0">
  <a href="https://finkkk.cn/docs/fink-framework">
    <img src="https://img.shields.io/badge/Docs-blue?style=flat-square" alt="Documentation">
  </a>
  <a href="https://github.com/finkkk/Fink-Framework/stargazers">
    <img src="https://img.shields.io/github/stars/finkkk/Fink-Framework?style=flat-square" alt="GitHub stars">
  </a>
  <a href="https://github.com/finkkk/Fink-Framework/releases">
    <img src="https://img.shields.io/github/v/release/finkkk/Fink-Framework?label=Release&style=flat-square" alt="Latest release">
  </a>
  <img src="https://img.shields.io/github/license/finkkk/Fink-Framework?style=flat-square&cacheSeconds=0" alt="License">
</div>

<p align="center"><em>文档更新日期：<strong>2026.9.16</strong></em></p>

## 框架简介

Fink Framework 是一套面向 Unity 游戏项目的开发基础框架，围绕 **UI 系统、数据管线、存档系统、资源加载、本地化系统与运行时基础服务** 提供完整支撑。框架同时覆盖场景、事件、对象池、计时器、输入、音频与调试工具等常用能力，并以清晰的模块边界减少重复建设，让团队更专注于玩法与内容。它既提供可直接调用的运行时 API，也提供数据工具、本地化编辑器、UI 面板生成器、项目统计与归档等编辑器工具。框架不替代 Unity，而是统一常用系统的运行时入口、项目配置和编辑器工作流。

::: tip 框架定位
轻量、清晰、工具优先。在保留 Unity 原生工作方式的基础上，为常用系统提供统一入口和更完整的编辑器工作流。
:::

## 核心能力

| 模块 | 能力概览 |
| --- | --- |
| UI 系统 | 重构后的 UI 架构，支持异步加载、面板生命周期、参数注入、转场、导航、模态遮罩、多 Surface 与多 Canvas 场景。 |
| 本地化系统 | 提供语言设置、运行时清单、文本与资源表、格式化、语言回退，以及导入、导出、质量检查等编辑器工具链。 |
| 数据管线 | 覆盖 Excel → C# → JSON → Binary 的处理流程，包含代码生成、字段校验、数据 QA、清单生成与路径管理。Binary 模式支持 AES 加密。 |
| 存档系统 | 提供强类型槽位/全局存档、UniTask 异步读写、自动存档、原子替换、即时与历史备份、损坏恢复及旧 Schema 成员重命名兼容；序列化、AES 与压缩能力复用 DataUtil。 |
| 资源加载 | 统一同步、异步与句柄式接口；通过 Provider 机制支持 Resources、Editor、File、Web、AssetBundle 与 Addressables。 |
| 项目设置 | 在 Project Settings 中集中管理框架、数据管线、存档系统、资源后端、输入、本地化与 UI 等配置；存档 AES 策略复用 Data Pipeline。 |
| 运行时基础服务 | 内置单例、事件、计时器、对象池、场景切换、输入、音频、日志、数学与 Gizmos 可视化工具。 |
| 编辑器工具 | 提供数据处理、本地化管理、UI 构建、项目统计、框架欢迎页与设置面板，形成从配置到导出的工作流。 |

## 适用场景

- 希望快速建立统一工程规范的 Unity 单人或小团队项目。
- 需要数据驱动配置、异步 UI、资源后端切换或多语言支持的项目。
- 希望将通用基础能力从业务层抽离，并保留后续扩展空间的项目。

## 项目结构

```text
Assets/FinkFramework/
├── Runtime/                 # 运行时模块
│   ├── UI/                  # UI、导航、转场、模态与安全区域
│   ├── Localization/        # 本地化运行时系统
│   ├── Data/                # 数据读取、序列化与管线路径
│   ├── Save/                # 槽位/全局存档、备份恢复与 Schema 兼容
│   ├── ResLoad/             # Provider 化资源加载
│   ├── Audio/ Pool/ Timer/  # 常用运行时服务
│   └── ...
├── Editor/                  # 数据、本地化、UI、设置与统计工具
└── Plugins/                 # 随框架分发的第三方依赖
```

## 设计特点

- **轻量清晰**：围绕 Unity 常见开发需求提供直接的管理器与工具类，项目结构和调用入口容易理解；
- **编辑器驱动**：配表、代码生成、本地化、UI 创建、设置和质量检查均有对应编辑器入口；
- **同步异步兼顾**：资源、UI、场景和本地化流程提供适合不同调用场景的同步或异步方式；
- **环境自动识别**：通过包定义自动识别 UGUI、TextMeshPro、Input System、XR、URP 和 Addressables；
- **开发到构建贯通**：从源数据处理、运行时加载到构建前校验，覆盖项目数据的完整使用链路。

## 基本要求

| 项目 | 要求 |
| --- | --- |
| Unity 版本 | Unity 2021.3+、Unity 2022.3+（推荐）或 Unity 6及以上 |
| 编码格式 | UTF-8 without BOM |
| 许可证 | MIT License |

UniTask、Odin Serializer、Newtonsoft.Json 和 ExcelDataReader 已随发行包提供。导入前请先阅读[依赖说明](/getting-started/setup/#_2-框架依赖说明)，避免项目内出现重复程序集。

## 当前边界

- 暂不支持 Unity 2021 以前的版本；
- 输入系统同时提供全局设备检测、`NewInputManager`（新版 Input System）和 `LegacyInputManager`（旧版 Input Manager）两套映射后端；
- AssetBundle 部分负责运行时加载与引用管理，不包含打包、下载、版本管理或差分更新工具；
- Addressables Provider 仅在项目已安装 Addressables 包时启用。

## 开始使用

建议按“安装配置 → 选择模块 → 基础能力 → 工具与附录”的顺序阅读。下面的入口与左侧导航保持一致，可以直接进入对应章节。

### 1. 安装与初始化

- [安装与初始化（Setup）](/getting-started/setup/)：导入 UnityPackage，设置脚本根目录，完成 Framework 全局配置。

### 2. 使用核心系统

- [数据管线（Data Pipeline）](/data-pipeline/)：从 Excel 配表、代码生成到 JSON/Binary 导出与运行时读取，适合数据驱动项目。
- [UI 系统（UI System）](/ui-system/)：了解面板、Surface、转场、导航、模态遮罩和 UI Builder 的完整工作流。
- [存档系统（Save System）](/save-system/)：配置槽位与全局存档，处理异步读写、原子提交、备份恢复和数据兼容。
- [资源加载（ResLoad）](/resload/)：通过 Provider 统一管理 Resources、本地文件、网络、AssetBundle 与 Addressables。
- [本地化系统（Localization）](/localization/)：配置语言、文本表、资源表与运行时语言切换，并使用 Excel 工具维护文本表。
- [输入系统（Input System）](/input-system/)：检测输入设备并绑定键鼠事件，区分设备识别、设备切换与输入监听。

### 3. 使用基础系统

- [单例模式（Singleton）](/core-systems/singleton/)：区分纯逻辑单例、自动挂载型 Mono 单例和场景挂载型 Mono 单例，按生命周期选择实现。
- [对象池系统（ObjectPool）](/core-systems/object-pool/)：复用 GameObject 与普通 C# 对象，减少频繁创建和销毁带来的开销。
- [生命周期系统（Mono）](/core-systems/mono/)：为普通类统一提供 Update、FixedUpdate、LateUpdate 与 Gizmos 回调。
- [定时系统（Timer）](/core-systems/timer/)：提供普通计时、真实计时、一次性计时和循环计时，并支持暂停、恢复与移除。
- [音效系统（Audio）](/core-systems/audio/)：统一播放背景音乐与音效，通过 Mixer、异步加载和对象池管理音频资源。
- [场景切换系统（Scene）](/core-systems/scene/)：提供按名称或索引的同步、异步场景切换，以及切换前清理和生命周期事件。
- [事件系统（Event）](/core-systems/event/)：基于枚举事件标识，支持无参数、单参数、双参数事件和自动绑定解绑。

### 4. 使用工具类

- [日志工具（Log）](/utilities/log/)：统一日志格式、模块标签、日志等级和彩色输出，并支持 DebugMode 开关。
- [数学工具（Math）](/utilities/math/)：提供范围处理、插值、距离、扇形检测、射线和 Overlap 等常用数学能力。
- [文本工具（Texts）](/utilities/texts/)：处理字符串拆分、数字格式化、时间转换、命名转换和 Excel 数据清洗。
- [概率工具（Prob）](/utilities/prob/)：提供概率判断、权重随机、随机元素、方向、位置和列表洗牌。
- [可视化工具（Gizmos）](/utilities/gizmos/)：在 Scene 视图中绘制射线、扇形、盒体和球体，辅助调试检测范围。
- [统计归档工具（Stat）](/utilities/stat/)：通过项目统计面板和项目归档面板分析代码、资源并导出归档文本。

### 5. 继续阅读

- [常见问题（FAQ）](/appendix/faq/)：汇总安装、配置、运行时和各模块接入中的常见问题。
- [更新日志（Changelog）](/appendix/changelog/)：记录版本功能、问题修复、兼容性变化和工程体验更新。
- [支持与致谢（Credits）](/appendix/credits/)：查看项目维护者、源码仓库以及随包提供的开源组件致谢。

如果还不确定从哪里开始，先阅读[安装与初始化](/getting-started/setup/)，再根据项目需求选择核心系统；具体 API 和进阶配置可以从各模块页面的章节导航继续深入。

## 相关链接

- [使用文档](https://www.finkkk.cn/fink-framework)
- [GitHub 仓库](https://github.com/finkkk/Fink-Framework)
- [GitHub Releases](https://github.com/finkkk/Fink-Framework/releases)
- [百度网盘镜像下载（提取码：2333）](https://pan.baidu.com/s/1obZYHwBI4ZVnavCiCPE8BA?pwd=2333)

## 依赖与致谢

框架感谢以下开源项目与社区贡献者提供的支持与启发：

- [Odin Serializer](https://github.com/TeamSirenix/odin-serializer)
- [UniTask](https://github.com/Cysharp/UniTask)
- [ExcelDataReader](https://github.com/ExcelDataReader/ExcelDataReader)
- [Newtonsoft.Json](https://github.com/JamesNK/Newtonsoft.Json)
- [Json.NET Converters（Wanzyee Studio）](https://assetstore.unity.com/packages/tools/input-management/json-net-converters-simple-compatible-solution-58621)
- 所有分享 Unity 技术与开源成果的开发者

## 开源协议与联系方式

本项目采用 [MIT License](https://github.com/finkkk/Fink-Framework-Docs/blob/main/LICENSE) 开源。

如果你在使用过程中遇到问题，或希望讨论框架设计、模块扩展、贡献代码等内容，欢迎加入QQ群聊一起讨论：

- **QQ群：** 1125852721
- **扫描二维码入群：**
![QQ群二维码](/images/brand/qq.webp)

也可以欢迎各位开发者添加框架作者的个人联系方式进行交流：

- **QQ：** 2217183968
- **微信：** FLX2217183968
- **博客：** https://finkkk.cn
- **GitHub：** https://github.com/finkkk

你也可以在 GitHub Issue 区提交问题或建议，也可在博客文档下留言进行讨论。
