# 存档系统配置

存档系统配置位于 `Edit` → `Project Settings` → `Fink Framework` → `Save System`。面板修改的内容会写入：

```text
Assets/FinkFramework_Assets/Resources/FinkFramework/Settings/Global/GlobalSettingsAsset.asset
```

运行时由 `GlobalSettingsRuntimeLoader` 加载这份资源。请保留资源路径和文件名，否则 `SaveManager` 无法初始化。

## 1. 存档数据格式

`SaveDataLoadMode` 决定新存档使用的序列化格式。

| 选项 | 文件内容 | 文件后缀 | 加密 | 压缩 |
| --- | --- | --- | --- | --- |
| `Json` | 可读的 UTF-8 JSON | 固定 `.json` | 不启用 | 不启用 |
| `Binary` | Odin Binary Payload 与 FSV1 容器 | 自定义后缀 | 可选 AES | 可选 GZip |

格式配置相互独立于数据管线的导出模式。切换数据管线为 JSON 不会自动改变存档格式，反之亦然。

::: warning 切换格式前先迁移旧档
更改格式或 Binary 扩展名会改变当前格式的目标文件路径。当前实现不会自动把已有 `.json` 主档迁移到 `.sav`，也不会在新路径缺档时搜索另一种当前格式。已经发布的项目应在业务层先完成迁移，再切换配置。
:::

## 2. Binary 文件后缀

`SaveBinaryExtension` 只在 Binary 模式生效，默认值为 `.sav`。输入内容会被规范化：

- 可以输入带点或不带点的后缀；
- 只允许字母、数字、下划线和连字符；
- 空值、路径字符或通配符会回退为默认后缀；
- 此选项不会影响数据管线的 `EncryptedExtension`。

例如输入 `sav`、`.sav` 都会得到 `.sav`。

## 3. 单槽位与多槽位

`MultiSlotMode` 控制槽位 API 的可用范围。

| 模式 | 行为 |
| --- | --- |
| 关闭 | 固定使用 Slot 1；创建、删除、枚举和选择槽位接口不可用 |
| 开启 | 接受任意大于 0 的槽位编号，可使用槽位管理接口 |

关闭多槽位并不会删除其他槽位文件。重新开启后，原有文件仍可被枚举和加载。

`CreateSlot` 只确保共享 `slot` 目录存在，不会创建空主档。槽位会在第一次成功调用 `SaveAsync(data, slotId)` 后真正出现于 `GetSlots()` 结果中。

当前默认值为：

| 配置 | 默认值 |
| --- | --- |
| `SaveDataLoadMode` | `Binary` |
| `SaveBinaryExtension` | `.sav` |
| `MultiSlotMode` | `false` |
| `EnableSaveHistory` | `false` |
| `SaveHistoryLimit` | `5` |
| `EnableSaveCompression` | `false` |

AES 开关和密码属于全局数据配置，默认是否启用以 `GlobalSettingsAsset` 中的实际设置为准；存档仅在 Binary 模式下读取这两个配置。

## 4. 历史备份

启用 `EnableSaveHistory` 后，每次覆盖已有主档时都会轮换编号历史备份。`SaveHistoryLimit` 的有效范围在编辑器中为 0–50；运行时会把负值按 0 处理。

需要区分两类备份：

| 文件 | 用途 | 是否计入历史数量 | `GetHistory` 是否返回 |
| --- | --- | --- | --- |
| `_bak` | 保存主档被覆盖前的即时备份，供自动恢复 | 否 | 否 |
| `_bak1`、`_bak2`…… | 多代历史，供自动恢复和手动回档 | 是 | 是 |

即使关闭历史备份，覆盖主档时仍会维护 `_bak` 即时备份；关闭的是编号历史链。将历史数量设为 0 会清理已有编号历史档，但不会取消即时备份。

## 5. Binary 压缩

`EnableSaveCompression` 只对 Binary 生效。保存顺序为：

```text
序列化 → GZip 压缩 → AES 加密
```

读取顺序相反。JSON 为保持可直接查看，会忽略压缩开关。

压缩是否有效取决于数据内容。大量重复文本、列表或结构化数值通常收益较明显；非常小的存档可能因容器和 GZip 开销而没有体积优势。

## 6. AES 加密

存档页面不重复维护 AES 设置。Binary 存档复用 `Data Pipeline` 页面中的：

| 字段 | 作用 |
| --- | --- |
| `EnableEncryption` | 是否对 Binary Payload 启用 AES |
| `Password` | AES 使用的密码 |

JSON 存档始终以明文保存，即使全局加密开关已经启用。

::: danger 修改 AES 密码会影响旧档
已有加密存档依赖写入时的密码。修改密码后，旧档会因解密失败而不可读，除非先用旧密码加载并以新密码重新保存。发布前应替换框架默认密码，并制定密钥迁移策略。
:::

## 7. 推荐配置

### 开发与调试

```text
格式：Json
多槽位：按游戏需求
历史备份：开启
历史数量：3–5
```

JSON 便于直接检查数据，历史链有助于复现存档演进问题。

### 正式单机版本

```text
格式：Binary
Binary 后缀：.sav
历史备份：开启
历史数量：3–5
压缩：按实测体积决定
AES：按项目安全需求决定
```

设置完成后，建议至少验证首次启动、覆盖保存、主档损坏恢复、版本升级和密钥变更策略。
