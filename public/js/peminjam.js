// Borrower management front-end script

document.addEventListener("DOMContentLoaded", async () => {
    // Check auth
    const user = await checkAuth();
    if (!user) return;

    // Display admin username
    const adminNameEl = document.getElementById("adminName");
    if (adminNameEl) {
        adminNameEl.textContent = "Halo, " + user.username;
    }

    // Load borrowers list
    await loadBorrowers();

    // Setup logout handler
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            await logout();
        });
    }
});

// Load borrowers
async function loadBorrowers() {
    const tableBody = document.getElementById("peminjamTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = `
    <tr>
      <td colspan="5" class="px-6 py-10 text-center text-slate-400">
        <svg class="animate-spin h-6 w-6 mx-auto mb-2 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Memuat data peminjam...
      </td>
    </tr>
  `;

    try {
        const res = await fetch("/api/peminjam", {
            method: "GET",
            headers: getAuthHeaders(),
        });

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                window.location.href = "/login";
                return;
            }
            throw new Error("Gagal memuat data peminjam");
        }

        const borrowers = await res.json();

        if (borrowers.length === 0) {
            tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-8 text-center text-slate-500">
            <i class="fa-solid fa-users-slash text-2xl mb-2 block"></i>
            Tidak ada data peminjam ditemukan.
          </td>
        </tr>
      `;
            return;
        }

        tableBody.innerHTML = borrowers
            .map(
                (b) => `
      <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
        <th scope="row" class="px-6 py-4 font-mono font-medium text-gray-900 whitespace-nowrap dark:text-white">${b.nik}</th>
        <td class="px-6 py-4 font-semibold">${b.nama}</td>
        <td class="px-6 py-4">${b.email}</td>
        <td class="px-6 py-4 font-mono text-sm">${b.no_telepon}</td>
        <td class="px-6 py-4 text-center">
          <button onclick="openEditModal('${b.nik}')" class="font-medium text-blue-600 dark:text-blue-500 hover:underline mr-3">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
          <button onclick="deleteBorrower('${b.nik}', '${b.nama.replace(/'/g, "\\'")}')" class="font-medium text-red-600 dark:text-red-500 hover:underline">
            <i class="fa-solid fa-trash"></i> Hapus
          </button>
        </td>
      </tr>
    `,
            )
            .join("");
    } catch (error) {
        console.error("Error loading borrowers:", error);
        tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-8 text-center text-red-400">
          Gagal mengambil data dari server.
        </td>
      </tr>
    `;
    }
}

// Add Borrower Submit Handler
const addPeminjamForm = document.getElementById("addPeminjamForm");
if (addPeminjamForm) {
    addPeminjamForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nik = document.getElementById("add_nik").value;
        const nama = document.getElementById("add_nama").value;
        const email = document.getElementById("add_email").value;
        const no_telepon = document.getElementById("add_no_telepon").value;

        const submitBtn = addPeminjamForm.querySelector(
            'button[type="submit"]',
        );
        submitBtn.disabled = true;

        try {
            const res = await fetch("/api/peminjam", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ nik, nama, email, no_telepon }),
            });

            const data = await res.json();

            if (!res.ok) {
                showToast(
                    data.message || "Gagal menambahkan peminjam.",
                    "error",
                );
            } else {
                showToast("Peminjam berhasil ditambahkan!", "success");
                addPeminjamForm.reset();

                // Close modal
                const modal = FlowbiteInstances.getInstance(
                    "Modal",
                    "add-peminjam-modal",
                );
                if (modal) modal.hide();

                await loadBorrowers();
            }
        } catch (error) {
            console.error(error);
            showToast("Gagal terhubung ke server.", "error");
        } finally {
            submitBtn.disabled = false;
        }
    });
}

// Edit Borrower Loader & Submit
let currentEditNik = null;
async function openEditModal(nik) {
    currentEditNik = nik;
    try {
        const res = await fetch(`/api/peminjam/${nik}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error();
        const borrower = await res.json();

        document.getElementById("edit_nik").value = borrower.nik;
        document.getElementById("edit_nama").value = borrower.nama;
        document.getElementById("edit_email").value = borrower.email;
        document.getElementById("edit_no_telepon").value = borrower.no_telepon;

        // Show modal
        const modalElement = document.getElementById("edit-peminjam-modal");
        if (!modalElement) {
            console.error("Modal element not found!");
            return;
        }

        let modal = FlowbiteInstances.getInstance(
            "Modal",
            "edit-peminjam-modal",
        );
        if (!modal) {
            console.log(
                "Flowbite instance not found, initializing manually...",
            );
            modal = new Modal(modalElement);
        }

        modal.show();
    } catch (error) {
        console.error("Error opening edit modal:", error);
        showToast("Gagal memuat data peminjam.", "error");
    }
}

const editPeminjamForm = document.getElementById("editPeminjamForm");
if (editPeminjamForm) {
    editPeminjamForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentEditNik) return;

        const nama = document.getElementById("edit_nama").value;
        const email = document.getElementById("edit_email").value;
        const no_telepon = document.getElementById("edit_no_telepon").value;

        const submitBtn = editPeminjamForm.querySelector(
            'button[type="submit"]',
        );
        submitBtn.disabled = true;

        try {
            const res = await fetch(`/api/peminjam/${currentEditNik}`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify({ nama, email, no_telepon }),
            });

            const data = await res.json();

            if (!res.ok) {
                showToast(
                    data.message || "Gagal memperbarui data peminjam.",
                    "error",
                );
            } else {
                showToast("Peminjam berhasil diperbarui!", "success");

                // Close modal
                const modal = FlowbiteInstances.getInstance(
                    "Modal",
                    "edit-peminjam-modal",
                );
                if (modal) modal.hide();

                await loadBorrowers();
            }
        } catch (error) {
            console.error(error);
            showToast("Gagal terhubung ke server.", "error");
        } finally {
            submitBtn.disabled = false;
        }
    });
}

// Delete Borrower
async function deleteBorrower(nik, name) {
    showConfirmModal({
        title: "Hapus Peminjam",
        message: `Apakah Anda yakin ingin menghapus peminjam <strong>"${name}"</strong> dengan NIK <strong>${nik}</strong>?`,
        confirmText: "Ya, Hapus",
        onConfirm: async () => {
            try {
                const res = await fetch(`/api/peminjam/${nik}`, {
                    method: "DELETE",
                    headers: getAuthHeaders(),
                });

                const data = await res.json();

                if (!res.ok) {
                    showToast(
                        data.message || "Gagal menghapus peminjam.",
                        "error",
                    );
                } else {
                    showToast("Peminjam berhasil dihapus!", "success");
                    await loadBorrowers();
                }
            } catch (error) {
                console.error(error);
                showToast("Gagal terhubung ke server.", "error");
            }
        },
    });
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
