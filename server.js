const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const multer = require('multer');

const app = express();
const USERS_FILE = path.join(__dirname, 'users.json');
const CARDKEYS_FILE = path.join(__dirname, 'cardkeys.json');

// 创建上传目录
const imageDir = path.join(__dirname, 'public/uploads/images');
const videoDir = path.join(__dirname, 'public/uploads/videos');
fs.mkdirSync(imageDir, { recursive: true });
fs.mkdirSync(videoDir, { recursive: true });

// 配置图片上传
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, imageDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const uploadImage = multer({ storage: imageStorage });

// 配置视频上传
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, videoDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const uploadVideo = multer({ storage: videoStorage });

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // 静态文件服务

// session 认证
app.use(session({
  secret: 'your-secret-key', // 建议修改为更复杂的密钥
  resave: false,
  saveUninitialized: true
}));

// 认证中间件
function requireLogin(req, res, next) {
  if (req.session && req.session.loggedIn) {
    next();
  } else {
    res.status(401).json({ error: '未登录或登录已过期' });
  }
}

// 管理员登录
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  // 简单的账号密码，建议后续改为数据库存储
  if (username === 'admin' && password === 'admin123') {
    req.session.loggedIn = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: '用户名或密码错误' });
  }
});

// 管理员退出
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// 用户数据操作
function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')).users || [];
}
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify({ users }, null, 2));
}

// 用户接口
app.get('/api/users', (req, res) => {
  res.json(readUsers());
});
app.get('/api/users/:number', (req, res) => {
  const user = readUsers().find(u => u.number === req.params.number);
  user ? res.json(user) : res.status(404).send('未找到用户');
});
app.post('/api/users', requireLogin, (req, res) => {
  const users = readUsers();
  users.push(req.body);
  writeUsers(users);
  res.status(201).json(req.body);
});
app.put('/api/users/:number', requireLogin, (req, res) => {
  let users = readUsers();
  const idx = users.findIndex(u => u.number === req.params.number);
  if (idx === -1) return res.status(404).send('未找到用户');
  users[idx] = req.body;
  writeUsers(users);
  res.json(req.body);
});
app.delete('/api/users/:number', requireLogin, (req, res) => {
  let users = readUsers();
  users = users.filter(u => u.number !== req.params.number);
  writeUsers(users);
  res.status(204).send();
});

// 图片上传接口
app.post('/api/upload/image', requireLogin, uploadImage.single('file'), (req, res) => {
  res.json({ url: '/uploads/images/' + req.file.filename });
});

// 视频上传接口
app.post('/api/upload/video', requireLogin, uploadVideo.single('file'), (req, res) => {
  res.json({ url: '/uploads/videos/' + req.file.filename });
});

// 卡密管理
function readCardKeys() {
  if (!fs.existsSync(CARDKEYS_FILE)) return [];
  return JSON.parse(fs.readFileSync(CARDKEYS_FILE, 'utf8')).cardkeys || [];
}
function writeCardKeys(cardkeys) {
  fs.writeFileSync(CARDKEYS_FILE, JSON.stringify({ cardkeys }, null, 2));
}
function generateCardKey() {
  return Math.random().toString(36).substr(2, 10).toUpperCase();
}
app.get('/api/cardkeys', requireLogin, (req, res) => {
  res.json(readCardKeys());
});
app.post('/api/cardkeys', requireLogin, (req, res) => {
  const { count = 1, validity = 'permanent' } = req.body;
  const cardkeys = readCardKeys();
  const now = Date.now();
  const newKeys = [];
  for (let i = 0; i < count; i++) {
    const key = generateCardKey();
    cardkeys.push({ key, validity, createdAt: now });
    newKeys.push({ key, validity, createdAt: now });
  }
  writeCardKeys(cardkeys);
  res.json(newKeys);
});

// 访问 /admin 自动跳转到后台页面
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 启动服务
const PORT = 3000;
app.listen(PORT, () => console.log(`服务器已启动，访问 http://localhost:${PORT}/admin 进行后台管理`));