<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vitepress'
import 'artalk/Artalk.css'

const route = useRoute()

let artalkInstance: any = null

async function mountArtalk() {
  await nextTick()

  const { default: Artalk } = await import('artalk')

  artalkInstance?.destroy?.()

  artalkInstance = Artalk.init({
    el: '#Comments',
    pageKey: window.location.pathname,
    pageTitle: document.title,
    server: 'https://comment.finkkk.cn',
    site: 'Fink Framework 文档'
  })
}

onMounted(mountArtalk)

watch(() => route.path, mountArtalk)

onBeforeUnmount(() => {
  artalkInstance?.destroy?.()
})
</script>

<template>
  <div id="Comments" class="artalk-comments"></div>
</template>
