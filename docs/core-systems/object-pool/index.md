# 对象池系统（ObjectPool）

`PoolManager` 同时管理 `GameObject` 池和实现 `IPoolable` 的普通 C# 对象池。

## GameObject 池

```csharp
GameObject enemy = PoolManager.Instance.Spawn("res://Enemies/Enemy");
PoolManager.Instance.Despawn(enemy);

PoolManager.Instance.Preload("res://Enemies/Enemy", 20);
```

路径必须是资源加载系统可识别的完整路径。对象池会复用预制体引用，`Despawn` 后保留实例；场景切换或不再使用资源时调用 `CleanPool()`，它会销毁池内对象并释放对应资源引用。

## 普通对象池

```csharp
public sealed class DamageInfo : IPoolable
{
    public int Value;
    public void ResetInfo() => Value = 0;
}

DamageInfo info = PoolManager.Instance.Spawn<DamageInfo>();
PoolManager.Instance.Despawn(info);
```

回收普通对象时框架会调用 `ResetInfo()`，因此该方法应清理对象的全部业务状态。
