// Book management front-end script

document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Check auth first
        const user = await checkAuth();
        console.log("User Data:", user); // Debugging line
        if (!user) return;

        // Display admin username
        const adminNameEl = document.getElementById("adminName");
        if (adminNameEl) {
            adminNameEl.textContent = "Halo, " + user.username;
        }

        // Load books
        await loadBooks();

        // Setup search handler
        const searchInput = document.getElementById("searchInput");
        if (searchInput) {
            searchInput.addEventListener(
                "input",
                debounce(async (e) => {
                    await loadBooks(e.target.value);
                }, 300),
            );
        }

        // Setup logout handler
        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", async (e) => {
                e.preventDefault();
                await logout();
            });
        }
    } catch (error) {
        console.error("Error in DOMContentLoaded:", error);
    }
});

// Load books list from server
async function loadBooks(search = "") {
    const tableBody = document.getElementById("booksTableBody");
    if (!tableBody) {
        console.error("Element #booksTableBody not found!");
        return;
    }

    // 1. Tampilkan state loading
    tableBody.innerHTML = `
    <tr>
      <td colspan="7" class="px-6 py-10 text-center text-slate-400">
        <svg class="animate-spin h-6 w-6 mx-auto mb-2 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Memuat data buku...
      </td>
    </tr>
  `;

    try {
        const headers = getAuthHeaders();
        console.log("Request Headers:", headers);

        const url = `/api/buku?search=${encodeURIComponent(search)}`;
        console.log("Request URL:", url);

        // 2. Fetch data dari API
        const res = await fetch(url, {
            method: "GET",
            headers: headers,
        });

        console.log("Response Status:", res.status);
        console.log("Response Headers:", [...res.headers.entries()]);

        // 3. Validasi Response
        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                console.error("Unauthorized: Redirecting to login...");
                window.location.href = "/login";
                return;
            }
            const errorData = await res.json().catch(() => ({}));
            console.error("Error Response:", errorData);
            throw new Error(errorData.message || "Gagal memuat buku");
        }

        const books = await res.json();
        console.log("Books Data:", books);

        // 4. Jika data kosong
        if (!books || books.length === 0) {
            tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-8 text-center text-slate-500">
            <i class="fa-solid fa-folder-open text-2xl mb-2 block"></i>
            Tidak ada data buku ditemukan. Pastikan database tidak kosong.
          </td>
        </tr>
      `;
            return;
        }

        // 5. Render data ke dalam tabel
        tableBody.innerHTML = books
            .map(
                (book) => `
      <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
        <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">${book.judul}</th>
        <td class="px-6 py-4 font-mono text-xs">${book.isbn}</td>
        <td class="px-6 py-4">${book.penulis}</td>
        <td class="px-6 py-4">${book.penerbit}</td>
        <td class="px-6 py-4 text-center">${book.tahun_terbit}</td>
        <td class="px-6 py-4 text-center">
          <span class="text-xs font-medium px-2.5 py-0.5 rounded ${
              book.stok > 0
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
          }">
            ${book.stok}
          </span>
        </td>
        <td class="px-6 py-4 text-center">
          <button onclick="openEditModal(${book.id_buku})" class="font-medium text-blue-600 dark:text-blue-500 hover:underline mr-3">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
          <button onclick="deleteBook(${book.id_buku}, '${book.judul.replace(/'/g, "\\'")}')" class="font-medium text-red-600 dark:text-red-500 hover:underline">
            <i class="fa-solid fa-trash"></i> Hapus
          </button>
        </td>
      </tr>
    `,
            )
            .join("");
    } catch (error) {
        // Blok catch tunggal yang menangani error runtime maupun network error
        console.error("Error loading books:", error);
        tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-8 text-center text-red-400">
          <i class="fa-solid fa-triangle-exclamation text-2xl mb-2 block"></i>
          Gagal mengambil data dari server: ${error.message}
        </td>
      </tr>
    `;
    }
}

// Validation Helper Functions
function setValidationError(inputId, labelId, helpId, message) {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);
    const help = document.getElementById(helpId);

    if (input && label && help) {
        input.className =
            "bg-red-50 border border-red-500 text-red-900 placeholder-red-700 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block w-full p-2.5 dark:bg-gray-750 dark:border-red-500 dark:text-red-500 dark:placeholder-red-500";
        label.className =
            "block mb-2 text-sm font-medium text-red-700 dark:text-red-500";
        help.textContent = message;
        help.classList.remove("hidden");
    }
}

function clearValidationError(inputId, labelId, helpId) {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);
    const help = document.getElementById(helpId);

    if (input && label && help) {
        input.className =
            "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white";
        label.className =
            "block mb-2 text-sm font-medium text-gray-900 dark:text-white";
        help.classList.add("hidden");
        help.textContent = "";
    }
}

// Input listeners to clear validation errors
if (document.getElementById("add_isbn")) {
    document.getElementById("add_isbn").addEventListener("input", () => {
        clearValidationError("add_isbn", "add_isbn_label", "add_isbn_help");
    });
}
if (document.getElementById("add_tahun_terbit")) {
    document
        .getElementById("add_tahun_terbit")
        .addEventListener("input", () => {
            clearValidationError(
                "add_tahun_terbit",
                "add_tahun_terbit_label",
                "add_tahun_terbit_help",
            );
        });
}
if (document.getElementById("add_stok")) {
    document.getElementById("add_stok").addEventListener("input", () => {
        clearValidationError("add_stok", "add_stok_label", "add_stok_help");
    });
}
if (document.getElementById("edit_isbn")) {
    document.getElementById("edit_isbn").addEventListener("input", () => {
        clearValidationError("edit_isbn", "edit_isbn_label", "edit_isbn_help");
    });
}
if (document.getElementById("edit_tahun_terbit")) {
    document
        .getElementById("edit_tahun_terbit")
        .addEventListener("input", () => {
            clearValidationError(
                "edit_tahun_terbit",
                "edit_tahun_terbit_label",
                "edit_tahun_terbit_help",
            );
        });
}
if (document.getElementById("edit_stok")) {
    document.getElementById("edit_stok").addEventListener("input", () => {
        clearValidationError("edit_stok", "edit_stok_label", "edit_stok_help");
    });
}

// Add Book Form Handler
const addBookForm = document.getElementById("addBookForm");
if (addBookForm) {
    addBookForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const isbn = document.getElementById("add_isbn").value;
        const judul = document.getElementById("add_judul").value;
        const penulis = document.getElementById("add_penulis").value;
        const penerbit = document.getElementById("add_penerbit").value;
        const tahun_terbit = document.getElementById("add_tahun_terbit").value;
        const stok = document.getElementById("add_stok").value;

        // Clear previous validation styling
        clearValidationError("add_isbn", "add_isbn_label", "add_isbn_help");
        clearValidationError(
            "add_tahun_terbit",
            "add_tahun_terbit_label",
            "add_tahun_terbit_help",
        );
        clearValidationError("add_stok", "add_stok_label", "add_stok_help");

        // Client-side validations
        let isValid = true;
        if (!/^\d{10,13}$/.test(isbn)) {
            setValidationError(
                "add_isbn",
                "add_isbn_label",
                "add_isbn_help",
                "ISBN harus berupa 10-13 digit angka.",
            );
            isValid = false;
        }
        const tahunVal = parseInt(tahun_terbit, 10);
        if (isNaN(tahunVal) || tahunVal < 1900 || tahunVal > 2026) {
            setValidationError(
                "add_tahun_terbit",
                "add_tahun_terbit_label",
                "add_tahun_terbit_help",
                "Tahun terbit harus di antara 1900 dan 2026.",
            );
            isValid = false;
        }
        const stokVal = parseInt(stok, 10);
        if (isNaN(stokVal) || stokVal < 0) {
            setValidationError(
                "add_stok",
                "add_stok_label",
                "add_stok_help",
                "Stok tidak boleh 0 atau kurang dari 0.",
            );
            isValid = false;
        }

        if (!isValid) return;

        const submitBtn = addBookForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const res = await fetch("/api/buku", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    isbn,
                    judul,
                    penulis,
                    penerbit,
                    tahun_terbit,
                    stok,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                // Check if duplicate ISBN error
                if (data.message && data.message.includes("ISBN")) {
                    setValidationError(
                        "add_isbn",
                        "add_isbn_label",
                        "add_isbn_help",
                        data.message,
                    );
                } else {
                    showToast(
                        data.message || "Gagal menambahkan buku.",
                        "error",
                    );
                }
            } else {
                showToast("Buku berhasil ditambahkan!", "success");
                addBookForm.reset();

                // Hide modal
                const modal = FlowbiteInstances.getInstance(
                    "Modal",
                    "add-book-modal",
                );
                if (modal) modal.hide();

                await loadBooks();
            }
        } catch (error) {
            console.error(error);
            showToast("Gagal terhubung ke server.", "error");
        } finally {
            submitBtn.disabled = false;
        }
    });
}

// Edit Book Loader & Form Handler
let currentEditId = null;

async function openEditModal(id) {
    currentEditId = id;
    try {
        const res = await fetch(`/api/buku/${id}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error();
        const book = await res.json();

        document.getElementById("edit_isbn").value = book.isbn;
        document.getElementById("edit_judul").value = book.judul;
        document.getElementById("edit_penulis").value = book.penulis;
        document.getElementById("edit_penerbit").value = book.penerbit;
        document.getElementById("edit_tahun_terbit").value = book.tahun_terbit;
        document.getElementById("edit_stok").value = book.stok;

        // Clear previous validation styling
        clearValidationError("edit_isbn", "edit_isbn_label", "edit_isbn_help");
        clearValidationError(
            "edit_tahun_terbit",
            "edit_tahun_terbit_label",
            "edit_tahun_terbit_help",
        );
        clearValidationError("edit_stok", "edit_stok_label", "edit_stok_help");

        // Show modal
        const modalElement = document.getElementById("edit-book-modal");
        if (!modalElement) {
            console.error("Modal element not found!");
            return;
        }

        // Initialize modal if not already initialized
        let modal = FlowbiteInstances.getInstance("Modal", "edit-book-modal");
        if (!modal) {
            modal = new Modal(modalElement);
        }

        modal.show();
    } catch (error) {
        console.error("Error loading book data:", error);
        showToast("Gagal memuat data buku.", "error");
    }
}

const editBookForm = document.getElementById("editBookForm");
if (editBookForm) {
    editBookForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentEditId) return;

        // Mengambil value dari form input
        const isbn = document.getElementById("edit_isbn").value;
        const judul = document.getElementById("edit_judul").value;
        const penulis = document.getElementById("edit_penulis").value;
        const penerbit = document.getElementById("edit_penerbit").value;
        const tahun_terbit = document.getElementById("edit_tahun_terbit").value;
        const stok = document.getElementById("edit_stok").value;

        // Clear previous validation styling
        clearValidationError("edit_isbn", "edit_isbn_label", "edit_isbn_help");
        clearValidationError(
            "edit_tahun_terbit",
            "edit_tahun_terbit_label",
            "edit_tahun_terbit_help",
        );
        clearValidationError("edit_stok", "edit_stok_label", "edit_stok_help");

        // Client-side validations
        let isValid = true;
        if (!/^\d{10,13}$/.test(isbn)) {
            setValidationError(
                "edit_isbn",
                "edit_isbn_label",
                "edit_isbn_help",
                "ISBN harus berupa 10-13 digit angka.",
            );
            isValid = false;
        }
        const tahunVal = parseInt(tahun_terbit, 10);
        if (isNaN(tahunVal) || tahunVal < 1900 || tahunVal > 2026) {
            setValidationError(
                "edit_tahun_terbit",
                "edit_tahun_terbit_label",
                "edit_tahun_terbit_help",
                "Tahun terbit harus di antara 1900 dan 2026.",
            );
            isValid = false;
        }
        const stokVal = parseInt(stok, 10);
        if (isNaN(stokVal) || stokVal < 0) {
            setValidationError(
                "edit_stok",
                "edit_stok_label",
                "edit_stok_help",
                "Stok tidak boleh negatif.",
            );
            isValid = false;
        }

        if (!isValid) return;

        // Menemukan tombol submit dan mendisable-nya (mencegah double-click/spam)
        const submitBtn = editBookForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
            // Menyiapkan header content-type untuk memberi tahu API bahwa kita mengirim JSON
            const headers = getAuthHeaders() || {};
            if (!headers["Content-Type"]) {
                headers["Content-Type"] = "application/json";
            }

            console.log("Request Data:", {
                isbn,
                judul,
                penulis,
                penerbit,
                tahun_terbit: Number(tahun_terbit),
                stok: Number(stok),
            });

            const res = await fetch(`/api/buku/${currentEditId}`, {
                method: "PUT",
                headers: headers,
                body: JSON.stringify({
                    isbn,
                    judul,
                    penulis,
                    penerbit,
                    tahun_terbit: Number(tahun_terbit),
                    stok: Number(stok),
                }),
            });

            console.log("Response Status:", res.status);

            const data = await res.json().catch(() => ({}));
            console.log("Response Data:", data);

            // Validasi respons API
            if (!res.ok) {
                if (data.message && data.message.includes("ISBN")) {
                    setValidationError(
                        "edit_isbn",
                        "edit_isbn_label",
                        "edit_isbn_help",
                        data.message,
                    );
                } else {
                    showToast(
                        data.message || "Gagal memperbarui buku.",
                        "error",
                    );
                }
            } else {
                showToast("Buku berhasil diperbarui!", "success");

                // Sembunyikan modal Flowbite
                if (typeof FlowbiteInstances !== "undefined") {
                    const modal = FlowbiteInstances.getInstance(
                        "Modal",
                        "edit-book-modal",
                    );
                    if (modal) modal.hide();
                }

                // Refresh data tabel buku terbaru
                await loadBooks();
            }
        } catch (error) {
            console.error("Error updating book:", error);
            showToast("Gagal terhubung ke server.", "error");
        } finally {
            // Pastikan tombol aktif kembali apa pun hasilnya (sukses maupun gagal)
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}

// Delete Book Handler
async function deleteBook(id, title) {
    showConfirmModal({
        title: "Hapus Buku",
        message: `Apakah Anda yakin ingin menghapus buku <strong>"${title}"</strong>?`,
        confirmText: "Ya, Hapus",
        onConfirm: async () => {
            try {
                const res = await fetch(`/api/buku/${id}`, {
                    method: "DELETE",
                    headers: getAuthHeaders(),
                });

                const data = await res.json();

                if (!res.ok) {
                    showToast(data.message || "Gagal menghapus buku.", "error");
                } else {
                    showToast("Buku berhasil dihapus!", "success");
                    await loadBooks();
                }
            } catch (error) {
                console.error(error);
                showToast("Gagal terhubung ke server.", "error");
            }
        },
    });
}

// Toast utility helper
function showToast(message, type = "success") {
    // Check if target container exists, create if not
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "fixed bottom-5 right-5 z-50 flex flex-col gap-2";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    const bgColor =
        type === "success"
            ? "bg-emerald-900/90 border-emerald-500/30"
            : "bg-red-900/90 border-red-500/30";
    const icon =
        type === "success"
            ? "fa-circle-check text-emerald-400"
            : "fa-circle-exclamation text-red-400";

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

    // Close handler
    toast.querySelector("button").addEventListener("click", () => {
        toast.remove();
    });

    // Auto remove
    setTimeout(() => {
        toast.classList.add("opacity-0");
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
