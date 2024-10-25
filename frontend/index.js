import { backend } from 'declarations/backend';

const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;
const COLORS = [
    '#FF0D72', '#0DC2FF', '#0DFF72', '#F538FF',
    '#FF8E0D', '#FFE138', '#3877FF'
];

const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const nextPieceCanvas = document.getElementById('next-piece');
const nextPieceCtx = nextPieceCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const startButton = document.getElementById('start-button');
const gameOverModal = new bootstrap.Modal(document.getElementById('game-over-modal'));
const finalScoreElement = document.getElementById('final-score');
const finalHighScoreElement = document.getElementById('final-high-score');
const playAgainButton = document.getElementById('play-again-button');

canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;
nextPieceCanvas.width = 4 * BLOCK_SIZE;
nextPieceCanvas.height = 4 * BLOCK_SIZE;

ctx.scale(BLOCK_SIZE, BLOCK_SIZE);
nextPieceCtx.scale(BLOCK_SIZE, BLOCK_SIZE);

const SHAPES = [
    [[1, 1, 1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1, 1], [0, 1, 0]],
    [[1, 1, 1], [1, 0, 0]],
    [[1, 1, 1], [0, 0, 1]],
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1, 1], [1, 1, 0]]
];

let board = createBoard();
let currentPiece = null;
let nextPiece = null;
let score = 0;
let highScore = 0;
let gameLoop = null;

function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function drawBoard() {
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                ctx.fillStyle = COLORS[value - 1];
                ctx.fillRect(x, y, 1, 1);
            }
        });
    });
}

function drawPiece(piece, offsetX, offsetY, context) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                context.fillStyle = COLORS[piece.color];
                context.fillRect(x + offsetX, y + offsetY, 1, 1);
            }
        });
    });
}

function createPiece() {
    const shapeIndex = Math.floor(Math.random() * SHAPES.length);
    return {
        shape: SHAPES[shapeIndex],
        color: shapeIndex,
        x: Math.floor(COLS / 2) - Math.ceil(SHAPES[shapeIndex][0].length / 2),
        y: 0
    };
}

function rotatePiece(piece) {
    const rotated = piece.shape[0].map((_, index) =>
        piece.shape.map(row => row[index]).reverse()
    );
    if (isValidMove(rotated, piece.x, piece.y)) {
        piece.shape = rotated;
    }
}

function isValidMove(shape, x, y) {
    return shape.every((row, dy) =>
        row.every((value, dx) =>
            value === 0 || (
                x + dx >= 0 &&
                x + dx < COLS &&
                y + dy < ROWS &&
                (y + dy < 0 || board[y + dy][x + dx] === 0)
            )
        )
    );
}

function mergePiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                board[y + currentPiece.y][x + currentPiece.x] = currentPiece.color + 1;
            }
        });
    });
}

function clearLines() {
    let linesCleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(value => value > 0)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            y++;
        }
    }
    if (linesCleared > 0) {
        score += linesCleared * 100;
        scoreElement.textContent = score;
    }
}

function drawNextPiece() {
    nextPieceCtx.clearRect(0, 0, 4, 4);
    drawPiece(nextPiece, 0, 0, nextPieceCtx);
}

function gameOver() {
    cancelAnimationFrame(gameLoop);
    finalScoreElement.textContent = score;
    finalHighScoreElement.textContent = highScore;
    gameOverModal.show();
    updateHighScore();
}

async function updateHighScore() {
    if (score > highScore) {
        highScore = score;
        highScoreElement.textContent = highScore;
        try {
            await backend.setHighScore(highScore);
        } catch (error) {
            console.error('Error updating high score:', error);
        }
    }
}

async function getHighScore() {
    try {
        highScore = await backend.getHighScore();
        highScoreElement.textContent = highScore;
    } catch (error) {
        console.error('Error getting high score:', error);
    }
}

function update() {
    if (isValidMove(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
    } else {
        mergePiece();
        clearLines();
        if (currentPiece.y === 0) {
            gameOver();
            return;
        }
        currentPiece = nextPiece;
        nextPiece = createPiece();
        drawNextPiece();
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    drawPiece(currentPiece, currentPiece.x, currentPiece.y, ctx);

    gameLoop = requestAnimationFrame(update);
}

function startGame() {
    board = createBoard();
    currentPiece = createPiece();
    nextPiece = createPiece();
    score = 0;
    scoreElement.textContent = score;
    drawNextPiece();
    cancelAnimationFrame(gameLoop);
    update();
}

document.addEventListener('keydown', event => {
    if (!currentPiece) return;

    if (event.key === 'ArrowLeft' && isValidMove(currentPiece.shape, currentPiece.x - 1, currentPiece.y)) {
        currentPiece.x--;
    } else if (event.key === 'ArrowRight' && isValidMove(currentPiece.shape, currentPiece.x + 1, currentPiece.y)) {
        currentPiece.x++;
    } else if (event.key === 'ArrowDown' && isValidMove(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
    } else if (event.key === ' ') {
        rotatePiece(currentPiece);
    }
});

startButton.addEventListener('click', startGame);
playAgainButton.addEventListener('click', () => {
    gameOverModal.hide();
    startGame();
});

getHighScore();
