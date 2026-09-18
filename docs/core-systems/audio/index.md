# 音频系统（Audio）

Fink Framework 的音频系统通过 `AudioManager` 统一管理背景音乐和音效，使用 `ResManager` 加载 `AudioClip`，使用 `AudioMixer` 分离 Music / SFX 音量，并通过对象池复用音效播放源。

系统提供同步、`UniTask` 异步、回调和 `AudioOperation` 句柄四种调用方式，适用于背景音乐、UI 音效、战斗音效和需要跟随场景对象移动的音效播放。

## 1. 启用音频模块

音频系统是否启用由全局设置中的 **启用音频模块** 控制。设置入口为：

```text
Edit → Project Settings → Fink Framework → Global
```

关闭后，`AudioManager` 不会初始化 Mixer，也不会注册音效清理回调；播放方法会直接返回空值或结束，不会创建音频对象。

`AudioManager` 是普通 C# 单例，不继承 `MonoBehaviour`。首次访问时会初始化 Mixer，并通过 `MonoManager` 注册 `FixedUpdate` 清理回收完成的音效播放源。

## 2. 音频资源与 Mixer

### 2.1 框架内置 Mixer

框架会从以下路径加载内置 Mixer：

```text
res://FinkFramework/Audio/MasterMixer
```

Mixer 中需要包含以下两个分组和暴露参数：

| 分组 | 暴露参数 | 用途 |
| --- | --- | --- |
| `Music` | `MusicVolume` | 背景音乐音量 |
| `SFX` | `SFXVolume` | 音效音量 |

`AudioManager` 初始化时通过 `FindMatchingGroups` 查找 `Music` 和 `SFX` 分组。Mixer 或分组缺失时，系统会输出错误日志，相关播放源可能无法正确路由。

### 2.2 音频 Clip 路径

音乐和音效的路径交给 `ResManager` 解析，可以使用框架支持的资源路径协议。示例使用 `res://`：

```csharp
"res://Audio/Music/BGM_Main"
"res://Audio/SFX/UI_Click"
```

这里的音频目录是业务项目的组织方式，不是 `AudioManager` 强制要求的固定目录。只要路径能够被 `ResManager` 支持的 Provider 解析，就可以传给播放接口。

框架自己的音效播放源预制体位于：

```text
res://FinkFramework/Audio/Base/SoundPlayer
```

业务代码不需要直接加载或实例化这个预制体。

## 3. 背景音乐（Music）

背景音乐使用全局唯一的 `MusicPlayer`。它由 `AudioManager` 在第一次播放音乐时自动创建，并通过 `DontDestroyOnLoad` 跨场景保留。

音乐播放源具有以下特征：

- 输出到 `Music` MixerGroup；
- 默认开启循环播放；
- 同一时间只维护一个全局播放器；
- 播放新音乐前会释放上一首音乐的资源引用；
- 场景切换时不会因为场景销毁而自动停止。

### 3.1 同步播放

```csharp
AudioManager.Instance.PlayMusic(
    "res://Audio/Music/BGM_Main");
```

同步接口会在当前调用中加载 `AudioClip`，不适合体积较大的音乐文件。加载失败时会输出错误日志，调用不会抛出由框架主动包装的播放结果。

### 3.2 `await` 异步播放

```csharp
using UnityEngine;
using Cysharp.Threading.Tasks;
using FinkFramework.Runtime.Audio;

public async UniTask PlayBackgroundMusic()
{
    AudioSource source = await AudioManager.Instance.PlayMusicAsync(
        "res://Audio/Music/BGM_Main");

    if (source == null)
        Debug.LogWarning("背景音乐加载失败");
}
```

异步接口会等待资源加载和播放源准备完成，成功时返回全局 `MusicPlayer` 的 `AudioSource`，失败时返回 `null`。

### 3.3 回调方式

```csharp
AudioManager.Instance.PlayMusicAsyncCallback(
    "res://Audio/Music/BGM_Main",
    source =>
    {
        if (source != null)
            Debug.Log("背景音乐已开始播放");
    });
```

回调会在异步操作完成后触发。若业务需要明确判断加载失败，建议使用 `AudioOperation` 句柄，因为句柄提供 `IsFailed` 状态。

### 3.4 句柄方式

```csharp
AudioOperation operation = AudioManager.Instance.PlayMusicAsyncHandle(
    "res://Audio/Music/BGM_Main");

if (operation != null)
{
    operation.Completed += completed =>
    {
        if (completed.IsFailed)
        {
            Debug.LogWarning("背景音乐加载失败");
            return;
        }

        Debug.Log("背景音乐加载并开始播放");
    };
}
```

句柄适合需要显示加载进度、统一处理成功/失败或串联多个异步步骤的场景。

### 3.5 停止与暂停

```csharp
AudioManager.Instance.PauseMusic("ignored");
AudioManager.Instance.StopMusic();
```

`PauseMusic` 当前保留了 `name` 参数，但参数不参与选择逻辑，实际只暂停全局音乐播放器。`StopMusic` 会停止播放、清空 Clip，并释放当前音乐的资源引用。

暂停后可以通过 `AudioSource.UnPause()` 自行恢复，也可以重新调用播放接口；系统没有单独提供 `ResumeMusic` 方法。

### 3.6 调整音乐音量

```csharp
AudioManager.Instance.ChangeMusicValue(0.5f);
```

参数按 `0~1` 使用，内部会映射到 `MusicVolume` 的 `-80~0 dB` 范围：

- `0`：接近静音；
- `1`：Mixer 的 0 dB；
- `0.5`：中间音量值。

## 4. 音效（SFX）

音效播放源使用对象池管理。每次播放时，`AudioManager` 从以下池化预制体中获取一个 `AudioSource`：

```text
res://FinkFramework/Audio/Base/SoundPlayer
```

当前内置 `SoundPlayer` 预制体的 `PoolablePrefab.maxNum` 默认值为 `50`。当同时播放的音效超过池上限时，对象池可能复用仍在播放的旧播放源，因此旧音效可能被停止或替换。需要更大同时播放数时，应调整该预制体的池上限。

### 4.1 同步播放

```csharp
AudioSource source = AudioManager.Instance.PlaySound(
    "res://Audio/SFX/UI_Click");
```

`PlaySound` 返回已经开始播放的 `AudioSource`。它支持循环、父对象和同步完成回调：

```csharp
AudioSource source = AudioManager.Instance.PlaySound(
    "res://Audio/SFX/Explosion",
    isLoop: false,
    fatherObj: enemy,
    callback: loadedSource =>
    {
        if (loadedSource != null)
            Debug.Log("音效已开始播放");
    });
```

同步加载失败时，播放源会被回收到对象池，回调收到 `null`，方法也返回 `null`。

### 4.2 `await` 异步播放

```csharp
AudioSource source = await AudioManager.Instance.PlaySoundAsync(
    "res://Audio/SFX/Explosion",
    isLoop: false,
    fatherObj: enemy);
```

异步方法在音频加载完成并开始播放后返回 `AudioSource`。失败时返回 `null`。

### 4.3 回调方式

```csharp
AudioManager.Instance.PlaySoundAsyncCallback(
    "res://Audio/SFX/Explosion",
    source =>
    {
        if (source != null)
            Debug.Log("音效已开始播放");
    },
    isLoop: false,
    fatherObj: enemy);
```

回调表示异步播放操作已经完成，不表示音效已经播放完毕。需要判断资源加载是否失败、获取进度或统一处理异常时，使用句柄方式更可靠。

### 4.4 句柄方式

```csharp
AudioOperation operation = AudioManager.Instance.PlaySoundHandle(
    "res://Audio/SFX/Explosion",
    isLoop: false,
    fatherObj: enemy);

if (operation != null)
{
    operation.Completed += completed =>
    {
        if (completed.IsFailed)
        {
            Debug.LogWarning("音效加载失败");
            return;
        }

        Debug.Log($"音效已开始播放，进度：{completed.Progress}");
    };
}
```

句柄支持进度查询、完成回调和异步等待，适合 Loading UI、动画流程和多步骤逻辑。

## 5. 音效播放源的挂载

`PlaySound`、`PlaySoundAsync` 和 `PlaySoundHandle` 都支持传入 `fatherObj`：

```csharp
AudioSource source = AudioManager.Instance.PlaySound(
    "res://Audio/SFX/Footstep",
    fatherObj: player);
```

传入父对象后，播放源会挂到该对象下，适合需要随角色或场景物体管理的音效。实际 3D 衰减、空间化和距离参数仍由 `SoundPlayer` 预制体上的 `AudioSource` 配置决定。

不传父对象时，非调试模式下播放源会统一挂到运行时创建的 `SoundPlayers` 节点下：

```text
SoundPlayers
├── SoundPlayer
├── SoundPlayer
└── ...
```

调试模式下，播放源的层级可能由对象池调试布局接管。

## 6. 停止与清理音效

### 6.1 停止单个音效

```csharp
AudioManager.Instance.StopSound(source);
```

`StopSound` 会停止播放、清空 Clip、释放音频资源引用，并将播放源回收到对象池。循环音效不会自动结束，使用完后必须主动调用该方法。

### 6.2 自动回收非循环音效

音频模块会通过 `MonoManager` 的 `FixedUpdate` 定期检查播放列表：

1. 找到已经不在播放的音效源；
2. 清空 Clip；
3. 释放对应的音频资源引用；
4. 将播放源回收到对象池；
5. 从内部集合中移除记录。

因此，普通非循环音效播放结束后通常不需要手动调用 `StopSound`。循环音效、被全局停止的音效和需要提前打断的音效仍应由业务代码主动管理。

### 6.3 清空全部音效

```csharp
AudioManager.Instance.ClearSound();
```

`ClearSound` 会停止并回收所有当前音效，释放资源引用，同时清空内部播放记录。框架的场景切换流程会在加载新场景前自动调用它。

## 7. 全局音效开关

```csharp
AudioManager.Instance.ToggleAllSounds(false);
```

传入 `false` 会停止当前所有音效并暂停自动清理检查；传入 `true` 会对记录中的播放源再次调用 `Play()`：

```csharp
AudioManager.Instance.ToggleAllSounds(true);
```

这不是逐个音效的暂停/恢复，而是全局停止与重新播放。重新开启后，已记录的音效会从头播放；如需保留精确播放位置，应自行保存和恢复 `AudioSource.time`。

## 8. 调整音量

```csharp
AudioManager.Instance.ChangeMusicValue(0.8f);
AudioManager.Instance.ChangeSoundValue(0.6f);
```

两个方法都建议传入 `0~1` 范围的值，分别写入 Mixer 的 `MusicVolume` 和 `SFXVolume`。系统内部将该范围映射到 `-80~0 dB`。

音量参数不是单个 `AudioSource` 的 `volume`，而是对应 Mixer 分组的集中控制，因此调整后会影响该分组下的所有播放源。

## 9. AudioOperation 句柄

异步播放接口最终通过 `AudioOperation` 表示一次“加载并开始播放”的操作：

| 属性或方法 | 说明 |
| --- | --- |
| `IsDone` | 操作是否已经结束，成功或失败都会变为 `true` |
| `IsFailed` | 资源加载或播放准备是否失败 |
| `Progress` | 资源加载进度，范围为 `0~1` |
| `Clip` | 加载成功的 `AudioClip`，失败时为空 |
| `Source` | 使用的 `AudioSource` |
| `Completed` | 操作结束时触发，成功和失败都会触发 |
| `WaitUntilDone()` | 异步等待操作结束 |

可以使用 `await` 等待句柄：

```csharp
AudioOperation operation = AudioManager.Instance.PlaySoundHandle(
    "res://Audio/SFX/Explosion");

if (operation != null)
{
    await operation.WaitUntilDone();

    if (!operation.IsFailed)
        Debug.Log($"音效已开始播放：{operation.Clip.name}");
}
```

`Completed` 回调内部有异常保护，回调自身抛出的异常不会破坏音频操作状态。业务代码仍应检查 `IsFailed`，不要只根据回调触发就判定播放成功。

## 10. 内部资源与播放源生命周期

一次异步音效播放的大致流程如下：

```text
创建或获取池化 AudioSource
        ↓
ResManager.LoadAsyncHandle<AudioClip>()
        ↓
同步加载进度到 AudioOperation.Progress
        ↓
加载失败：标记 IsFailed 并回收音效源
        ↓
加载成功：绑定 Clip，设置循环并开始播放
        ↓
标记 IsDone，触发 Completed
```

播放中的每个音效源都会同时记录在 `HashSet<AudioSource>` 和 `List<AudioSource>` 中：

- `HashSet` 用于快速判断播放源是否已经被记录；
- `List` 用于在 `FixedUpdate` 中按顺序检查和倒序移除。

音频资源引用由 `AudioManager` 在停止、自动回收、切换音乐或清空音效时释放。业务代码不需要额外对通过 `AudioManager` 加载的 Clip 调用 `ResManager.UnloadAsset`。

## 11. 使用建议

- 优先使用 `PlayMusicAsync`、`PlaySoundAsync` 或句柄接口，避免大文件同步加载阻塞主线程；
- 循环音效不会自动结束，使用完成后主动调用 `StopSound`；
- 音效同时播放数量较多时，检查 `SoundPlayer` 的 `PoolablePrefab.maxNum`，避免池满后复用正在播放的旧音效；
- 需要 3D 跟随效果时传入 `fatherObj`，并检查 `SoundPlayer` 的 AudioSource 空间化和距离配置；
- 需要判断加载失败时使用 `AudioOperation.IsFailed`，不要只依赖 `Completed` 是否触发；
- 场景切换通常不需要手动清理，框架会自动调用 `ClearSound`；
- 不使用框架音频系统时，可在全局设置中关闭音频模块以避免初始化和运行时开销。
