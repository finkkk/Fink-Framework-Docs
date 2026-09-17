# 音效系统（Audio）

启用全局音频模块后，通过 `AudioManager.Instance` 播放音乐和音效。资源路径交给 `ResManager` 解析，不需要业务代码自行加载 `AudioClip`。

```csharp
AudioManager.Instance.PlayMusic("res://Audio/Music/Main");
AudioSource source = AudioManager.Instance.PlaySound(
    "res://Audio/UI/Click");

AudioManager.Instance.ChangeMusicValue(0.8f);
AudioManager.Instance.ChangeSoundValue(0.7f);
AudioManager.Instance.StopMusic();
AudioManager.Instance.StopSound(source);
```

音乐和音效都提供同步、`UniTask`、回调和 `AudioOperation` 句柄式加载。循环音效结束后调用 `StopSound`；场景或系统退出时可调用 `ClearSound` 释放当前音效资源。
