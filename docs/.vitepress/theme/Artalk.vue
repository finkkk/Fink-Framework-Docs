<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vitepress'
import 'artalk/Artalk.css'

const route = useRoute()

let artalkInstance: any = null
let mountedPageKey = ''
let mounting = false

function decorateEditor(root: HTMLElement) {
  const inputs = root.querySelectorAll<HTMLInputElement>(
    '.atk-main-editor > .atk-header input'
  )
  const placeholders = ['昵称（必填）', '邮箱（必填，不公开）', '网址（选填）']

  inputs.forEach((input, index) => {
    if (placeholders[index]) {
      input.placeholder = placeholders[index]
    }
  })
}

async function mountArtalk() {
  if (mounting) return

  mounting = true

  try {
    await nextTick()

    const root = document.getElementById('Comments')
    if (!root) return

    const pageKey = window.location.pathname
    if (artalkInstance && mountedPageKey === pageKey) return

    artalkInstance?.destroy?.()
    artalkInstance = null
    root.innerHTML = ''

    const { default: Artalk } = await import('artalk')

    artalkInstance = Artalk.init({
      el: root,
      pageKey,
      pageTitle: document.title,
      server: 'https://comment.finkkk.cn',
      site: 'Fink Framework 文档'
    })

    mountedPageKey = pageKey
    decorateEditor(root)
    artalkInstance.on?.('mounted', () => decorateEditor(root))
  } finally {
    mounting = false
  }
}

onMounted(mountArtalk)

watch(() => route.path, mountArtalk)

onBeforeUnmount(() => {
  artalkInstance?.destroy?.()
  artalkInstance = null
  mountedPageKey = ''
})
</script>

<template>
  <div id="Comments" class="artalk-comments"></div>
</template>
