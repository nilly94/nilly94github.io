const fs = require('fs');

// 读取 user_data.json 文件
fs.readFile('user_data.json', 'utf8', (err, data) => {
  if (err) {
    console.error('无法读取文件:', err);
    return;
  }
  const users = JSON.parse(data).users;
  console.log('用户数据:', users);
  // 在此处添加代码以在后端管理系统中展示用户数据
});