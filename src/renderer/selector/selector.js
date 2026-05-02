const api = window.electronAPI;

const selBox   = document.getElementById('selectionBox');
const tip      = document.getElementById('coordsTip');
const crossH   = document.querySelector('.crosshair-h');
const crossV   = document.querySelector('.crosshair-v');

let startX = 0, startY = 0;
let isDragging = false;

// Move crosshairs with mouse
document.addEventListener('mousemove', (e) => {
  crossH.style.top = e.clientY + 'px';
  crossV.style.left = e.clientX + 'px';

  if (isDragging) {
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);

    selBox.style.left   = x + 'px';
    selBox.style.top    = y + 'px';
    selBox.style.width  = w + 'px';
    selBox.style.height = h + 'px';

    tip.textContent = `${Math.round(w)} × ${Math.round(h)} px · Release to capture`;
  }
});

document.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;

  selBox.style.left   = startX + 'px';
  selBox.style.top    = startY + 'px';
  selBox.style.width  = '0px';
  selBox.style.height = '0px';
  selBox.style.display = 'block';
});

document.addEventListener('mouseup', (e) => {
  if (!isDragging) return;
  isDragging = false;

  const x = Math.min(e.clientX, startX);
  const y = Math.min(e.clientY, startY);
  const w = Math.abs(e.clientX - startX);
  const h = Math.abs(e.clientY - startY);

  if (w < 20 || h < 20) {
    // Too small, cancel
    api.cancelSelection();
    return;
  }

  // Use devicePixelRatio for HiDPI screens
  const dpr = window.devicePixelRatio || 1;
  api.sendRegion({
    x: x * dpr,
    y: y * dpr,
    width: w * dpr,
    height: h * dpr
  });
});

// Cancel on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    api.cancelSelection();
  }
});
