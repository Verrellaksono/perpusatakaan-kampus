// Client-side authentication helpers

const API_URL = ''; // Relative path because they are on the same domain

// Check if token exists and verify with backend
async function checkAuth() {
  const token = localStorage.getItem('token');
  const currentPath = window.location.pathname;

  if (!token) {
    if (!currentPath.endsWith('login.html') && currentPath !== '/login') {
      window.location.href = '/login';
    }
    return null;
  }

  try {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error('Unauthorized');
    }

    const data = await res.json();
    
    // If we are on login page, redirect to dashboard
    if (currentPath.endsWith('login.html') || currentPath === '/login') {
      window.location.href = '/dashboard';
    }
    return data.user;
  } catch (error) {
    console.error('Session verification failed:', error);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (!currentPath.endsWith('login.html') && currentPath !== '/login') {
      window.location.href = '/login';
    }
    return null;
  }
}

// Perform login request
async function login(username, password) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, message: data.message || 'Login gagal.' };
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    console.log('Token saved to localStorage:', data.token);  // Debugging line
    return { success: true, user: data.user };
  } catch (error) {
    console.error('Login request failed:', error);
    return { success: false, message: 'Gagal terhubung ke server.' };
  }
}

// Perform logout
async function logout() {
  const token = localStorage.getItem('token');
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  } catch (error) {
    console.error('Logout request failed:', error);
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
}

// Get authorization headers for fetch requests
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// Get current user details from local storage
function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

// -------------------------------------------------------
// Reusable Flowbite Confirmation Modal
// Replaces native browser confirm() dialog.
//
// Usage:
//   showConfirmModal({
//     title: 'Hapus Buku',
//     message: 'Apakah Anda yakin?',
//     warning: 'Opsional teks peringatan',
//     confirmText: 'Ya, Hapus',
//     confirmClass: 'bg-red-600 hover:bg-red-700',  // default: merah
//     onConfirm: async () => { /* aksi */ }
//   });
// -------------------------------------------------------
function showConfirmModal({
  title = 'Konfirmasi',
  message = 'Apakah Anda yakin?',
  warning = null,
  confirmText = 'Ya, Lanjutkan',
  confirmClass = 'bg-red-600 hover:bg-red-700 focus:ring-red-300 dark:bg-red-500 dark:hover:bg-red-600 dark:focus:ring-red-900',
  onConfirm
} = {}) {
  // Remove existing modal if any
  const existing = document.getElementById('_confirm_modal_');
  if (existing) existing.remove();

  const warningHtml = warning
    ? `<div class="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
        <i class="fa-solid fa-triangle-exclamation mr-1.5"></i>${warning}
       </div>`
    : '';

  const modalEl = document.createElement('div');
  modalEl.id = '_confirm_modal_';
  modalEl.setAttribute('tabindex', '-1');
  modalEl.setAttribute('aria-hidden', 'true');
  modalEl.className = 'fixed top-0 left-0 right-0 z-[9999] hidden w-full p-4 overflow-x-hidden overflow-y-auto h-[calc(100%-1rem)] max-h-full flex items-center justify-center';
  modalEl.innerHTML = `
    <div class="relative w-full max-w-md max-h-full">
      <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
              <i class="fa-solid fa-question text-red-600 dark:text-red-400 text-sm"></i>
            </div>
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">${title}</h3>
          </div>
          <button id="_confirm_modal_close_" type="button"
            class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white">
            <i class="fa-solid fa-xmark text-base"></i>
            <span class="sr-only">Tutup</span>
          </button>
        </div>
        <!-- Body -->
        <div class="p-4 md:p-5">
          <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">${message}</p>
          ${warningHtml}
        </div>
        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 p-4 md:p-5 border-t border-gray-200 rounded-b dark:border-gray-600">
          <button id="_confirm_modal_cancel_" type="button"
            class="py-2.5 px-5 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700">
            Batal
          </button>
          <button id="_confirm_modal_confirm_" type="button"
            class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 text-center ${confirmClass}">
            ${confirmText}
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalEl);

  // Show modal using Flowbite
  const modal = new Modal(modalEl, { backdrop: 'static', closable: false });
  modal.show();

  function closeModal() {
    modal.hide();
    setTimeout(() => modalEl.remove(), 300);
  }

  document.getElementById('_confirm_modal_close_').addEventListener('click', closeModal);
  document.getElementById('_confirm_modal_cancel_').addEventListener('click', closeModal);
  document.getElementById('_confirm_modal_confirm_').addEventListener('click', async () => {
    closeModal();
    if (typeof onConfirm === 'function') {
      await onConfirm();
    }
  });
}
