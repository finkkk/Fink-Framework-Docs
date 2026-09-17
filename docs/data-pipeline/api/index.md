# 运行时 API 使用

本页介绍 Fink Framework 数据管线的运行时 API，包括默认数据和本地数据读取、本地数据保存、JSON / Binary 序列化、数据路径处理以及复杂泛型类型解析。

运行时入口：常规业务代码优先使用 `FinkFramework.Runtime.Data.DataFilesUtil`；需要处理序列化、类型查找或路径工具时，再使用 `DataUtil` 和 `PathUtil`。

运行时 API 主要集中在以下几个类中：

| 类 | 作用 |
| --- | --- |
| `DataFilesUtil` | 读取默认数据、读取和保存本地数据、根据数据类型查找文件，并处理 StreamingAssets 与 persistentDataPath 的差异。 |
| `DataUtil` | 序列化、反序列化、JSON / Binary 转换、AES 加密解密以及类型查找。 |
| `PathUtil` | 规范化路径并确保目标目录存在。 |

常规业务代码通常只需要关注 `DataFilesUtil` 的读取和保存 API，其余方法主要用于扩展数据流程或处理底层文件。

## 1. 数据读取 API

同步与异步的选择是运行时使用数据管线时最需要注意的规则。

### 1.1 同步与异步读取的选择

#### Editor 和桌面 PC

在 Unity Editor、Windows、macOS、Linux 等桌面环境中，`StreamingAssets` 通常是普通文件路径，因此同步和异步读取都可以使用：

- 需要在当前调用点立即拿到数据时，可以使用同步 API；
- 初始化、加载界面或不希望阻塞主线程时，建议使用异步 API；
- 如果项目同时支持桌面和移动端，建议直接统一使用异步 API，减少平台分支。

同步示例：

```csharp
using FinkFramework.Runtime.Data;

PlayerConfigContainer config =
    DataFilesUtil.LoadDefaultData<PlayerConfigContainer>();
```

异步示例：

```csharp
using FinkFramework.Runtime.Data;

PlayerConfigContainer config =
    await DataFilesUtil.LoadDefaultDataAsync<PlayerConfigContainer>();
```

#### Android 和 iOS

Android、iOS 等移动平台上的 `Application.streamingAssetsPath` 通常是 URI，例如 APK 内部资源可能表现为 `jar:file://...`。这类路径不能交给普通的 `System.IO` 文件 API 遍历或读取，框架需要通过 `UnityWebRequest` 异步读取。

移动端应使用异步 API：

```csharp
PlayerConfigContainer config =
    await DataFilesUtil.LoadDefaultDataAsync<PlayerConfigContainer>();

PlayerSaveContainer save =
    await DataFilesUtil.LoadLocalDataAsync<PlayerSaveContainer>();
```

在移动端调用默认数据的同步 API 时，框架会输出提醒并返回默认值；本地数据首次需要从 StreamingAssets 初始化时，调用同步 API 也无法完成跨平台复制。因此，移动端不要使用 `LoadDefaultData` 或依赖同步初始化的 `LoadLocalData`。

#### 不确定目标平台时

如果代码会在多个平台运行，或者暂时无法确定目标平台，建议统一使用异步 API：

```csharp
var data = await DataFilesUtil.LoadDefaultDataAsync<MyDataContainer>();
```

这样可以同时兼容 Editor、桌面 PC、Android 和 iOS。异步 API 在桌面平台同样可用，不需要额外维护两套平台分支。

::: tip 简单结论
Editor / 桌面 PC：同步和异步都可以；Android / iOS：读取 StreamingAssets 时使用异步；不确定平台：统一使用异步。
:::

#### `await` 与 `.Forget()`

异步 API 返回的是 `UniTask` 或 `UniTask<T>`。通常推荐在另一个异步方法中使用 `await`，这样可以等待读取完成后再使用结果：

```csharp
private async UniTask LoadConfigAsync()
{
    PlayerConfigContainer config =
        await DataFilesUtil.LoadDefaultDataAsync<PlayerConfigContainer>();

    ApplyConfig(config);
}
```

如果当前调用方不能或不需要等待结果，也可以使用 `.Forget()`：

```csharp
private void StartLoadingConfig()
{
    LoadConfigAsync().Forget();
}
```

`.Forget()` 的含义是 **fire-and-forget（启动后不等待）**，不是“把异步改成同步”：

- 调用方会立即继续执行，不会等待数据读取完成；
- 数据读取任务仍然在后台继续运行；
- `.Forget()` 不会返回读取到的 `config`，因此后续代码不能立刻使用异步结果；
- 任务中的异常不会通过调用方的 `await` 抛出，应使用异常回调或在异步方法内部处理；
- 如果对象、场景或页面可能在任务完成前销毁，还应配合取消令牌管理生命周期。

需要处理异常时，可以使用项目内 UniTask 提供的异常回调重载：

```csharp
private void StartLoadingConfig()
{
    LoadConfigAsync().Forget(exception =>
    {
        LogUtil.Error("DataExample", $"配置读取失败：{exception.Message}");
    });
}
```

对于数据读取，只有在“读取完成后不需要在当前调用栈继续使用结果”的场景才适合使用 `.Forget()`，例如启动预加载并在完成回调中更新缓存或界面。需要拿到配置、判断读取结果或保证下一步操作依赖数据时，应使用 `await`。

::: warning `.Forget()` 不是同步调用
下面的代码不会在下一行执行时保证 `config` 已经读取完成：

```csharp
DataFilesUtil.LoadDefaultDataAsync<PlayerConfigContainer>().Forget();
OpenGameScene(); // 此时配置读取可能仍未完成
```

如果 `OpenGameScene()` 依赖配置内容，应改为在异步方法中 `await` 读取完成后再执行。
:::

### 1.2 读取默认数据（只读）

默认数据是随应用发布的数据，通常位于：

```text
Assets/StreamingAssets/FinkFramework_Data/DataJson/
Assets/StreamingAssets/FinkFramework_Data/DataBinary/
```

它适合保存不需要玩家修改的配置，例如角色基础属性、关卡配置和静态表格数据。

#### 同步读取

同步 API 适用于 Editor 和桌面 PC：

```csharp
T data = DataFilesUtil.LoadDefaultData<T>(string relativePath = null);
```

`relativePath` 可以留空。留空时，框架会根据 `T` 的类型名称查找对应的数据文件。例如：

```text
PlayerSaveDataContainer
→ PlayerSaveData
→ FinkFramework_Data/DataJson/PlayerSaveData.json
   或 FinkFramework_Data/DataBinary/PlayerSaveData.<自定义扩展名>
```

指定相对路径时，应传入相对于 `StreamingAssets` 的数据路径，并且通常不需要手动拼接当前扩展名：

```csharp
var config = DataFilesUtil.LoadDefaultData<PlayerConfigContainer>(
    "FinkFramework_Data/DataJson/PlayerConfig");
```

移动端不要调用此同步方法读取 `StreamingAssets`。

#### 异步读取

异步 API 支持所有平台，移动端必须使用：

```csharp
UniTask<T> operation =
    DataFilesUtil.LoadDefaultDataAsync<T>(
        string relativePath = null,
        CancellationToken cancellationToken = default);
```

实际使用时通常直接 `await`：

```csharp
PlayerConfigContainer config =
    await DataFilesUtil.LoadDefaultDataAsync<PlayerConfigContainer>();
```

在 Android / iOS 上，如果不传路径，框架会读取运行时数据清单，通过清单定位数据文件，再使用 `UnityWebRequest` 读取文件内容。

### 1.3 读取本地数据（可读可写）

本地数据位于：

```text
Application.persistentDataPath/FinkFramework_Data/
```

它适合保存玩家存档、用户设置、解锁进度等运行时可修改的数据。

如果本地文件不存在，异步读取 API 会尝试从随应用发布的默认数据初始化本地文件。

#### 同步读取

同步读取适用于 Editor 和桌面 PC，或已经确认本地文件存在且不涉及移动端首次初始化的场景：

```csharp
PlayerSaveContainer save =
    DataFilesUtil.LoadLocalData<PlayerSaveContainer>();
```

#### 异步读取

移动端以及跨平台代码应使用：

```csharp
PlayerSaveContainer save =
    await DataFilesUtil.LoadLocalDataAsync<PlayerSaveContainer>();
```

该方法会先检查 `persistentDataPath` 中是否已有文件；如果没有，则通过跨平台读取器获取默认数据并写入本地目录，然后再加载本地文件。

## 2. 数据保存 API

### 2.1 保存本地数据

`persistentDataPath` 是运行时可写目录，保存 API 可在桌面和移动端使用：

```csharp
DataFilesUtil.SaveLocalData(save);
```

完整签名：

```csharp
DataFilesUtil.SaveLocalData<T>(T data, string relativePath = null);
```

`relativePath` 可以留空。留空时，框架会根据 `T` 的类型查找对应路径。保存时会自动：

- 创建目标目录；
- 根据当前数据模式选择 `.json` 或配置的 Binary 扩展名；
- 根据全局加密设置决定是否对 Binary 数据进行 AES 加密；
- 写入 `Application.persistentDataPath`。

示例：

```csharp
var save = new PlayerSaveContainer
{
    // 填充需要保存的数据
};

DataFilesUtil.SaveLocalData(save);
```

注意：保存本地数据本身使用的是可写文件目录，不需要通过 `UnityWebRequest`。移动端读取随应用发布的默认模板时，仍然必须使用 `LoadLocalDataAsync`。

## 3. 数据模式与加密

全局数据模式决定运行时数据的主要扩展名和读取方式：

| 数据模式 | 默认数据 | 本地数据 |
| --- | --- | --- |
| **JSON** | `.json` 文本文件 | `.json` 文本文件 |
| **Binary** | 配置的 Binary 扩展名 | 配置的 Binary 扩展名 |

Binary 是否使用 AES 加密由全局设置中的“启用加密”决定：

- 开启：通过全局密码进行 AES 加密和解密；
- 关闭：使用明文 Binary；
- JSON 不经过 AES Binary 加密流程。

用户通常不需要手动调用加密方法。`DataFilesUtil` 会根据当前扩展名和全局设置调用 `DataUtil` 完成对应的序列化、反序列化、加密或解密。

## 4. 路径相关 API

路径工具主要由框架内部使用。只有在需要自定义数据文件路径或扩展框架功能时，才建议直接调用。

### 4.1 NormalizePath

`PathUtil.NormalizePath` 会将路径统一为跨平台形式：

- 统一路径分隔符为 `/`；
- 去除首尾空白；
- 规范化部分中文标点；
- 保留 `http://`、`jar:file://` 等 URI 前缀。

```csharp
string path = PathUtil.NormalizePath("Data\\Player\\Save");
```

### 4.2 BuildFullPath

`DataFilesUtil.BuildFullPath` 负责将根路径、相对路径和扩展名组合为完整路径。它不会替调用者决定使用 `StreamingAssets` 还是 `persistentDataPath`。

完整签名：

```csharp
string fullPath = DataFilesUtil.BuildFullPath(
    string basePath,
    string relativePath,
    string extension = null);
```

示例：

```csharp
string fullPath = DataFilesUtil.BuildFullPath(
    Application.persistentDataPath,
    "FinkFramework_Data/PlayerSaveData",
    ".json");
```

如果 `extension` 为空，方法会保留相对路径本身的扩展名状态；它不会根据全局数据模式自动推断扩展名。运行时数据 API 会在调用它之前根据当前设置确定正确扩展名。

### 4.3 EnsureDirectory

`PathUtil.EnsureDirectory` 会根据文件路径创建所需的父目录：

```csharp
PathUtil.EnsureDirectory(path);
```

`SaveLocalData` 和框架内部的数据复制流程会自动调用它。

## 5. 泛型类型映射

`DataUtil` 会动态查找基础类型、Unity 类型、数组、泛型和项目中的自动生成类型，用户一般无需手动调用。

### 5.1 FindType

支持：

- `int`、`float`、`bool`、`string` 等基础类型；
- `Vector2`、`Vector3`、`Color`、`Matrix4x4` 等 Unity 类型；
- 数组类型，例如 `ItemData[]`；
- `List&lt;T&gt;`、`Dictionary&lt;TKey, TValue&gt;`、`HashSet&lt;T&gt;` 等泛型；
- 当前程序集中的自动生成数据类和其他同名类型。

```csharp
Type type = DataUtil.FindType("Dictionary<string, int>");
```

### 5.2 FindGenericType

`FindGenericType` 支持多层嵌套泛型，例如：

```text
Dictionary<string, List<ItemData>>
List<Dictionary<int, SkillData>>
```

```csharp
Type type = DataUtil.FindGenericType(
    "Dictionary<string, List<SkillData>>");
```

如果泛型参数中的类型无法找到，方法会返回 `null`。

## 6. 序列化与反序列化

框架内部会自动完成序列化和反序列化，用户通常只需要调用 `DataFilesUtil`。底层使用 Odin Serializer 处理 Binary 数据，并使用 JSON 转换器处理 JSON 数据，支持：

- Vector、Color、Matrix4x4 等 Unity 类型；
- 自定义数据结构；
- 数组、List、Dictionary 和嵌套泛型；
- AES 加密 Binary 数据。

如确实需要直接处理文件，可以使用：

```csharp
DataUtil.Save(path, data);
var data = DataUtil.Load<PlayerData>(path);
```

直接调用时，调用者需要自行保证路径、扩展名、全局加密设置和目标平台读取方式正确。移动端的 `StreamingAssets` URI 不应直接交给 `DataUtil.Load`，应通过 `DataFilesUtil.LoadDefaultDataAsync` 或 `LoadLocalDataAsync` 读取。

## 7. 常用 API 对照

| 需求 | 推荐 API |
| --- | --- |
| Editor / 桌面读取默认配置 | `DataFilesUtil.LoadDefaultData<T>()` 或 `LoadDefaultDataAsync<T>()` |
| Android / iOS 读取默认配置 | `await DataFilesUtil.LoadDefaultDataAsync<T>()` |
| Editor / 桌面读取本地数据 | `DataFilesUtil.LoadLocalData<T>()` |
| Android / iOS 读取本地数据 | `await DataFilesUtil.LoadLocalDataAsync<T>()` |
| 跨平台读取 | `await DataFilesUtil.LoadDefaultDataAsync<T>()` / `LoadLocalDataAsync<T>()` |
| 保存玩家存档或设置 | `DataFilesUtil.SaveLocalData(data)` |
| 自定义路径拼接 | `DataFilesUtil.BuildFullPath(...)` |
| 自定义类型查找 | `DataUtil.FindType(...)` |

通过 `DataFilesUtil`、`DataUtil` 和 `PathUtil`，可以在游戏中完成配置加载、玩家存档、默认模板初始化、加密 Binary 读取以及复杂数据类型解析。对于常规业务代码，优先使用 `DataFilesUtil`，让框架统一处理平台差异和数据格式。
