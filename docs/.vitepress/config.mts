import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/fink-framework/',
  lang: 'zh-CN',
  title: "Fink Framework 使用文档",
  description: "Fink Framework —— 面向 Unity 游戏开发的模块化开发框架文档",
  themeConfig: {
    logo: {
      src: '/images/brand/f_logo.webp',
      alt: 'Fink Framework 标志'
    },
    // https://vitepress.dev/reference/default-theme-config
    // 中文界面文案（包含移动端菜单与“本页内容”入口）
    sidebarMenuLabel: '菜单',
    mobileMenuLabel: '菜单',
    outline: {
      level: 2,
      label: '本页内容'
    },
    returnToTopLabel: '返回顶部',
    navMenuLabel: '主导航',
    extraMenuLabel: '更多选项',
    skipToContentLabel: '跳转到正文',
    langMenuLabel: '切换语言',
    darkModeSwitchLabel: '外观',
    lightModeSwitchTitle: '切换到浅色主题',
    darkModeSwitchTitle: '切换到深色主题',
    docFooter: {
      prev: '上一页',
      next: '下一页'
    },
    nav: [
      { text: '主页', link: '/' }
    ],

    sidebar: [
      {
        text: '入门（Getting Started）',
        collapsed: true,
        items: [
          { text: '欢迎使用（Welcome）', link: '/getting-started/welcome/' },
          { text: '安装与初始化（Setup）', link: '/getting-started/setup/' }
        ]
      },
      {
        text: '数据管线（Data Pipeline）',
        collapsed: true,
        items: [
          { text: '数据管线概述（Overview）', link: '/data-pipeline/' },
          { text: '数据管线配置（Configuration）', link: '/data-pipeline/configuration/' },
          { text: '基础使用（Basic Usage）', link: '/data-pipeline/basic-usage/' },
          { text: 'Excel 配表规则（Rules）', link: '/data-pipeline/excel-rules/' },
          { text: '面板工具使用（Editor Tools）', link: '/data-pipeline/editor-tools/' },
          { text: '运行时 API 使用（API）', link: '/data-pipeline/api/' }
        ]
      },
      {
        text: '存档系统（Save System）',
        collapsed: true,
        items: [
          { text: '存档系统概述（Overview）', link: '/save-system/' },
          { text: '存档系统配置（Configuration）', link: '/save-system/configuration/' },
          { text: '基础使用（Basic Usage）', link: '/save-system/basic-usage/' },
          { text: '运行时 API 使用（API）', link: '/save-system/api/' }
        ]
      },
      {
        text: 'UI 系统（UI System）',
        collapsed: false,
        items: [
          { text: 'UI 系统概述（Overview）', link: '/ui-system/' },
          { text: 'UI 系统配置（Configuration）', link: '/ui-system/configuration/' },
          { text: '基础使用（Basic Usage）', link: '/ui-system/basic-usage/' },
          { text: 'Surface 与空间 UI（World）', link: '/ui-system/surfaces/' },
          { text: 'UI 面板生成器（UI Builder）', link: '/ui-system/ui-builder/' },
          { text: '运行时 API 使用（API）', link: '/ui-system/api/' }
        ]
      },
      {
        text: '输入系统（Input System）',
        collapsed: true,
        items: [
          { text: '输入系统概述（Overview）', link: '/input-system/' },
          { text: '输入系统配置（Configuration）', link: '/input-system/configuration/' },
          { text: '基础使用（Basic Usage）', link: '/input-system/basic-usage/' },
          { text: '运行时 API 使用（API）', link: '/input-system/api/' }
        ]
      },
      {
        text: '资源加载（ResLoad）',
        collapsed: true,
        items: [
          { text: '资源加载概述（Overview）', link: '/resload/' },
          { text: '资源后端配置（Configuration）', link: '/resload/configuration/' },
          { text: '基础使用（Basic Usage）', link: '/resload/basic-usage/' },
          { text: '资源插件系统（Provider）', link: '/resload/provider/' }
        ]
      },
      {
        text: '本地化系统（Localization）',
        collapsed: true,
        items: [
          { text: '本地化概述（Overview）', link: '/localization/' },
          { text: '本地化配置（Configuration）', link: '/localization/configuration/' },
          { text: '基础使用（Basic Usage）', link: '/localization/basic-usage/' },
          { text: '本地化配表（Tables）', link: '/localization/tables/' },
          { text: '运行时 API 使用（API）', link: '/localization/api/' }
        ]
      },
      {
        text: '基础系统（Core Systems）',
        collapsed: true,
        items: [
          { text: '单例模式（Singleton）', link: '/core-systems/singleton/' },
          { text: '对象池系统（ObjectPool）', link: '/core-systems/object-pool/' },
          { text: '生命周期系统（Mono）', link: '/core-systems/mono/' },
          { text: '定时系统（Timer）', link: '/core-systems/timer/' },
          { text: '音效系统（Audio）', link: '/core-systems/audio/' },
          { text: '场景切换系统（Scene）', link: '/core-systems/scene/' },
          { text: '事件系统（Event）', link: '/core-systems/event/' }
        ]
      },
      {
        text: '工具类（Utilities）',
        collapsed: true,
        items: [
          { text: '日志工具（Log）', link: '/utilities/log/' },
          { text: '数学工具（Math）', link: '/utilities/math/' },
          { text: '文本工具（Texts）', link: '/utilities/texts/' },
          { text: '可视化工具（Gizmos）', link: '/utilities/gizmos/' },
          { text: '统计归档工具（Stat）', link: '/utilities/stat/' },
          { text: '概率工具（Prob）', link: '/utilities/prob/' }
        ]
      },
      {
        text: '附录（Appendix）',
        collapsed: true,
        items: [
          { text: '常见问题（FAQ）', link: '/appendix/faq/' },
          { text: '更新日志（Changelog）', link: '/appendix/changelog/' },
          { text: '支持与致谢（Credits）', link: '/appendix/credits/' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/finkkk/Fink-Framework-Docs' }
    ]
  },
  head: [
    ['link', {
      rel: 'icon',
      type: 'image/webp',
      href: '/fink-framework/images/brand/f_logo.webp'
    }]
  ]
})
