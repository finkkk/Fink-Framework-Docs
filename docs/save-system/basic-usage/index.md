# 存档系统基础使用

本页从定义数据开始，介绍槽位保存、全局保存、结果处理、多槽位、历史回档、自动存档和数据结构演进。

存档系统的推荐使用方式是：主线程抓取当前状态，转换为独立的纯数据对象，再交给 `SaveManager` 异步提交。不要把场景对象本身交给存档系统，也不要让后台文件操作直接读取正在变化的游戏对象。

`SaveManager` 依赖已加载的 `GlobalSettingsAsset`。正常情况下由框架启动流程完成配置加载；如果在框架初始化之前手动访问存档系统，初始化可能会因缺少全局配置而失败。

示例使用以下命名空间：

```csharp
using System;
using Cysharp.Threading.Tasks;
using FinkFramework.Runtime.Save;
```

## 1. 定义存档数据

存档根类型及其嵌套引用类型必须可实例化并提供无参构造函数。公共字段和公共可读写属性会参与保存。

```csharp
[Serializable]
public sealed class PlayerSaveData
{
    public int Level = 1;
    public float Health = 100f;
    public string DisplayName = "New Player";
    public PlayerPosition Position = new();
}

[Serializable]
public sealed class PlayerPosition
{
    public string Scene = "Start";
    public float X;
    public float Y;
    public float Z;
}
```

`[Serializable]` 便于 Unity 和其他工具识别数据类型，但存档成员选择由框架自己的规则决定。以下成员不会保存：

- 静态字段；
- 非公共字段或非公共属性；
- 只读、只写或索引属性；
- 标记 `[NonSerialized]` 或 `[JsonIgnore]` 的成员。

不要保存 `GameObject`、`Component`、`ScriptableObject` 等 `UnityEngine.Object` 引用。应保存资源 ID、场景名、位置、数值等可重建状态。

## 2. 保存当前槽位

将当前游戏状态转换为独立纯数据对象，再调用 `SaveAsync`：

```csharp
private PlayerSaveData Capture()
{
    return new PlayerSaveData
    {
        Level = currentLevel,
        Health = player.Health,
        DisplayName = playerName,
        Position = new PlayerPosition
        {
            Scene = currentScene,
            X = player.transform.position.x,
            Y = player.transform.position.y,
            Z = player.transform.position.z
        }
    };
}

public async UniTask SaveGameAsync()
{
    SaveResult result = await SaveManager.Instance.SaveAsync(Capture());
    if (!result.Succeeded)
        UnityEngine.Debug.LogError($"保存失败：{result.Status} - {result.Message}");
}
```

`SaveAsync` 会在第一次异步等待前完成 Schema 校验和序列化，冻结调用时刻的数据。即使随后修改传入对象，也不会改变已经进入队列的这一笔存档。

相同目标的保存、加载、删除操作会串行执行。不同槽位拥有不同队列，可以各自处理文件操作。

## 3. 加载与应用数据

```csharp
public async UniTask LoadGameAsync()
{
    LoadResult<PlayerSaveData> result =
        await SaveManager.Instance.LoadAsync<PlayerSaveData>();

    if (!result.Succeeded)
    {
        UnityEngine.Debug.LogError(
            $"加载失败：{result.Status} - {result.Message}");
        return;
    }

    Apply(result.Data);

    if (result.UsedDefault)
        UnityEngine.Debug.Log("没有旧存档，正在使用默认数据。");
    else if (result.Recovered)
        UnityEngine.Debug.LogWarning($"主档不可用，已从 {result.Source} 恢复。");
}
```

`Succeeded` 在以下两种状态为 `true`：

- `Success`：成功读取主档或某个备份；
- `FileNotFound`：没有任何文件，已返回当前版本默认实例。

如果业务明确不关心错误和恢复来源，可使用便捷接口：

```csharp
PlayerSaveData data =
    await SaveManager.Instance.LoadOrDefaultAsync<PlayerSaveData>();
```

该方法在缺档、损坏、取消或其他失败时都会返回新的默认实例，因此不适合需要向玩家提示损坏或记录诊断信息的场景。

## 4. 默认值与首次启动

字段初始化器和无参构造函数定义当前版本的默认值：

```csharp
PlayerSaveData defaults = SaveManager.CreateDefault<PlayerSaveData>();
float defaultHealth =
    SaveManager.GetDefault<PlayerSaveData, float>(data => data.Health);
```

加载旧档时，缺失成员会保留当前版本的默认值。存档中明确存在的 `0`、`false`、空字符串和 `null` 不会被默认值覆盖。

## 5. 全局存档

不属于玩家槽位的数据使用全局 API：

```csharp
[Serializable]
public sealed class GlobalSaveData
{
    public float MusicVolume = 0.8f;
    public float SoundVolume = 1f;
    public int LastSlotId = 1;
}

public async UniTask SaveSettingsAsync(GlobalSaveData data)
{
    SaveResult result = await SaveManager.Instance.SaveGlobalAsync(data);
    if (!result.Succeeded)
        UnityEngine.Debug.LogError(result.Message);
}

public UniTask<LoadResult<GlobalSaveData>> LoadSettingsAsync()
{
    return SaveManager.Instance.LoadGlobalAsync<GlobalSaveData>();
}
```

全局文件和槽位文件使用独立队列与备份链。切换当前槽位不会影响全局数据。

## 6. 多槽位

先在项目设置中启用多槽位，然后使用槽位 API：

```csharp
SaveManager saves = SaveManager.Instance;

SaveResult prepared = saves.CreateSlot(2);
if (prepared.Succeeded && saves.SelectSlot(2))
    await saves.SaveAsync(Capture());
```

也可以不修改当前槽位，直接指定目标：

```csharp
await SaveManager.Instance.SaveAsync(Capture(), slotId: 3);

LoadResult<PlayerSaveData> loaded =
    await SaveManager.Instance.LoadAsync<PlayerSaveData>(slotId: 3);
```

构建槽位选择界面：

```csharp
foreach (SaveSlotInfo slot in SaveManager.Instance.GetSlots())
{
    UnityEngine.Debug.Log(
        $"Slot {slot.SlotId} / {slot.LastSavedUtc:u} / {slot.Path}");
}
```

`GetSlots()` 只在多槽位模式返回数据，并按槽位编号升序排列。JSON 不携带容器代数，因此 `Generation` 为 0，保存时间来自文件最后写入时间。

删除槽位会删除主档、即时备份、编号历史以及对应旧版目录：

```csharp
SaveResult deleted = await SaveManager.Instance.DeleteSlotAsync(3);
```

删除不可由存档系统自动撤销，应在 UI 中进行二次确认。

## 7. 历史记录与回档

项目设置启用历史备份后，可以列出当前槽位的编号历史：

```csharp
var history = SaveManager.Instance.GetHistory();
if (history.Count > 0)
{
    SaveResult restored =
        await SaveManager.Instance.RestoreHistoryAsync<PlayerSaveData>(history[0]);
}
```

指定槽位和全局存档分别使用：

```csharp
var slotHistory = SaveManager.Instance.GetHistory(slotId: 2);
var globalHistory = SaveManager.Instance.GetGlobalHistory();

if (globalHistory.Count > 0)
{
    await SaveManager.Instance.RestoreGlobalHistoryAsync<GlobalSaveData>(
        globalHistory[0]);
}
```

传给恢复方法的记录必须来自同一目标的 `GetHistory` 或 `GetGlobalHistory` 结果。恢复不会直接覆盖文件，而是读取历史数据后执行一次正常保存。因此恢复后的数据成为新一代主档，恢复前的主档仍会进入即时备份或历史链。

## 8. 自动存档

`StartAutoSave` 返回一个 `IDisposable` 句柄。保存间隔从上一次保存完成后开始计算：

```csharp
private IDisposable autoSave;

private void Start()
{
    autoSave = SaveManager.Instance.StartAutoSave(
        Capture,
        TimeSpan.FromMinutes(5),
        result =>
        {
            if (!result.Succeeded)
                UnityEngine.Debug.LogError(result.Message);
        });
}

private void OnDestroy()
{
    autoSave?.Dispose();
    autoSave = null;
}
```

`Capture` 和完成回调都在 Unity 主线程执行，可以安全读取大多数 Unity 对象状态；实际文件操作仍走后台队列。`Dispose` 会停止后续循环。

指定槽位可使用带 `slotId` 的重载；全局数据使用 `StartGlobalAutoSave`。

## 9. 数据结构演进

### 新增成员

直接为新成员声明当前版本默认值：

```csharp
public int SkillPoints = 3;
```

旧档没有该成员时会得到 `3`。

### 删除成员

从类型中移除成员即可。旧档里多出的数据会被忽略。

### 重命名成员

使用 `[FormerSaveNames]` 保留一个或多个旧名称：

```csharp
[FormerSaveNames("PlayerName", "Name")]
public string DisplayName = "New Player";
```

当前名称优先级最高。旧名称按参数顺序声明，并会在 JSON 与 Binary 加载时用于兼容旧档。名称匹配不区分大小写。

### 改变类型

成员类型变化不保证可以自动迁移，例如把 `int` 改为复杂对象。对于不兼容变化，建议保留旧成员，加载后显式转换到新成员，再在确认迁移完成的后续版本中删除旧成员。

## 10. 常见注意事项

- 不要直接保存场景对象或资源引用，保存可重建它们的 ID 和状态；
- 保存根对象不能为 `null`；
- 同一文件应始终使用同一个根数据类型；Binary 会校验保存的类型名称；
- 用 `LoadResult<T>` 判断损坏、解密失败和自动恢复，不要只检查 `Data != null`；
- 自动存档句柄应随拥有者生命周期释放；
- 切换格式、扩展名或 AES 密码前，应先规划旧档迁移。
