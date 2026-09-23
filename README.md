# Library Management System

A full-stack Library Management System built as a practical virtual internship project, using Node.js, Express, and SQLite on the backend and a responsive HTML/CSS/JS frontend.

## Features

- **Responsive interface** — clean, mobile-friendly UI that adapts to any screen size
- **Database integration** — persistent storage using SQLite (via `better-sqlite3`)
- **CRUD operations** — create, read, update, and delete books
- **Search and validation** — live search across title/author/ISBN/genre, with server-side input validation (required fields, ISBN format, duplicate ISBN checks, non-negative quantity)
- **Bonus**: Issue / Return workflow to track available copies of each book

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: SQLite (better-sqlite3)
- **Frontend**: Vanilla HTML, CSS, JavaScript (no framework dependency, fast to run)

## Project Structure

```
library-management-system/
├── server.js          # Express app & REST API routes
├── database.js         # SQLite connection, schema, and seed data
├── package.json
├── public/
│   ├── index.html      # Main UI
│   ├── style.css        # Responsive styling
│   └── script.js        # Frontend logic (fetch calls, rendering, events)
└── README.md
```

## Setup & Run

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the server**
   ```bash
   npm start
   ```

3. **Open in browser**
   ```
   http://localhost:3000
   ```

The SQLite database file (`library.db`) is created automatically on first run, with a few sample books pre-seeded.

## API Endpoints

| Method | Endpoint                | Description                       |
|--------|--------------------------|------------------------------------|
| GET    | `/api/books`             | Get all books (supports `?q=` search) |
| GET    | `/api/books/:id`         | Get a single book                  |
| POST   | `/api/books`              | Create a new book                  |
| PUT    | `/api/books/:id`          | Update an existing book            |
| DELETE | `/api/books/:id`          | Delete a book                      |
| POST   | `/api/books/:id/issue`    | Issue one copy (decrement available) |
| POST   | `/api/books/:id/return`   | Return one copy (increment available) |

## Validation Rules

- Title and Author are required
- ISBN is required, must be 10–17 characters (digits/hyphens), and must be unique
- Quantity must be a non-negative whole number
- Duplicate ISBNs are rejected with a clear error message

## Expected Outcome

A complete, working library management system with documented workflow (this README), tested CRUD + search + validation functionality, and a project ready for submission.

## Notes for Submission

- Push this project to your own GitHub repository.
- Take screenshots of the running app (add/search/edit/delete) for your submission if required.
- Feel free to customize the styling, add authentication, or extend it (e.g. member management, due dates, fines) to make it more distinctly your own.
