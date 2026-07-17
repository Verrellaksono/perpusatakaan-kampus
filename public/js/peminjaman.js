// Borrowing management front-end script

let allBorrowers = [];
let availableBooks = [];
let selectedBookIds = [];

document.addEventListener('DOMContentLoaded', async () => {
  // Check auth
  const user = await checkAuth();
  if (!user) return;

  // Display admin username
  const adminNameEl = document.getElementById('adminName');
  if (adminNameEl) {
    adminNameEl.textContent = 'Halo, ' + user.username;
  }

  // Set default deadline date to 7 days from today
  const deadlineInput = document.getElementById('tanggal_pengembalian');
  if (deadlineInput) {
    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 7);
    deadlineInput.value = defaultDeadline.toISOString().split('T')[0];
    
    // Configure min date dynamically for Flowbite Datepicker
    setTimeout(() => {
      if (deadlineInput.datepicker) {
        deadlineInput.datepicker.setOptions({
          minDate: new Date()
        });
      }
    }, 200);
  }

  // Load dropdown data
  await loadBorrowersDropdown();
  await loadBooksList();
  await loadLoansList();

  // Setup autocompletes
  setupAutocompleteListeners();

  // Handle selected book selection
  const addBookBtn = document.getElementById('addBookSelectionBtn');
  if (addBookBtn) {
    addBookBtn.addEventListener('click', addSelectedBookToList);
  }

  // Form submission
  const borrowForm = document.getElementById('borrowForm');
  if (borrowForm) {
    borrowForm.addEventListener('submit', handleBorrowSubmit);
  }

  // Setup logout handler
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await logout();
    });
  }
});

// Load borrowers into selection
async function loadBorrowersDropdown() {
  try {
    const res = await fetch('/api/peminjam', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error();
    allBorrowers = await res.json();
    
    renderBorrowerOptions(allBorrowers);
  } catch (error) {
    console.error('Error loading borrowers:', error);
  }
}

// Load books list
async function loadBooksList() {
  try {
    const res = await fetch('/api/buku', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error();
    availableBooks = await res.json();

    // Filter books with stock > 0
    const instockBooks = availableBooks.filter(b => b.stok > 0);
    renderBookOptions(instockBooks);
  } catch (error) {
    console.error('Error loading books list:', error);
  }
}

// Add a book to current transaction list
function addSelectedBookToList() {
  const select = document.getElementById('book_select');
  if (!select) return;

  const id_buku = parseInt(select.value);
  if (!id_buku) return;

  if (selectedBookIds.includes(id_buku)) {
    showToast('Buku ini sudah dimasukkan ke dalam daftar.', 'error');
    return;
  }

  selectedBookIds.push(id_buku);
  renderSelectedBooks();

  // Reset values
  select.value = '';
  const searchInput = document.getElementById('buku_search');
  if (searchInput) searchInput.value = '';
}

// Render selected books in table format
function renderSelectedBooks() {
  const container = document.getElementById('selectedBooksContainer');
  const emptyMessage = document.getElementById('selectedBooksEmpty');
  
  if (!container) return;

  if (selectedBookIds.length === 0) {
    container.classList.add('hidden');
    if (emptyMessage) emptyMessage.classList.remove('hidden');
    return;
  }

  container.classList.remove('hidden');
  if (emptyMessage) emptyMessage.classList.add('hidden');

  const listEl = document.getElementById('selectedBooksList');
  if (!listEl) return;

  listEl.innerHTML = selectedBookIds.map(id => {
    const book = availableBooks.find(b => b.id_buku === id);
    if (!book) return '';
    return `
      <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
        <th scope="row" class="px-4 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white text-sm">${book.judul}</th>
        <td class="px-4 py-3 font-mono text-xs">${book.isbn}</td>
        <td class="px-4 py-3 text-sm">${book.penulis}</td>
        <td class="px-4 py-3 text-right">
          <button type="button" onclick="removeBookFromList(${book.id_buku})" class="font-medium text-red-600 dark:text-red-500 hover:underline">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Remove book from selected lists
function removeBookFromList(id) {
  selectedBookIds = selectedBookIds.filter(bid => bid !== id);
  renderSelectedBooks();
}

// Handle Form Submission
async function handleBorrowSubmit(e) {
  e.preventDefault();

  const nim = document.getElementById('nim_select').value;
  const tanggal_pengembalian = document.getElementById('tanggal_pengembalian').value;

  if (!nim) {
    showToast('Silakan pilih peminjam terlebih dahulu.', 'error');
    return;
  }

  if (selectedBookIds.length === 0) {
    showToast('Silakan pilih minimal 1 buku yang akan dipinjam.', 'error');
    return;
  }

  const submitBtn = document.getElementById('submitBorrowBtn');
  submitBtn.disabled = true;

  try {
    const res = await fetch('/api/peminjaman', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        nim,
        tanggal_pengembalian,
        id_buku_list: selectedBookIds
      })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || 'Gagal memproses peminjaman.', 'error');
    } else {
      showToast('Transaksi peminjaman berhasil dicatat!', 'success');
      
      // Clear inputs
      selectedBookIds = [];
      document.getElementById('nim_select').value = '';
      document.getElementById('peminjam_search').value = '';
      if (document.getElementById('book_select')) document.getElementById('book_select').value = '';
      if (document.getElementById('buku_search')) document.getElementById('buku_search').value = '';
      renderSelectedBooks();

      // Reload resources
      await loadBooksList();
      await loadLoansList();
    }
  } catch (error) {
    console.error(error);
    showToast('Gagal terhubung ke server.', 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

// Load Loans History Table
async function loadLoansList() {
  const tableBody = document.getElementById('loansTableBody');
  if (!tableBody) return;

  try {
    const res = await fetch('/api/peminjaman', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error();
    const loans = await res.json();

    if (loans.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-8 text-center text-slate-500">
            Tidak ada riwayat peminjaman.
          </td>
        </tr>
      `;
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    tableBody.innerHTML = loans.map(loan => {
      // Calculate visual status
      let badgeColor = '';
      let badgeLabel = '';
      
      const deadlineDate = new Date(loan.tanggal_pengembalian);
      deadlineDate.setHours(0, 0, 0, 0);

      if (loan.status === 'Dikembalikan') {
        badgeColor = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        badgeLabel = 'Dikembalikan';
      } else if (loan.status === 'Dipinjam' && today > deadlineDate) {
        badgeColor = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
        badgeLabel = 'Terlambat';
      } else {
        badgeColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        badgeLabel = 'Dipinjam';
      }

      // Format dates
      const tglPinjam = formatDate(loan.tanggal_peminjaman);
      const tglBatas = formatDate(loan.tanggal_pengembalian);
      const tglKembali = loan.tanggal_realisasi_kembali ? formatDate(loan.tanggal_realisasi_kembali) : '-';

      // Format denda currency
      const formatDenda = parseInt(loan.denda) > 0 ? `Rp${parseInt(loan.denda).toLocaleString('id-ID')}` : '-';

      return `
        <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
          <th scope="row" class="px-6 py-4">
            <div class="font-medium text-gray-900 dark:text-white text-sm">${loan.judul_buku}</div>
            <div class="text-gray-500 dark:text-gray-400 text-xs font-mono">${loan.isbn}</div>
          </th>
          <td class="px-6 py-4">
            <div class="font-medium text-gray-900 dark:text-white text-sm">${loan.nama_peminjam}</div>
            <div class="text-gray-500 dark:text-gray-400 text-xs font-mono">${loan.nim}</div>
          </td>
          <td class="px-6 py-4 text-center">${tglPinjam}</td>
          <td class="px-6 py-4 text-center">${tglBatas}</td>
          <td class="px-6 py-4 text-center">
            <span class="text-xs font-medium px-2.5 py-0.5 rounded ${badgeColor}">
              ${badgeLabel}
            </span>
          </td>
          <td class="px-6 py-4 text-center">${tglKembali}</td>
          <td class="px-6 py-4 text-center text-sm font-semibold ${parseInt(loan.denda) > 0 ? 'text-red-600 dark:text-red-500' : 'text-gray-500 dark:text-gray-400'}">${formatDenda}</td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading loans list:', error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-8 text-center text-red-400">
          Gagal mengambil data dari server.
        </td>
      </tr>
    `;
  }
}

// Utility to format date string to Indonesian format (DD-MM-YYYY)
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// Toast helper
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-emerald-900/90 border-emerald-500/30' : 'bg-red-900/90 border-red-500/30';
  const icon = type === 'success' ? 'fa-circle-check text-emerald-400' : 'fa-circle-exclamation text-red-400';

  toast.className = `flex items-center w-full max-w-xs p-4 rounded-lg shadow border backdrop-blur-md ${bgColor} text-white animate-fade-in transition-all duration-300`;
  toast.innerHTML = `
    <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg text-lg">
      <i class="fa-solid ${icon}"></i>
    </div>
    <div class="ml-3 text-sm font-normal">${message}</div>
    <button type="button" class="ml-auto -mx-1.5 -my-1.5 rounded-lg focus:ring-2 focus:ring-slate-300 p-1.5 hover:bg-white/10 inline-flex items-center justify-center h-8 w-8 text-slate-300 hover:text-white" data-dismiss-target="#toast" aria-label="Close">
      <span class="sr-only">Close</span>
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  container.appendChild(toast);

  toast.querySelector('button').addEventListener('click', () => {
    toast.remove();
  });

  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Searchable selects Autocomplete Helper Logics
function setupAutocompleteListeners() {
  const peminjamSearch = document.getElementById('peminjam_search');
  const peminjamDropdown = document.getElementById('peminjam_dropdown');
  const nimSelect = document.getElementById('nim_select');
  
  if (peminjamSearch && peminjamDropdown) {
    peminjamSearch.addEventListener('focus', () => {
      peminjamDropdown.classList.remove('hidden');
      renderBorrowerOptions(allBorrowers);
    });
    
    peminjamSearch.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      if (nimSelect.value) {
        nimSelect.value = '';
      }
      const filtered = allBorrowers.filter(b => 
        b.nama.toLowerCase().includes(term) || b.nim.toLowerCase().includes(term)
      );
      renderBorrowerOptions(filtered);
    });
  }

  const bukuSearch = document.getElementById('buku_search');
  const bukuDropdown = document.getElementById('buku_dropdown');
  const bookSelect = document.getElementById('book_select');
  
  if (bukuSearch && bukuDropdown) {
    bukuSearch.addEventListener('focus', () => {
      bukuDropdown.classList.remove('hidden');
      const instockBooks = availableBooks.filter(b => b.stok > 0);
      renderBookOptions(instockBooks);
    });
    
    bukuSearch.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      if (bookSelect.value) {
        bookSelect.value = '';
      }
      const instockBooks = availableBooks.filter(b => b.stok > 0);
      const filtered = instockBooks.filter(b => 
        b.judul.toLowerCase().includes(term) || b.isbn.toLowerCase().includes(term)
      );
      renderBookOptions(filtered);
    });
  }

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (peminjamSearch && peminjamDropdown && !peminjamSearch.contains(e.target) && !peminjamDropdown.contains(e.target)) {
      peminjamDropdown.classList.add('hidden');
    }
    if (bukuSearch && bukuDropdown && !bukuSearch.contains(e.target) && !bukuDropdown.contains(e.target)) {
      bukuDropdown.classList.add('hidden');
    }
  });
}

function renderBorrowerOptions(list) {
  const container = document.getElementById('peminjam_list');
  if (!container) return;
  
  if (list.length === 0) {
    container.innerHTML = `<li class="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">Peminjam tidak ditemukan</li>`;
    return;
  }
  
  container.innerHTML = list.map(b => `
    <li 
      onclick="selectBorrower('${b.nim}', '${b.nama.replace(/'/g, "\\'")}')" 
      class="px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-900 dark:text-white transition-colors duration-150"
    >
      <div class="font-semibold text-sm">${b.nama}</div>
      <div class="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">${b.nim}</div>
    </li>
  `).join('');
}

function selectBorrower(nim, nama) {
  const peminjamSearch = document.getElementById('peminjam_search');
  const peminjamDropdown = document.getElementById('peminjam_dropdown');
  const nimSelect = document.getElementById('nim_select');
  
  if (peminjamSearch && nimSelect) {
    peminjamSearch.value = `${nama} (${nim})`;
    nimSelect.value = nim;
  }
  if (peminjamDropdown) {
    peminjamDropdown.classList.add('hidden');
  }
}

function renderBookOptions(list) {
  const container = document.getElementById('buku_list');
  if (!container) return;
  
  if (list.length === 0) {
    container.innerHTML = `<li class="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">Buku tidak ditemukan atau stok habis</li>`;
    return;
  }
  
  container.innerHTML = list.map(b => `
    <li 
      onclick="selectBook(${b.id_buku}, '${b.judul.replace(/'/g, "\\'")}', ${b.stok})" 
      class="px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-900 dark:text-white transition-colors duration-150"
    >
      <div class="font-semibold text-sm">${b.judul}</div>
      <div class="text-xs text-gray-500 dark:text-gray-400 flex justify-between mt-0.5">
        <span class="font-mono">${b.isbn}</span>
        <span class="bg-blue-100 text-blue-800 text-[10px] font-medium px-1.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">Stok: ${b.stok}</span>
      </div>
    </li>
  `).join('');
}

function selectBook(id, judul, stok) {
  const bukuSearch = document.getElementById('buku_search');
  const bukuDropdown = document.getElementById('buku_dropdown');
  const bookSelect = document.getElementById('book_select');
  
  if (bukuSearch && bookSelect) {
    bukuSearch.value = `${judul} (Stok: ${stok})`;
    bookSelect.value = id;
  }
  if (bukuDropdown) {
    bukuDropdown.classList.add('hidden');
  }
}

// Bind callbacks to window for inline onclick attributes
window.selectBorrower = selectBorrower;
window.selectBook = selectBook;
