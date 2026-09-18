# 存档系统运行时 API

本页列出存档系统对业务开放的运行时 API。入口位于 `FinkFramework.Runtime.Save` 命名空间，异步接口返回 Cysharp UniTask 的 `UniTask<T>`。

## 1. SaveManager 状态

| API | 类型 | 说明 |
| --- | --- | --- |
| `SaveManager.Instance` | `SaveManager` | 获取存档管理器单例 |
| `RootPath` | `string` | 存档根目录的绝对路径 |
| `CurrentSlotId` | `int` | 无槽位参数 API 当前使用的槽位 |
| `MultiSlotMode` | `bool` | 是否启用多槽位配置 |

`RootPath` 默认为 `Application.persistentDataPath/FinkFramework_Save`。单槽位模式下 `CurrentSlotId` 固定为 1。

## 2. 默认数据 API

```csharp
public static T CreateDefault<T>();

public static TValue GetDefault<T, TValue>(
    Func<T, TValue> selector);
```

`CreateDefault<T>` 调用无参构造函数并执行字段初始化器。`GetDefault` 用于读取单个当前默认值，适合重置设置项或编写迁移逻辑。

类型不可实例化或没有无参构造函数时，这两个接口会抛出 `InvalidOperationException`；`selector` 为空时会抛出 `ArgumentNullException`。

## 3. 槽位保存与加载

```csharp
public UniTask<SaveResult> SaveAsync<T>(
    T data,
    CancellationToken cancellationToken = default);

public UniTask<SaveResult> SaveAsync<T>(
    T data,
    int slotId,
    CancellationToken cancellationToken = default);

public UniTask<LoadResult<T>> LoadAsync<T>(
    CancellationToken cancellationToken = default);

public UniTask<LoadResult<T>> LoadAsync<T>(
    int slotId,
    CancellationToken cancellationToken = default);

public UniTask<T> LoadOrDefaultAsync<T>(
    CancellationToken cancellationToken = default);

public UniTask<T> LoadOrDefaultAsync<T>(
    int slotId,
    CancellationToken cancellationToken = default);
```

无 `slotId` 重载使用 `CurrentSlotId`。单槽位模式只接受 Slot 1；多槽位模式接受任意大于 0 的编号。

`LoadAsync` 会保留完整状态和恢复来源。`LoadOrDefaultAsync` 在任何未获得可用数据的结果下创建默认实例，适合明确接受静默回退的业务。

取消令牌可以取消队列等待和提交前工作。一旦进入原子文件替换阶段，操作会完成提交或清理，不会在中途留下半写入主档。

## 4. 全局存档

```csharp
public UniTask<SaveResult> SaveGlobalAsync<T>(
    T data,
    CancellationToken cancellationToken = default);

public UniTask<LoadResult<T>> LoadGlobalAsync<T>(
    CancellationToken cancellationToken = default);

public UniTask<T> LoadGlobalOrDefaultAsync<T>(
    CancellationToken cancellationToken = default);
```

全局存档不使用槽位编号，主文件名为 `global_save` 加当前格式扩展名。

## 5. 槽位管理

| API | 返回值 | 说明 |
| --- | --- | --- |
| `SelectSlot(int slotId)` | `bool` | 选择无参数 API 使用的当前槽位；不会创建文件 |
| `CreateSlot(int slotId)` | `SaveResult` | 准备共享槽位目录；不会创建空主档 |
| `DeleteSlotAsync(int, CancellationToken)` | `UniTask<SaveResult>` | 删除目标槽位全部当前及旧版文件 |
| `SlotExists(int slotId)` | `bool` | 检查当前或旧版主档是否存在 |
| `GetSlots()` | `IReadOnlyList<SaveSlotInfo>` | 枚举已有主档并按槽位编号升序排列 |

`SelectSlot`、`CreateSlot`、`DeleteSlotAsync` 和 `GetSlots` 面向多槽位模式。单槽位模式中，创建与删除返回 `ModeNotSupported`，选择返回 `false`，枚举返回空集合。

### SaveSlotInfo

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `SlotId` | `int` | 大于 0 的槽位编号 |
| `HasData` | `bool` | 主档是否存在 |
| `Generation` | `long` | Binary 容器提交代数；裸 JSON 为 0 |
| `LastSavedUtc` | `DateTime` | 最近保存 UTC 时间；JSON 使用文件写入时间 |
| `Path` | `string` | 主档绝对路径 |

## 6. 历史与回档

```csharp
public IReadOnlyList<SaveHistoryInfo> GetHistory(
    int? slotId = null);

public IReadOnlyList<SaveHistoryInfo> GetGlobalHistory();

public UniTask<SaveResult> RestoreHistoryAsync<T>(
    SaveHistoryInfo history,
    int? slotId = null,
    CancellationToken cancellationToken = default);

public UniTask<SaveResult> RestoreGlobalHistoryAsync<T>(
    SaveHistoryInfo history,
    CancellationToken cancellationToken = default);
```

历史列表按代数和保存时间倒序排列，不包含自动恢复使用的即时 `_bak` 文件。恢复接口只接受属于同一存档目标的有效历史路径，并通过正常保存流程把历史数据重新提交为主档。

### SaveHistoryInfo

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `Generation` | `long` | Binary 提交代数；裸 JSON 为 0 |
| `SavedUtc` | `DateTime` | 保存 UTC 时间；JSON 使用文件写入时间 |
| `Path` | `string` | 历史文件绝对路径 |

## 7. 自动存档

```csharp
public IDisposable StartAutoSave<T>(
    Func<T> capture,
    TimeSpan interval,
    Action<SaveResult> onCompleted = null);

public IDisposable StartAutoSave<T>(
    Func<T> capture,
    TimeSpan interval,
    int slotId,
    Action<SaveResult> onCompleted = null);

public IDisposable StartGlobalAutoSave<T>(
    Func<T> capture,
    TimeSpan interval,
    Action<SaveResult> onCompleted = null);
```

`capture` 和 `onCompleted` 在 Unity 主线程执行。`interval` 必须大于零；空抓取函数或无效间隔会抛出参数异常。调用返回句柄的 `Dispose()` 可以停止循环。

自动存档的第一次抓取发生在等待一个完整间隔后，而不是创建句柄时立即执行。

## 8. SaveResult

所有预期的保存、删除、创建槽位和历史恢复失败都会尽量通过 `SaveResult` 返回。

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `Status` | `SaveOperationStatus` | 最终状态 |
| `Path` | `string` | 主文件或失败文件的路径；无目标时为空 |
| `Message` | `string` | 恢复或失败说明 |
| `Exception` | `Exception` | 原始异常；可能为空 |
| `Succeeded` | `bool` | 仅 `Status == Success` 时为 `true` |

典型处理方式：

```csharp
SaveResult result = await SaveManager.Instance.SaveAsync(data);
if (!result.Succeeded)
{
    UnityEngine.Debug.LogError(
        $"{result.Status}: {result.Message}\n{result.Exception}");
}
```

## 9. LoadResult&lt;T&gt;

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `Status` | `SaveOperationStatus` | 加载状态 |
| `Source` | `SaveDataSource` | 最终数据来源 |
| `Data` | `T` | 加载数据；缺档时为默认实例，其他失败通常为 `default` |
| `Path` | `string` | 成功候选或原始主档路径 |
| `Message` | `string` | 缺档、恢复或失败说明 |
| `Exception` | `Exception` | 最后一次读取失败的异常；可能为空 |
| `Succeeded` | `bool` | `Success` 或 `FileNotFound` 时为 `true` |
| `UsedDefault` | `bool` | 数据来源是否为 `Default` |
| `Recovered` | `bool` | 是否从 `Backup` 或 `History` 恢复 |

### SaveDataSource

| 值 | 含义 |
| --- | --- |
| `None` | 没有获得可用数据 |
| `Main` | 主档 |
| `Backup` | 即时 `_bak` 备份 |
| `History` | 编号历史备份 |
| `Default` | 文件不存在时创建的默认实例 |

## 10. SaveOperationStatus

| 状态 | 含义 |
| --- | --- |
| `Success` | 操作成功 |
| `Cancelled` | 提交前被取消 |
| `InvalidArgument` | 槽位、数据或路径参数无效 |
| `ModeNotSupported` | 当前槽位模式不支持该操作 |
| `SchemaInvalid` | 数据类型违反 Schema 规则 |
| `SerializationFailed` | 序列化、压缩或加密失败 |
| `TempWriteFailed` | 临时文件写入失败 |
| `ValidationFailed` | 文件结构、长度、JSON 或临时文件校验失败 |
| `ReplaceFailed` | 主文件替换或首次提交失败 |
| `BackupFailed` | 备份创建或轮换失败 |
| `FileNotFound` | 目标不存在；加载时会同时返回默认数据 |
| `ChecksumFailed` | Binary Payload 的 SHA-256 校验失败 |
| `DecryptionFailed` | AES 密钥不匹配或密文损坏 |
| `DeserializationFailed` | JSON 或 Odin 无法还原目标类型 |
| `SchemaIncompatible` | 旧 Binary 结构与当前类型不兼容 |
| `RecoveryFailed` | 主档与所有备份都不可用的兜底状态 |
| `DeleteFailed` | 删除槽位文件失败 |
| `UnknownError` | 未能归类的文件系统或运行时错误 |

加载依次尝试多个候选文件。如果全部失败，最终状态对应最后一次候选的失败类型，`Message` 会说明整个恢复链已经失败。

## 11. Schema 规则

保存和加载前会递归校验根类型。有效 Schema 应满足：

- 根类型和嵌套引用类型可实例化；
- 根类型和嵌套引用类型提供公共或非公共无参构造函数；
- 不使用 `object`、抽象类或接口作为成员的实际 Schema；
- 不保存 `UnityEngine.Object` 派生类型；
- 集合元素与字典值类型同样满足规则；
- 当前名称和所有 `[FormerSaveNames]` 旧名称在同一类型内不冲突；
- 旧名称不能为空或重复。

Schema 不合法时，保存和加载返回 `SchemaInvalid`。需要一次查看全部校验错误时，可从结果的 `Exception` 读取 `SaveSchemaValidationException.Errors`：

```csharp
if (result.Exception is SaveSchemaValidationException schemaError)
{
    foreach (string error in schemaError.Errors)
        UnityEngine.Debug.LogError(error);
}
```

### FormerSaveNamesAttribute

```csharp
[FormerSaveNames("Hp", "PlayerHp")]
public long Health = 100;
```

该特性只能用于字段或属性，每个成员声明一次，但可以传入多个历史名称。当前名称始终优先于旧名称。

## 12. 兼容的旧版布局

加载、槽位枚举、历史枚举和删除仍识别旧版路径：

```text
FinkFramework_Save/Slots/Slot_N/main.save
FinkFramework_Save/Slots/Slot_N/backup.save
FinkFramework_Save/Slots/Slot_N/History/*
FinkFramework_Save/Global/global.save
FinkFramework_Save/Global/global.backup.save
```

当前路径不存在但旧版主档或备份存在时，加载会使用旧版路径。新项目应使用当前扁平命名结构，不要再主动创建旧版目录。
