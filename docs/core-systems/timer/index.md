# 定时系统（Timer）

`TimerManager` 使用毫秒创建一次性、重复间隔和倒计时计时器，内部时间粒度为 100ms。

```csharp
int timeoutId = TimerManager.Instance.SetTimeout(
    1000,
    () => LogUtil.Info("一秒已到"));

int timerId = TimerManager.Instance.CreateInfiniteTimer(
    isRealTimer: true,
    intervalTime: 500,
    onInterval: Tick);

TimerManager.Instance.StopTimer(timerId);
TimerManager.Instance.RemoveTimer(timerId);
```

`isRealTimer = false` 的计时器受 `Time.timeScale` 影响；设为 `true` 则使用真实时间。`PauseAll`、`ResumeAll` 控制全部计时器，`StartTimer`、`StopTimer`、`ResetTimer` 控制单个计时器。
