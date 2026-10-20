/* 
 * Tactical Chess Analyzer
 * Engine: Custom Minimax with Alpha-Beta Pruning & Piece-Square Tables
 */

// متغیرهای سراسری شطرنج
let board = null;
let game = new Chess();
const $status = document.getElementById('aiStatus');
const $bestMoveText = document.getElementById('bestMoveText');

// ارزیابی مهره‌ها
const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// جداول ارزیابی موقعیت (Piece-Square Tables) برای هوش مصنوعی
// این جداول باعث می‌شن هوش مصنوعی مهره‌ها رو به مرکز و موقعیت‌های بهتر هدایت کنه
const pst = {
    p: [
        0,  0,  0,  0,  0,  0,  0,  0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 10, 20, 30, 30, 20, 10, 10,
        5,  5, 10, 25, 25, 10,  5,  5,
        0,  0,  0, 20, 20,  0,  0,  0,
        5, -5,-10,  0,  0,-10, -5,  5,
        5, 10, 10,-20,-20, 10, 10,  5,
        0,  0,  0,  0,  0,  0,  0,  0
    ],
    n: [
        -50,-40,-30,-30,-30,-30,-40,-50,
        -40,-20,  0,  0,  0,  0,-20,-40,
        -30,  0, 10, 15, 15, 10,  0,-30,
        -30,  5, 15, 20, 20, 15,  5,-30,
        -30,  0, 15, 20, 20, 15,  0,-30,
        -30,  5, 10, 15, 15, 10,  5,-30,
        -40,-20,  0,  5,  5,  0,-20,-40,
        -50,-40,-30,-30,-30,-30,-40,-50
    ],
    b: [
        -20,-10,-10,-10,-10,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5, 10, 10,  5,  0,-10,
        -10,  5,  5, 10, 10,  5,  5,-10,
        -10,  0, 10, 10, 10, 10,  0,-10,
        -10, 10, 10, 10, 10, 10, 10,-10,
        -10,  5,  0,  0,  0,  0,  5,-10,
        -20,-10,-10,-10,-10,-10,-10,-20
    ],
    r: [
          0,  0,  0,  0,  0,  0,  0,  0,
          5, 10, 10, 10, 10, 10, 10,  5,
         -5,  0,  0,  0,  0,  0,  0, -5,
         -5,  0,  0,  0,  0,  0,  0, -5,
         -5,  0,  0,  0,  0,  0,  0, -5,
         -5,  0,  0,  0,  0,  0,  0, -5,
         -5,  0,  0,  0,  0,  0,  0, -5,
          0,  0,  0,  5,  5,  0,  0,  0
    ],
    q: [
        -20,-10,-10, -5, -5,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5,  5,  5,  5,  0,-10,
         -5,  0,  5,  5,  5,  5,  0, -5,
          0,  0,  5,  5,  5,  5,  0, -5,
        -10,  5,  5,  5,  5,  5,  0,-10,
        -10,  0,  5,  0,  0,  0,  0,-10,
        -20,-10,-10, -5, -5,-10,-10,-20
    ],
    k: [
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -20,-30,-30,-40,-40,-30,-30,-20,
        -10,-20,-20,-20,-20,-20,-20,-10,
         20, 20,  0,  0,  0,  0, 20, 20,
         20, 30, 10,  0,  0, 10, 30, 20
    ]
};

// تابع ارزیابی صفحه (ارزش مهره + موقعیت)
function evaluateBoard(game) {
    if (game.in_checkmate()) {
        return game.turn() === 'w' ? -99999 : 99999;
    }
    if (game.in_draw() || game.in_threefold_repetition() || game.insufficient_material()) {
        return 0;
    }

    let totalEvaluation = 0;
    const board = game.board();

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (piece) {
                const isWhite = piece.color === 'w';
                const val = pieceValues[piece.type];
                // محاسبه PST (جدول برای سفید و سیاه متفاوت است)
                const pstVal = isWhite ? pst[piece.type][i * 8 + j] : pst[piece.type][(7 - i) * 8 + j];
                const total = val + pstVal;
                totalEvaluation += isWhite ? total : -total;
            }
        }
    }
    return totalEvaluation;
}

// الگوریتم Minimax با هرس Alpha-Beta
function minimax(game, depth, alpha, beta, isMaximizingPlayer) {
    if (depth === 0 || game.game_over()) {
        return evaluateBoard(game);
    }

    const moves = game.moves({ verbose: true });
    // مرتب‌سازی حرکات برای افزایش سرعت هرس (حرکات ضربه زدن اولویت دارند)
    moves.sort((a, b) => (b.captured ? pieceValues[b.captured] : 0) - (a.captured ? pieceValues[a.captured] : 0));

    if (isMaximizingPlayer) {
        let maxEval = -Infinity;
        for (let i = 0; i < moves.length; i++) {
            game.move(moves[i]);
            let eval = minimax(game, depth - 1, alpha, beta, false);
            game.undo();
            maxEval = Math.max(maxEval, eval);
            alpha = Math.max(alpha, eval);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let i = 0; i < moves.length; i++) {
            game.move(moves[i]);
            let eval = minimax(game, depth - 1, alpha, beta, true);
            game.undo();
            minEval = Math.min(minEval, eval);
            beta = Math.min(beta, eval);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

// پیدا کردن بهترین حرکت
function findBestMove(game, depth) {
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) return null;
    
    let bestMove = null;
    let bestValue = game.turn() === 'w' ? -Infinity : Infinity;
    const isMaximizing = game.turn() === 'w';

    // مرتب‌سازی برای بهینه‌سازی
    moves.sort((a, b) => (b.captured ? pieceValues[b.captured] : 0) - (a.captured ? pieceValues[a.captured] : 0));

    for (let i = 0; i < moves.length; i++) {
        game.move(moves[i]);
        let value = minimax(game, depth - 1, -Infinity, Infinity, !isMaximizing);
        game.undo();

        if (isMaximizing) {
            if (value > bestValue) { bestValue = value; bestMove = moves[i]; }
        } else {
            if (value < bestValue) { bestValue = value; bestMove = moves[i]; }
        }
    }
    return bestMove;
}

// آپدیت وضعیت صفحه
function updateStatus() {
    let status = '';
    let moveColor = game.turn() === 'w' ? 'سفید' : 'سیاه';

    if (game.in_checkmate()) {
        status = `شاه مات! ${moveColor} برنده شد.`;
        $bestMoveText.innerText = '-';
    } else if (game.in_draw()) {
        status = 'مساوی شد';
        $bestMoveText.innerText = '-';
    } else {
        status = `نوبت: ${moveColor}`;
        if (game.in_check()) status += ' (کیش)';
    }
    $status.innerText = status;
}

// وقتی مهره‌ای جابجا میشه
function onDrop(source, target) {
    const move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback';
    updateStatus();
    setTimeout(askEngine, 50);
}

function onSnapEnd() {
    board.position(game.fen());
}

// درخواست از موتور (با کمی تاخیر برای جلوگیری از فریز شدن UI)
function askEngine() {
    if (game.game_over()) return;
    $bestMoveText.innerText = '...';
    $status.innerText = 'در حال محاسبه...';

    // استفاده از setTimeout برای اینکه UI فریز نشه
    setTimeout(() => {
        // عمق جستجو = 3 (برای سرعت بالا و دقت خوب)
        const bestMove = findBestMove(game, 3);
        
        if (bestMove) {
            $bestMoveText.innerText = bestMove.san;
            $status.innerText = `پیشنهاد برای ${game.turn() === 'w' ? 'سفید' : 'سیاه'}`;
        } else {
            $bestMoveText.innerText = 'بدون حرکت';
        }
    }, 100);
}

// ==========================================
// مدیریت رابط کاربری (Iframe, Modal, Buttons)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // راه‌اندازی تخته شطرنج
    board = Chessboard('myBoard', {
        draggable: true,
        position: 'start',
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    });

    updateStatus();

    // دکمه‌ها
    document.getElementById('newGameBtn').addEventListener('click', () => {
        game = new Chess();
        board.start();
        updateStatus();
        $bestMoveText.innerText = '-';
    });

    document.getElementById('undoBtn').addEventListener('click', () => {
        game.undo();
        game.undo(); // برگرداندن دو حرکت (حرکت خودت و حریف)
        board.position(game.fen());
        updateStatus();
        $bestMoveText.innerText = '-';
    });

    document.getElementById('flipBtn').addEventListener('click', () => {
        board.flip();
    });

    document.getElementById('analyzeBtn').addEventListener('click', () => {
        askEngine();
    });

    // مدیریت Iframe
    document.getElementById('loadUrlBtn').addEventListener('click', () => {
        let url = document.getElementById('targetUrl').value.trim();
        if (!url) return alert('لطفاً یک آدرس معتبر وارد کنید.');
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        
        const iframe = document.getElementById('targetFrame');
        const placeholder = document.getElementById('iframePlaceholder');
        
        placeholder.innerHTML = '<p>در حال بارگذاری...</p>';
        iframe.src = url;
        iframe.style.display = 'block';

        // تایم اوت برای بررسی اینکه آیا لود شده یا نه
        setTimeout(() => {
            try {
                // اگر سایت لود نشده باشد یا مسدود شده باشد، معمولاً خطا می‌دهد
                // اینجا فقط یک هشدار نمایش می‌دهیم که اگر خالی بود، از آموزش استفاده کند
            } catch(e) {}
        }, 3000);
    });

    // مدیریت مودال آموزش
    const modal = document.getElementById('tutorialModal');
    const helpBtn = document.getElementById('helpBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const okBtn = document.getElementById('modalOkBtn');

    helpBtn.addEventListener('click', () => modal.classList.add('active'));
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    okBtn.addEventListener('click', () => modal.classList.remove('active'));
    
    // بستن با کلیک بیرون
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    // ریسایز تخته
    window.addEventListener('resize', () => board.resize());
});
