<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import Artalk from './Artalk.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #doc-after>
      <Artalk />
    </template>
  </Layout>
</template>
