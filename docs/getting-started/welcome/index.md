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

<p align="center"><em>文档更新日期：<strong>2026.9.10</strong></em></p>

## 框架简介

Fink Framework 面向个人开发者、小型团队和中小型 Unity 项目，目标是把游戏开发中重复出现的数据处理、资源加载、UI 管理、本地化和运行时基础能力整理成一套一致的工作流。

它既提供可直接调用的运行时 API，也提供数据工具、本地化编辑器、UI 面板生成器、项目统计与构建检查等编辑器工具。框架不试图替代 Unity，而是帮助项目减少重复代码、统一开发约定，并让常见工作尽量在可视化界面中完成。

::: tip 框架定位
轻量、清晰、工具优先。在保留 Unity 原生工作方式的基础上，为常用系统提供统一入口和更完整的编辑器工作流。
:::

## 核心能力

| 方向 | 能力概览 | 相关文档 |
| --- | --- | --- |
| 数据管线 | 从 Excel 读取配置，生成 C# 数据类，导出 JSON 或二进制数据，并提供 AES 加密、清理、清单和表格质量检查。 | [数据管线](/data-pipeline/) |
| 本地化 | 管理文本及图片、音频、字体等本地化资源；支持语言回退、RTL、分类加载、Excel 交换、差异预览与工程引用检查。 | [本地化系统](/localization/) |
| UI 系统 | 管理面板的创建、显示、隐藏与销毁，支持分层、单/多画布、参数传递以及同步、异步和回调式加载。 | [UI 系统](/ui-system/) |
| 资源加载 | 使用统一路径访问 Resources、本地文件、网络、AssetBundle 和 Addressables，并处理缓存、引用计数、批量加载与释放。 | [资源加载](/resload/) |
| 运行时基础设施 | 提供单例、对象池、事件绑定、生命周期代理、输入、计时器、音频和场景切换等常用能力。 | [基础系统](/core-systems/) |
| 通用工具 | 提供日志、数学、文本、路径与解析工具，以及可在 Scene 视图中使用的 Gizmos 调试绘制。 | [工具类](/utilities/) |

## 编辑器工具

框架将常用流程集中在 Unity 顶部的 `Fink Framework` 菜单和 `Project Settings → Fink Framework` 中：

- **数据工具面板**：一键处理全部数据、单独生成或解析数据、验证 Excel 表格并管理处理日志；
- **本地化工作台**：编辑语言表和资源表、导入导出 Excel、预览差异，并检查缺失 Key、占位符和未接入本地化的内容；
- **UI 面板生成器**：生成符合框架约定的面板脚本与资源结构；
- **项目统计与归档**：统计代码、材质、模型、音频、Prefab、场景、纹理及资源组，并导出统计或源码归档；
- **全局设置**：集中管理数据模式、加密、环境检测、UI 模式和资源后端；
- **开发保障**：导入后自动初始化目录，提供版本检查、数据与本地化构建检查，并阻止仅限编辑器的资源路径进入正式构建。

## 设计特点

- **轻量清晰**：围绕 Unity 常见开发需求提供直接的管理器与工具类，项目结构和调用入口容易理解；
- **编辑器驱动**：配表、代码生成、本地化、UI 创建、设置和质量检查均有对应编辑器入口；
- **同步异步兼顾**：资源、UI、场景和本地化流程提供适合不同调用场景的同步或异步方式；
- **环境自动识别**：通过包定义自动识别 UGUI、TextMeshPro、Input System、XR、URP 和 Addressables；
- **开发到构建贯通**：从源数据处理、运行时加载到构建前校验，覆盖项目数据的完整使用链路。

## 基本要求

| 项目 | 要求 |
| --- | --- |
| Unity 版本 | Unity 2021.3+、Unity 2022.3+（推荐）或 Unity 6 |
| 编码格式 | UTF-8 without BOM |
| 当前框架版本 | v0.4.0 |
| 许可证 | MIT License |

UniTask、Odin Serializer、Newtonsoft.Json 和 ExcelDataReader 已随发行包提供。导入前请先阅读[依赖说明](/getting-started/setup/#_2-框架依赖说明)，避免项目内出现重复程序集。

## 开始使用

第一次接入时，建议按以下顺序完成：

1. 阅读[安装与初始化](/getting-started/setup/)，导入 UnityPackage 并完成全局设置；
2. 从[数据管线基础使用](/data-pipeline/basic-usage/)建立第一张配置表；
3. 根据项目需要自行使用 [UI 系统](/ui-system/)、[资源加载](/resload/)与[本地化系统](/localization/)；
4. 在开发过程中使用[基础系统](/core-systems/)和[工具类](/utilities/)减少重复代码。

更多内容可以从左侧导航栏进入。

## 当前边界

- 暂不支持 Unity 2021 以前的版本；
- 框架的 `InputManager` 面向 Unity 旧输入系统；检测到新 Input System 时会自动停止使用该输入管理器；
- AssetBundle 部分负责运行时加载与引用管理，不包含打包、下载、版本管理或差分更新工具；
- Addressables Provider 仅在项目已安装 Addressables 包时启用。

## 开源地址

[GitHub：finkkk/Fink-Framework](https://github.com/finkkk/Fink-Framework)

项目采用 MIT License。欢迎提交 Issue 或 PR，一起完善 Fink Framework。
