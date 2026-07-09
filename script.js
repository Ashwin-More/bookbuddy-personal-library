// script.js

// Data storage
let books = [];
let yearlyGoal = 20;
let currentYear = new Date().getFullYear();
let activeUser = null;

function booksKey() {
  return `bookshelf_books_${activeUser.id}`;
}
function goalKey() {
  return `bookshelf_goal_${activeUser.id}`;
}

// Load data from localStorage
function loadData() {
  activeUser = requireAuth();
  if (!activeUser) return; // requireAuth already redirected to login.html

  document.getElementById("currentUsername").textContent = activeUser.username;

  const savedBooks = localStorage.getItem(booksKey());
  books = savedBooks ? JSON.parse(savedBooks) : [];

  const savedGoal = localStorage.getItem(goalKey());
  yearlyGoal = savedGoal ? parseInt(savedGoal) : 20;

  loadTheme();
  renderAll();
}

// Save data to localStorage
function saveData() {
  if (!activeUser) return;
  localStorage.setItem(booksKey(), JSON.stringify(books));
  localStorage.setItem(goalKey(), yearlyGoal);
}

// Generate unique ID
function generateId() {
  return "book-" + Date.now();
}

// ===================== Theme (Dark / Light) =====================
function loadTheme() {
  const savedTheme = localStorage.getItem("bookshelf_theme") || "dark";
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  const body = document.body;
  const icon = document.getElementById("themeToggleIcon");
  if (theme === "light") {
    body.classList.remove("dark-mode");
    body.classList.add("light-mode");
    if (icon) {
      icon.classList.remove("bi-sun-fill");
      icon.classList.add("bi-moon-stars-fill");
    }
  } else {
    body.classList.remove("light-mode");
    body.classList.add("dark-mode");
    if (icon) {
      icon.classList.remove("bi-moon-stars-fill");
      icon.classList.add("bi-sun-fill");
    }
  }
}

function toggleTheme() {
  const isLight = document.body.classList.contains("light-mode");
  const newTheme = isLight ? "dark" : "light";
  localStorage.setItem("bookshelf_theme", newTheme);
  applyTheme(newTheme);
}

// Render all sections
function renderAll() {
  renderBooks();
  renderDashboard();
  renderGoals();
  renderBorrowedLent();
}

// Show specific section
function showSection(section) {
  document.querySelectorAll(".section").forEach((sec) => {
    sec.classList.add("d-none");
  });

  document.getElementById(section + "-section").classList.remove("d-none");

  // Update active nav
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active");
    if (link.id === "nav-" + section) {
      link.classList.add("active");
    }
  });

  if (section === "library") renderBooks();
  if (section === "dashboard") renderDashboard();
  if (section === "goals") renderGoals();
  if (section === "borrowed") renderBorrowedLent();
}

// Render books grid
function renderBooks(filteredBooks = books) {
  const container = document.getElementById("booksGrid");
  container.innerHTML = "";

  if (filteredBooks.length === 0) {
    container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-book display-1 text-muted"></i>
                <p class="text-muted mt-3">No books found. Add some to get started!</p>
            </div>`;
    return;
  }

  filteredBooks.forEach((book) => {
    const card = document.createElement("div");
    card.className = "col-md-4 col-lg-3";
    card.innerHTML = `
            <div class="card book-card h-100">
                <div class="card-body">
                    <h5 class="card-title">${escapeHtml(book.title)}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">${escapeHtml(book.author)}</h6>
                    <p class="card-text">
                        <span class="badge bg-${getStatusColor(book.status)}">${book.status}</span><br>
                        <small class="text-muted">${book.genre}</small>
                    </p>
                    ${book.person ? `<p class="mb-1"><small><strong>${book.ownership}:</strong> ${escapeHtml(book.person)}</small></p>` : ""}
                    ${book.notes ? `<p class="card-text small text-muted">${escapeHtml(book.notes.substring(0, 80))}${book.notes.length > 80 ? "..." : ""}</p>` : ""}
                </div>
                <div class="card-footer d-flex justify-content-between bg-transparent border-0">
                    <button class="btn btn-sm btn-outline-primary" onclick="editBook('${book.id}')">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteBook('${book.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
    container.appendChild(card);
  });
}

// Helper to prevent XSS
function escapeHtml(unsafe) {
  return unsafe
    ? unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    : "";
}

// Get color for status badge
function getStatusColor(status) {
  if (status === "Completed") return "success";
  if (status === "Currently Reading") return "primary";
  return "secondary";
}

// Filter books
let currentFilter = "all";

function filterByStatus(status) {
  currentFilter = status;
  filterBooks();
}

function filterBooks() {
  const searchTerm = document
    .getElementById("searchInput")
    .value.toLowerCase()
    .trim();

  let filtered = books;

  // Status filter
  if (currentFilter !== "all") {
    filtered = filtered.filter((book) => book.status === currentFilter);
  }

  // Search filter
  if (searchTerm) {
    filtered = filtered.filter(
      (book) =>
        (book.title && book.title.toLowerCase().includes(searchTerm)) ||
        (book.author && book.author.toLowerCase().includes(searchTerm)) ||
        (book.genre && book.genre.toLowerCase().includes(searchTerm)),
    );
  }

  // Sort
  const sortBy = document.getElementById("sortSelect").value;
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "title") {
      return (a.title || "").localeCompare(b.title || "");
    }
    if (sortBy === "author") {
      return (a.author || "").localeCompare(b.author || "");
    }
    if (sortBy === "date") {
      return new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0);
    }
    if (sortBy === "status") {
      return (a.status || "").localeCompare(b.status || "");
    }
    return 0;
  });

  renderBooks(filtered);
}

// Save or update book
function saveBook() {
  const id = document.getElementById("bookId").value;
  const title = document.getElementById("bookTitle").value.trim();
  const author = document.getElementById("bookAuthor").value.trim();
  const genre = document.getElementById("bookGenre").value;
  const status = document.getElementById("bookStatus").value;
  const ownership = document.getElementById("bookOwnership").value;
  const person = document.getElementById("bookPerson").value.trim();
  const notes = document.getElementById("bookNotes").value.trim();

  if (!title || !author) {
    alert("Title and Author are required!");
    return;
  }

  if (id) {
    // Edit existing book
    const book = books.find((b) => b.id === id);
    if (book) {
      book.title = title;
      book.author = author;
      book.genre = genre;
      book.status = status;
      book.ownership = ownership;
      book.person = person || null;
      book.notes = notes;
    }
  } else {
    // Add new book
    const newBook = {
      id: generateId(),
      title,
      author,
      genre,
      status,
      ownership,
      person: person || null,
      notes,
      dateAdded: new Date().toISOString(),
    };
    books.push(newBook);
  }

  saveData();
  renderAll();

  // Close modal
  const modal = bootstrap.Modal.getInstance(
    document.getElementById("bookModal"),
  );
  if (modal) modal.hide();
}

// Edit book
function editBook(id) {
  const book = books.find((b) => b.id === id);
  if (!book) return;

  document.getElementById("bookId").value = book.id;
  document.getElementById("bookTitle").value = book.title || "";
  document.getElementById("bookAuthor").value = book.author || "";
  document.getElementById("bookGenre").value = book.genre || "Fiction";
  document.getElementById("bookStatus").value = book.status || "To Read";
  document.getElementById("bookOwnership").value = book.ownership || "Owned";
  document.getElementById("bookPerson").value = book.person || "";
  document.getElementById("bookNotes").value = book.notes || "";

  document.getElementById("modalTitle").textContent = "Edit Book";

  const modal = new bootstrap.Modal(document.getElementById("bookModal"));
  modal.show();
}

// Delete book
let bookToDelete = null;

function deleteBook(id) {
  bookToDelete = id;
  const modal = new bootstrap.Modal(document.getElementById("deleteModal"));
  modal.show();
}

// Confirm delete listener
document.getElementById("confirmDelete").addEventListener("click", () => {
  if (bookToDelete) {
    books = books.filter((b) => b.id !== bookToDelete);
    saveData();
    renderAll();
    bookToDelete = null;
  }
  const modal = bootstrap.Modal.getInstance(
    document.getElementById("deleteModal"),
  );
  if (modal) modal.hide();
});

// Reset form for new book
function resetBookForm() {
  document.getElementById("bookForm").reset();
  document.getElementById("bookId").value = "";
  document.getElementById("modalTitle").textContent = "Add New Book";
}

// Dashboard rendering
function renderDashboard() {
  const completed = books.filter((b) => b.status === "Completed").length;
  const reading = books.filter((b) => b.status === "Currently Reading").length;
  const total = books.length;

  document.getElementById("booksReadCount").textContent = completed;
  document.getElementById("currentReadingCount").textContent = reading;
  document.getElementById("totalBooksCount").textContent = total;

  // Goal progress
  const progress =
    yearlyGoal > 0
      ? Math.min(Math.round((completed / yearlyGoal) * 100), 100)
      : 0;
  const progressBar = document.getElementById("goalProgressBar");
  progressBar.style.width = `${progress}%`;
  progressBar.textContent = `${progress}%`;
  document.getElementById("goalProgressText").textContent =
    `${completed} / ${yearlyGoal} books`;
  document.getElementById("goalYear").textContent = currentYear;

  // Recent activity (last 5)
  const recent = [...books]
    .sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0))
    .slice(0, 5);

  const activityContainer = document.getElementById("recentActivity");
  activityContainer.innerHTML = "";

  if (recent.length === 0) {
    activityContainer.innerHTML =
      '<p class="text-muted">No activity yet. Add some books!</p>';
    return;
  }

  const ul = document.createElement("ul");
  ul.className = "list-group list-group-flush";

  recent.forEach((book) => {
    const li = document.createElement("li");
    li.className =
      "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `
            <div>
                <strong>${escapeHtml(book.title)}</strong><br>
                <small class="text-muted">${escapeHtml(book.author)} • ${book.status}</small>
            </div>
            <span class="badge bg-${getStatusColor(book.status)}">${book.status}</span>
        `;
    ul.appendChild(li);
  });

  activityContainer.appendChild(ul);
}

// Goals section
function renderGoals() {
  const completed = books.filter((b) => b.status === "Completed").length;
  const progress =
    yearlyGoal > 0
      ? Math.min(Math.round((completed / yearlyGoal) * 100), 100)
      : 0;

  const container = document.getElementById("goalsStats");
  container.innerHTML = `
        <div class="alert alert-info">
            <h5>Current Progress: ${completed} of ${yearlyGoal} books</h5>
            <div class="progress mb-3" style="height: 30px;">
                <div class="progress-bar bg-success" style="width: ${progress}%">${progress}%</div>
            </div>
        </div>
    `;
}

function setYearlyGoal() {
  const input = document.getElementById("yearlyGoalInput");
  const newGoal = parseInt(input.value);
  if (newGoal && newGoal > 0) {
    yearlyGoal = newGoal;
    saveData();
    renderDashboard();
    renderGoals();
    alert("Yearly goal updated successfully!");
  } else {
    alert("Please enter a valid number greater than 0.");
  }
}

// Borrowed / Lent section
function renderBorrowedLent() {
  const borrowedContainer = document.getElementById("borrowedList");
  const lentContainer = document.getElementById("lentList");

  borrowedContainer.innerHTML = "";
  lentContainer.innerHTML = "";

  const borrowed = books.filter((b) => b.ownership === "Borrowed");
  const lent = books.filter((b) => b.ownership === "Lent");

  if (borrowed.length === 0) {
    borrowedContainer.innerHTML =
      '<div class="list-group-item text-muted">No borrowed books yet.</div>';
  } else {
    borrowed.forEach((book) => {
      borrowedContainer.appendChild(createBorrowItem(book));
    });
  }

  if (lent.length === 0) {
    lentContainer.innerHTML =
      '<div class="list-group-item text-muted">No lent books yet.</div>';
  } else {
    lent.forEach((book) => {
      lentContainer.appendChild(createBorrowItem(book));
    });
  }
}

// ===================== Export Library =====================
function exportLibrary(format) {
  if (!books.length) {
    alert("Your library is empty — add some books first!");
    return;
  }

  const filenameBase = `bookbuddy-library-${activeUser.username}-${new Date()
    .toISOString()
    .slice(0, 10)}`;

  if (format === "json") {
    downloadFile(
      JSON.stringify(books, null, 2),
      `${filenameBase}.json`,
      "application/json",
    );
  } else if (format === "csv") {
    downloadFile(booksToCsv(books), `${filenameBase}.csv`, "text/csv");
  } else if (format === "excel") {
    exportLibraryAsExcel(filenameBase);
  } else if (format === "pdf") {
    exportLibraryAsPdf(filenameBase);
  }
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function bookRows() {
  return books.map((b) => ({
    Title: b.title || "",
    Author: b.author || "",
    Genre: b.genre || "",
    Status: b.status || "",
    Ownership: b.ownership || "",
    Person: b.person || "",
    Rating: b.rating || "",
    Notes: b.notes || "",
    "Date Added": b.dateAdded ? b.dateAdded.slice(0, 10) : "",
  }));
}

function booksToCsv(list) {
  const rows = bookRows();
  const headers = Object.keys(rows[0]);
  const escapeCsv = (val) => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((h) => escapeCsv(row[h])).join(","));
  });
  return lines.join("\n");
}

function exportLibraryAsExcel(filenameBase) {
  if (typeof XLSX === "undefined") {
    alert("Excel export library failed to load. Please check your connection.");
    return;
  }
  const rows = bookRows();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Library");
  XLSX.writeFile(workbook, `${filenameBase}.xlsx`);
}

function exportLibraryAsPdf(filenameBase) {
  if (typeof window.jspdf === "undefined") {
    alert("PDF export library failed to load. Please check your connection.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text("Bookbuddy Library", 14, 15);
  doc.setFontSize(10);
  doc.text(`${activeUser.username} • ${new Date().toLocaleDateString()}`, 14, 21);

  const rows = bookRows();
  const headers = Object.keys(rows[0]);
  doc.autoTable({
    startY: 26,
    head: [headers],
    body: rows.map((r) => headers.map((h) => r[h])),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [13, 110, 253] },
  });

  doc.save(`${filenameBase}.pdf`);
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  showSection("library");

  // Handle delete modal cleanup
  const deleteModalEl = document.getElementById("deleteModal");
  deleteModalEl.addEventListener("hidden.bs.modal", () => {
    bookToDelete = null;
  });
});
