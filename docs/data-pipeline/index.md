# 数据管线概述

Fink Framework 内置了一套面向 Unity 配置数据的自动化管线，用于将 Excel（`.xlsx`）配置表转换为运行时可读取的强类型数据。

一张表可以生成对应的 **C# 数据类与容器类**，并根据全局设置导出 **JSON** 或 **Binary** 运行时文件。数据源模式、C# 输出位置和加密选项可在 `Project Settings → Fink Framework` 中统一配置，详见[安装与初始化](/getting-started/setup/#_4-全局配置说明)。

::: tip 一句话理解
策划维护 Excel，工具负责生成代码、校验内容和导出文件，业务代码最终只与强类型数据交互。
:::

## 1. 核心工作流

<div class="ff-flow-grid">
  <div class="ff-card">
    <span class="ff-step">01</span>
    <h3>配置（Config）</h3>
    <p>在 <code>FinkFramework_Data/DataTables/</code> 中维护 Excel。前三行依次填写字段名、字段类型和字段说明，第四行开始填写实际数据。</p>
  </div>
  <div class="ff-card">
    <span class="ff-step">02</span>
    <h3>生成（Generate）</h3>
    <p>工具递归扫描所有 <code>.xlsx</code> 文件，为每张表生成数据类与容器类；内部输出时会等待 Unity 完成脚本编译。</p>
  </div>
  <div class="ff-card">
    <span class="ff-step">03</span>
    <h3>导出（Export）</h3>
    <p>逐行解析数据并写出 JSON；Binary 模式还会生成运行时二进制文件。全部成功后生成数据清单。</p>
  </div>
  <div class="ff-card">
    <span class="ff-step">04</span>
    <h3>使用（Use）</h3>
    <p>运行时通过 <code>DataFilesUtil</code> 读取强类型数据，框架会按照当前模式选择 JSON 或 Binary，并处理反序列化。</p>
  </div>
</div>

表格格式与命名要求请继续阅读 [Excel 配表规则](/data-pipeline/excel-rules/)。

## 2. 生成结果

| 产物 | 作用 | 输出规则 |
| --- | --- | --- |
| C# 数据类 | 描述单行数据的字段结构 | 输出到配置的内部或外部 C# 路径 |
| C# 容器类 | 保存整张表的数据集合 | 与数据类生成在同一目录 |
| JSON | 调试快照或运行时数据源 | Binary 模式输出到项目外部；JSON 模式输出到 `StreamingAssets` |
| Binary | 更适合正式运行时读取的二进制数据 | 仅 Binary 模式生成，可选择是否启用 AES 加密 |
| 数据清单 | 记录运行时数据文件与类型的对应关系 | 全部表格导出成功后写入 `StreamingAssets` |

### JSON 与 Binary 模式的区别

| 模式 | JSON | Binary | 运行时读取 |
| --- | --- | --- | --- |
| **Binary（推荐）** | 始终生成，保存在项目外部供检查 | 生成到 `StreamingAssets` | Binary，可按全局设置加密 |
| **JSON** | 生成到 `StreamingAssets` | 不生成 | JSON |

无论选择哪种模式，业务侧都使用相同的强类型读取方式，不需要自行维护两套加载逻辑。

## 3. 支持的数据类型

数据解析器支持常见基础类型以及多层复合结构，包括：

- `int`、`float`、`double`、`bool`、`string` 等基础类型；
- 枚举、数组和 `List<T>`；
- `Dictionary<TKey, TValue>`；
- `Vector2`、`Vector3`、`Vector4` 和 `Color`；
- 自定义数据类，以及由数组、列表、字典组合的嵌套结构；
- 使用 JSON 表达的复杂单元格内容。

JSON 序列化还内置了 Vector、Color、Bounds、Rect、Matrix4x4 和 Quaternion 等 Unity 常用类型转换器。项目自定义的无参 `JsonConverter` 也会被自动发现并注册。

## 4. 数据 QA 与安全保护

数据工具面板提供独立的“验证所有表格”入口，会在不写出运行时文件的情况下检查数据质量：

- 字段名是否为空、重复或包含非法字符；
- 字段类型能否被框架识别和构造；
- 每个非空数据行能否逐格解析为声明的类型；
- 每张表的警告、错误与最终通过状态；
- Excel 被其他程序占用等读取异常。

正式导出时，如果任意单元格解析失败，框架不会写出该表的不完整数据；如果存在导出失败的表，也不会生成新的运行时数据清单，避免损坏内容被误认为有效产物。

## 5. 编辑器工作流

在 Unity 顶部菜单选择 `Fink Framework → 数据工具面板`，可以执行：

- **一键处理全部数据**：清理旧产物 → 生成代码 → 等待编译 → 导出数据 → 输出汇总；
- **仅生成数据文件**：只更新 C# 数据类与容器类；
- **仅解析导出数据**：使用现有类型解析 Excel 并导出运行时文件；
- **清空加密数据**：清理工具维护的导出内容；
- **验证所有表格**：运行完整的数据 QA；
- **导出或清空日志**：管理本次工具执行记录。

具体界面与操作步骤参见[数据管线编辑器工具](/data-pipeline/editor-tools/)。

## 6. 运行时读取

运行时数据分为两类：

- **默认数据**位于 `StreamingAssets`，适合随游戏发布的初始配置；
- **本地数据**位于 `persistentDataPath`，适合玩家存档或运行期间需要覆盖的数据。

`DataFilesUtil` 同时提供同步和异步读取。Android、iOS 等平台上的 `StreamingAssets` 可能是 URI 路径，应使用异步接口；框架会通过数据清单定位文件并完成读取。详细用法参见[运行时 API](/data-pipeline/api/)。

::: warning 自动生成目录
`AutoGen/` 和 `AutoExport/` 中的内容由工具维护，重新处理数据时可能被覆盖或清理，请不要手动修改。Excel 源文件应始终保存在 `FinkFramework_Data/DataTables/` 中。
:::

## 下一步

从[基础使用：创建第一张 Excel 配置表](/data-pipeline/basic-usage/)开始，完整走一遍配置、生成、导出和读取流程。

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
