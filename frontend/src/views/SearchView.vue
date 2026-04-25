<template>
  <div class="search">
    <div class="card">
      <div class="search-bar">
        <input class="input" v-model="query" placeholder="输入搜索关键词..." @keyup.enter="doSearch" autofocus>
        <button class="btn btn-primary" @click="doSearch">搜索</button>
      </div>

      <div class="search-history" v-if="history.length">
        <span class="history-label">搜索历史：</span>
        <span class="history-item" v-for="h in history" :key="h" @click="query = h; doSearch()">{{ h }}</span>
        <button class="btn btn-secondary btn-small" @click="clearHistory">清除</button>
      </div>

      <div class="filters">
        <select class="select" v-model="category">
          <option value="">全部分类</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </div>

      <div v-if="loading" class="loading">搜索中...</div>
      <div v-else-if="results.length">
        <p class="result-count">找到 {{ total }} 个结果</p>
        <table class="table">
          <thead>
            <tr>
              <th>文件名</th>
              <th>路径</th>
              <th>大小</th>
              <th>分类</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="file in results" :key="file.id">
              <td>{{ file.name }}</td>
              <td class="path-cell">{{ truncatePath(file.path) }}</td>
              <td>{{ file.sizeFormatted }}</td>
              <td>
                <span :class="'badge badge-' + getBadgeClass(file.category)">{{ file.category }}</span>
              </td>
              <td>
                <button class="btn btn-secondary btn-small" @click="openLocation(file)">定位</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else-if="searched" class="no-results">
        未找到匹配的文件
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { getFiles, getCategories, openFile, getSearchHistory, clearSearchHistory } from '../api'

export default {
  name: 'SearchView',
  setup() {
    const query = ref('')
    const category = ref('')
    const results = ref([])
    const total = ref(0)
    const loading = ref(false)
    const searched = ref(false)
    const history = ref([])
    const categories = ref([])

    onMounted(async () => {
      await loadHistory()
      await loadCategories()
    })

    async function loadHistory() {
      try {
        const res = await getSearchHistory()
        if (res.success) {
          history.value = res.data
        }
      } catch (err) {
        console.error('获取历史失败:', err)
      }
    }

    async function loadCategories() {
      try {
        const res = await getCategories()
        if (res.success) {
          categories.value = res.data
        }
      } catch (err) {
        console.error('获取分类失败:', err)
      }
    }

    async function doSearch() {
      if (!query.value.trim()) return
      
      loading.value = true
      searched.value = true
      
      try {
        const res = await getFiles({
          search: query.value,
          category: category.value,
          pageSize: 100
        })
        if (res.success) {
          results.value = res.data.files
          total.value = res.data.total
          loadHistory()
        }
      } catch (err) {
        console.error('搜索失败:', err)
      }
      
      loading.value = false
    }

    async function openLocation(file) {
      try {
        await openFile(file.id)
      } catch (err) {
        alert('打开失败：' + err.message)
      }
    }

    async function clearHistory() {
      try {
        await clearSearchHistory()
        history.value = []
      } catch (err) {
        console.error('清除历史失败:', err)
      }
    }

    function truncatePath(path) {
      if (path.length > 60) {
        return '...' + path.slice(-57)
      }
      return path
    }

    function getBadgeClass(category) {
      const map = {
        '视频': 'video',
        '图片': 'image',
        '音频': 'audio',
        '文档': 'doc'
      }
      return map[category] || 'other'
    }

    return {
      query, category, results, total, loading, searched, history, categories,
      doSearch, openLocation, clearHistory,
      truncatePath, getBadgeClass
    }
  }
}
</script>

<style scoped>
.search-history {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-label {
  color: var(--text-muted);
  font-size: 14px;
}

.history-item {
  padding: 4px 12px;
  background: var(--bg);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.history-item:hover {
  background: var(--border);
}

.filters {
  margin-top: 16px;
}

.result-count {
  color: var(--text-muted);
  margin-bottom: 16px;
}

.path-cell {
  color: var(--text-muted);
  font-size: 13px;
}

.no-results {
  text-align: center;
  padding: 48px;
  color: var(--text-muted);
}
</style>