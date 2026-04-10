# NAS 文件索引工具

扫描 NAS 目录结构,生成 Markdown 知识库,支持本地分类和统计分析。

## 功能特点

- 📁 **目录扫描** - 扫描指定路径，生成文件列表
- 📝 **Markdown 输出** - 结构化表格格式，包含文件元信息
- 🏷️ **本地分类** - 基于文件后缀自动分类（视频、音频、图片、文档等）
- 📊 **统计分析** - 饼图展示文件类型分布和占比
- 🔍 **Web 搜索** - 浏览器访问，本地快速检索
- ⏰ **定时扫描** - 支持 Cron 表达式配置自动扫描
- 💾 **统一存储** - 所有数据合并存储在单一文件中



## 安装

```bash
npm install
```

## 使用

### 1. 启动服务

```bash
npm start
```

服务默认运行在 `http://localhost:3000`

### 2. 配置

在 Web 页面中配置：

1. **扫描路径** - 添加你的 NAS 挂载路径（如 `D:\NAS` 或 `/mnt/nas`）
2. **定时扫描** - Cron 表达式，默认每天凌晨 2 点
3. **排除模式** - 要跳过的目录/文件模式

### 3. 操作

- **立即扫描** - 手动触发一次扫描
- **搜索框** - 输入关键词搜索文件

## 输出文件

默认情况下，所有文件都存储在项目目录下的 `profiles/` 目录：

```
profiles/
├── config.json       # 用户配置
└── nas_scan.md       # 扫描结果（包含分类、统计数据）
```

可通过 Web 配置界面的"存储配置"部分自定义存储目录。

### nas_scan.md 存储结构

```markdown
# NAS 文件索引

扫描时间：2026/04/11 00:00:00
总文件数：123
总大小：45.6 GB

---

## 文件列表

| 文件路径 | 文件名 | 大小 | 后缀 | 本地分类 |
|----------|--------|------|------|----------|
| \\nas\video\movie.mp4 | movie.mp4 | 2.1 GB | .mp4 | 视频 |
| \\nas\music\song.mp3 | song.mp3 | 5.2 MB | .mp3 | 音频 |

---

## 统计汇总

| 分类 | 文件数 | 大小 | 占比 |
|------|--------|------|------|
| 视频 | 45 | 35.2 GB | 77.2% |
| 音频 | 30 | 2.1 GB | 4.6% |
```

## Cron 表达式示例

- `0 2 * * *` - 每天凌晨 2 点
- `0 */4 * * *` - 每 4 小时
- `0 9 * * 1-5` - 工作日每天 9 点
- `*/30 * * * *` - 每 30 分钟

## 配置说明

### 配置文件位置

- **默认存储目录**：`profiles/`（项目目录下）
- **用户配置**：`profiles/config.json`
- **默认配置模板**：`config.default.json`

### 配置项说明

```json
{
  "storagePath": "",
  "scanPaths": ["D:\\NAS", "E:\\Media"],
  "scanTime": "0 2 * * *",
  "excludePatterns": ["$Recycle.Bin", ".git", "node_modules"],
  "outputFile": "nas_scan.md"
}
```

**storagePath 说明**：
- 留空：使用默认 `profiles/` 目录
- 绝对路径：如 `D:\NAS_Data` 或 `/data/nas-index`
- 相对路径：相对于项目目录，如 `./data`

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/config` | GET | 获取配置 |
| `/api/config/full` | GET | 获取完整配置 |
| `/api/config` | POST | 保存配置 |
| `/api/storage/path` | GET | 获取存储路径信息 |
| `/api/scan` | POST | 手动扫描 |
| `/api/content/scan` | GET | 获取扫描内容 |
| `/api/statistics` | GET | 获取统计数据（用于饼图） |
| `/api/search?q=xxx` | GET | 搜索文件 |
| `/api/status` | GET | 获取状态 |

## 注意事项

- NAS 关机时扫描会跳过，不会报错
- 文件搜索在本地进行，不依赖外部服务