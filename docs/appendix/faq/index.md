# 常见问题（FAQ）

本页面按照系统分类整理 Fink Framework 在安装、配置、编辑器操作和运行时接入过程中最常见的问题。

排查时建议先确认三个基础条件：

1. Unity Console 中是否存在更早出现的编译错误；
2. 当前使用的路径、类型、Key 或实例标识是否与配置完全一致；
3. 当前功能属于编辑器工具、运行时系统，还是需要额外安装的可选后端。

如果问题同时涉及多个模块，优先检查最底层的依赖。例如 UI 面板打不开时，先确认脚本编译、预制体路径和资源 Provider，再检查 Surface、输入和面板生命周期。

---

## 安装与全局配置

### 安装、依赖与编译

| 现象 | 原因与处理 |
| --- | --- |
| 导入 UnityPackage 后出现大量重复类型或命名空间错误 | 检查项目中是否已经存在 UniTask、Odin Serializer、Newtonsoft.Json 或 ExcelDataReader 的另一份程序集。框架发行包已经提供这些依赖，删除或排除重复版本后重新编译。 |
| 导入完成但没有弹出欢迎窗口 | 先等待 Unity 完成脚本编译，再检查 Console 是否有编译错误。欢迎窗口属于 Editor 工具，编译未完成或 Editor 程序集加载失败时不会正常显示。 |
| 生成的代码不在预期目录 | 检查 `Edit → Project Settings → Fink Framework` 中的“全局脚本根目录”。该设置填写的是 `Assets/` 后的相对路径，例如 `Scripts` 最终对应 `Assets/Scripts`。 |
| 修改设置后代码生成路径没有变化 | 修改自定义路径后需要点击面板中的应用或保存按钮；同时确认路径没有重复填写 `Assets/`，也没有使用绝对路径或跳出项目的路径。 |
| 构建时提示使用了 `editor://` 资源 | `editor://` 仅供 Unity Editor 的工具链使用，不能进入 Player。将运行时资源改为 `res://`、`file://`、`ab://` 或 Addressables 路径，并保留编辑器加载打包检测。 |
| 某个可选模块没有启用 | 检查项目中是否安装了对应包，以及全局设置中的强制关闭选项。框架会根据 XR、Input System、URP 和 Addressables 的实际环境自动识别，但“强制关闭”会覆盖自动检测结果。 |

详细步骤参见[安装与初始化](/getting-started/setup/)。

---

## 数据管线

### Excel、代码生成与导出

| 现象 | 原因与处理 |
| --- | --- |
| Excel 没有被扫描到 | 确认源文件位于项目根目录的 `FinkFramework_Data/DataTables/`，扩展名为 `.xlsx`。工具支持递归扫描子目录，但不会把其他目录中的 Excel 当作数据源。 |
| 表格能打开，但生成数据类失败 | 检查前三行结构：第一行是 C# 字段名，第二行是字段类型，第三行是字段说明，第四行开始才是数据。字段名不能为空、重复或包含非法字符。 |
| 只填了两行，第一条数据被当成说明 | 第三行说明可以留空，但不能省略。即使没有字段说明，也要保留第三行。 |
| 字段类型无法识别 | 对照[Excel 配表规则](/data-pipeline/excel-rules/)检查类型拼写、数组和字典格式。复杂类型的声明必须是框架支持的 C# 类型或可解析的嵌套结构。 |
| 代码生成成功，但运行时仍读取不到数据 | 重新执行数据导出，并确认运行时数据模式与导出产物一致。Binary 模式读取 `DataBinary`，JSON 模式读取 `StreamingAssets` 下的 `DataJson`。 |
| JSON 文件存在，但游戏仍提示数据缺失 | 不要只检查 JSON 是否存在。确认所有表都成功导出，并且新的 `data-manifest.json` 已生成；任意表导出失败时，框架不会生成新的有效清单。 |
| 数据 QA 通过，但一键处理仍然失败 | QA 只检查表格内容，不代表代码生成、脚本编译、文件写入和运行时导出一定成功。继续查看 Console 中最早出现的 `DataGenTool`、`DataParseTool` 或 `DataExportTool` 错误。 |
| Excel 打不开或读取时报文件占用 | 关闭 Excel、WPS 或其他正在打开该文件的程序，确认文件没有被同步盘锁定，然后重新运行 QA 或导出。 |
| 生成代码被重新处理后消失 | `AutoGen/`、`AutoExport/` 和 `StreamingAssets/FinkFramework_Data/` 属于框架维护目录，重新处理时可能被清理或覆盖。不要在这些目录中放置手动维护的业务文件。 |

### 运行时读取与平台差异

| 现象 | 原因与处理 |
| --- | --- |
| Editor 或 Windows 可以读取，Android/iOS 读取失败 | 移动平台的 `StreamingAssets` 通常是 URI，不能依赖普通文件 API 同步遍历。使用 `DataFilesUtil.LoadDefaultDataAsync` 或其他异步读取接口。 |
| Binary 和 JSON 切换后数据不一致 | 修改数据模式后必须重新执行导出。数据管线不会自动把旧模式的文件转换成新模式，也不会自动清理所有外部副本。 |
| 开启 AES 后旧数据无法读取 | 修改密钥、加密开关或扩展名后，旧文件仍使用旧配置。恢复原配置读取旧数据，或在业务层完成迁移后重新导出。 |
| 想直接修改运行时数据文件 | 应修改 Excel 源文件或数据源，再重新生成和导出。`StreamingAssets` 下的内容是自动生成的运行时副本，直接修改容易在下一次处理时被覆盖。 |

详细步骤参见[数据管线基础使用](/data-pipeline/basic-usage/)和[数据管线运行时 API](/data-pipeline/api/)。

---

## UI 系统

### 面板加载与查询

| 现象 | 原因与处理 |
| --- | --- |
| `Open<T>` 或 `OpenAsync<T>` 返回 `null` | 检查面板脚本是否继承 `BasePanel`、预制体根节点是否挂载了对应脚本、预制体名称是否与类型名一致、资源是否位于 UI Settings 配置的 `Resources` 目录，以及 Console 中是否存在编译错误。 |
| 面板预制体存在，但同步打开失败 | 同步 API 要求底层 Provider 支持同步加载。如果资源正在异步加载或后端只支持异步，改用 `OpenAsync<T>`。 |
| `Get<T>` / `TryGet<T>` 返回空，但面板“应该存在” | 查询 API 不会自动创建面板，只会查找已经预加载或打开的实例。先调用 `Preload`、`PreloadAsync`、`Open` 或 `OpenAsync`；同时确认 `instanceId` 和 `surfaceId` 与打开时一致。 |
| 同一种面板打开后出现多个实例或查询不到 | 面板身份由类型、`InstanceId` 和 `SurfaceId` 共同决定。默认实例、指定实例和不同 Surface 是不同记录，打开和查询必须使用同一组标识。 |
| `PreloadAsync` 后面板没有显示 | 预加载只负责加载、实例化和初始化，面板保持隐藏，不会进入 Page 栈，也不会触发 `OnEnter`。之后仍需调用 `Open` 或 `OpenAsync`。 |
| 关闭后再次打开没有刷新数据 | 将每次显示时的刷新逻辑放在 `OnEnter`，页面从上层返回时的刷新逻辑放在 `OnResume`。`OnInitialize` 只执行一次，适合缓存控件引用和一次性初始化。 |
| 关闭后任务或事件仍在运行 | 使用 `Context.VisibilityToken` 绑定面板可见周期内的异步任务，并在 `OnDispose` 中解除外部事件订阅。缓存策略为 `KeepAlive` 时，关闭并不等于销毁。 |

### 控件、Surface 与输入

| 现象 | 原因与处理 |
| --- | --- |
| `GetControl<T>` 返回空 | 检查控件 GameObject 名称和组件类型，名称区分大小写；如果重写了 `Awake`，必须调用 `base.Awake()`，否则 BasePanel 不会建立控件缓存。 |
| 面板显示了但无法点击 | 检查 Canvas 是否启用、目标 Surface 是否已注册、Canvas 是否有正确的 EventCamera 和 Raycaster，以及场景中是否存在有效的 EventSystem。Modal 打开时，下层面板会被主动阻止交互。 |
| 自定义 Surface 上面板不显示 | 确认已先注册 Surface，`SurfaceId` 唯一且没有覆盖框架保留的 `Main`，打开选项中的 Surface ID 与注册值完全一致。 |
| WorldSpace UI 可以显示但没有射线交互 | 检查 Canvas 的 EventCamera、世界空间 Canvas 的碰撞/射线配置以及当前 EventSystem 类型。需要导航时还要确认 UI 输入模式和导航交互开关已启用。 |
| 键盘或手柄导航没有焦点 | 目标面板必须处于可见状态，并且包含可导航的 `Selectable`。可使用 `UIManager.Focus<T>()` 主动设置焦点；被 Modal 阻断或没有有效 Selectable 时，聚焦会失败。 |
| 面板转场动画没有等待 | 同步打开和关闭会立即完成过渡；需要等待过渡结束时使用 `OpenAsync` 或 `CloseAsync`，并确认面板根节点挂载了有效的过渡组件。 |

### UI Builder

| 现象 | 原因与处理 |
| --- | --- |
| UI Builder 创建按钮不可用 | 检查面板名称、脚本输出路径和预制体输出路径是否有效，确认目标文件不存在且目录可写。 |
| 生成了脚本但没有生成预制体 | 查看 Console 中的生成和编译错误，确认生成类型继承 `BasePanel`，并等待 Unity 完成脚本编译后再检查目标目录。 |
| 生成的面板无法被 UIManager 打开 | 检查预制体是否位于配置的 Resources 目录、文件名和脚本类型名是否一致，以及脚本是否挂在预制体根节点。 |

详细步骤参见[UI 系统基础使用](/ui-system/basic-usage/)和[UI 运行时 API](/ui-system/api/)。

---

## 存档系统

### 保存、加载与数据结构

| 现象 | 原因与处理 |
| --- | --- |
| `SaveAsync` 返回失败 | 检查 `SaveResult.Status` 和 `Message`，确认根数据对象不为 `null`，成员类型可序列化，目标目录可写，并确认没有更早的配置或程序集错误。 |
| 保存后修改了对象，结果文件内容也跟着变化 | 当前实现会在 `SaveAsync` 第一次异步等待前完成快照和序列化。之后再修改原对象不会改变已排队的这一笔保存；如果需要保存最新状态，请重新调用保存。 |
| 存档中没有保存某个成员 | 默认只保存公共字段和公共可读写属性；静态、非公共、只读、只写、索引属性，以及标记 `[NonSerialized]` 或 `[JsonIgnore]` 的成员不会保存。 |
| 想直接保存 `GameObject`、`Component` 或 `ScriptableObject` | 不建议保存 Unity 对象引用。应保存资源 ID、Prefab 路径、场景名、位置、数值等可重建数据，加载后由业务系统重新解析。 |
| 没有存档，但 `LoadResult.Succeeded` 是 `true` | 缺档时框架会创建当前版本默认数据，并将 `UsedDefault` 设为 `true`。如果业务需要区分首次启动和真实读取成功，请同时检查 `UsedDefault`。 |
| 主档损坏但加载没有完全失败 | 检查 `LoadResult.Recovered` 和 `Source`。启用备份后，框架可能从即时备份或历史记录恢复；业务可以据此提示玩家或记录诊断日志。 |
| 保存、加载和删除同时发生导致文件状态混乱 | 相同目标的操作会进入串行队列。业务层仍应避免在多个系统中无序重复保存，并为自动存档句柄设置明确的拥有者。 |

### 槽位、备份与迁移

| 现象 | 原因与处理 |
| --- | --- |
| 槽位 API 不可用或返回失败 | 先在 Save System 设置中启用多槽位模式。单槽位模式只提供当前槽位和全局存档 API，不应直接假设任意槽位都可用。 |
| 切换槽位后读到了旧槽位数据 | `SelectSlot`、`SaveAsync(slotId)` 和 `LoadAsync(slotId)` 的目标必须明确；检查当前槽位、传入槽位和实际文件路径，不要把全局存档误当作槽位存档。 |
| 修改存档格式或 `.sav` 后旧档消失 | 格式和扩展名会改变目标文件路径，当前实现不会自动跨格式搜索或迁移。切换前先备份并在业务层完成旧档迁移。 |
| 新增字段后旧档加载报错 | 为新字段提供字段初始化值或无参构造默认值。缺失成员会保留当前版本默认值；存档中明确存在的 `0`、`false`、空字符串和 `null` 不会被默认值覆盖。 |
| 重命名字段后旧档丢失该值 | 使用 `[FormerSaveNames]` 声明旧名称，保留必要的旧名称顺序。类型变化较大的字段不能依赖自动兼容，应编写显式迁移逻辑。 |
| 自动存档停止不了 | 保存 `StartAutoSave` 返回的 `IDisposable`，在对象销毁或流程结束时调用 `Dispose()`。全局自动存档和槽位自动存档也应由对应生命周期对象负责释放。 |

详细说明参见[存档系统配置](/save-system/configuration/)和[存档系统基础使用](/save-system/basic-usage/)。

---

## 资源加载（ResLoad）

### 路径、Provider 与同步异步

| 现象 | 原因与处理 |
| --- | --- |
| 资源加载返回 `null` | 检查路径前缀、资源实际位置、目标泛型类型和对应 Provider 是否已注册。未知前缀不会自动回退到 Resources。 |
| 同步 `Load` 返回 `null`，但资源路径看起来正确 | 如果同一路径同一类型正在异步加载，同步接口不会阻塞等待，会直接返回 `null`；改用 `LoadAsync`。WebProvider 始终只支持异步，Addressables 同步加载还受 `AllowSyncLoad` 控制。 |
| 同一路径按不同类型加载出现类型错误 | ResLoad 的缓存键包含规范化路径和资源类型。业务代码应始终用同一个目标类型请求同一资源，尤其是 Addressables 和 UI Prefab。 |
| `editor://` 在构建后不可用 | EditorProvider 只在 Unity Editor 中注册。运行时资源应改用 Resources、File、Web、AssetBundle 或 Addressables，并通过构建前检测清除编辑器路径。 |
| `ab://` 加载失败 | 确认全局资源后端选择 AssetBundle、AB 配置已加载、主包和 Manifest 存在，且路径符合 `bundleName/assetName` 格式。ABProvider 不负责下载、版本校验或差分更新。 |
| `addr://` 或 `addressables://` 找不到资源 | 确认安装 Addressables、框架 Addressables 扩展程序集可用、全局后端选择 Addressables，并且传入的是 Address/Key 而不是文件路径。 |

### 缓存、进度与释放

| 现象 | 原因与处理 |
| --- | --- |
| 句柄进度一直没有真实变化 | Resources、File 和 Editor Provider 不提供真实进度，ResManager 会使用平滑模拟进度；网络、AssetBundle 和 Addressables 才能提供底层真实进度。 |
| `UnloadAsset` 后资源仍在缓存中 | `isDel` 默认是 `false`，默认调用只减少引用，不标记缓存删除。需要真正删除时传入 `isDel: true`，并确认 `refCount` 已归零。 |
| 资源被过早释放 | 检查每次成功加载是否都与一次卸载配对，是否有多个业务模块共享资源，以及是否错误地对仍在使用的资源传入了 `isDel: true`。 |
| `UnloadUnusedAssets` 没有清理某个记录 | 该接口只处理 `refCount == 0 && isDel == true` 的记录。需要彻底清空时使用 `ClearDicAsync`，并等待其完成。 |
| 批量加载完成但 `Results` 中有 `null` | 批量完成只表示所有路径都已处理，不表示全部成功。当前实现按顺序加载，失败项会以 `null` 保留在原位置，业务代码必须逐项检查。 |
| 清理时正在加载的请求被打断 | `ClearDic` 和 `ClearDicAsync` 不会强制中断 Provider 请求；它们会标记待清理记录，等待请求结束后再完成释放。同步入口如存在进行中请求，应通过回调判断最终完成。 |

详细说明参见[资源加载基础使用](/resload/basic-usage/)和[资源插件系统](/resload/provider/)。

---

## 本地化系统

### 配置、Key 与语言表

| 现象 | 原因与处理 |
| --- | --- |
| 查询文本时只返回 Key | 检查语言表是否已保存并同步到运行时副本，当前语言和 Fallback 是否在支持语言列表中，以及传入的 Key 是否为完整规范形式，例如 `ui.button.confirm`。 |
| 当前语言缺少翻译但没有得到预期文本 | 系统会先查当前语言，再查默认 Fallback。确认 Fallback 文件存在且默认语言中包含该 Key；文本最终返回 Key，资源最终返回 `null`。 |
| 编辑器里输入的 Key 与运行时 Key 不一致 | 编辑器显示的是当前分类下的相对 Key，保存后会补上分类前缀。运行时代码建议始终使用完整小写 Key，不要把分类前缀重复写入。 |
| 新增分类或语言后没有对应文件 | 在 Localization 配置中保存并应用配置。框架会创建缺少的分类目录和语言 JSON，但不会覆盖已经存在的翻译内容。 |
| 直接修改 `StreamingAssets` 后运行时仍不对 | `StreamingAssets` 是自动同步的运行时副本。修改应回到源语言表或源 JSON，再执行保存和同步，不要只修改副本。 |
| 翻译保存时提示占位符不一致 | 各语言必须保留相同的 `{0}` 或 `{name}` 占位符集合；位置参数和命名参数不能混用。先修正翻译，再重新保存或导入 Excel。 |

### 运行时、资源表与 Excel

| 现象 | 原因与处理 |
| --- | --- |
| 桌面正常，Android/iOS 初始化或切换语言失败 | 移动平台的 `StreamingAssets` 可能是 URI。启动时使用 `InitializeAsync`，切换语言和按需查询使用异步 API，不要依赖同步扫描文件。 |
| `GetAsset<T>` 返回空 | 检查资源表中的类型、当前语言资源、Fallback 资源和 Key 是否正确。资源表保存的是 Unity Object 引用，不会把资源内容写入语言 JSON。 |
| 本地化 Excel 导入没有变化 | 确认工作表名称与分类匹配、第一列表头为 `Key`、后续语言列使用已配置语言 ID，并在导入预览后点击“应用导入”，最后再保存语言表。 |
| Excel 导入后磁盘 JSON 没有更新 | “应用导入”只载入编辑器状态；必须回到语言表点击“保存并同步运行时副本”才会写入源 JSON 和 Manifest。 |
| 导出 Excel 包含旧内容 | Excel 导出使用磁盘中已经保存的 JSON，不会混入编辑器里尚未保存的修改。先保存语言表，再执行“导出全部语言表”。 |

详细说明参见[本地化基础使用](/localization/basic-usage/)、[本地化配表](/localization/tables/)和[本地化运行时 API](/localization/api/)。

---

## 输入与设备检测

| 现象 | 原因与处理 |
| --- | --- |
| 设备类型一直是 `Unknown` | `CurrentDevice` 表示最近一次有效输入，而不是设备连接状态。先确认设备检测已启用，并产生了有效键盘、鼠标、手柄或触摸输入。 |
| 已安装 Input System，但输入事件没有触发 | 先确认使用的是 `NewInputManager`，并已通过 `Initialize` 绑定 `InputActionAsset` 或 `PlayerInput`；如果项目强制关闭了新版输入系统，则应使用 `LegacyInputManager`。 |
| 手柄切换后 UI 提示没有变化 | 使用 `DeviceDetectionManager.DeviceChanged` 或读取 `CurrentDevice` 更新提示。设备识别与具体输入监听是两套独立能力。 |
| UI 导航和自定义输入事件互相影响 | 输入系统负责设备活动和游戏动作映射，UI 系统负责焦点、导航、提交和返回。不要用 `NewInputManager` 或 `LegacyInputManager` 直接替代 `UIManager` 的导航 API。 |
| 事件绑定后重复触发 | 检查是否在多个生命周期重复注册，或者手动注册后没有在对应生命周期移除。跨模块广播建议使用事件系统的自动绑定工具。 |

详细说明参见[输入系统概述](/input-system/)、[全局设备检测](/input-system/device-detection/)、[新版输入系统](/input-system/new-input-system/)和[旧版输入系统](/input-system/legacy-input-system/)。

---

## 基础系统

### 单例与生命周期

| 现象 | 原因与处理 |
| --- | --- |
| `SingletonMono<T>.Instance` 返回空 | `SingletonMono<T>` 不会自动创建 GameObject，必须先在场景中挂载组件。需要首次访问自动创建并跨场景常驻时，使用 `SingletonAutoMono<T>`。 |
| 编辑器非运行状态访问自动 Mono 单例为空 | `SingletonAutoMono<T>` 只允许在 Unity 播放或运行期间创建，编辑器非运行状态不会隐式创建场景对象。 |
| 场景中出现多个相同 Manager | 不要同时手动挂载多个实例，也不要额外 `new` 或 `AddComponent` 创建自动单例。重复对象会输出错误并销毁重复实例。 |
| 访问 `Instance` 导致意外创建 | 可选依赖、清理流程或退出阶段使用 `TryGetInstance()` / `HasInstance`，这两个入口只查询已有实例，不触发创建。 |
| 普通类没有 Update 或协程 | 普通 C# 类不能直接接收 Unity 生命周期函数。使用 `MonoManager` 注册 Update、FixedUpdate、LateUpdate 或通过它启动协程。 |
| Gizmos 没有绘制 | 确认 DebugMode、Gizmos 开关和对应绘制功能已启用，并在 Scene 视图中查看；运行时桥接使用 `GizmosAdapter`，正式构建不会绘制。 |

### 对象池与计时系统

| 现象 | 原因与处理 |
| --- | --- |
| 对象池生成返回空或无法回收 | GameObject 预制体根节点必须挂载 `PoolablePrefab`，生成和回收必须使用相同的资源路径；回收请使用 `Despawn`，不要直接 `Destroy`。 |
| 对象池达到上限后对象状态异常 | `maxNum` 是池中“缓存 + 使用中”的总数量。达到上限后框架会复用最早进入使用列表的对象，业务代码必须在再次生成时重置位置、状态和运行数据。 |
| 泛型对象池复用后保留上一次数据 | 类型必须实现 `IPoolable`，并在 `ResetInfo()` 中清理集合、引用和所有业务字段。重置发生在回收时，取出后仍需完成本次使用的初始化。 |
| 普通计时器暂停后仍在走 | 检查使用的是普通计时器还是真实计时器。普通计时受 `Time.timeScale` 影响，真实计时使用不受时间缩放影响的时间源；同时确认没有创建多个计时器。 |
| 无限计时器无法停止 | 保存 `CreateInfiniteTimer` 返回的 ID，使用 `StopTimer`、`RemoveTimer` 或对应的批量控制 API；不要只依赖回调内部的布尔状态。 |
| 切场景后对象池或计时器残留 | 场景切换会统一清理框架资源；常驻系统中的计时器、事件和外部回调仍建议在业务对象销毁时主动停止或解绑。 |

### 事件、音频与场景

| 现象 | 原因与处理 |
| --- | --- |
| 事件监听不触发 | 确认事件枚举值和参数泛型完全一致，注册和触发使用同一事件类型；手动注册必须在合适生命周期执行，并在销毁或禁用时移除。 |
| 事件触发多次 | 检查重复注册，尤其是 `OnEnable` 中手动注册的代码。`EventAutoBinder.BindAuto` 不要在 `OnEnable` 中调用；它本身就是用于托管启用和禁用绑定关系的工具。 |
| 粘性事件注册后没有立即收到值 | 只有使用 `sticky: true` 注册，并且事件此前已经成功触发过，监听者才会收到最近一次的值。粘性事件不适合每帧或高频输入。 |
| 音频播放没有声音 | 检查 `Resources/Audio/MasterMixer` 是否存在、Music/SFX MixerGroup 是否能被找到、音量参数是否被设为静音，以及音频资源路径和类型是否正确。 |
| 音效越播越多或没有自动清理 | 音效由对象池创建 AudioSource，并在播放结束后的清理周期回收。停止指定音效使用 `StopSound(source)`，场景切换或模块重置时使用 `ClearSound()`。 |
| 场景异步加载后逻辑立即执行 | `ScenesManager.LoadSceneAsync` 直接返回 Unity `AsyncOperation`，不会替业务判断完成。调用方应自行检查 `isDone` 或监听 `completed`。 |
| 场景切换后仍有旧 UI、资源或事件 | 使用框架场景切换入口触发统一的切换前清理；不要绕过场景系统自行加载后再假设 Pool、UI、ResLoad 和 Event 状态会自动清空。 |

详细说明参见[单例模式](/core-systems/singleton/)、[对象池系统](/core-systems/object-pool/)、[生命周期系统](/core-systems/mono/)、[定时系统](/core-systems/timer/)、[事件系统](/core-systems/event/)、[音频系统](/core-systems/audio/)和[场景切换系统](/core-systems/scene/)。

---

## 编辑器工具与调试

| 现象 | 原因与处理 |
| --- | --- |
| 日志在 Console 中看不到 | `LogUtil.Info`、`Success` 和 `Warn` 受 `DebugMode` 控制；发布或关闭 DebugMode 后可能被屏蔽。错误日志和 `force: true` 的日志仍会输出。 |
| 日志模块名显示不准确 | 自动模块识别依赖调用栈，在 Reflection、UnityEvent Inspector、部分 IL2CPP Release 和 async 状态机中可能无法还原真实类名。需要稳定标签时显式传入模块名。 |
| MathUtil 的射线或扇形检测没有可视化 | 确认 DebugMode、调用方法的 `gizmosToggle` 和 GizmosDrawer 功能开关都已开启，并在 Scene 视图查看。运行时代码应调用 `GizmosAdapter`，不能直接引用 UnityEditor。 |
| 统计面板和归档面板找不到 | 当前入口已拆分为 `Fink Framework → 统计与归档 → 项目统计面板` 和 `项目归档面板`。统计与归档都属于 Editor-only 工具。 |
| 项目统计数据不准确 | 统计工具按文件扩展名扫描 Assets，不分析代码逻辑和资源引用关系。确认统计开关、脚本目录和资源类型选项后重新统计。 |
| 项目归档没有导出文件 | 检查是否启用了项目归档、导出目录是否已选择、源码读取路径是否相对于 `Assets`，以及归档配置是否通过完整性校验。 |
| 归档输出目录中已有文件被覆盖 | 归档文件按时间戳命名，但导出前仍应确认目标目录和文件名规则。不要把需要手动维护的文件放在工具的自动输出目录中。 |

详细说明参见[日志工具](/utilities/log/)、[可视化工具](/utilities/gizmos/)和[统计归档工具](/utilities/stat/)。

---

## 许可证、更新与贡献

| 问题 | 说明 |
| --- | --- |
| 框架是否可以商用或二次开发 | 可以。项目采用 MIT License。二次分发框架代码时应保留原始 LICENSE 文件和版权声明。 |
| 自动更新会不会覆盖业务代码 | 自动更新只替换 `Assets/FinkFramework` 框架目录，不应把业务脚本放在该目录内。项目生成的业务代码应放在全局脚本根目录或自定义的外部输出目录。 |
| 如何报告问题或贡献代码 | 可以在 GitHub 提交 Issue、Pull Request、文档修改或示例项目。提交问题时请附 Unity 版本、框架版本、复现步骤、Console 首个错误和相关配置。 |
| 是否需要赞助 | 框架免费使用。可以通过 GitHub Star、分享项目或爱发电支持维护。详情参见[支持与致谢](/appendix/credits/)。 |

---

## 推荐排查顺序

当问题无法直接归类时，可以按下面顺序收集信息：

1. 查看 Console 中最早出现的错误，而不是最后一个连带异常；
2. 确认脚本是否全部编译成功，Editor 工具是否已经重新加载；
3. 核对配置资产是否存在、路径是否正确、模块是否启用；
4. 核对资源路径、Key、泛型类型、实例 ID、Surface ID 或槽位 ID；
5. 检查当前平台是否需要异步 API，例如移动端 `StreamingAssets`、网络资源和 Addressables；
6. 检查生命周期是否配对：加载与释放、注册与移除、创建与销毁、启动与停止；
7. 如果仍无法定位，保留最小复现项目和完整错误堆栈，再提交 Issue。

如果这里没有覆盖你的问题，可以先从[安装与初始化](/getting-started/setup/)或[欢迎使用](/getting-started/welcome/)开始，根据模块导航进入对应的配置、基础使用和 API 文档。
