# 数据管线配置

本页介绍数据管线的运行时数据源、C# 代码生成路径和数据加密设置。开始制作正式配表前，建议先完成这些配置。

数据管线设置入口：`Edit` → `Project Settings` → `Fink Framework` → `Data Pipeline`，也可以从 `Fink Framework → 数据管线系统 → 数据管线配置` 打开。

![数据管线设置面板](/images/data-pipeline/set.webp)

## 1. 运行时数据源

在“数据导出模式”中选择运行时使用的数据源。

| 模式 | 导出与加载行为 |
| --- | --- |
| **Binary（默认）** | 运行时读取二进制数据；同时额外导出一份位于项目外部的 JSON，供调试和检查使用。 |
| **Json** | 运行时读取 `StreamingAssets` 中的 JSON；不会生成二进制文件。 |

如果修改数据源模式，请重新执行数据导出，确保运行时文件与当前设置一致。

## 2. C# 数据类输出位置

数据管线会根据 Excel 表自动生成数据类和容器类。输出位置分为两种模式：

| 模式 | 默认位置 | 说明 |
| --- | --- | --- |
| **内部（Assets）** | 全局脚本根目录下的 `Data/AutoGen/DataClass` | 生成后由 Unity 自动编译，适合大多数项目。 |
| **外部（项目目录）** | `FinkFramework_Data/AutoGen/DataClass` | 生成在 Assets 之外，适合需要自行管理或复制生成代码的流程。 |

内部路径会跟随 [Framework 全局设置](/getting-started/setup/#_5-framework-全局设置)中的“全局脚本根目录”。例如根目录为 `Assets/Scripts` 时，默认输出位置为：

```text
Assets/Scripts/Data/AutoGen/DataClass
```

两种模式都支持启用自定义路径。输入路径后需要点击“应用”，面板下方会显示当前最终生效的路径。

- 自定义内部路径只填写全局脚本根目录之后的部分，不要重复填写 `Assets` 或全局根目录；
- 自定义外部路径需要填写 Unity 项目内、`Assets` 目录外的项目相对路径；
- 路径不合法时无法应用，运行流程也会回退到默认路径。

> `AutoGen` 目录由工具维护，不要手动修改其中的生成代码，否则下次生成时会被覆盖。

## 3. 不同模式的输出位置

Excel 源文件始终放在：

```text
FinkFramework_Data/DataTables
```

数据文件的最终位置由运行时数据源模式自动决定：

| 当前模式 | 输出内容 | 输出位置 |
| --- | --- | --- |
| **Binary** | 运行时二进制 | `Assets/StreamingAssets/FinkFramework_Data/DataBinary` |
| **Binary** | 调试用 JSON 快照 | `FinkFramework_Data/AutoExport/DataJson` |
| **Json** | 运行时 JSON | `Assets/StreamingAssets/FinkFramework_Data/DataJson` |

Json 模式不会生成二进制文件；Binary 模式生成的外部 JSON 只用于检查和调试，不会作为运行时数据源。以上数据路径由框架统一管理，无需手动指定。

## 4. 二进制数据加密

加密配置就在 Data Pipeline 页面中，与运行时数据源和 C# 输出路径统一管理。

### 4.1 全局开启加密

开启后，框架的数据保存流程会使用 AES 加密；关闭后则保存未加密的二进制内容。该选项主要影响 Binary 数据流程，使用 JSON 模式时不会把 JSON 转为加密二进制。

### 4.2 AES 密钥

“加密密钥”同时用于数据加密与解密。正式项目不要继续使用默认或过于简单的字符串，建议配合代码混淆，并避免将真实密钥公开在仓库或文档中。

### 4.3 文件后缀名

可以修改加密数据文件使用的扩展名，例如 `.fink`、`.dat` 或 `.bytes`。扩展名只起到文件识别和一定程度的混淆作用，本身不等于安全加密。

修改密钥、加密开关或扩展名后，需要重新导出数据；已经写出的数据文件不会自动按新配置转换。

## 5. 推荐配置

- 开发初期需要直接检查数据内容时，可使用 Json 模式；
- 正式运行数据可使用 Binary，并根据项目安全需求开启加密；
- 多人协作项目应尽早统一代码输出位置、密钥管理方式和扩展名；
- 完成设置后，继续阅读[数据管线基础使用](/data-pipeline/basic-usage/)。
