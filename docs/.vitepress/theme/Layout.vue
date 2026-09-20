<script setup lang="ts">
import { withBase } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Artalk from './Artalk.vue'

const { Layout } = DefaultTheme
const blogLogo = withBase('/images/brand/cn_logo.webp')
</script>

<template>
  <Layout>
    <template #nav-bar-content-after>
      <a
        class="fink-blog-link"
        href="https://finkkk.cn"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="访问 Fink 的个人博客"
        title="访问个人博客"
      >
        <img :src="blogLogo" alt="个人博客" />
      </a>
    </template>
    <template #doc-after>
      <Artalk />
    </template>
  </Layout>
</template>
