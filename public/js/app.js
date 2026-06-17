const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const statusEl = document.getElementById('status');
const gallery = document.getElementById('gallery');
const emptyState = document.getElementById('emptyState');
const refreshBtn = document.getElementById('refreshBtn');

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type || ''}`.trim();
}

function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

async function uploadFile(file) {
  setStatus(`Uploading ${file.name}...`, '');
  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch('/upload', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      setStatus(data.error || 'Upload failed', 'error');
      return;
    }

    setStatus(`Uploaded ${data.filename}`, 'success');
    loadGallery();
  } catch (err) {
    setStatus('Network error during upload', 'error');
  }
}

async function loadGallery() {
  try {
    const res = await fetch('/images');
    const images = await res.json();

    gallery.innerHTML = '';
    emptyState.hidden = images.length > 0;

    images.forEach((img) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img src="${img.blob_url}" alt="${img.original_name}" loading="lazy" />
        <button class="card__delete" title="Delete" data-id="${img.id}">&times;</button>
        <div class="card__meta">${img.original_name} · ${formatBytes(img.size_bytes)}</div>
      `;
      gallery.appendChild(card);
    });
  } catch (err) {
    setStatus('Could not load gallery', 'error');
  }
}

gallery.addEventListener('click', async (e) => {
  const btn = e.target.closest('.card__delete');
  if (!btn) return;
  const id = btn.dataset.id;
  await fetch(`/images/${id}`, { method: 'DELETE' });
  loadGallery();
});

dropzone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) uploadFile(fileInput.files[0]);
});

['dragenter', 'dragover'].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add('is-dragover');
  })
);

['dragleave', 'drop'].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove('is-dragover');
  })
);

dropzone.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (file) uploadFile(file);
});

refreshBtn.addEventListener('click', loadGallery);

loadGallery();
