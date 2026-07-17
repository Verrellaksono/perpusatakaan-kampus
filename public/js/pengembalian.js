// Return management front-end script

document.addEventListener("DOMContentLoaded", async () => {
    // Check auth
    const user = await checkAuth();
    if (!user) return;

    // Display admin username
    const adminNameEl = document.getElementById("adminName");
    if (adminNameEl) {
        adminNameEl.textContent = "Halo, " + user.username;
    }

    // Load active loans list
    await loadActiveLoans();

    // Load return history
    await loadReturnHistory();

    // Setup logout handler
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            await logout();
        });
    }
});

// Load active loans from API
async function loadActiveLoans() {
    const tableBody = document.getElementById("returnsTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = `
    <tr>
      <td colspan="6" class="px-6 py-10 text-center text-slate-400">
        <svg class="animate-spin h-6 w-6 mx-auto mb-2 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Memuat data peminjaman aktif...
      </td>
    </tr>
  `;

    try {
        const res = await fetch("/api/peminjaman", {
            method: "GET",
            headers: getAuthHeaders(),
        });

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                window.location.href = "/login";
                return;
            }
            throw new Error("Gagal memuat peminjaman aktif");
        }

        const loans = await res.json();

        // Filter only borrowed items (status = 'Dipinjam')
        const activeLoans = loans.filter((l) => l.status === "Dipinjam");

        if (activeLoans.length === 0) {
            tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-12 text-center text-slate-500">
            Tidak ada peminjaman aktif saat ini.
          </td>
        </tr>
      `;
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        tableBody.innerHTML = activeLoans
            .map((loan) => {
                // Calculate estimated denda in real-time
                const deadlineDate = new Date(loan.tanggal_pengembalian);
                deadlineDate.setHours(0, 0, 0, 0);

                const timeDiff = today.getTime() - deadlineDate.getTime();
                const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

                let estDenda = 0;
                let statusBadge = "";

                if (daysDiff > 0) {
                    estDenda = daysDiff * 2000;
                    statusBadge = `<span class="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-red-900 dark:text-red-300">Terlambat ${daysDiff} Hari</span>`;
                } else {
                    statusBadge = `<span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300">Dipinjam</span>`;
                }

                const tglPinjam = formatDate(loan.tanggal_peminjaman);
                const tglBatas = formatDate(loan.tanggal_pengembalian);
                const formatEstDenda =
                    estDenda > 0
                        ? `Rp${estDenda.toLocaleString("id-ID")}`
                        : "-";

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
          <td class="px-6 py-4 text-center">${statusBadge}</td>
          <td class="px-6 py-4 text-center text-sm font-semibold ${estDenda > 0 ? "text-red-600 dark:text-red-500" : "text-gray-500 dark:text-gray-400"}">${formatEstDenda}</td>
          <td class="px-6 py-4 text-center">
            <button onclick="processReturn(${loan.id_detail}, '${loan.judul_buku.replace(/'/g, "\\'")}', '${loan.nama_peminjam.replace(/'/g, "\\'")}', ${estDenda})" 
              class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-xs px-3 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 flex items-center gap-1.5 mx-auto">
              <i class="fa-solid fa-rotate-left"></i> Kembalikan
            </button>
          </td>
        </tr>
      `;
            })
            .join("");
    } catch (error) {
        console.error("Error loading active loans:", error);
        tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-8 text-center text-red-400">
          Gagal mengambil data dari server.
        </td>
      </tr>
    `;
    }
}

// Process Book Return API call
async function processReturn(id_detail, bookTitle, borrowerName, dendaAmount) {
    const warningText =
        dendaAmount > 0
            ? `Peminjaman terlambat! Denda yang dikenakan: <strong>Rp${dendaAmount.toLocaleString("id-ID")}</strong>`
            : null;

    showConfirmModal({
        title: "Konfirmasi Pengembalian",
        message: `Proses pengembalian buku <strong>"${bookTitle}"</strong> oleh <strong>${borrowerName}</strong>?`,
        warning: warningText,
        confirmText: "Ya, Kembalikan",
        confirmClass:
            "bg-blue-700 hover:bg-blue-800 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800",
        onConfirm: async () => {
            try {
                const res = await fetch(
                    `/api/peminjaman/pengembalian/${id_detail}`,
                    {
                        method: "PUT",
                        headers: getAuthHeaders(),
                    },
                );

                const data = await res.json();

                if (!res.ok) {
                    showToast(
                        data.message || "Gagal memproses pengembalian.",
                        "error",
                    );
                } else {
                    let toastMsg = `Buku "${bookTitle}" berhasil dikembalikan!`;
                    if (data.denda > 0) {
                        toastMsg += ` Total denda: Rp${parseInt(data.denda).toLocaleString("id-ID")}`;
                    }
                    showToast(toastMsg, "success");
                    await loadActiveLoans();
                    await loadReturnHistory();
                }
            } catch (error) {
                console.error(error);
                showToast("Gagal terhubung ke server.", "error");
            }
        },
    });
}

// Load Return History Table
async function loadReturnHistory() {
    const tableBody = document.getElementById("historyTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = `
    <tr>
      <td colspan="7" class="px-6 py-10 text-center text-slate-400">
        <svg class="animate-spin h-6 w-6 mx-auto mb-2 text-green-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Memuat riwayat pengembalian...
      </td>
    </tr>
  `;

    try {
        const res = await fetch("/api/peminjaman", {
            method: "GET",
            headers: getAuthHeaders(),
        });

        if (!res.ok) throw new Error("Gagal memuat riwayat");

        const loans = await res.json();
        const returned = loans.filter((l) => l.status === "Dikembalikan");

        if (returned.length === 0) {
            tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-12 text-center text-slate-500">
            <i class="fa-solid fa-folder-open text-3xl mb-3 text-gray-400 block"></i>
            Belum ada riwayat pengembalian.
          </td>
        </tr>
      `;
            return;
        }

        tableBody.innerHTML = returned
            .map((loan) => {
                const tglPinjam = formatDate(loan.tanggal_peminjaman);
                const tglBatas = formatDate(loan.tanggal_pengembalian);
                const tglKembali = formatDate(loan.tanggal_realisasi_kembali);

                // Check if was returned late
                const deadlineDate = new Date(loan.tanggal_pengembalian);
                deadlineDate.setHours(0, 0, 0, 0);
                const returnedDate = new Date(loan.tanggal_realisasi_kembali);
                returnedDate.setHours(0, 0, 0, 0);
                const isLate = returnedDate > deadlineDate;

                const statusBadge = isLate
                    ? `<span class="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-orange-900 dark:text-orange-300">Terlambat</span>`
                    : `<span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">Tepat Waktu</span>`;

                const dendaFormatted =
                    parseInt(loan.denda) > 0
                        ? `<span class="font-semibold text-red-600 dark:text-red-400">Rp${parseInt(loan.denda).toLocaleString("id-ID")}</span>`
                        : `<span class="text-gray-400">-</span>`;

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
            <span class="font-medium text-gray-900 dark:text-white">${tglKembali}</span>
          </td>
          <td class="px-6 py-4 text-center">${statusBadge}</td>
          <td class="px-6 py-4 text-center">${dendaFormatted}</td>
        </tr>
      `;
            })
            .join("");
    } catch (error) {
        console.error("Error loading return history:", error);
        tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-8 text-center text-red-400">
          Gagal mengambil riwayat pengembalian dari server.
        </td>
      </tr>
    `;
    }
}

// Format date utility
function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
}

// Toast helper
function showToast(message, type = "success") {
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

    toast.querySelector("button").addEventListener("click", () => {
        toast.remove();
    });

    setTimeout(() => {
        toast.classList.add("opacity-0");
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
