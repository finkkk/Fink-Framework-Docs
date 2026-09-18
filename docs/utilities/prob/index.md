# 随机与概率工具（ProbUtil）

`ProbUtil` 是一组面向 Unity 游戏逻辑的静态随机与概率工具，适用于掉落、抽卡、AI 决策、随机地图、Roguelike 房间、技能触发等场景。

它不需要初始化，也不依赖框架中的单例或场景对象，直接调用静态方法即可。

> 当前仓库快照中暂未检索到 `ProbUtil` 的实现文件。本页按现有 API 约定整理，接入项目时请以实际源码中的命名空间、重载和参数顺序为准。

---

## 1. 能力概览

| 类型 | 能力 |
| --- | --- |
| 概率判断 | `Chance`、`ChancePercent` |
| 权重选择 | `Roll`、`RollNormalized` |
| 随机元素 | `Pick`、`PickAndRemove` |
| 随机数字 | `RangeExcept` |
| 随机枚举 | `RandomEnum<T>` |
| 随机布尔 | `Bool` |
| 随机方向 | `RandomDirection2D`、`RandomDirection3D` |
| 随机位置 | `RandomPointInCircle`、`RandomPointInSphere` |
| 集合洗牌 | `Shuffle` |

底层随机源为 `UnityEngine.Random`，因此它适合一般玩法随机，不适合加密、安全或要求严格确定性的随机场景。

---

## 2. 概率判断

### 2.1 `Chance`

使用 `0~1` 的小数概率判断事件是否触发：

```csharp
if (ProbUtil.Chance(0.2f))
{
    // 约 20% 概率执行
}
```

参数含义：

- `probability`：概率值，`0` 表示不会触发，`1` 表示必定触发。

该接口会将传入值限制在 `0~1` 范围内。

### 2.2 `ChancePercent`

使用百分数表达概率：

```csharp
if (ProbUtil.ChancePercent(25f))
{
    // 约 25% 概率执行
}
```

参数含义：

- `percent`：百分比概率，范围为 `0~100`。

它适合配置表和策划参数直接使用百分数的场景。

---

## 3. 权重随机

权重随机不会直接返回概率，而是根据多个候选项的相对权重返回被选中的索引或元素。

例如权重 `40、40、15、5` 的总和为 `100`，对应的相对概率约为：

| 索引 | 权重 | 概率 |
| ---: | ---: | ---: |
| `0` | `40` | `40%` |
| `1` | `40` | `40%` |
| `2` | `15` | `15%` |
| `3` | `5` | `5%` |

### 3.1 按整数权重返回索引

```csharp
int index = ProbUtil.Roll(40, 40, 15, 5);
```

返回值为被选中的权重索引。

### 3.2 按小数概率返回索引

```csharp
int index = ProbUtil.RollNormalized(
    0.4f,
    0.4f,
    0.15f,
    0.05f
);
```

这种形式适合算法已经计算出小数概率的情况。为了让结果符合预期，传入值应为非负数，并保持与候选项一一对应。

### 3.3 按权重返回元素

```csharp
var items = new List<string>
{
    "Common",
    "Rare",
    "Epic"
};

var weights = new List<int>
{
    70,
    25,
    5
};

string item = ProbUtil.Roll(items, weights);
```

使用元素版本时，候选元素集合和权重集合必须保持相同数量，并且每个元素与对应权重的位置一致。

常见用途：

- 掉落表
- 宝箱奖励
- 怪物或事件生成
- 抽卡稀有度
- AI 行为选择

---

## 4. 随机选择元素

### 4.1 从数组中选择

```csharp
int value = ProbUtil.Pick(new[] { 1, 2, 3, 4 });
```

### 4.2 从 List 中选择

```csharp
string name = ProbUtil.Pick(nameList);
```

`Pick` 只读取集合并返回随机元素，不会改变原集合内容。

### 4.3 选择并移除

```csharp
int item = ProbUtil.PickAndRemove(poolList);
```

`PickAndRemove` 会完成以下操作：

1. 从当前集合中随机选择一个元素；
2. 返回该元素；
3. 将元素从原集合中移除。

适用于一次抽取后不能再次抽到同一项的场景，例如不重复奖励池、随机事件池和卡牌抽取。

---

## 5. 随机数字

### 5.1 排除指定数字

```csharp
int value = ProbUtil.RangeExcept(0, 5, 2);
```

在上述示例中，可能返回：

```text
0、1、3、4
```

该方法适合随机选择目标索引、随机技能槽或随机位置，同时排除当前对象对应的索引。

需要注意 Unity 整数区间通常使用左闭右开规则，因此 `max` 是否包含在区间内应以实际方法实现为准；使用时不要把它当作固定包含上限的接口。

---

## 6. 随机 Enum

```csharp
EnemyType type = ProbUtil.RandomEnum<EnemyType>();
```

该方法会从枚举定义的值中随机选择一个成员。

适用场景：

- AI 初始行为
- 随机状态机分支
- 随机敌人类型
- 随机事件类型

如果枚举中包含仅用于占位、未知或数量统计的成员，建议在业务层额外过滤，避免它们被随机选中。

---

## 7. 随机布尔

```csharp
bool result = ProbUtil.Bool();
```

返回 `true` 或 `false`，两者各占约一半概率。

如果业务需要可配置概率，不要使用 `Bool`，应改用 `Chance` 或 `ChancePercent`。

---

## 8. 随机方向

### 8.1 二维方向

```csharp
Vector2 direction = ProbUtil.RandomDirection2D();
```

返回一个二维单位方向，适合：

- 2D 子弹散射
- 随机移动方向
- 粒子发射方向
- 随机寻路偏移

### 8.2 三维方向

```csharp
Vector3 direction = ProbUtil.RandomDirection3D();
```

返回一个三维单位方向，适合：

- 3D 子弹散射
- 爆炸或粒子扩散
- 随机飞行方向
- AI 移动偏移

---

## 9. 随机位置

### 9.1 圆形范围内的点

```csharp
Vector2 position = ProbUtil.RandomPointInCircle(5f);
```

返回以原点为中心、半径为 `5` 的圆形范围内的二维随机点。

如果需要将结果放到世界坐标中的某个中心点，可以在返回值上加上中心坐标：

```csharp
Vector2 position = center + ProbUtil.RandomPointInCircle(radius);
```

### 9.2 球形范围内的点

```csharp
Vector3 position = ProbUtil.RandomPointInSphere(10f);
```

返回以原点为中心、半径为 `10` 的球形范围内的三维随机点。

```csharp
Vector3 position = center + ProbUtil.RandomPointInSphere(radius);
```

圆形和球形方法生成的是范围内部的点，不是只位于圆周或球面的点。

---

## 10. 列表洗牌

```csharp
ProbUtil.Shuffle(cardList);
```

洗牌会直接改变原集合的排列顺序。通常使用 Fisher-Yates 思路，可以在不重复元素的前提下高效打乱列表。

常见用途：

- 卡牌顺序
- 随机事件池
- Roguelike 房间顺序
- 关卡候选项排序
- 奖励展示顺序

如果不希望修改原列表，请先复制一份再洗牌：

```csharp
var shuffled = new List<Card>(cardList);
ProbUtil.Shuffle(shuffled);
```

---

## 11. 使用注意事项

### 11.1 不适合确定性随机

这些方法依赖 `UnityEngine.Random`，不保证不同平台、不同运行顺序下得到完全一致的随机序列。

需要回放、联网同步或可复现关卡时，应使用独立的带种子随机源，并由业务层显式管理随机状态。

### 11.2 不适合安全随机

`ProbUtil` 不适合：

- 加密密钥生成
- 身份验证令牌
- 安全抽奖
- 任何需要防预测的安全场景

### 11.3 权重输入建议

使用权重随机时建议：

- 权重使用非负数；
- 候选项与权重数量保持一致；
- 总权重不应为零；
- 不要把百分比和 `0~1` 小数概率混用；
- 对来自配置表的权重先做数据校验。

### 11.4 空集合处理

在调用 `Pick`、`PickAndRemove` 或权重元素版本前，应确保集合不为空。空集合、空权重列表和数量不匹配时的处理方式，应以实际实现为准，不建议依赖未定义行为。

---

## 12. 典型示例：随机掉落

```csharp
var rewards = new List<Reward>
{
    commonReward,
    rareReward,
    epicReward
};

var weights = new List<int>
{
    70,
    25,
    5
};

Reward reward = ProbUtil.Roll(rewards, weights);
```

如果奖励池中的每一项只能出现一次，可以改为：

```csharp
Reward reward = ProbUtil.PickAndRemove(rewardPool);
```

前者适合带概率差异的奖励选择，后者适合不重复抽取。

---

## 13. 总结

`ProbUtil` 将游戏中常见的随机需求统一为简单的静态方法：

- 用 `Chance` 表达概率触发；
- 用 `Roll` 表达权重选择；
- 用 `Pick` 和 `PickAndRemove` 选择集合元素；
- 用方向、圆形和球形方法生成空间随机值；
- 用 `RandomEnum` 和 `Bool` 简化基础随机分支；
- 用 `Shuffle` 快速打乱列表顺序。

它适合作为玩法层的通用随机辅助，但不应替代确定性随机系统或安全随机系统。
