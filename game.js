document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const startButton = document.getElementById('start-btn');
    const restartButton = document.getElementById('restart-btn');
    const playerNameInput = document.getElementById('player-name');
    const playerDisplay = document.getElementById('player-display');
    const scoreDisplay = document.getElementById('score');
    const finalScoreDisplay = document.getElementById('final-score');
    const highScoresList = document.getElementById('high-scores');
    const finalHighScoresList = document.getElementById('final-high-scores');
    const gameBoard = document.getElementById('game-board');
    const rotateButton = document.getElementById('rotate-btn');
    const leftButton = document.getElementById('left-btn');
    const downButton = document.getElementById('down-btn');
    const rightButton = document.getElementById('right-btn');

    // Configuración del juego
    const ctx = gameBoard.getContext('2d');
    const blockSize = 30;
    const rows = 20;
    const cols = 10;
    const emojis = ['😀', '🤪', '😎', '🤩', '👽', '🤖', '👻', '🐶', '🦄', '🐙'];
    
    gameBoard.width = cols * blockSize;
    gameBoard.height = rows * blockSize;
    
    // Variables del juego
    let playerName = '';
    let score = 0;
    let gameOver = false;
    let highScores = [];
    let board = Array(rows).fill().map(() => Array(cols).fill(0));
    let currentPiece = null;
    let nextPiece = null;
    let dropStart = Date.now();
    let gameSpeed = 1000; // ms
    let lastScoreUpdate = 0;

    // Clase para las piezas
    class Piece {
        constructor() {
            this.emoji = emojis[Math.floor(Math.random() * emojis.length)];
            this.shape = this.randomShape();
            this.x = Math.floor(cols / 2) - Math.floor(this.shape[0].length / 2);
            this.y = 0;
        }

        randomShape() {
            const shapes = [
                [[1]], // solo un bloque
                [[1, 1]], // dos bloques horizontales
                [[1], [1]], // dos bloques verticales
                [[1, 1], [1, 1]], // cuadrado 2x2
                [[0, 1, 0], [1, 1, 1]], // T
                [[1, 1, 0], [0, 1, 1]], // S
                [[0, 1, 1], [1, 1, 0]], // Z
                [[1, 0, 0], [1, 1, 1]], // L
                [[0, 0, 1], [1, 1, 1]]  // J
            ];
            return shapes[Math.floor(Math.random() * shapes.length)];
        }

        rotate() {
            const N = this.shape.length;
            const newShape = Array(N).fill().map(() => Array(N).fill(0));
            
            for (let y = 0; y < N; y++) {
                for (let x = 0; x < N; x++) {
                    newShape[x][N - 1 - y] = this.shape[y][x];
                }
            }
            
            // Verificar si la rotación es válida
            const oldShape = this.shape;
            this.shape = newShape;
            if (this.collision()) {
                this.shape = oldShape;
            }
        }
        
        collision() {
            for (let y = 0; y < this.shape.length; y++) {
                for (let x = 0; x < this.shape[y].length; x++) {
                    if (!this.shape[y][x]) continue;
                    
                    const newX = this.x + x;
                    const newY = this.y + y;
                    
                    if (newX < 0 || newX >= cols || newY >= rows) {
                        return true;
                    }
                    
                    if (newY < 0) continue;
                    
                    if (board[newY][newX]) {
                        return true;
                    }
                }
            }
            return false;
        }
    }

    // Funciones del juego
    function drawBlock(x, y, emoji) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
        ctx.strokeStyle = '#1d3557';
        ctx.strokeRect(x * blockSize, y * blockSize, blockSize, blockSize);
        
        // Dibujar emoji
        ctx.font = `${blockSize * 0.8}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000000';
        ctx.fillText(emoji, x * blockSize + blockSize / 2, y * blockSize + blockSize / 2);
    }

    function drawBoard() {
        ctx.clearRect(0, 0, gameBoard.width, gameBoard.height);
        
        // Dibujar piezas en el tablero
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if (board[y][x]) {
                    drawBlock(x, y, board[y][x]);
                }
            }
        }
        
        // Dibujar pieza actual
        if (currentPiece) {
            for (let y = 0; y < currentPiece.shape.length; y++) {
                for (let x = 0; x < currentPiece.shape[y].length; x++) {
                    if (currentPiece.shape[y][x]) {
                        drawBlock(currentPiece.x + x, currentPiece.y + y, currentPiece.emoji);
                    }
                }
            }
        }
    }

    function movePiece(direction) {
        if (gameOver) return;
        
        switch(direction) {
            case 'left':
                currentPiece.x--;
                if (currentPiece.collision()) currentPiece.x++;
                break;
            case 'right':
                currentPiece.x++;
                if (currentPiece.collision()) currentPiece.x--;
                break;
            case 'down':
                currentPiece.y++;
                if (currentPiece.collision()) {
                    currentPiece.y--;
                    lockPiece();
                    checkRows();
                    newPiece();
                }
                dropStart = Date.now();
                break;
        }
        
        drawBoard();
    }

    function rotatePiece() {
        if (gameOver) return;
        currentPiece.rotate();
        drawBoard();
    }

    function lockPiece() {
        for (let y = 0; y < currentPiece.shape.length; y++) {
            for (let x = 0; x < currentPiece.shape[y].length; x++) {
                if (!currentPiece.shape[y][x]) continue;
                
                if (currentPiece.y + y < 0) {
                    gameOver = true;
                    endGame();
                    return;
                }
                
                board[currentPiece.y + y][currentPiece.x + x] = currentPiece.emoji;
            }
        }
    }

    function checkRows() {
        let linesCleared = 0;
        
        outer: for (let y = rows - 1; y >= 0; y--) {
            for (let x = 0; x < cols; x++) {
                if (!board[y][x]) continue outer;
            }
            
            // Eliminar la línea
            board.splice(y, 1);
            board.unshift(Array(cols).fill(0));
            linesCleared++;
            y++; // Revisar la misma fila otra vez
        }
        
        if (linesCleared > 0) {
            // Actualizar puntuación
            const now = Date.now();
            const timeBonus = Math.max(0, 500 - (now - lastScoreUpdate)) / 100;
            lastScoreUpdate = now;
            
            const linePoints = [0, 100, 300, 500, 800][linesCleared];
            score += linePoints * (1 + timeBonus);
            updateScore();
            
            // Aumentar dificultad
            gameSpeed = Math.max(100, gameSpeed - (linesCleared * 20));
        }
    }

    function newPiece() {
        currentPiece = new Piece();
        if (currentPiece.collision()) {
            gameOver = true;
            endGame();
        }
    }

    function updateScore() {
        scoreDisplay.textContent = Math.floor(score);
    }

    function updateHighScores() {
        // Agregar nueva puntuación
        highScores.push({ name: playerName, score: Math.floor(score) });
        
        // Ordenar y mantener solo las 5 mejores
        highScores.sort((a, b) => b.score - a.score);
        highScores = highScores.slice(0, 5);
        
        // Actualizar las listas
        updateHighScoresList(highScoresList, highScores);
        updateHighScoresList(finalHighScoresList, highScores);
    }

    function updateHighScoresList(listElement, scores) {
        listElement.innerHTML = '';
        scores.forEach((entry, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${entry.name}: ${entry.score}`;
            listElement.appendChild(li);
        });
    }

    function endGame() {
        updateHighScores();
        finalScoreDisplay.textContent = `Puntuación: ${Math.floor(score)}`;
        gameScreen.classList.add('hidden');
        gameOverScreen.classList.remove('hidden');
    }

    function resetGame() {
        board = Array(rows).fill().map(() => Array(cols).fill(0));
        score = 0;
        gameOver = false;
        gameSpeed = 1000;
        updateScore();
        newPiece();
        drawBoard();
    }

    // Event listeners
    startButton.addEventListener('click', () => {
        playerName = playerNameInput.value.trim() || 'Anónimo';
        playerDisplay.textContent = playerName;
        startScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        resetGame();
    });

    restartButton.addEventListener('click', () => {
        gameOverScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        resetGame();
    });

    rotateButton.addEventListener('click', rotatePiece);
    leftButton.addEventListener('click', () => movePiece('left'));
    downButton.addEventListener('click', () => movePiece('down'));
    rightButton.addEventListener('click', () => movePiece('right'));

    // Controles de teclado
    document.addEventListener('keydown', (e) => {
        if (gameOver) return;
        
        switch(e.key) {
            case 'ArrowLeft':
                movePiece('left');
                break;
            case 'ArrowRight':
                movePiece('right');
                break;
            case 'ArrowDown':
                movePiece('down');
                break;
            case 'ArrowUp':
                rotatePiece();
                break;
        }
    });

    // Bucle del juego
    function gameLoop() {
        const now = Date.now();
        const delta = now - dropStart;
        
        if (!gameOver) {
            if (delta > gameSpeed) {
                movePiece('down');
            }
            requestAnimationFrame(gameLoop);
        }
    }

    // Iniciar el bucle del juego
    gameLoop();
});
