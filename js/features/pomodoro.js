// js/features/pomodoro.js - 番茄钟

(function() {
    'use strict';

    // ---------- 状态 ----------
    let state = {
        isActive: false,
        isPaused: true,
        isFocus: true,
        cycle: 0,               // 0=未开始,1=第一次专注,2=第一次休息,3=第二次专注,4=完成
        focusMinutes: 25,
        breakMinutes: 5,
        totalSeconds: 0,
        maxSeconds: 0,
        timerInterval: null,
        isMinimized: false,
    };

    let els = {};

    // ---------- 工具函数 ----------
    function formatTime(s) {
        var m = String(Math.floor(s / 60)).padStart(2, '0');
        var sec = String(s % 60).padStart(2, '0');
        return m + ':' + sec;
    }

    function getAvatarSrc(sel) {
        var img = document.querySelector(sel);
        return img ? img.src : null;
    }

    function getBg() {
        var bg = document.documentElement.style.getPropertyValue('--chat-bg-image');
        if (bg && bg !== '') return bg;
        return 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
    }

    function getThemeMode() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    }

    // ---------- UI 构建 ----------
    function buildUI() {
        if (document.getElementById('pomodoro-style')) return;

        var style = document.createElement('style');
        style.id = 'pomodoro-style';
        style.textContent = `
            #pomodoro-app {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 99980;
                background: var(--primary-bg);
                background-image: var(--chat-bg-image, none);
                background-size: cover;
                background-position: center;
                display: none;
                flex-direction: column;
                align-items: center;
                padding: 0 20px 30px;
                box-sizing: border-box;
                overflow: hidden;
            }
            #pomodoro-app.visible { display: flex; }
            #pomodoro-app.dark-mode-tint {
                background-color: rgba(0,0,0,0.4);
                background-blend-mode: overlay;
            }
            .pomo-top {
                width: 100%;
                display: flex;
                justify-content: space-between;
                padding: 20px 0 10px;
                flex-shrink: 0;
            }
            .pomo-top-btn {
                width: 44px;
                height: 44px;
                border-radius: 50%;
                background: rgba(255,255,255,0.25);
                backdrop-filter: blur(8px);
                border: 1.5px solid rgba(255,255,255,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                color: var(--accent-color);
                cursor: pointer;
            }
            .pomo-avatars {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 40px;
                margin-top: 10px;
                transition: gap 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                flex-shrink: 0;
            }
            .pomo-avatars.active { gap: 4px; }
            .pomo-av-wrap {
                position: relative;
                width: 72px;
                height: 72px;
                border-radius: 50%;
                padding: 4px;
            }
            .pomo-av-ring {
                position: absolute;
                inset: 0;
                border-radius: 50%;
                border: 3px solid rgba(var(--accent-color-rgb), 0.3);
                transition: all 0.5s ease;
            }
            .pomo-av-wrap.active .pomo-av-ring {
                border-color: var(--accent-color);
                box-shadow: 0 0 20px rgba(var(--accent-color-rgb), 0.3);
                animation: pomoPulse 1.8s ease-in-out infinite;
            }
            @keyframes pomoPulse {
                0%, 100% { transform: scale(1); opacity: 0.6; }
                50% { transform: scale(1.15); opacity: 1; }
            }
            .pomo-av-img {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                overflow: hidden;
                border: 2px solid rgba(255,255,255,0.6);
                background: var(--border-color);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 28px;
                color: var(--text-secondary);
            }
            .pomo-av-img img {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                object-fit: cover;
                display: block;
            }
            .pomo-bubble {
                margin-top: 20px;
                padding: 14px 32px;
                border-radius: 40px;
                background: rgba(255,255,255,0.15);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255,255,255,0.25);
                font-size: 18px;
                font-weight: 600;
                color: var(--text-primary);
                text-align: center;
                flex-shrink: 0;
                min-width: 160px;
            }
            .pomo-bubble .sub {
                font-size: 12px;
                font-weight: 400;
                opacity: 0.7;
                display: block;
                margin-top: 2px;
            }
            .pomo-timer {
                font-size: 72px;
                font-weight: 700;
                letter-spacing: 4px;
                color: var(--accent-color);
                margin: 4px 0 10px;
                flex-shrink: 0;
                line-height: 1.2;
                font-family: 'Inter', monospace;
                transition: color 0.5s ease;
            }
            .pomo-timer.rest {
                color: rgba(var(--accent-color-rgb), 0.45);
            }

            /* 底部三个按钮 */
            .pomo-ctrls {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 30px;
                flex-shrink: 0;
                padding: 20px 0 0;
                margin-top: auto;
            }
            .pomo-ctrl {
                width: 64px;
                height: 64px;
                border-radius: 50%;
                background: rgba(255,255,255,0.15);
                backdrop-filter: blur(12px);
                border: 2.5px solid var(--accent-color);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                color: var(--accent-color);
                cursor: pointer;
            }
            .pomo-ctrl.main {
                width: 76px;
                height: 76px;
                border-width: 3px;
                font-size: 28px;
            }

            /* 弹窗 */
            .pomo-popup {
                position: fixed;
                inset: 0;
                z-index: 99999;
                background: rgba(0,0,0,0.5);
                backdrop-filter: blur(10px);
                display: none;
                align-items: center;
                justify-content: center;
            }
            .pomo-popup.open { display: flex; }
            .pomo-popup-card {
                background: var(--secondary-bg);
                border-radius: 24px;
                padding: 24px;
                width: 92%;
                max-width: 380px;
                box-shadow: 0 24px 64px rgba(0,0,0,0.3);
            }
            .pomo-popup-card .title {
                font-size: 17px;
                font-weight: 700;
                text-align: center;
                margin-bottom: 16px;
                color: var(--text-primary);
            }
            .pomo-popup-card .row {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 14px;
            }
            .pomo-popup-card .row label {
                font-size: 14px;
                font-weight: 600;
                color: var(--text-secondary);
                width: 60px;
                flex-shrink: 0;
            }
            .pomo-popup-card .row input {
                flex: 1;
                padding: 8px 12px;
                border-radius: 10px;
                border: 1.5px solid var(--border-color);
                background: var(--primary-bg);
                color: var(--text-primary);
                font-size: 15px;
                font-weight: 600;
                text-align: center;
                outline: none;
                width: 0;
            }
            .pomo-popup-card .row input:focus { border-color: var(--accent-color); }
            .pomo-presets {
                display: flex;
                gap: 8px;
                margin: 6px 0 16px;
            }
            .pomo-presets button {
                flex: 1;
                padding: 8px 4px;
                border-radius: 10px;
                border: 1.5px solid var(--border-color);
                background: var(--primary-bg);
                font-size: 12px;
                font-weight: 600;
                color: var(--text-secondary);
                cursor: pointer;
                font-family: var(--font-family);
                text-align: center;
            }
            .pomo-presets button.active {
                border-color: var(--accent-color);
                background: rgba(var(--accent-color-rgb), 0.08);
                color: var(--accent-color);
            }
            .pomo-presets button span {
                display: block;
                font-size: 10px;
                opacity: 0.6;
            }
            .pomo-actions {
                display: flex;
                gap: 10px;
                margin-top: 6px;
            }
            .pomo-actions button {
                flex: 1;
                padding: 12px;
                border-radius: 12px;
                border: none;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                font-family: var(--font-family);
            }
            .pomo-actions .cancel {
                background: var(--primary-bg);
                color: var(--text-secondary);
                border: 1px solid var(--border-color);
            }
            .pomo-actions .confirm {
                background: var(--accent-color);
                color: #fff;
            }
            .pomo-actions .danger {
                background: #ff4757;
                color: #fff;
            }
            .pomo-warn {
                text-align: center;
                font-size: 15px;
                color: var(--text-secondary);
                padding: 12px 0;
                line-height: 1.6;
            }

            /* 小窗 */
            #pomo-mini {
                position: fixed;
                bottom: 100px;
                right: 20px;
                z-index: 99990;
                display: none;
                align-items: center;
                gap: 10px;
                background: rgba(10,18,38,0.92);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 30px;
                padding: 8px 14px 8px 10px;
                box-shadow: 0 8px 28px rgba(0,0,0,0.4);
                cursor: grab;
                color: #fff;
            }
            #pomo-mini:active { cursor: grabbing; }
            #pomo-mini.visible { display: flex; animation: miniPop 0.3s cubic-bezier(0.34,1.56,0.64,1); }
            @keyframes miniPop {
                from { opacity: 0; transform: scale(0.8) translateX(20px); }
                to { opacity: 1; transform: scale(1) translateX(0); }
            }
            #pomo-mini .av {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: var(--accent-color);
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            #pomo-mini .av img { width: 100%; height: 100%; object-fit: cover; }
            #pomo-mini .av i { font-size: 12px; color: rgba(255,255,255,0.8); }
            #pomo-mini .info { display: flex; flex-direction: column; }
            #pomo-mini .time { font-size: 13px; font-weight: 700; color: #fff; }
            #pomo-mini .label { font-size: 9px; opacity: 0.5; color: #fff; }
            #pomo-mini .ctrl {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: rgba(255,255,255,0.1);
                border: none;
                color: #fff;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                flex-shrink: 0;
            }
        `;
        document.head.appendChild(style);

        if (document.getElementById('pomodoro-app')) return;

        var app = document.createElement('div');
        app.id = 'pomodoro-app';
        app.innerHTML = `
            <div class="pomo-top">
                <button class="pomo-top-btn" id="pomo-mini-btn"><i class="fas fa-minus"></i></button>
                <button class="pomo-top-btn" id="pomo-bg-btn"><i class="fas fa-images"></i></button>
                <input type="file" id="pomo-bg-input" accept="image/*" style="display:none;">
            </div>
            <div class="pomo-avatars" id="pomo-avs">
                <div class="pomo-av-wrap" id="pomo-av-p">
                    <div class="pomo-av-ring"></div>
                    <div class="pomo-av-img" id="pomo-av-p-img"><i class="fas fa-user"></i></div>
                </div>
                <div class="pomo-av-wrap" id="pomo-av-m">
                    <div class="pomo-av-ring"></div>
                    <div class="pomo-av-img" id="pomo-av-m-img"><i class="fas fa-user"></i></div>
                </div>
            </div>
            <div class="pomo-bubble" id="pomo-bubble">准备开始专注<span class="sub" id="pomo-sub">点击左下角设置时间</span></div>
            <div class="pomo-timer" id="pomo-timer">00:00</div>
            <div class="pomo-ctrls">
                <button class="pomo-ctrl" id="pomo-prev"><i class="fas fa-backward"></i></button>
                <button class="pomo-ctrl main" id="pomo-main"><i class="fas fa-play"></i></button>
                <button class="pomo-ctrl" id="pomo-next"><i class="fas fa-forward"></i></button>
            </div>
        `;
        document.body.appendChild(app);

        var popup = document.createElement('div');
        popup.className = 'pomo-popup';
        popup.id = 'pomo-popup';
        popup.innerHTML = `
            <div class="pomo-popup-card">
                <div class="title" id="pomo-popup-title">设置专注时间</div>
                <div id="pomo-popup-body">
                    <div class="row">
                        <label>学习</label>
                        <input type="number" id="pomo-focus" min="1" max="120" value="25">
                        <span style="font-size:13px;color:var(--text-secondary);">分钟</span>
                    </div>
                    <div class="row">
                        <label>休息</label>
                        <input type="number" id="pomo-break" min="1" max="60" value="5">
                        <span style="font-size:13px;color:var(--text-secondary);">分钟</span>
                    </div>
                    <div class="pomo-presets">
                        <button data-f="30" data-b="10">30<span>学习</span>10<span>休息</span></button>
                        <button class="active" data-f="25" data-b="5">25<span>学习</span>5<span>休息</span></button>
                        <button data-f="60" data-b="15">60<span>学习</span>15<span>休息</span></button>
                    </div>
                </div>
                <div class="pomo-actions">
                    <button class="cancel" id="pomo-popup-cancel">取消</button>
                    <button class="confirm" id="pomo-popup-confirm">确定</button>
                </div>
            </div>
        `;
        document.body.appendChild(popup);

        var mini = document.createElement('div');
        mini.id = 'pomo-mini';
        mini.innerHTML = `
            <div class="av" id="pomo-mini-av"><i class="fas fa-user"></i></div>
            <div class="info">
                <div class="time" id="pomo-mini-time">00:00</div>
                <div class="label" id="pomo-mini-label">专注中</div>
            </div>
            <button class="ctrl" id="pomo-mini-toggle"><i class="fas fa-play"></i></button>
        `;
        document.body.appendChild(mini);

        // 缓存元素
        els.app = app;
        els.popup = popup;
        els.mini = mini;
        els.avs = document.getElementById('pomo-avs');
        els.avP = document.getElementById('pomo-av-p');
        els.avM = document.getElementById('pomo-av-m');
        els.avPImg = document.getElementById('pomo-av-p-img');
        els.avMImg = document.getElementById('pomo-av-m-img');
        els.bubble = document.getElementById('pomo-bubble');
        els.sub = document.getElementById('pomo-sub');
        els.timer = document.getElementById('pomo-timer');
        els.main = document.getElementById('pomo-main');
        els.prev = document.getElementById('pomo-prev');
        els.next = document.getElementById('pomo-next');
        els.miniBtn = document.getElementById('pomo-mini-btn');
        els.bgBtn = document.getElementById('pomo-bg-btn');
        els.bgInput = document.getElementById('pomo-bg-input');
        els.miniAv = document.getElementById('pomo-mini-av');
        els.miniTime = document.getElementById('pomo-mini-time');
        els.miniLabel = document.getElementById('pomo-mini-label');
        els.miniToggle = document.getElementById('pomo-mini-toggle');

        bindEvents();
    }

    // ---------- 事件绑定 ----------
    function bindEvents() {
        els.miniBtn.addEventListener('click', minimize);

        els.mini.addEventListener('click', function(e) {
            if (!e.target.closest('.ctrl')) {
                restore();
            }
        });

        els.miniToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMain();
        });

        els.bgBtn.addEventListener('click', function() {
            els.bgInput.click();
        });

        els.bgInput.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
                var data = ev.target.result;
                try {
                    var gallery = JSON.parse(localStorage.getItem('CHAT_APP_V3_backgroundGallery') || '[]');
                    gallery.push({ id: 'pomo-' + Date.now(), type: 'image', value: data });
                    localStorage.setItem('CHAT_APP_V3_backgroundGallery', JSON.stringify(gallery));
                    els.app.style.backgroundImage = 'url(' + data + ')';
                    if (typeof showNotification === 'function') {
                        showNotification('番茄钟背景已更新', 'success');
                    }
                } catch(err) {
                    if (typeof showNotification === 'function') {
                        showNotification('背景保存失败', 'error');
                    }
                }
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        });

        // 主按钮
        els.main.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMain();
        });

        // 左下角设置
        els.prev.addEventListener('click', function(e) {
            e.stopPropagation();
            openSettings();
        });

        // 右下角退出按钮
var nextBtn = els.next;
if (nextBtn) {
    nextBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        openExit();
    });
}
        // 弹窗取消和确定
        document.getElementById('pomo-popup-cancel').addEventListener('click', closePopup);
        document.getElementById('pomo-popup-confirm').addEventListener('click', confirmSettings);

        // 预设时间按钮
        document.querySelectorAll('.pomo-presets button').forEach(function(btn) {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.pomo-presets button').forEach(function(b) {
                    b.classList.remove('active');
                });
                this.classList.add('active');
                document.getElementById('pomo-focus').value = this.dataset.f;
                document.getElementById('pomo-break').value = this.dataset.b;
            });
        });

        // 点击弹窗外关闭
        els.popup.addEventListener('click', function(e) {
            if (e.target === els.popup) {
                closePopup();
            }
        });

        initDrag();
    }

    // ---------- 核心逻辑 ----------
    function open() {
        syncAvatars();
        syncBg();
        if (!state.isActive && state.cycle === 0) {
            resetToIdle();
        }
        els.app.classList.add('visible');
        if (getThemeMode() === 'dark') {
            els.app.classList.add('dark-mode-tint');
        } else {
            els.app.classList.remove('dark-mode-tint');
        }
        if (state.isMinimized) {
            els.mini.classList.remove('visible');
            state.isMinimized = false;
        }
        updateUI();
    }

    function closePomo(exit) {
        if (exit) {
            if (state.timerInterval) {
                clearInterval(state.timerInterval);
                state.timerInterval = null;
            }
            state.isActive = false;
            state.isPaused = true;
            state.cycle = 0;
            resetToIdle();
            els.mini.classList.remove('visible');
            state.isMinimized = false;
        }
        els.app.classList.remove('visible');
        // 确保弹窗被关闭
        var popup = document.getElementById('pomo-popup');
        if (popup) {
            popup.classList.remove('open');
            popup.style.display = 'none';
        }
    }

    function resetToIdle() {
        state.isFocus = true;
        state.totalSeconds = 0;
        state.maxSeconds = 0;
        state.cycle = 0;
        state.isPaused = true;
        if (state.timerInterval) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
        }
        els.avs.classList.remove('active');
        els.avP.classList.remove('active');
        els.avM.classList.remove('active');
        els.timer.classList.remove('rest');
        els.bubble.textContent = '准备开始专注';
        els.sub.textContent = '点击左下角设置时间';
        els.timer.textContent = '00:00';
        updateMainIcon(false);
        updateMiniIcon(false);
    }

    function syncAvatars() {
        var pSrc = getAvatarSrc('#partner-avatar img');
        var mSrc = getAvatarSrc('#my-avatar img');
        els.avPImg.innerHTML = pSrc ? '<img src="' + pSrc + '">' : '<i class="fas fa-user"></i>';
        els.avMImg.innerHTML = mSrc ? '<img src="' + mSrc + '">' : '<i class="fas fa-user"></i>';
        els.miniAv.innerHTML = pSrc ? '<img src="' + pSrc + '">' : '<i class="fas fa-user"></i>';
    }

    function syncBg() {
        var bg = getBg();
        els.app.style.backgroundImage = bg.startsWith('url(') ? bg : 'url(' + bg + ')';
    }

    function toggleMain() {
        if (state.cycle === 0 && state.totalSeconds === 0) {
            showWarning('请先点击左下角设置好时间后，再开启陪伴');
            return;
        }
        if (state.isPaused) {
            if (state.cycle === 0) {
                startFocus();
            } else {
                startTimer();
            }
        } else {
            pauseTimer();
        }
    }

    function startFocus() {
        state.isFocus = true;
        state.totalSeconds = state.focusMinutes * 60;
        state.maxSeconds = state.totalSeconds;
        state.cycle = 1;
        state.isPaused = false;
        state.isActive = true;
        startTimer();
        updateUI();
    }

    function startBreak() {
        state.isFocus = false;
        state.totalSeconds = state.breakMinutes * 60;
        state.maxSeconds = state.totalSeconds;
        state.cycle = 2;
        state.isPaused = false;
        state.isActive = true;
        startTimer();
        updateUI();
    }

    function startTimer() {
        if (state.timerInterval) clearInterval(state.timerInterval);
        state.isPaused = false;
        updateUI();
        state.timerInterval = setInterval(function() {
            if (state.totalSeconds <= 0) {
                clearInterval(state.timerInterval);
                state.timerInterval = null;
                handleTimeUp();
                return;
            }
            state.totalSeconds--;
            updateUI();
            updateMiniIcon(true);
        }, 1000);
    }

    function pauseTimer() {
        state.isPaused = true;
        if (state.timerInterval) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
        }
        updateUI();
        updateMiniIcon(false);
    }

    function handleTimeUp() {
        if (typeof playSound === 'function') {
            playSound('message');
        }
        if (state.cycle === 1) {
            if (typeof showNotification === 'function') {
                showNotification('专注时间结束，进入休息时间', 'info', 3000);
            }
            startBreak();
        } else if (state.cycle === 2) {
            if (typeof showNotification === 'function') {
                showNotification('休息结束，开始第二次专注', 'info', 3000);
            }
            state.isFocus = true;
            state.totalSeconds = state.focusMinutes * 60;
            state.maxSeconds = state.totalSeconds;
            state.cycle = 3;
            state.isPaused = false;
            startTimer();
            updateUI();
        } else if (state.cycle === 3) {
            if (typeof showNotification === 'function') {
                showNotification('全部完成，太棒了', 'success', 4000);
            }
            state.cycle = 4;
            state.isActive = false;
            state.isPaused = true;
            els.avs.classList.remove('active');
            els.avP.classList.remove('active');
            els.avM.classList.remove('active');
            els.bubble.textContent = '全部完成';
            els.sub.textContent = '休息一下吧';
            updateMainIcon(false);
            updateMiniIcon(false);
        }
    }

    function updateUI() {
        els.timer.textContent = formatTime(state.totalSeconds);

        if (state.isFocus || state.cycle === 0 || state.cycle === 4) {
            els.timer.classList.remove('rest');
        } else {
            els.timer.classList.add('rest');
        }

        if (state.isActive && !state.isPaused && state.cycle < 4) {
            els.avs.classList.add('active');
            els.avP.classList.add('active');
            els.avM.classList.add('active');
        } else {
            els.avs.classList.remove('active');
            els.avP.classList.remove('active');
            els.avM.classList.remove('active');
        }

        if (state.cycle === 0) {
            els.bubble.textContent = '准备开始专注';
            els.sub.textContent = '点击左下角设置时间';
        } else if (state.cycle === 4) {
            els.bubble.textContent = '全部完成';
            els.sub.textContent = '休息一下吧';
        } else {
            if (state.isFocus) {
                els.bubble.textContent = '学习时间';
                els.sub.textContent = state.isPaused ? '已暂停' : '专注中';
            } else {
                els.bubble.textContent = '休息时间';
                els.sub.textContent = state.isPaused ? '已暂停' : '放松一下';
            }
        }

        updateMainIcon(state.isPaused);
        updateMiniIcon(state.isPaused);
        els.miniTime.textContent = formatTime(state.totalSeconds);
        els.miniLabel.textContent = state.cycle === 4 ? '已完成' : (state.isFocus ? '专注中' : '休息中');
    }

    function updateMainIcon(paused) {
        var icon = els.main.querySelector('i');
        if (state.cycle === 0 || state.cycle === 4) {
            icon.className = 'fas fa-play';
        } else if (paused) {
            icon.className = 'fas fa-play';
        } else {
            icon.className = 'fas fa-pause';
        }
    }

    function updateMiniIcon(paused) {
        var icon = els.miniToggle.querySelector('i');
        if (state.cycle === 0 || state.cycle === 4) {
            icon.className = 'fas fa-play';
        } else if (paused) {
            icon.className = 'fas fa-play';
        } else {
            icon.className = 'fas fa-pause';
        }
        els.miniTime.textContent = formatTime(state.totalSeconds);
    }

    // ---------- 弹窗 ----------
    var popupType = 'settings';

    function openSettings() {
        if (state.isActive && !state.isPaused) {
            if (typeof showNotification === 'function') {
                showNotification('请先暂停再调整时间', 'warning');
            }
            return;
        }
        popupType = 'settings';
        document.getElementById('pomo-popup-title').textContent = '设置专注时间';
        document.getElementById('pomo-popup-body').style.display = '';
        document.getElementById('pomo-focus').value = state.focusMinutes;
        document.getElementById('pomo-break').value = state.breakMinutes;
        document.querySelectorAll('.pomo-presets button').forEach(function(b) {
            b.classList.remove('active');
        });
        var active = document.querySelector('.pomo-presets button[data-f="' + state.focusMinutes + '"][data-b="' + state.breakMinutes + '"]');
        if (active) active.classList.add('active');
        document.getElementById('pomo-popup-confirm').textContent = '确定';
        document.getElementById('pomo-popup-confirm').className = 'confirm';
        var popup = document.getElementById('pomo-popup');
        popup.classList.add('open');
        popup.style.display = 'flex';
    }

    function showWarning(text) {
        popupType = 'warning';
        document.getElementById('pomo-popup-title').textContent = '提示';
        document.getElementById('pomo-popup-body').style.display = 'none';
        document.getElementById('pomo-popup-confirm').textContent = '我知道了';
        document.getElementById('pomo-popup-confirm').className = 'confirm';
        var warn = document.querySelector('.pomo-warn');
        if (!warn) {
            warn = document.createElement('div');
            warn.className = 'pomo-warn';
            var card = document.getElementById('pomo-popup-card');
            var body = document.getElementById('pomo-popup-body');
            card.insertBefore(warn, body);
        }
        warn.textContent = text;
        warn.style.display = '';
        var popup = document.getElementById('pomo-popup');
        popup.classList.add('open');
        popup.style.display = 'flex';
    }

    // ====== 关键修复：退出弹窗 ======
function openExit() {
    popupType = 'exit';
    document.getElementById('pomo-popup-title').textContent = '退出专注？';
    document.getElementById('pomo-popup-body').style.display = 'none';
    document.getElementById('pomo-popup-confirm').textContent = '退出';
    document.getElementById('pomo-popup-confirm').className = 'danger';
    
    var popup = document.getElementById('pomo-popup');
    popup.classList.add('open');
    popup.style.display = 'flex';
}
   
    function closePopup() {
        var popup = document.getElementById('pomo-popup');
        popup.classList.remove('open');
        popup.style.display = 'none';
        var warn = document.querySelector('.pomo-warn');
        if (warn) warn.style.display = 'none';
    }

    function confirmSettings() {
    if (popupType === 'warning') {
        closePopup();
        return;
    }
    if (popupType === 'exit') {
        closePopup();
        closePomo(true);
        return;
    }
    // settings
    var focus = parseInt(document.getElementById('pomo-focus').value);
    var brk = parseInt(document.getElementById('pomo-break').value);
    if (isNaN(focus) || focus < 1 || isNaN(brk) || brk < 0) {
        if (typeof showNotification === 'function') {
            showNotification('请输入有效时间', 'warning');
        }
        return;
    }
    state.focusMinutes = focus;
    state.breakMinutes = brk;
    if (state.cycle === 0) {
        state.totalSeconds = focus * 60;
        state.maxSeconds = state.totalSeconds;
        els.timer.textContent = formatTime(state.totalSeconds);
        els.sub.textContent = '学习' + focus + '分钟 · 休息' + brk + '分钟';
    }
    closePopup();
    if (typeof showNotification === 'function') {
        showNotification('时间已设置：学习' + focus + '分钟，休息' + brk + '分钟', 'success');
    }
    updateUI();
}
    // ---------- 小窗 ----------
    function minimize() {
        if (!els.app.classList.contains('visible')) return;
        state.isMinimized = true;
        els.app.classList.remove('visible');
        els.mini.classList.add('visible');
        updateMiniIcon(state.isPaused);
        els.miniTime.textContent = formatTime(state.totalSeconds);
    }

    function restore() {
        state.isMinimized = false;
        els.mini.classList.remove('visible');
        els.app.classList.add('visible');
        syncAvatars();
        syncBg();
        updateUI();
    }

    function initDrag() {
        var dragging = false;
        var sx, sy, ox, oy;
        var moved = false;
        var pill = els.mini;

        pill.addEventListener('mousedown', function(e) {
            if (e.target.closest('.ctrl')) return;
            dragging = true;
            moved = false;
            var rect = pill.getBoundingClientRect();
            sx = e.clientX;
            sy = e.clientY;
            ox = rect.left;
            oy = rect.top;
            pill.style.transition = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', function(e) {
            if (!dragging) return;
            var dx = e.clientX - sx;
            var dy = e.clientY - sy;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
            var nl = ox + dx;
            var nt = oy + dy;
            nl = Math.max(0, Math.min(window.innerWidth - pill.offsetWidth, nl));
            nt = Math.max(0, Math.min(window.innerHeight - pill.offsetHeight, nt));
            pill.style.left = nl + 'px';
            pill.style.top = nt + 'px';
            pill.style.right = 'auto';
            pill.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', function() {
            if (dragging) {
                dragging = false;
                pill.style.transition = '';
            }
        });

        pill.addEventListener('touchstart', function(e) {
            if (e.target.closest('.ctrl')) return;
            var t = e.touches[0];
            dragging = true;
            moved = false;
            var rect = pill.getBoundingClientRect();
            sx = t.clientX;
            sy = t.clientY;
            ox = rect.left;
            oy = rect.top;
            pill.style.transition = 'none';
        }, { passive: true });

        document.addEventListener('touchmove', function(e) {
            if (!dragging) return;
            var t = e.touches[0];
            var dx = t.clientX - sx;
            var dy = t.clientY - sy;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
            var nl = ox + dx;
            var nt = oy + dy;
            nl = Math.max(0, Math.min(window.innerWidth - pill.offsetWidth, nl));
            nt = Math.max(0, Math.min(window.innerHeight - pill.offsetHeight, nt));
            pill.style.left = nl + 'px';
            pill.style.top = nt + 'px';
            pill.style.right = 'auto';
            pill.style.bottom = 'auto';
        }, { passive: true });

        document.addEventListener('touchend', function() {
            if (dragging) {
                dragging = false;
                pill.style.transition = '';
            }
        });
    }

    // ---------- 外部接口 ----------
    window.pomodoro = {
        open: open,
        close: closePomo,
        toggle: function() {
            if (els.app && (els.app.classList.contains('visible') || state.isMinimized)) {
                closePomo(true);
            } else {
                open();
            }
        }
    };

    // ---------- 初始化 ----------
    function init() {
        try {
            buildUI();
            state.focusMinutes = 25;
            state.breakMinutes = 5;
            state.totalSeconds = 25 * 60;
            state.maxSeconds = state.totalSeconds;
            if (els.timer) els.timer.textContent = '25:00';
            if (els.sub) els.sub.textContent = '学习25分钟 · 休息5分钟';
        } catch(e) {
            console.error('番茄钟初始化失败:', e);
        }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(init, 100);
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 100);
        });
    }
    setTimeout(init, 500);
    setTimeout(init, 1500);

})();
