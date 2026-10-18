'use strict';

const boardElement = document.getElementById('board');
const mineCountElement = document.getElementById('mine-count');
const timerElement = document.getElementById('timer');
const messageElement = document.getElementById('message');
const resetFaceButton = document.getElementById('reset-face');
const flagModeButton = document.getElementById('flag-mode');

let rows = 16;
let cols = 16;
let totalMines = 40;
let cells = [];
let flags = 0;
let revealedCount = 0;
let firstMove = true;
let gameOver = false;
let won = false;
let elapsedSeconds = 0;
let timerInterval = null;
let flagMode = false;

function newGame() {
  rows = 16;
  cols = 16;
  totalMines = 40;
  document.body.classList.remove('expert-mode');
  flags = 0;
  revealedCount = 0;
  firstMove = true;
  gameOver = false;
  won = false;
  elapsedSeconds = 0;
  flagMode = false;
  stopTimer();
  timerElement.textContent = '000';
  resetFaceButton.textContent = '🙂';
  flagModeButton.classList.remove('active');
  flagModeButton.setAttribute('aria-pressed', 'false');
  flagModeButton.textContent = '⚑ Flag mode: off';
  messageElement.textContent = 'Choose a square to begin.';
  messageElement.className = 'message';

  cells = Array.from({ length: rows * cols }, (_, index) => ({
    index,
    row: Math.floor(index / cols),
    col: index % cols,
    mine: false,
    adjacent: 0,
    revealed: false,
    flagged: false,
    exploded: false
  }));

  // Mines are placed randomly after the first click, so that first square is always safe.
  renderBoard();
  updateMineCounter();
}

function renderBoard() {
  boardElement.innerHTML = '';
  boardElement.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size, 31px))`;
  boardElement.setAttribute('aria-rowcount', rows);
  boardElement.setAttribute('aria-colcount', cols);

  const fragment = document.createDocumentFragment();
  cells.forEach((cell) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cell';
    button.setAttribute('role', 'gridcell');
    button.dataset.index = cell.index;
    button.setAttribute('aria-label', `Row ${cell.row + 1}, column ${cell.col + 1}, covered`);
    button.addEventListener('click', () => handleCellClick(cell.index));
    // Chord-click (left + right mouse buttons together) on a revealed number.
    button.addEventListener('mousedown', (event) => {
      if (event.buttons === 3) {
        event.preventDefault();
        chordCell(cell.index);
      }
    });
    button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      // Right-clicking a revealed number also supports the usual quick-clear action.
      if (cells[cell.index].revealed && cells[cell.index].adjacent > 0) {
        chordCell(cell.index);
      } else {
        toggleFlag(cell.index);
      }
    });
    fragment.appendChild(button);
  });
  boardElement.appendChild(fragment);
}

function placeMines(safeIndex) {
  // Keep the first click and its surrounding 3x3 area mine-free. This guarantees
  // the first click is a zero and starts a flood-fill, instead of often opening
  // just one numbered square. Mines remain randomized everywhere else.
  const safeZone = new Set([safeIndex, ...getNeighbors(safeIndex)]);
  const eligible = cells.filter((cell) => !safeZone.has(cell.index));
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }
  eligible.slice(0, totalMines).forEach((cell) => { cell.mine = true; });

  cells.forEach((cell) => {
    if (!cell.mine) {
      cell.adjacent = getNeighbors(cell.index).filter((neighbor) => cells[neighbor].mine).length;
    }
  });
}

function getNeighbors(index) {
  const row = Math.floor(index / cols);
  const col = index % cols;
  const neighbors = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
    for (let colOffset = -1; colOffset <= 1; colOffset++) {
      if (rowOffset === 0 && colOffset === 0) continue;
      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;
      if (nextRow >= 0 && nextRow < rows && nextCol >= 0 && nextCol < cols) {
        neighbors.push(nextRow * cols + nextCol);
      }
    }
  }
  return neighbors;
}

function handleCellClick(index) {
  if (gameOver) return;
  if (flagMode) {
    toggleFlag(index);
    return;
  }
  const cell = cells[index];
  if (cell.revealed || cell.flagged) return;

  if (firstMove) {
    placeMines(index);
    firstMove = false;
    startTimer();
  }
  revealCell(index);
  if (cell.mine) {
    cell.exploded = true;
    endGame(false);
    return;
  }
  checkWin();
  renderCell(index);
}

function revealCell(index) {
  const cell = cells[index];
  if (cell.revealed || cell.flagged || gameOver) return;
  cell.revealed = true;
  revealedCount++;
  renderCell(index);

  // Flood-fill empty spaces so a zero opens its surrounding safe area.
  if (!cell.mine && cell.adjacent === 0) {
    getNeighbors(index).forEach((neighborIndex) => {
      const neighbor = cells[neighborIndex];
      if (!neighbor.revealed && !neighbor.mine && !neighbor.flagged) {
        revealCell(neighborIndex);
      }
    });
  }
}


function chordCell(index) {
  if (gameOver) return;
  const cell = cells[index];
  if (!cell.revealed || cell.mine || cell.adjacent === 0) return;

  const neighbors = getNeighbors(index);
  const flaggedNeighbors = neighbors.filter((neighborIndex) => cells[neighborIndex].flagged).length;

  // Only clear surrounding covered squares when the number of flags matches
  // the number shown on this revealed square.
  if (flaggedNeighbors !== cell.adjacent) {
    messageElement.textContent = `Quick clear needs ${cell.adjacent} flag${cell.adjacent === 1 ? '' : 's'} around this number; ${flaggedNeighbors} currently placed.`;
    messageElement.className = 'message';
    return;
  }

  for (const neighborIndex of neighbors) {
    const neighbor = cells[neighborIndex];
    if (neighbor.revealed || neighbor.flagged) continue;
    if (neighbor.mine) {
      neighbor.revealed = true;
      neighbor.exploded = true;
      renderCell(neighborIndex);
      endGame(false);
      return;
    }
    revealCell(neighborIndex);
  }
  checkWin();
}

function toggleFlag(index) {
  if (gameOver) return;
  const cell = cells[index];
  if (cell.revealed) return;
  if (!cell.flagged && flags >= totalMines) {
    messageElement.textContent = 'You have used all your flags. Remove one to flag another square.';
    return;
  }
  cell.flagged = !cell.flagged;
  flags += cell.flagged ? 1 : -1;
  updateMineCounter();
  renderCell(index);
  messageElement.textContent = cell.flagged ? 'Flag placed.' : 'Flag removed.';
  messageElement.className = 'message';
}

function renderCell(index) {
  const cell = cells[index];
  const button = boardElement.querySelector(`[data-index="${index}"]`);
  if (!button) return;
  button.className = 'cell';
  button.textContent = '';

  if (cell.flagged && !cell.revealed) {
    button.classList.add('flagged');
    button.textContent = '⚑';
    button.setAttribute('aria-label', `Row ${cell.row + 1}, column ${cell.col + 1}, flagged`);
    return;
  }
  if (cell.revealed) {
    button.classList.add('revealed');
    if (cell.mine) {
      button.classList.add(cell.exploded ? 'mine-hit' : 'mine-shown');
      button.textContent = '✹';
      button.setAttribute('aria-label', `Row ${cell.row + 1}, column ${cell.col + 1}, mine`);
    } else if (cell.adjacent > 0) {
      button.classList.add(`n${cell.adjacent}`);
      button.textContent = String(cell.adjacent);
      button.setAttribute('aria-label', `Row ${cell.row + 1}, column ${cell.col + 1}, ${cell.adjacent} adjacent mines`);
    } else {
      button.setAttribute('aria-label', `Row ${cell.row + 1}, column ${cell.col + 1}, empty`);
    }
    return;
  }
  button.setAttribute('aria-label', `Row ${cell.row + 1}, column ${cell.col + 1}, covered`);
}

function updateMineCounter() {
  mineCountElement.textContent = String(Math.max(0, totalMines - flags)).padStart(3, '0');
}

function startTimer() {
  if (timerInterval || gameOver) return;
  timerInterval = setInterval(() => {
    elapsedSeconds = Math.min(999, elapsedSeconds + 1);
    timerElement.textContent = String(elapsedSeconds).padStart(3, '0');
    if (elapsedSeconds >= 999) stopTimer();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function endGame(didWin) {
  gameOver = true;
  won = didWin;
  stopTimer();
  resetFaceButton.textContent = didWin ? '😎' : '😵';
  cells.forEach((cell) => {
    if (cell.mine && !cell.flagged) renderCell(cell.index);
    if (!cell.mine && cell.flagged) {
      const button = boardElement.querySelector(`[data-index="${cell.index}"]`);
      if (button) button.classList.add('wrong-flag');
    }
  });
  if (didWin) {
    messageElement.textContent = `Grid cleared in ${elapsedSeconds} second${elapsedSeconds === 1 ? '' : 's'} — nicely done!`;
    messageElement.className = 'message success';
  } else {
    messageElement.textContent = 'Boom! You found a mine. Try another round.';
    messageElement.className = 'message danger';
  }
}

function checkWin() {
  const safeSquares = rows * cols - totalMines;
  if (revealedCount === safeSquares) {
    endGame(true);
    // Automatically flag all remaining mines on a win.
    cells.forEach((cell) => {
      if (cell.mine && !cell.flagged) {
        cell.flagged = true;
        flags++;
        renderCell(cell.index);
      }
    });
    updateMineCounter();
  }
}

function toggleFlagMode() {
  if (gameOver) return;
  flagMode = !flagMode;
  flagModeButton.classList.toggle('active', flagMode);
  flagModeButton.setAttribute('aria-pressed', String(flagMode));
  flagModeButton.textContent = flagMode ? '⚑ Flag mode: on' : '⚑ Flag mode: off';
  messageElement.textContent = flagMode ? 'Flag mode is on. Tap a square to place or remove a flag.' : 'Flag mode is off. Tap a square to reveal it.';
  messageElement.className = 'message';
}

document.getElementById('new-game').addEventListener('click', newGame);
resetFaceButton.addEventListener('click', newGame);
flagModeButton.addEventListener('click', toggleFlagMode);

newGame();
