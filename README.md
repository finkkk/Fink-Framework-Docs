# Fink Framework 文档

Fink Framework 官方文档站，使用 [VitePress](https://vitepress.dev/) 构建。

这里主要记录 Fink Framework 的使用说明、核心系统、数据流程、资源加载以及相关开发文档。

## 本地运行

安装依赖：

```bash
npm ci
```

启动本地开发服务：

```bash
npm run docs:dev
```

构建静态网站：

```bash
npm run docs:build
```

构建产物位于：

```text
docs/.vitepress/dist/
```

## 技术栈

- VitePress
- Markdown
- TypeScript

## 目录结构

```text
docs/              文档源文件
docs/.vitepress/   VitePress 配置
docs/public/       图片及其他静态资源
```

## 许可

详见 [LICENSE](./LICENSE)。
