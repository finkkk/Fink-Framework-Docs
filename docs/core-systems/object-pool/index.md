# 对象池系统（ObjectPool）

对象池通过“创建一次、重复使用”减少频繁 `Instantiate` / `Destroy` 带来的开销。Fink Framework 的对象池由 `PoolManager` 统一管理，分为两类：

- **GameObject 池**：复用场景中的预制体实例，支持预加载、最大数量限制和调试层级管理；
- **泛型对象池**：复用实现 `IPoolable` 的普通 C# 引用类型，适合计时器、数据结构和临时逻辑对象。

业务代码不需要手动创建池。第一次调用 `Spawn` 时，`PoolManager` 会按资源路径或类型自动创建对应的池。

## 1. GameObject 池

### 1.1 配置可池化预制体

想要通过 GameObject 池生成的预制体，必须在**预制体根节点**上添加 `PoolablePrefab` 组件。

实际使用时直接在 Inspector 中设置 `Max Num`。它表示该预制体在池中允许同时存在的最大实例数量，包含正在使用和已经回收的实例。`maxNum` 小于等于 0 时，框架会按 `1` 处理并输出警告。

框架已经提供 `PoolablePrefab` 组件，不需要在业务项目中重复声明同名脚本。将它挂到预制体根节点，并在 Inspector 中设置 `maxNum` 即可。

### 1.2 生成对象

`Spawn` 的参数是资源加载系统能够识别的完整路径，可以使用无协议路径或带 `res://` 协议的路径：

```csharp
GameObject enemy = PoolManager.Instance.Spawn(
    "res://Enemies/Enemy");

if (enemy != null)
{
    enemy.transform.SetPositionAndRotation(
        spawnPoint,
        spawnRotation);
}
```

第一次调用时，框架会：

1. 通过 `ResManager` 加载预制体；
2. 创建对应的 GameObject 池；
3. 读取预制体上的 `PoolablePrefab.maxNum`；
4. 实例化并返回第一个对象。

后续调用会按以下顺序处理：

1. 池中有已回收对象时，优先取出并激活；
2. 没有缓存对象但尚未达到上限时，使用池持有的预制体创建新实例；
3. 已达到上限且没有缓存对象时，复用最早进入使用列表的实例。

因此，当池已满时，`Spawn` 不会继续创建对象，而是采用先进先出的方式复用仍在使用列表中的最旧对象。需要注意：被强制复用的对象应当由业务代码重新设置位置、状态和其他运行时数据。

### 1.3 回收对象

对象使用完后调用 `Despawn`：

```csharp
PoolManager.Instance.Despawn(enemy);
```

回收时框架会：

- 将对象设为失活；
- 放入对应池的缓存栈；
- 从使用中列表移除；
- 在调试模式下，将对象挂到对应的对象池根节点下。

`PoolManager` 会按对象实例记录其所属的池，因此对象在生成后被业务代码改名，也不会影响正常回收。空对象、重复回收或不属于任何已注册池的对象会被安全忽略，并输出相应日志。

不要对仍由对象池管理的实例直接调用 `Destroy`。如果对象不再需要，应使用 `Despawn`；只有在清理整个池时，框架才会统一销毁这些实例。

### 1.4 预加载

对于战斗开始后会短时间大量生成的对象，可以提前预加载：

```csharp
private void Start()
{
    PoolManager.Instance.Preload(
        "res://Projectiles/Bullet",
        100);
}
```

`Preload` 的第二个参数表示池中“缓存对象 + 使用中对象”的目标总数量，不是每次额外创建的数量。例如，池中已经有 40 个实例时调用 `Preload(path, 100)`，最多只会继续准备 60 个。

预加载完成后，临时创建的实例会统一回收到池中，下一次 `Spawn` 可以直接复用。若目标数量超过 `PoolablePrefab.maxNum`，框架会按照最大数量限制创建，并输出警告。

### 1.5 清理对象池

```csharp
PoolManager.Instance.CleanPool();
```

`CleanPool` 会：

- 销毁缓存中和正在使用中的所有 GameObject；
- 销毁调试模式下创建的对象池根节点；
- 释放池持有的预制体资源引用；
- 清空 GameObject 池、泛型对象池和实例归属记录。

框架的场景切换系统会在切换场景前自动调用 `CleanPool`。如果手动调用，必须确保当前没有代码继续使用这些池化对象。

## 2. 调试模式与对象层级

当 `EnvironmentState.DebugMode` 开启时，框架会创建以下层级，方便在 Hierarchy 中观察缓存对象：

```text
ObjectPool
└── res://Enemies/Enemy
    ├── res://Enemies/Enemy
    └── res://Enemies/Enemy
```

失活对象会被挂到对应池的根节点下，重新 `Spawn` 时会解除父子关系。调试层级会增加父子关系修改的开销，正式发布时建议关闭调试模式。

## 3. 泛型对象池

泛型对象池用于复用非 `MonoBehaviour` 的引用类型，例如计时器条目、战斗数据和临时计算对象。

### 3.1 实现 `IPoolable`

要进入泛型对象池，类型必须满足以下条件：

- 是引用类型（`class`）；
- 实现 `IPoolable`；
- 提供无参数构造函数，或声明为 `new()` 可构造的类型；
- 在 `ResetInfo()` 中清理所有会被下一次使用影响的状态。

```csharp
using FinkFramework.Runtime.Pool;

public sealed class DamageInfo : IPoolable
{
    public int Value;
    public string Source;

    public void ResetInfo()
    {
        Value = 0;
        Source = null;
    }
}
```

接口定义如下：

```csharp
public interface IPoolable
{
    void ResetInfo();
}
```

### 3.2 获取与回收

```csharp
DamageInfo info = PoolManager.Instance.Spawn<DamageInfo>();
info.Value = 100;
info.Source = "Fireball";

PoolManager.Instance.Despawn(info);
```

泛型对象池的行为是：

- 池中有缓存对象时，出队并复用；
- 池中没有缓存对象时，调用 `new T()` 创建；
- 回收前调用 `ResetInfo()`；
- 重置完成后，将对象放入队列等待下一次使用。

`ResetInfo()` 在回收时执行，而不是在取出时执行。因此业务代码应在对象取出后完成本次使用所需的初始化，并保证回收前不再持有会被异步逻辑继续使用的引用。

### 3.3 使用命名空间区分同一类型的池

同一个类型可以通过 `nameSpace` 分到不同的池中：

```csharp
DamageInfo combatInfo = PoolManager.Instance.Spawn<DamageInfo>("Combat");
PoolManager.Instance.Despawn(combatInfo, "Combat");
```

`Spawn` 和 `Despawn` 必须使用相同的 `nameSpace`。不传参数时使用默认池。命名空间适合在同一类型需要不同复用生命周期或不同业务用途时使用。

## 4. 完整示例：发射并回收子弹

假设 `Resources/Projectiles/Bullet.prefab` 已添加 `PoolablePrefab` 组件：

```csharp
using System.Collections;
using UnityEngine;
using FinkFramework.Runtime.Pool;

public class BulletShooter : MonoBehaviour
{
    private void Start()
    {
        PoolManager.Instance.Preload(
            "res://Projectiles/Bullet",
            50);
    }

    private void Update()
    {
        if (Input.GetKeyDown(KeyCode.Space))
        {
            GameObject bullet = PoolManager.Instance.Spawn(
                "res://Projectiles/Bullet");

            if (bullet == null)
                return;

            bullet.transform.SetPositionAndRotation(
                transform.position,
                transform.rotation);

            StartCoroutine(ReturnAfterDelay(bullet, 3f));
        }
    }

    private IEnumerator ReturnAfterDelay(
        GameObject bullet,
        float delay)
    {
        yield return new WaitForSeconds(delay);
        PoolManager.Instance.Despawn(bullet);
    }
}
```

池化对象重复使用时，建议把依赖运行状态的初始化放在 `OnEnable` 或显式的初始化方法中，不要只依赖预制体首次实例化时的状态。对象被 `Despawn` 后会触发 Unity 的失活流程，重新 `Spawn` 时会再次激活。

## 5. 使用建议

- 可池化预制体的根节点必须挂载 `PoolablePrefab`；
- `maxNum` 应根据实际同时使用数量设置，并预留合理余量；
- 对高频生成对象在进入战斗或高峰流程前调用 `Preload`；
- 使用 `Despawn` 代替直接 `Destroy`，不要重复回收同一个对象；
- 在 `ResetInfo()` 中完整清理泛型对象的字段、集合和临时引用；
- 初始化逻辑应能适应对象被多次激活，不要假设 `Awake` 只对应一次业务使用；
- 场景切换或模块整体卸载时再调用 `CleanPool`，不要在普通对象回收流程中清空整个池。
