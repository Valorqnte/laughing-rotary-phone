// 基础依赖
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

// MySQL连接（生产部署时用环境变量注入，避免把密码写进代码）
const db = mysql.createConnection({
  host: '127.0.0.1',
  port:  '3306',
  user: 'bookapp',
  password: 'lalala123',
  database: 'book'
});


const Minio = require('minio');
const multer = require('multer');
const bcrypt = require('bcrypt');


const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

const upload = multer({ storage: multer.memoryStorage() });


const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || '127.0.0.1',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: String(process.env.MINIO_USE_SSL || 'false').toLowerCase() === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123'
});

const MINIO_BUCKET = process.env.MINIO_BUCKET || 'book-files';
const MINIO_AUTO_CREATE_BUCKET = String(process.env.MINIO_AUTO_CREATE_BUCKET || 'false').toLowerCase() === 'true';


minioClient.bucketExists(MINIO_BUCKET, (err) => {
  if (err) {
    // 只有显式开启时才尝试创建 bucket，避免线上因为权限不足导致启动失败/循环报错
    if (MINIO_AUTO_CREATE_BUCKET && err.code === 'NoSuchBucket') {
      minioClient.makeBucket(MINIO_BUCKET, 'us-east-1', (mkErr) => {
        if (mkErr) {
          console.error('创建 MinIO bucket 失败:', mkErr);
        } else {
          console.log('已创建 MinIO bucket:', MINIO_BUCKET);
        }
      });
    } else {
      console.error('检查 MinIO bucket 失败:', err);
    }
  } else {
    console.log('MinIO bucket 已存在:', MINIO_BUCKET);
  }
});

const app = express();

// CORS：开发阶段可放开；生产建议设置 CORS_ORIGIN（例如 https://yourdomain.com）
const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors({
    origin: corsOrigin
      ? corsOrigin.split(',').map((s) => s.trim()).filter(Boolean)
      : true,
    credentials: true
  })
);
app.use(bodyParser.json());

db.connect(err => {
  if (err) {
    console.error('数据库连接失败:', err);
  } else {
    console.log('数据库连接成功');
  }
});

// 用户注册
app.post('/register', async (req, res) => {
  //接收前端传来的两个字段username，password
  const { username, password } = req.body;
  try {
    const [existing] = await db.promise().query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) return res.status(400).json({ error: '用户名已存在' });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    await db.promise().query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashed, 'user']);
    res.json({ success: true });
  } catch (err) {
    console.error('注册失败', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 用户登录
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.promise().query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(401).json({ error: '用户名或密码错误' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: '用户名或密码错误' });

    // never return password hash
    delete user.password;
    res.json({ success: true, user });
  } catch (err) {
    console.error('登录失败', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取所有图书
app.get('/books', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''

  let sql = `
    SELECT b.*, br.user_id AS borrowed_by, br.id AS active_borrow_id
    FROM books b
    LEFT JOIN borrow br ON br.book_id = b.id AND br.status = 'borrowed'
  `
  const params = []

  if (q) {
    sql += ` WHERE (LOWER(b.title) LIKE ? OR LOWER(b.author) LIKE ?)`
    const like = `%${q.toLowerCase()}%`
    params.push(like, like)
  }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err })
    res.json(results)
  })
});

// 新增图书
app.post('/books', (req, res) => {
  const { title, author, publish_date, status, quantity } = req.body;
  const qty = Number.isInteger(quantity) && quantity >= 0 ? quantity : 0;
  db.query('INSERT INTO books (title, author, publish_date, status, quantity) VALUES (?, ?, ?, ?, ?)', [title, author, publish_date, status || 'available', qty], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
  });
});

// 为指定图书上传文件（封面、PDF 等）
app.post('/books/:id/file', upload.single('file'), (req, res) => {
  const bookId = req.params.id;

  if (!req.file) {
    return res.status(400).json({ error: '未上传文件' });
  }

  // 先确认图书存在
  db.query('SELECT id FROM books WHERE id = ?', [bookId], (checkErr, checkResults) => {
    if (checkErr) return res.status(500).json({ error: checkErr });
    if (checkResults.length === 0) return res.status(404).json({ error: '图书不存在' });

    const file = req.file;
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const objectName = `books/${bookId}/${Date.now()}-${safeName}`;

    minioClient.putObject(
      MINIO_BUCKET,
      objectName,
      file.buffer,
      file.size,
      { 'Content-Type': file.mimetype },
      (err, etag) => {
        if (err) {
          console.error('上传到 MinIO 失败:', err);
          return res.status(500).json({ error: '文件上传失败' });
        }

        // 把文件键保存到 books 表
        db.query(
          'UPDATE books SET file_key = ? WHERE id = ?',
          [objectName, bookId],
          (dbErr) => {
            if (dbErr) {
              console.error('保存文件信息到数据库失败:', dbErr);
              return res.status(500).json({ error: '保存文件信息失败' });
            }

            res.json({ success: true, file_key: objectName, etag });
          }
        );
      }
    );
  });
});

// 下载指定图书的文件
app.get('/books/:id/file', (req, res) => {
  const bookId = req.params.id;

  db.query('SELECT file_key FROM books WHERE id = ?', [bookId], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) return res.status(404).json({ error: '图书不存在' });

    const fileKey = results[0].file_key;
    if (!fileKey) return res.status(404).json({ error: '该图书尚未上传文件' });

    // 可选：先查一下对象信息，拿到 Content-Type
    minioClient.statObject(MINIO_BUCKET, fileKey, (statErr, stat) => {
      if (!statErr && stat && stat.metaData && stat.metaData['content-type']) {
        res.setHeader('Content-Type', stat.metaData['content-type']);
      }

      minioClient.getObject(MINIO_BUCKET, fileKey, (getErr, dataStream) => {
        if (getErr) {
          console.error('从 MinIO 获取文件失败:', getErr);
          return res.status(500).json({ error: '读取文件失败' });
        }

        dataStream.on('error', (streamErr) => {
          console.error('文件流错误:', streamErr);
          if (!res.headersSent) {
            res.status(500).json({ error: '文件传输错误' });
          }
        });

        dataStream.pipe(res);
      });
    });
  });
});

// 编辑图书
app.put('/books/:id', (req, res) => {
  const { title, author, publish_date, status, quantity } = req.body;
  if (!Number.isInteger(quantity) || quantity < 0) return res.status(400).json({ error: 'quantity must be a non-negative integer' });
  db.query('UPDATE books SET title=?, author=?, publish_date=?, status=?, quantity=? WHERE id=?', [title, author, publish_date, status, quantity, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
  });
});

// 删除图书
app.delete('/books/:id', (req, res) => {
  const bookId = req.params.id

  const activeBorrowSql = 'SELECT id FROM borrow WHERE book_id = ? AND status = ?'
  db.query(activeBorrowSql, [bookId, 'borrowed'], (activeErr, activeResults) => {
    if (activeErr) return res.status(500).json({ error: activeErr })
    if (activeResults.length > 0) {
      return res.status(400).json({ error: '书籍仍被借出，无法删除' })
    }

    const deleteBorrowSql = 'DELETE FROM borrow WHERE book_id = ?'
    db.query(deleteBorrowSql, [bookId], (borrowErr) => {
      if (borrowErr) return res.status(500).json({ error: borrowErr })

      db.query('DELETE FROM books WHERE id=?', [bookId], (err) => {
        if (err) return res.status(500).json({ error: err })
        res.json({ success: true })
      })
    })
  })
})

// 获取所有用户
app.get('/users', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const role = typeof req.query.role === 'string' ? req.query.role.trim() : ''

  let sql = 'SELECT id, username, role FROM users'
  const where = []
  const params = []

  if (q) {
    where.push('LOWER(username) LIKE ?')
    params.push(`%${q.toLowerCase()}%`)
  }
  if (role) {
    where.push('role = ?')
    params.push(role)
  }
  if (where.length) {
    sql += ' WHERE ' + where.join(' AND ')
  }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err })
    res.json(results)
  })
});

// 新增用户
app.post('/users', async (req, res) => {
  const { username, role } = req.body;
  try {
    const hashed = await bcrypt.hash('123456', SALT_ROUNDS);
    await db.promise().query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashed, role]);
    res.json({ success: true });
  } catch (err) {
    console.error('创建用户失败', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 编辑用户
app.put('/users/:id', (req, res) => {
  const { username, role } = req.body;
  db.query('UPDATE users SET username=?, role=? WHERE id=?', [username, role, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
  });
});

// 删除用户
app.delete('/users/:id', (req, res) => {
  db.query('DELETE FROM users WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
  });
});

// 借阅记录
app.get('/borrow', (req, res) => {
  const sql = `
    SELECT b.id, b.book_id, b.user_id, books.title AS book_title, books.author AS book_author,
           users.username, b.borrow_date, b.return_date, b.status
    FROM borrow b
    JOIN books ON b.book_id = books.id
    JOIN users ON b.user_id = users.id
  `
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err })
    res.json(results)
  })
});

// 借书
app.post('/borrow', (req, res) => {
  const { book_id, user_id } = req.body;
  db.query('INSERT INTO borrow (book_id, user_id, borrow_date, status) VALUES (?, ?, NOW(), ?)', [book_id, user_id, 'borrowed'], (err) => {
    if (err) return res.status(500).json({ error: err });
    db.query('UPDATE books SET status=? WHERE id=?', ['borrowed', book_id]);
    res.json({ success: true });
  });
});

// 还书
app.put('/borrow/:id/return', (req, res) => {
  db.query('UPDATE borrow SET return_date=NOW(), status=? WHERE id=?', ['returned', req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err });
    // 同步更新图书状态为 available
    db.query('SELECT book_id FROM borrow WHERE id=?', [req.params.id], (err2, results) => {
      if (!err2 && results.length > 0) {
        db.query('UPDATE books SET status=? WHERE id=?', ['available', results[0].book_id]);
      }
    });
    res.json({ success: true });
  });
});


app.put('/users/:id/password', async (req, res) => {
    const { password } = req.body;
    if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    try {
        const hashed = await bcrypt.hash(password, SALT_ROUNDS);
        const [result] = await db.promise().query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true });
    } catch (err) {
        console.error('更新密码失败', err);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 用户借阅的图书
app.get('/users/:id/borrowed', (req, res) => {
  const sql = `
    SELECT b.id AS borrow_id, books.id AS book_id, books.title, books.author,
           b.borrow_date, b.status
    FROM borrow b
    JOIN books ON b.book_id = books.id
    WHERE b.user_id = ? AND b.status = 'borrowed'
  `
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err })
    res.json(results)
  })
})

// 仪表盘统计
app.get('/stats', (req, res) => {
  db.query('SELECT (SELECT COUNT(*) FROM books) as books, (SELECT COUNT(*) FROM users) as users, (SELECT COUNT(*) FROM books WHERE status="borrowed") as borrowed, (SELECT COUNT(*) FROM books WHERE status="available") as inLibrary', (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results[0]);
  });
});


app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(parseInt(process.env.PORT || '3000', 10), () => {
  console.log(`Node服务已启动：http://localhost:${process.env.PORT || 3000}`);
});
