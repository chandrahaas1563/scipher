// ============================================================
// js/taboo-game.js
// Real Taboo game engine - word pack, timer, scoring
// Add <script src="./js/taboo-game.js"></script> to taboo-player.html
// ============================================================

(function () {

    // ── Game State ────────────────────────────────────────────
    var state = {
        words: [],           // shuffled word pool for this game
        currentIndex: 0,     // index into words[]
        currentWord: null,   // { word, taboo[] }
        timeLeft: 60,        // seconds remaining this turn
        timerInterval: null,
        scores: { team1: 0, team2: 0 },
        currentTeam: 1,
        wordsRevealed: 0,
        wordsSkipped: 0,
        gameStarted: false,
        difficulty: 'easy',  // read from localStorage (set in create-taboo.html)
        wordsPerTurn: 7
    };

    // ── Load settings saved by create-taboo page ──────────────
    var settings = JSON.parse(localStorage.getItem('taboo_settings') || '{}');
    state.difficulty    = settings.difficulty    || 'easy';
    state.timeLeft      = parseInt(settings.timePerTurn) || 60;
    state.wordsPerTurn  = parseInt(settings.wordsPerTurn) || 7;
    var originalTime    = state.timeLeft;

    // ── Load Word Pack ─────────────────────────────────────────
    fetch('./assets/data/taboo-words.json')
        .then(function (res) { return res.json(); })
        .then(function (data) {
            var pool = [];

            // Add official pack if selected
            if (settings.useOfficialPack !== false) {
                pool = pool.concat(data[state.difficulty] || data['easy']);
            }

            // Add custom words if any
            if (settings.customWords && settings.customWords.length > 0) {
                var customPool = settings.customWords.map(function(w) {
                    return { word: w, taboo: [] }; // custom words have no taboo words
                });
                pool = pool.concat(customPool);
            }

            if (pool.length === 0) {
                updateGameLog('⚠️ No words loaded. Please go back and select a word pack.');
                return;
            }

            state.words = shuffle(pool);

            var packInfo = [];
            if (settings.useOfficialPack !== false) packInfo.push('Official Pack (' + capitalize(state.difficulty) + ')');
            if (settings.customWords && settings.customWords.length > 0) packInfo.push(settings.customWords.length + ' custom words');

            console.log('✅ Loaded ' + state.words.length + ' words');
            updateGameLog('Loaded <strong>' + state.words.length + ' words</strong> — ' + packInfo.join(' + ') + '. ' +
                'Each turn: <strong>' + state.wordsPerTurn + ' words</strong>, <strong>' + originalTime + ' seconds</strong>. Press Start Turn to begin!');
        })
        .catch(function (err) {
            console.error('Failed to load word pack:', err);
            updateGameLog('⚠️ Could not load word pack. Make sure taboo-words.json is in assets/data/');
        });

    // ── DOM References ─────────────────────────────────────────
    var timerEl       = document.getElementById('player-timer-value');
    var timerCircle   = document.querySelector('.taboo-start-color-bg');
    var enterWorldEl  = document.querySelector('.enter-world p');
    var submitBtn     = document.querySelector('.btn-start');
    var wordInput     = document.querySelector('.taboo__search-form .form-row-input');
    var gameLogEl     = document.querySelector('.taboo__gamelog-content');
    var scoreEls      = document.querySelectorAll('.boards__score-score span');

    // ── Inject Start Turn + Skip buttons into the UI ──────────
    var searchArea = document.querySelector('.taboo__search');
    if (searchArea) {
        var controlsDiv = document.createElement('div');
        controlsDiv.style.cssText = 'display:flex; gap:10px; margin-bottom:12px; flex-wrap:wrap;';
        controlsDiv.innerHTML = `
            <button type="button" id="start-turn-btn" class="btn btn-start" style="background:#00e5ff; color:#000; padding:8px 20px; border-radius:6px; font-weight:600; cursor:pointer;">
                ▶ Start Turn
            </button>
            <button type="button" id="skip-btn" class="btn" style="background:rgba(255,100,0,0.3); color:#fff; padding:8px 20px; border-radius:6px; cursor:pointer; display:none;">
                ⏭ Skip Word
            </button>
            <button type="button" id="end-turn-btn" class="btn" style="background:rgba(255,50,50,0.3); color:#fff; padding:8px 20px; border-radius:6px; cursor:pointer; display:none;">
                ⏹ End Turn
            </button>
        `;
        searchArea.insertBefore(controlsDiv, searchArea.firstChild);

        document.getElementById('start-turn-btn').addEventListener('click', startTurn);
        document.getElementById('skip-btn').addEventListener('click', skipWord);
        document.getElementById('end-turn-btn').addEventListener('click', endTurn);
    }

    // ── Inject Current Word Display ────────────────────────────
    var wordDisplay = document.createElement('div');
    wordDisplay.id = 'current-word-display';
    wordDisplay.style.cssText = 'display:none; margin-bottom:16px;';
    wordDisplay.innerHTML = `
        <div style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:12px; padding:20px; text-align:center;">
            <p style="color:rgba(255,255,255,0.5); font-size:0.75rem; text-transform:uppercase; letter-spacing:2px; margin-bottom:8px;">Describe this word</p>
            <h2 id="target-word" style="color:#fff; font-size:2rem; font-weight:700; margin-bottom:16px;"></h2>
            <p style="color:rgba(255,255,255,0.4); font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Do NOT say these words:</p>
            <div id="taboo-words-list" style="display:flex; flex-wrap:wrap; gap:8px; justify-content:center;"></div>
        </div>
    `;
    if (searchArea) searchArea.insertBefore(wordDisplay, searchArea.querySelector('.taboo__search-form'));

    // ── Inject Score Display ───────────────────────────────────
    var scoreDisplay = document.createElement('div');
    scoreDisplay.id = 'score-display';
    scoreDisplay.style.cssText = 'display:flex; gap:16px; margin-bottom:12px;';
    scoreDisplay.innerHTML = `
        <div style="background:rgba(255,100,150,0.15); border:1px solid rgba(255,100,150,0.3); border-radius:8px; padding:10px 20px; flex:1; text-align:center;">
            <p style="color:rgba(255,255,255,0.5); font-size:0.7rem; text-transform:uppercase;">Team 1</p>
            <h3 id="score-team1" style="color:#ff6699; font-size:1.5rem; font-weight:700;">0</h3>
        </div>
        <div style="background:rgba(255,150,50,0.15); border:1px solid rgba(255,150,50,0.3); border-radius:8px; padding:10px 20px; flex:1; text-align:center;">
            <p style="color:rgba(255,255,255,0.5); font-size:0.7rem; text-transform:uppercase;">Team 2</p>
            <h3 id="score-team2" style="color:#ff9632; font-size:1.5rem; font-weight:700;">0</h3>
        </div>
    `;
    var tabooContent = document.querySelector('.taboo__content');
    if (tabooContent) tabooContent.insertBefore(scoreDisplay, tabooContent.firstChild);

    // ── Start Turn ─────────────────────────────────────────────
    function startTurn() {
        if (state.words.length === 0) {
            updateGameLog('⚠️ Word pack not loaded yet. Please wait...');
            return;
        }

        state.gameStarted = true;
        state.timeLeft = originalTime;
        state.wordsRevealed = 0;
        state.wordsSkipped = 0;
        state.currentIndex = Math.floor(Math.random() * state.words.length); // random start

        document.getElementById('start-turn-btn').style.display = 'none';
        document.getElementById('skip-btn').style.display = '';
        document.getElementById('end-turn-btn').style.display = '';
        wordDisplay.style.display = '';

        showCurrentWord();
        startTimer();

        updateGameLog('🎮 Team ' + state.currentTeam + '\'s turn started! ' + state.wordsPerTurn + ' words, ' + originalTime + 's. Describe the word — <strong>DON\'T say the taboo words!</strong>');
    }

    // ── Show Current Word Card ─────────────────────────────────
    function showCurrentWord() {
        if (state.currentIndex >= state.words.length) state.currentIndex = 0;
        state.currentWord = state.words[state.currentIndex];

        document.getElementById('target-word').textContent = state.currentWord.word;

        var tabooList = document.getElementById('taboo-words-list');
        tabooList.innerHTML = state.currentWord.taboo.map(function (t) {
            return '<span style="background:rgba(255,50,50,0.2); color:#ff6b6b; border:1px solid rgba(255,50,50,0.4); border-radius:20px; padding:4px 12px; font-size:0.8rem;">' + t + '</span>';
        }).join('');

        // Update the "enter word" placeholder
        if (enterWorldEl) enterWorldEl.textContent = 'Guess the word:';
        if (wordInput) {
            wordInput.value = '';
            wordInput.placeholder = 'Type your guess and press Submit...';
            wordInput.focus();
        }
    }

    // ── Submit btn + Enter key ─────────────────────────────────
    if (submitBtn) {
        submitBtn.addEventListener('click', checkGuess);
    }
    if (wordInput) {
        wordInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') checkGuess();
        });
    }

    function checkGuess() {
        if (!state.gameStarted || !state.currentWord) return;

        var guess = (wordInput ? wordInput.value.trim() : '').toLowerCase();
        var target = state.currentWord.word.toLowerCase();

        if (!guess) return;

        if (guess === target || similarity(guess, target) >= 0.8) {
            // ✅ Correct!
            state.scores['team' + state.currentTeam]++;
            state.wordsRevealed++;
            updateScoreDisplay();
            updateGameLog('✅ <strong>' + state.currentWord.word + '</strong> — Correct! (+1 point)');
            addContribution(state.currentWord.word, 'correct');

            if (state.wordsRevealed >= state.wordsPerTurn) {
                endTurn(true);
                return;
            }

            nextWord();
        } else {
            // ❌ Wrong
            updateGameLog('❌ <strong>' + guess + '</strong> — Not quite! Keep trying.');
            if (wordInput) { wordInput.value = ''; wordInput.focus(); }
        }
    }

    // ── Skip Word ──────────────────────────────────────────────
    function skipWord() {
        if (!state.gameStarted) return;
        state.wordsSkipped++;
        updateGameLog('⏭ Skipped: <strong>' + state.currentWord.word + '</strong>');
        nextWord();
    }

    function nextWord() {
        state.currentIndex++;
        if (wordInput) { wordInput.value = ''; }
        showCurrentWord();
    }

    // ── Timer ──────────────────────────────────────────────────
    function startTimer() {
        clearInterval(state.timerInterval);
        updateTimerDisplay();

        state.timerInterval = setInterval(function () {
            state.timeLeft--;
            updateTimerDisplay();

            if (state.timeLeft <= 0) {
                clearInterval(state.timerInterval);
                endTurn(false);
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        if (timerEl) timerEl.textContent = state.timeLeft;

        // Animate the SVG circle
        if (timerCircle) {
            var circumference = 2 * Math.PI * 28; // r=28
            var progress = state.timeLeft / originalTime;
            timerCircle.style.strokeDasharray = circumference;
            timerCircle.style.strokeDashoffset = circumference * (1 - progress);
        }

        // Turn red when < 10 seconds
        if (timerEl) {
            timerEl.style.color = state.timeLeft <= 10 ? '#ff4444' : '#fff';
        }
    }

    // ── End Turn ───────────────────────────────────────────────
    function endTurn(completed) {
        clearInterval(state.timerInterval);
        state.gameStarted = false;

        document.getElementById('start-turn-btn').style.display = '';
        document.getElementById('skip-btn').style.display = 'none';
        document.getElementById('end-turn-btn').style.display = 'none';
        wordDisplay.style.display = 'none';

        var reason = completed ? 'completed all words' : 'time ran out';
        updateGameLog('🏁 Turn ended (' + reason + '). Team ' + state.currentTeam + ' revealed <strong>' + state.wordsRevealed + ' word(s)</strong> this turn. Skipped: ' + state.wordsSkipped);

        // Switch teams
        state.currentTeam = state.currentTeam === 1 ? 2 : 1;
        document.getElementById('start-turn-btn').textContent = '▶ Start Turn — Team ' + state.currentTeam;

        // Update turn label
        var turnLabel = document.querySelector('.turn__tabs-btn');
        if (turnLabel) turnLabel.textContent = "Team " + state.currentTeam + "'s turn";

        if (timerEl) { timerEl.textContent = originalTime; timerEl.style.color = '#fff'; }
        if (timerCircle) { timerCircle.style.strokeDashoffset = 0; }

        // Re-shuffle for next turn
        state.words = shuffle(state.words);
    }

    // ── Score Display ──────────────────────────────────────────
    function updateScoreDisplay() {
        var t1 = document.getElementById('score-team1');
        var t2 = document.getElementById('score-team2');
        if (t1) t1.textContent = state.scores.team1;
        if (t2) t2.textContent = state.scores.team2;
        // Also update original score elements
        if (scoreEls.length >= 1) scoreEls[0].textContent = state.scores['team' + state.currentTeam];
    }

    // ── Game Log ───────────────────────────────────────────────
    function updateGameLog(message) {
        if (!gameLogEl) return;
        var p = document.createElement('p');
        p.className = 'taboo__gamelog-text';
        p.innerHTML = message;
        p.style.borderLeft = '2px solid rgba(0,229,255,0.4)';
        p.style.paddingLeft = '8px';
        p.style.marginBottom = '6px';
        gameLogEl.insertBefore(p, gameLogEl.firstChild);
    }

    // ── Contributions Panel ────────────────────────────────────
    function addContribution(word, type) {
        var list = document.querySelector('.card__list');
        if (!list) return;
        var li = document.createElement('li');
        li.className = 'card__list-item with-buttons';
        li.innerHTML = `
            <div class="card__info">
                <div class="card__info-icon"><img src="./assets/images/cup_icon.svg" alt="Cup icon"></div>
                <div class="card__info-avatar"><img src="./assets/images/card-avatar.png" alt=""></div>
                <div class="card__info-text"><p class="color-cyan">${word}</p></div>
            </div>
            <div class="card__list-buttons">
                <button type="button" class="btn card-btn-orange mr-4" style="background:rgba(0,200,100,0.3); color:#4dff91;">✅ Correct</button>
            </div>
        `;
        list.insertBefore(li, list.firstChild);
    }

    // ── Helpers ────────────────────────────────────────────────
    function shuffle(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
        }
        return a;
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Simple similarity check (handles typos)
    function similarity(a, b) {
        if (a === b) return 1;
        if (a.length === 0 || b.length === 0) return 0;
        var longer = a.length > b.length ? a : b;
        var shorter = a.length > b.length ? b : a;
        var editDist = levenshtein(longer, shorter);
        return (longer.length - editDist) / longer.length;
    }

    function levenshtein(a, b) {
        var dp = [];
        for (var i = 0; i <= b.length; i++) {
            dp[i] = [i];
            for (var j = 1; j <= a.length; j++) {
                dp[i][j] = i === 0 ? j :
                    Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1,
                        dp[i-1][j-1] + (b[i-1] === a[j-1] ? 0 : 1));
            }
        }
        return dp[b.length][a.length];
    }

})();
