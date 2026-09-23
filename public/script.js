const API_BASE = '/api/books';

const form = document.getElementById('book-form');
const bookIdField = document.getElementById('book-id');
const titleField = document.getElementById('title');
const authorField = document.getElementById('author');
const isbnField = document.getElementById('isbn');
const genreField = document.getElementById('genre');
const quantityField = document.getElementById('quantity');

const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit');
const formErrors = document.getElementById('form-errors');

const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const clearSearchBtn = document.getElementById('clear-search');

const tbody = document.getElementById('books-tbody');
const emptyState = document.getElementById('empty-state');
const statusMsg = document.getElementById('status-msg');

let editingId = null;

// ---------- Helpers ----------
function showStatus(message, type = 'success') {
  statusMsg.textContent = message;
  statusMsg.className = `status-msg ${type}`;
  statusMsg.classList.remove('hidden');
  setTimeout(() => statusMsg.classList.add('hidden'), 3000);
}

function showFormErrors(errors) {
  formErrors.innerHTML = errors.map(e => `• ${escapeHtml(e)}`).join('<br>');
  formErrors.classList.remove('hidden');
}

function clearFormErrors() {
  formErrors.classList.add('hidden');
  formErrors.innerHTML = '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function resetForm() {
  form.reset();
  bookIdField.value = '';
  quantityField.value = 1;
  editingId = null;
  formTitle.textContent = 'Add New Book';
  submitBtn.textContent = 'Add Book';
  cancelEditBtn.classList.add('hidden');
  clearFormErrors();
}

// ---------- Rendering ----------
function renderBooks(books) {
  tbody.innerHTML = '';
  if (!books || books.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  for (const book of books) {
    const tr = document.createElement('tr');
    const availClass = book.available > 0 ? 'available' : 'unavailable';
    const availLabel = `${book.available} / ${book.quantity}`;

    tr.innerHTML = `
      <td>${escapeHtml(book.title)}</td>
      <td>${escapeHtml(book.author)}</td>
      <td>${escapeHtml(book.isbn)}</td>
      <td>${escapeHtml(book.genre || '—')}</td>
      <td><span class="badge ${availClass}">${availLabel}</span></td>
      <td>
        <div class="row-actions">
          <button class="btn btn-outline btn-small" data-action="issue" data-id="${book.id}" ${book.available <= 0 ? 'disabled' : ''}>Issue</button>
          <button class="btn btn-outline btn-small" data-action="return" data-id="${book.id}" ${book.available >= book.quantity ? 'disabled' : ''}>Return</button>
          <button class="btn btn-secondary btn-small" data-action="edit" data-id="${book.id}">Edit</button>
          <button class="btn btn-danger btn-small" data-action="delete" data-id="${book.id}">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

// ---------- API calls ----------
async function fetchBooks(query = '') {
  try {
    const url = query ? `${API_BASE}?q=${encodeURIComponent(query)}` : API_BASE;
    const res = await fetch(url);
    const json = await res.json();
    if (json.success) {
      renderBooks(json.data);
    } else {
      showStatus(json.error || 'Failed to load books.', 'error');
    }
  } catch (err) {
    showStatus('Network error while loading books.', 'error');
  }
}

async function createBook(payload) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function updateBook(id, payload) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function deleteBook(id) {
  const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  return res.json();
}

async function issueBook(id) {
  const res = await fetch(`${API_BASE}/${id}/issue`, { method: 'POST' });
  return res.json();
}

async function returnBook(id) {
  const res = await fetch(`${API_BASE}/${id}/return`, { method: 'POST' });
  return res.json();
}

// ---------- Event handlers ----------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFormErrors();

  const payload = {
    title: titleField.value.trim(),
    author: authorField.value.trim(),
    isbn: isbnField.value.trim(),
    genre: genreField.value.trim(),
    quantity: Number(quantityField.value)
  };

  let result;
  if (editingId) {
    result = await updateBook(editingId, payload);
  } else {
    result = await createBook(payload);
  }

  if (result.success) {
    showStatus(editingId ? 'Book updated successfully.' : 'Book added successfully.', 'success');
    resetForm();
    fetchBooks(searchInput.value.trim());
  } else {
    showFormErrors(result.errors || [result.error || 'Something went wrong.']);
  }
});

cancelEditBtn.addEventListener('click', resetForm);

searchBtn.addEventListener('click', () => {
  const q = searchInput.value.trim();
  fetchBooks(q);
  clearSearchBtn.classList.toggle('hidden', q.length === 0);
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    searchBtn.click();
  }
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  clearSearchBtn.classList.add('hidden');
  fetchBooks();
});

tbody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === 'delete') {
    if (!confirm('Delete this book? This cannot be undone.')) return;
    const result = await deleteBook(id);
    if (result.success) {
      showStatus('Book deleted.', 'success');
      fetchBooks(searchInput.value.trim());
    } else {
      showStatus(result.error || 'Failed to delete book.', 'error');
    }
  }

  if (action === 'edit') {
    const res = await fetch(`${API_BASE}/${id}`);
    const json = await res.json();
    if (json.success) {
      const b = json.data;
      editingId = b.id;
      bookIdField.value = b.id;
      titleField.value = b.title;
      authorField.value = b.author;
      isbnField.value = b.isbn;
      genreField.value = b.genre || '';
      quantityField.value = b.quantity;
      formTitle.textContent = 'Edit Book';
      submitBtn.textContent = 'Save Changes';
      cancelEditBtn.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  if (action === 'issue') {
    const result = await issueBook(id);
    if (result.success) {
      showStatus('Book issued.', 'success');
      fetchBooks(searchInput.value.trim());
    } else {
      showStatus(result.error || 'Failed to issue book.', 'error');
    }
  }

  if (action === 'return') {
    const result = await returnBook(id);
    if (result.success) {
      showStatus('Book returned.', 'success');
      fetchBooks(searchInput.value.trim());
    } else {
      showStatus(result.error || 'Failed to return book.', 'error');
    }
  }
});

// ---------- Init ----------
fetchBooks();
