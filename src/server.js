const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const { performScan } = require('./scanner');
const { storage, formatSize } = require('./storage');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 配置管理
const PROJECT_ROOT = path.join(__dirname, '..');
const DEFAULT_STORAGE_PATH = path.join(PROJECT_ROOT, 'profiles');
const DEFAULT_CONFIG_FILE = path.join(PROJECT_ROOT, 'config.default.json');

// 获取存储路径（优先使用用户配置，否则使用默认 profiles 目录）
function getStoragePath(config) {
  if (config.storagePath && config.storagePath.trim() !== '') {
    // 处理相对路径：如果是相对路径，转换为绝对路径
    let storagePath = config.storagePath;
    if (!path.isAbsolute(storagePath)) {
      storagePath = path.resolve(PROJECT_ROOT, storagePath);
    }
    return storagePath;
  }
  return DEFAULT_STORAGE_PATH;
}

// 获取存储文件路径
function getStorageFilePath(config, filename) {
  const storagePath = getStoragePath(config);
  return path.join(storagePath, filename);
}

// 获取配置文件路径
function getConfigFilePath(config) {
  return getStorageFilePath(config, 'config.json');
}

// 确保存储目录存在
function ensureStorageDir(config) {
  const storagePath = getStoragePath(config);
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
    console.log('已创建存储目录:', storagePath);
  }
  return storagePath;
}

function loadConfig() {
  try {
    // 先尝试从默认配置加载 storagePath
    let defaultConfig = getDefaultConfig();
    
    // 检查 profiles 目录是否有配置文件
    const profilesConfigPath = path.join(DEFAULT_STORAGE_PATH, 'config.json');
    if (fs.existsSync(profilesConfigPath)) {
      const config = JSON.parse(fs.readFileSync(profilesConfigPath, 'utf-8'));
      console.log('从 profiles 目录加载配置:', profilesConfigPath);
      return config;
    }
    
    // 检查是否有用户自定义存储路径的配置（从命令行参数或环境变量）
    const envStoragePath = process.env.NAS_STORAGE_PATH;
    if (envStoragePath) {
      const envConfigPath = path.join(envStoragePath, 'config.json');
      if (fs.existsSync(envConfigPath)) {
        const config = JSON.parse(fs.readFileSync(envConfigPath, 'utf-8'));
        console.log('从环境变量指定路径加载配置:', envConfigPath);
        return config;
      }
    }
    
    // 检查旧版本用户目录配置（用于迁移）
    const userHome = process.env.USERPROFILE || process.env.HOME || require('os').homedir();
    const legacyConfigPath = path.join(userHome, 'nasscanclassllm', 'config.json');
    if (fs.existsSync(legacyConfigPath)) {
      const config = JSON.parse(fs.readFileSync(legacyConfigPath, 'utf-8'));
      console.log('检测到旧版本配置，正在迁移到 profiles 目录...');
      // 确保 storagePath 字段存在
      if (!config.storagePath) {
        config.storagePath = '';
      }
      // 迁移到 profiles 目录
      ensureStorageDir(defaultConfig);
      fs.writeFileSync(profilesConfigPath, JSON.stringify(config, null, 2), 'utf-8');
      console.log('配置已迁移:', profilesConfigPath);
      return config;
    }
    
    // 最后使用默认配置，并保存到 profiles 目录
    ensureStorageDir(defaultConfig);
    fs.writeFileSync(profilesConfigPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    console.log('使用默认配置，已保存到:', profilesConfigPath);
    return defaultConfig;
  } catch (err) {
    console.error('加载配置失败:', err.message);
    return getDefaultConfig();
  }
}

function saveConfig(config) {
  const storagePath = ensureStorageDir(config);
  const configFilePath = getStorageFilePath(config, 'config.json');
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
  console.log('配置已保存:', configFilePath);
  return true;
}

function getDefaultConfig() {
  // 尝试从 config.default.json 加载
  try {
    if (fs.existsSync(DEFAULT_CONFIG_FILE)) {
      const defaultConfig = JSON.parse(fs.readFileSync(DEFAULT_CONFIG_FILE, 'utf-8'));
      return defaultConfig;
    }
  } catch (err) {
    console.warn('加载默认配置文件失败，使用内置默认值:', err.message);
  }
  
  // 内置默认配置
  return {
    storagePath: '',
    scanPaths: [],
    scanTime: '0 2 * * *',
    excludePatterns: ['$Recycle.Bin', 'System Volume Information', '.git', 'node_modules', '__pycache__', '.cache'],
    fileExtensionFilter: {
      whitelist: [
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif',
        '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg',
        '.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.ape', '.alac',
        '.srt', '.ass', '.ssa', '.sub', '.vtt',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.odt'
      ],
      blacklist: [
        '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.cs', '.go', '.rs',
        '.php', '.rb', '.swift', '.kt', '.scala', '.r', '.m', '.mm', '.vue', '.html', '.css',
        '.lnk', '.url', '.desktop', '.alias',
        '.cache', '.tmp', '.temp', '.swp', '.bak', '.old', '.log',
        '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.tgz'
      ]
    },
    outputFile: 'nas_scan.md',
    classifyOutputFile: 'nas_class.md',
    aiConfig: {
      apiKey: '',
      endpoint: 'https://coding.dashscope.aliyuncs.com/v1',
      model: 'qwen3.5-plus'
    },
    categories: ['电影/视频', '音乐/音频', '文档/资料', '软件/安装包', '图片/照片', '项目/代码', '备份/归档', '其他']
  };
}

// 定时任务存储
let scanJob = null;

function scheduleScan(config) {
  // 取消之前的任务
  if (scanJob) {
    scanJob.stop();
    scanJob = null;
  }

  // 创建新任务
  if (config.scanPaths && config.scanPaths.length > 0) {
    scanJob = cron.schedule(config.scanTime, async () => {
      console.log(`[${new Date().toLocaleString()}] 定时扫描开始`);
      await runScan(config);
    }, {
      timezone: 'Asia/Shanghai'
    });
    console.log(`定时扫描已设置：${config.scanTime}`);
  }
}

async function runScan(config) {
  try {
    // 获取存储目录路径
    const storagePath = ensureStorageDir(config);
    
    // 执行扫描
    const scanResult = performScan(
      config.scanPaths,
      config.outputFile,
      config.excludePatterns || [],
      config.fileExtensionFilter || { whitelist: [], blacklist: [] },
      storagePath
    );

    // AI 分类改为手动触发，不再自动执行

    return scanResult;
  } catch (err) {
    console.error('扫描失败:', err.message);
    throw err;
  }
}

// API 路由

// 获取配置
  app.get('/api/config', (req, res) => {
  const config = loadConfig();
  res.json(config);
});

// 保存配置
app.post('/api/config', (req, res) => {
  try {
    const newConfig = { ...loadConfig(), ...req.body };
    saveConfig(newConfig);
    scheduleScan(newConfig);
    res.json({ success: true, message: '配置已保存' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取完整配置（用于初始化表单）
app.get('/api/config/full', (req, res) => {
  const config = loadConfig();
  res.json(config);
});

// 获取存储路径信息
app.get('/api/storage/path', (req, res) => {
  try {
    const config = loadConfig();
    const storagePath = getStoragePath(config);
    const profilesPath = DEFAULT_STORAGE_PATH;
    
    res.json({
      success: true,
      storagePath,
      profilesPath,
      isCustom: config.storagePath && config.storagePath.trim() !== '',
      exists: fs.existsSync(storagePath)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 手动触发扫描
app.post('/api/scan', async (req, res) => {
  try {
    const config = loadConfig();

    if (!config.scanPaths || config.scanPaths.length === 0) {
      return res.status(400).json({ success: false, error: '请先配置扫描路径' });
    }

    const result = await runScan(config);

    res.json({
      success: true,
      message: '扫描完成',
      data: {
        scannedPaths: result.results.map(r => ({ path: r.path, fileCount: r.files?.length || 0 })),
        outputFile: result.outputFile
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取扫描内容
app.get('/api/content/scan', (req, res) => {
  try {
    const config = loadConfig();
    const storagePath = getStoragePath(config);
    const filePath = path.isAbsolute(config.outputFile)
      ? config.outputFile
      : path.join(storagePath, config.outputFile);

    if (!fs.existsSync(filePath)) {
      return res.json({ success: false, content: '', error: '文件不存在，请先执行扫描' });
    }

    storage.init(filePath);
    const content = storage.getMarkdownContent();
    
    res.json({ success: true, content });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取统计数据（用于饼图展示）
app.get('/api/statistics', (req, res) => {
  try {
    const config = loadConfig();
    const storagePath = getStoragePath(config);
    const filePath = path.isAbsolute(config.outputFile)
      ? config.outputFile
      : path.join(storagePath, config.outputFile);

    if (!fs.existsSync(filePath)) {
      return res.json({ success: false, error: '文件不存在，请先执行扫描', stats: null });
    }

    storage.init(filePath);
    const stats = storage.getStatistics();

    const formattedStats = {
      meta: {
        scanTime: stats.meta.scanTime,
        totalFiles: stats.meta.totalFiles,
        totalSize: formatSize(stats.meta.totalSize),
        totalSizeBytes: stats.meta.totalSize
      },
      local: formatCategoryStats(stats.local, stats.meta.totalSize)
    };

    res.json({ success: true, stats: formattedStats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 格式化分类统计数据
function formatCategoryStats(categoryStats, totalSize) {
  const result = [];
  for (const [category, data] of Object.entries(categoryStats)) {
    const percent = totalSize > 0 ? ((data.totalSize / totalSize) * 100).toFixed(1) : 0;
    result.push({
      category,
      count: data.count,
      size: formatSize(data.totalSize),
      sizeBytes: data.totalSize,
      percent: parseFloat(percent)
    });
  }
  result.sort((a, b) => b.sizeBytes - a.sizeBytes);
  return result;
}

// 搜索文件（使用 storage 模块）
app.get('/api/search', (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.json({ success: true, results: [] });
    }

    const config = loadConfig();
    const storagePath = getStoragePath(config);
    const filePath = path.isAbsolute(config.outputFile)
      ? config.outputFile
      : path.join(storagePath, config.outputFile);

    if (!fs.existsSync(filePath)) {
      return res.json({ success: false, results: [], error: '文件不存在' });
    }

    storage.init(filePath);
    const files = storage.searchFiles(q);

    const results = files.slice(0, 100).map(f => `- ${f.path} [${f.localClass}]`);

    res.json({ success: true, results, total: results.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取扫描状态
app.get('/api/status', (req, res) => {
  try {
    const config = loadConfig();
    const storagePath = getStoragePath(config);

    const scanPath = path.isAbsolute(config.outputFile)
      ? config.outputFile
      : path.join(storagePath, config.outputFile);

    const scanFileExists = fs.existsSync(scanPath);

    res.json({
      success: true,
      status: {
        storagePath,
        scanFileExists,
        scanTime: scanFileExists ? fs.statSync(scanPath).mtime.toLocaleString('zh-CN') : null,
        scheduled: scanJob !== null,
        nextScan: scanJob ? '按 cron 计划执行' : '未设置'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`\n🚀 NAS Indexer v2.0.0 服务已启动`);
  console.log(`📍 访问地址：http://localhost:${PORT}`);
  console.log(`📁 默认存储目录：${DEFAULT_STORAGE_PATH}\n`);

  const config = loadConfig();
  const storagePath = getStoragePath(config);
  console.log(`📂 当前存储目录：${storagePath}`);
  
  scheduleScan(config);
});

module.exports = { app, server };