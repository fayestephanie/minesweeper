MINESWEEPER WEBSITE

Files
- index.html: page structure
- styles.css: styling and responsive layout
- script.js: randomized mines and game logic

Game settings
- Fixed Intermediate mode: 16 rows × 16 columns, 40 randomly placed mines.
- The first click and its surrounding 3×3 area are mine-free, helping reveal a larger safe area.

How to play
1. Open index.html in a modern browser.
2. Click a square to reveal it.
3. Right-click a covered square to place/remove a flag on desktop.
4. On touch screens, turn on Flag mode, then tap squares to place/remove flags.
5. Quick clear: on a revealed number, use left + right mouse buttons together (or right-click the number). It clears adjacent covered squares only when the surrounding flag count matches the number. Incorrect flags can still cause a mine to be revealed.
6. Reveal all non-mine squares to win.

No game API is needed: the board and random mine placement run locally in JavaScript. Google Fonts is used for typography; system fonts are used as fallback.
