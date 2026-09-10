<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vitepress'
import 'artalk/Artalk.css'

const route = useRoute()

let artalkInstance: any = null
let mountedPageKey = ''
let mounting = false
let editorObserver: MutationObserver | null = null

function decorateEditor(root: HTMLElement) {
  const inputs = root.querySelectorAll<HTMLInputElement>(
    '.atk-main-editor > .atk-header input'
  )
  const placeholders = ['昵称（必填）', '邮箱（必填，不公开）', '网址（选填）']

  inputs.forEach((input, index) => {
    if (placeholders[index] && input.placeholder !== placeholders[index]) {
      input.setAttribute('placeholder', placeholders[index])
    }
  })

  const previewIcon = root.querySelector<HTMLElement>(
    '.atk-main-editor .atk-plug-btn i[aria-label="预览"]'
  )
  const previewButton = previewIcon?.closest<HTMLElement>('.atk-plug-btn')

  previewIcon?.setAttribute('aria-label', 'Markdown 预览')
  previewButton?.setAttribute(
    'title',
    'Markdown 预览：支持标题、粗体、列表、链接等格式'
  )
}

function observeEditor(root: HTMLElement) {
  editorObserver?.disconnect()

  editorObserver = new MutationObserver(() => {
    decorateEditor(root)
  })

  editorObserver.observe(root, {
    childList: true,
    subtree: true
  })

  decorateEditor(root)
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

    editorObserver?.disconnect()
    editorObserver = null
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
    observeEditor(root)
  } finally {
    mounting = false
  }
}

onMounted(mountArtalk)

watch(() => route.path, mountArtalk)

onBeforeUnmount(() => {
  editorObserver?.disconnect()
  editorObserver = null
  artalkInstance?.destroy?.()
  artalkInstance = null
  mountedPageKey = ''
})
</script>

<template>
  <div id="Comments" class="artalk-comments"></div>
</template>
