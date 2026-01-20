// ゲームの設定
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

// キャンバスの取得
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

// UI要素の取得
const scoreElement = document.getElementById('score');
const linesElement = document.getElementById('lines');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

// ゲーム状態
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let lines = 0;
let gameLoop = null;
let isPlaying = false;
let isPaused = false;
let speed = 5;

// テトリミノの形状
const SHAPES = [
    // I
    {
        shape: [[1, 1, 1, 1]],
        color: '#00d4ff'
    },
    // O
    {
        shape: [[1, 1], [1, 1]],
        color: '#ffdd00'
    },
    // T
    {
        shape: [[0, 1, 0], [1, 1, 1]],
        color: '#aa00ff'
    },
    // S
    {
        shape: [[0, 1, 1], [1, 1, 0]],
        color: '#00ff00'
    },
    // Z
    {
        shape: [[1, 1, 0], [0, 1, 1]],
        color: '#ff0000'
    },
    // J
    {
        shape: [[1, 0, 0], [1, 1, 1]],
        color: '#0000ff'
    },
    // L
    {
        shape: [[0, 0, 1], [1, 1, 1]],
        color: '#ff8800'
    }
];

// ボードの初期化
function initBoard() {
    board = [];
    for (let row = 0; row < ROWS; row++) {
        board[row] = [];
        for (let col = 0; col < COLS; col++) {
            board[row][col] = 0;
        }
    }
}

// ランダムなピースを生成
function randomPiece() {
    const index = Math.floor(Math.random() * SHAPES.length);
    const piece = SHAPES[index];
    return {
        shape: piece.shape.map(row => [...row]),
        color: piece.color,
        x: Math.floor(COLS / 2) - Math.floor(piece.shape[0].length / 2),
        y: 0
    };
}

// ピースを描画
function drawPiece(piece, context, offsetX = 0, offsetY = 0, blockSize = BLOCK_SIZE) {
    context.fillStyle = piece.color;
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const drawX = (piece.x + x + offsetX) * blockSize;
                const drawY = (piece.y + y + offsetY) * blockSize;
                context.fillRect(drawX + 1, drawY + 1, blockSize - 2, blockSize - 2);

                // ハイライト効果
                context.fillStyle = 'rgba(255, 255, 255, 0.3)';
                context.fillRect(drawX + 1, drawY + 1, blockSize - 2, 4);
                context.fillStyle = piece.color;
            }
        });
    });
}

// ボードを描画
function drawBoard() {
    // ボードをクリア
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッドを描画
    ctx.strokeStyle = '#1a1a3a';
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            ctx.strokeRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
    }

    // 固定されたブロックを描画
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                ctx.fillStyle = value;
                ctx.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);

                // ハイライト効果
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, 4);
            }
        });
    });

    // 現在のピースを描画
    if (currentPiece) {
        drawPiece(currentPiece, ctx);
    }
}

// 次のピースを描画
function drawNextPiece() {
    nextCtx.fillStyle = '#0a0a1a';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (nextPiece) {
        const blockSize = 25;
        const offsetX = (nextCanvas.width - nextPiece.shape[0].length * blockSize) / 2;
        const offsetY = (nextCanvas.height - nextPiece.shape.length * blockSize) / 2;

        nextCtx.fillStyle = nextPiece.color;
        nextPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    nextCtx.fillRect(
                        offsetX + x * blockSize + 1,
                        offsetY + y * blockSize + 1,
                        blockSize - 2,
                        blockSize - 2
                    );
                }
            });
        });
    }
}

// 衝突判定
function collision(piece, offsetX = 0, offsetY = 0) {
    return piece.shape.some((row, y) => {
        return row.some((value, x) => {
            if (!value) return false;
            const newX = piece.x + x + offsetX;
            const newY = piece.y + y + offsetY;
            return (
                newX < 0 ||
                newX >= COLS ||
                newY >= ROWS ||
                (newY >= 0 && board[newY][newX])
            );
        });
    });
}

// ピースを固定
function lockPiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const boardY = currentPiece.y + y;
                const boardX = currentPiece.x + x;
                if (boardY >= 0) {
                    board[boardY][boardX] = currentPiece.color;
                }
            }
        });
    });
}

// ライン消去チェック
function clearLines() {
    let linesCleared = 0;

    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row].every(cell => cell !== 0)) {
            board.splice(row, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            row++;
        }
    }

    if (linesCleared > 0) {
        lines += linesCleared;
        // スコア計算（複数ライン同時消しでボーナス）
        const points = [0, 100, 300, 500, 800];
        score += points[linesCleared] || 800;
        updateScore();
    }
}

// スコア更新
function updateScore() {
    scoreElement.textContent = score;
    linesElement.textContent = lines;
}

// ピースを回転
function rotatePiece() {
    const rotated = currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map(row => row[i]).reverse()
    );

    const originalShape = currentPiece.shape;
    currentPiece.shape = rotated;

    // 壁キック（回転後に壁にめり込んでいたら調整）
    if (collision(currentPiece)) {
        // 左に移動してみる
        currentPiece.x--;
        if (collision(currentPiece)) {
            // 右に移動してみる
            currentPiece.x += 2;
            if (collision(currentPiece)) {
                // どちらもダメなら元に戻す
                currentPiece.x--;
                currentPiece.shape = originalShape;
            }
        }
    }
}

// ピースを移動
function movePiece(dir) {
    currentPiece.x += dir;
    if (collision(currentPiece)) {
        currentPiece.x -= dir;
    }
}

// ピースを落とす
function dropPiece() {
    currentPiece.y++;
    if (collision(currentPiece)) {
        currentPiece.y--;
        lockPiece();
        clearLines();
        spawnPiece();
    }
}

// ピースを一気に落とす
function hardDrop() {
    while (!collision(currentPiece, 0, 1)) {
        currentPiece.y++;
        score += 2;
    }
    lockPiece();
    clearLines();
    spawnPiece();
    updateScore();
}

// 新しいピースを生成
function spawnPiece() {
    currentPiece = nextPiece || randomPiece();
    nextPiece = randomPiece();
    drawNextPiece();

    // ゲームオーバーチェック
    if (collision(currentPiece)) {
        gameOver();
    }
}

// ゲームオーバー
function gameOver() {
    isPlaying = false;
    clearInterval(gameLoop);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`スコア: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

    startBtn.textContent = 'もう一度';
}

// スピードから落下間隔を計算（1=遅い、10=速い）
function getDropInterval() {
    // スピード1: 1000ms, スピード10: 100ms
    return 1000 - (speed - 1) * 100;
}

// ゲームループ開始
function startGameLoop() {
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(() => {
        if (!isPaused) {
            dropPiece();
            drawBoard();
        }
    }, getDropInterval());
}

// ゲーム開始
function startGame() {
    initBoard();
    score = 0;
    lines = 0;
    updateScore();
    spawnPiece();
    isPlaying = true;
    isPaused = false;
    startBtn.textContent = 'リスタート';
    pauseBtn.textContent = '一時停止';
    startGameLoop();
    drawBoard();
}

// 一時停止
function togglePause() {
    if (!isPlaying) return;

    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? '再開' : '一時停止';

    if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    } else {
        drawBoard();
    }
}

// キーボード操作
document.addEventListener('keydown', (e) => {
    // 矢印キーとスペースキーのブラウザデフォルト動作を防ぐ
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
    }

    if (!isPlaying || isPaused) return;

    switch (e.key) {
        case 'ArrowLeft':
            movePiece(-1);
            break;
        case 'ArrowRight':
            movePiece(1);
            break;
        case 'ArrowUp':
            rotatePiece();
            break;
        case 'ArrowDown':
            dropPiece();
            score += 1;
            updateScore();
            break;
        case ' ':
            hardDrop();
            break;
    }
    drawBoard();
});

// リセット機能
function resetGame() {
    clearInterval(gameLoop);
    isPlaying = false;
    isPaused = false;
    score = 0;
    lines = 0;
    speed = 5;
    speedSlider.value = 5;
    speedValue.textContent = 5;
    updateScore();
    initBoard();
    currentPiece = null;
    nextPiece = null;
    drawBoard();
    drawNextPiece();
    startBtn.textContent = 'スタート';
    pauseBtn.textContent = '一時停止';
}

// ボタンイベント
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', resetGame);

// スピードスライダー
speedSlider.addEventListener('input', (e) => {
    speed = parseInt(e.target.value);
    speedValue.textContent = speed;
    if (isPlaying && !isPaused) {
        startGameLoop();
    }
});

// 初期描画
initBoard();
drawBoard();
drawNextPiece();
