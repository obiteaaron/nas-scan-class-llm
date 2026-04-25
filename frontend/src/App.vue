<template>
  <div class="app">
    <header class="header">
      <div class="header-left">
        <h1 class="logo">NAS Indexer</h1>
        <nav class="nav">
          <router-link to="/" class="nav-link">首页</router-link>
          <router-link to="/files" class="nav-link">文件列表</router-link>
          <router-link to="/search" class="nav-link">搜索</router-link>
          <router-link to="/statistics" class="nav-link">统计</router-link>
          <router-link to="/settings" class="nav-link">设置</router-link>
        </nav>
      </div>
      <div class="header-right">
        <span class="status" v-if="status">{{ status.totalFiles }} 个文件 | {{ status.totalSize }}</span>
      </div>
    </header>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { getStatus } from './api'

export default {
  name: 'App',
  setup() {
    const status = ref(null)

    onMounted(async () => {
      try {
        const res = await getStatus()
        if (res.success) {
          status.value = res.status
        }
      } catch (err) {
        console.error('获取状态失败:', err)
      }
    })

    return { status }
  }
}
</script>