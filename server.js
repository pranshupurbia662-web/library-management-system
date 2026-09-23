const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Validation helper ----------
function validateBook(data, isUpdate = false) {
  const errors = [];
  const { title, author, isbn, quantity } = data;

  if (!isUpdate || title !== undefined) {
    if (!title || typeof title !== 'string' || title.trim().length < 1) {
      errors.push('Title is required.');
    } else if (title.trim().length > 200) {
      errors.push('Title must be under 200 characters.');
    }
  }

  if (!isUpdate || author !== undefined) {
    if (!author || typeof author !== 'string' || author.trim().length < 1) {
      errors.push('Author is required.');
    }
  }

  if (!isUpdate || isbn !== undefined) {
    if (!isbn || typeof isbn !== 'string' || !/^[0-9Xx-]{10,17}$/.test(isbn.trim())) {
      errors.push('A valid ISBN (10–17 digits, may include hyphens) is required.');
    }
  }

  if (quantity !== undefined) {
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 0) {
      errors.push('Quantity must be a non-negative whole number.');
    }
  }

  return errors;
}

// ---------- Routes ----------

// GET all books, with optional search (?q=) across title/author/isbn/genre
app.get('/api/books', (req, res) => {
  try {
    const { q } = req.query;
    let rows;
    if (q && q.trim().length > 0) {
      const term = `%${q.trim()}%`;
      rows = db.prepare(`
        SELECT * FROM books
        WHERE title LIKE ? OR author LIKE ? OR isbn LIKE ? OR genre LIKE ?
        ORDER BY updated_at DESC
      `).all(term, term, term, term);
    } else {
      rows = db.prepare('SELECT * FROM books ORDER BY updated_at DESC').all();
    }
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch books.' });
  }
});

// GET single book by id
app.get('/api/books/:id', (req, res) => {
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
    if (!book) return res.status(404).json({ success: false, error: 'Book not found.' });
    res.json({ success: true, data: book });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch book.' });
  }
});

// POST create a new book
app.post('/api/books', (req, res) => {
  const errors = validateBook(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }
  try {
    const { title, author, isbn, genre, quantity } = req.body;
    const qty = quantity !== undefined ? Number(quantity) : 1;
    const stmt = db.prepare(`
      INSERT INTO books (title, author, isbn, genre, quantity, available)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(title.trim(), author.trim(), isbn.trim(), (genre || '').trim(), qty, qty);
    const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: newBook });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ success: false, errors: ['A book with this ISBN already exists.'] });
    }
    res.status(500).json({ success: false, error: 'Failed to create book.' });
  }
});

// PUT update an existing book
app.put('/api/books/:id', (req, res) => {
  const errors = validateBook(req.body, true);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }
  try {
    const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Book not found.' });

    const title = req.body.title !== undefined ? req.body.title.trim() : existing.title;
    const author = req.body.author !== undefined ? req.body.author.trim() : existing.author;
    const isbn = req.body.isbn !== undefined ? req.body.isbn.trim() : existing.isbn;
    const genre = req.body.genre !== undefined ? req.body.genre.trim() : existing.genre;
    const quantity = req.body.quantity !== undefined ? Number(req.body.quantity) : existing.quantity;
    const available = req.body.available !== undefined ? Number(req.body.available) : Math.min(existing.available, quantity);

    db.prepare(`
      UPDATE books
      SET title = ?, author = ?, isbn = ?, genre = ?, quantity = ?, available = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, author, isbn, genre, quantity, available, req.params.id);

    const updated = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ success: false, errors: ['A book with this ISBN already exists.'] });
    }
    res.status(500).json({ success: false, error: 'Failed to update book.' });
  }
});

// DELETE a book
app.delete('/api/books/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Book not found.' });
    db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Book deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete book.' });
  }
});

// POST issue/return a copy (simple availability toggle used by the UI)
app.post('/api/books/:id/issue', (req, res) => {
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
    if (!book) return res.status(404).json({ success: false, error: 'Book not found.' });
    if (book.available <= 0) return res.status(400).json({ success: false, error: 'No copies available.' });
    db.prepare('UPDATE books SET available = available - 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
    res.json({ success: true, data: db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to issue book.' });
  }
});

app.post('/api/books/:id/return', (req, res) => {
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
    if (!book) return res.status(404).json({ success: false, error: 'Book not found.' });
    if (book.available >= book.quantity) return res.status(400).json({ success: false, error: 'All copies already returned.' });
    db.prepare('UPDATE books SET available = available + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
    res.json({ success: true, data: db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to return book.' });
  }
});

app.listen(PORT, () => {
  console.log(`Library Management System running at http://localhost:${PORT}`);
});
