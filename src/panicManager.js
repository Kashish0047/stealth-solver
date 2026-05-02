const { BrowserWindow } = require('electron');

let isPanicked = false;
const hiddenState = new Map(); // windowId -> wasVisible

function register(win) {
  win.on('closed', () => hiddenState.delete(win.id));
}

function toggle() {
  if (isPanicked) {
    restore();
  } else {
    hide();
  }
}

function hide() {
  isPanicked = true;
  hiddenState.clear();

  BrowserWindow.getAllWindows().forEach((win) => {
    hiddenState.set(win.id, win.isVisible());
    if (win.isVisible()) {
      win.hide();
    }
  });
}

function restore() {
  isPanicked = false;

  BrowserWindow.getAllWindows().forEach((win) => {
    if (hiddenState.get(win.id)) {
      win.show();
    }
  });

  hiddenState.clear();
}

function isPanic() {
  return isPanicked;
}

module.exports = { register, toggle, hide, restore, isPanic };
