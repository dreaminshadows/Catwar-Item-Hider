// ==UserScript==
// @name         Catwar Item Hider
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Скрывает предметы во рту по ID предмета. Предложения по улучшению писать автору мода.
// @author       dreaminshadows | Бейлиз (https://catwar.net/cat1638466)
// @match        *://catwar.su/cw3/*
// @match        *://catwar.net/cw3/*
// @match        *://cw3.space/*
// @updateURL    https://raw.githubusercontent.com/dreaminshadows/Catwar-Item-Hider/main/Catwar-Item-Hider.user.js
// @downloadURL  https://raw.githubusercontent.com/dreaminshadows/Catwar-Item-Hider/main/Catwar-Item-Hider.user.js
// @run-at       document-end
// @grant        none
// ==/UserScript==

// ОБНОВЛЕНИЯ
// --- 1.1 ---
// - изменена палитра
// - более мобайл френдли
// - кнопка очистки теперь с подтверждением
// - высота списка растягивается

(function() {
    'use strict';

    const STORAGE_KEY_IDS = 'cw_item_hider_ids';
    const STORAGE_KEY_POS = 'cw_item_hider_pos';
    const STORAGE_KEY_COLLAPSED = 'cw_item_hider_collapsed';

    // ---------- Загрузка сохранённого ----------
    let hiddenItemIds = new Set();
    try {
        const saved = localStorage.getItem(STORAGE_KEY_IDS);
        if (saved) {
            const arr = JSON.parse(saved);
            if (Array.isArray(arr)) hiddenItemIds = new Set(arr.map(String));
        }
    } catch (e) { console.warn('[Catwar Item Hider] load ids error:', e); }

    let savedPos = null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY_POS);
        if (raw) savedPos = JSON.parse(raw);
    } catch (e) { console.warn('[Catwar Item Hider] load pos error:', e); }

    let isCollapsed = localStorage.getItem(STORAGE_KEY_COLLAPSED) === '1';

    // ---------- Сохранение ----------
    function saveIds() {
        try { localStorage.setItem(STORAGE_KEY_IDS, JSON.stringify(Array.from(hiddenItemIds))); }
        catch (e) { console.warn('[Catwar Item Hider] save ids error:', e); }
    }
    function savePos() {
        const panel = document.getElementById('cw-item-hider-panel');
        if (!panel) return;
        try {
            localStorage.setItem(STORAGE_KEY_POS, JSON.stringify({
                left: parseInt(panel.style.left) || 0,
                top: parseInt(panel.style.top) || 0
            }));
        } catch (e) { console.warn('[Catwar Item Hider] save pos error:', e); }
    }
    function saveCollapsed() {
        try { localStorage.setItem(STORAGE_KEY_COLLAPSED, isCollapsed ? '1' : '0'); }
        catch (e) { console.warn('[Catwar Item Hider] save collapsed error:', e); }
    }

    // ---------- Скрытие предметов ----------
    function hideItems() {
        const itemList = document.getElementById('itemList');
        if (!itemList) return;
        itemList.querySelectorAll('.itemInMouth').forEach(item => {
            const img = item.querySelector('img');
            if (!img) return;
            const match = img.getAttribute('src').match(/things\/(\d+)\.png/);
            if (!match) return;
            item.style.display = hiddenItemIds.has(match[1]) ? 'none' : '';
        });
    }

    // ---------- Проверка границ ----------
    function clampToViewport(panel) {
        const docWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
        const docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
        const rect = panel.getBoundingClientRect();

        let left = parseInt(panel.style.left) || 0;
        let top = parseInt(panel.style.top) || 0;

        if (left < 0) left = 0;
        if (top < 0) top = 0;
        if (left + rect.width > docWidth) left = docWidth - rect.width;
        if (top + rect.height > docHeight) top = docHeight - rect.height;

        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
    }

    // ---------- Панель ----------
    function createControlPanel() {
        if (document.getElementById('cw-item-hider-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'cw-item-hider-panel';
        Object.assign(panel.style, {
            position: 'absolute',
            zIndex: '99999',
            background: 'rgba(10, 10, 10, 0.95)',
            color: '#fff',
            padding: '0',
            borderRadius: '6px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '12px',
            width: '220px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
            overflow: 'hidden',
            border: '1px solid #333'
        });

        if (savedPos && typeof savedPos.left === 'number' && typeof savedPos.top === 'number') {
            panel.style.left = savedPos.left + 'px';
            panel.style.top = savedPos.top + 'px';
        } else {
            panel.style.left = (window.scrollX + window.innerWidth - 240) + 'px';
            panel.style.top = (window.scrollY + window.innerHeight - 150) + 'px';
        }

        // ----- Заголовок -----
        const header = document.createElement('div');
        header.id = 'cw-item-hider-header';
        Object.assign(header.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 8px',
            background: 'rgba(255,255,255,0.05)',
            cursor: 'move',
            userSelect: 'none',
            fontWeight: 'bold',
            touchAction: 'none'
        });

        const titleEl = document.createElement('span');
        titleEl.textContent = 'Скрыть предметы';
        titleEl.style.pointerEvents = 'none';

        const btnCollapse = document.createElement('span');
        btnCollapse.textContent = isCollapsed ? '+' : '–';
        Object.assign(btnCollapse.style, {
            cursor: 'pointer',
            padding: '0 6px',
            fontSize: '14px',
            lineHeight: '1',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '3px',
            pointerEvents: 'auto'
        });
        btnCollapse.title = 'Свернуть / развернуть';

        header.appendChild(titleEl);
        header.appendChild(btnCollapse);
        panel.appendChild(header);

        // ----- Контейнер с содержимым -----
        const body = document.createElement('div');
        body.id = 'cw-item-hider-body';
        Object.assign(body.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            padding: '8px'
        });

        // Поле ввода
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Например: 18177';
        Object.assign(input.style, {
            width: '100%',
            boxSizing: 'border-box',
            padding: '4px',
            borderRadius: '3px',
            border: '1px solid #444',
            background: '#050505',
            color: '#fff',
            outline: 'none'
        });
        input.addEventListener('focus', () => input.style.borderColor = '#00bcd4');
        input.addEventListener('blur', () => input.style.borderColor = '#444');
        body.appendChild(input);

        // Кнопка "Скрыть"
        const addBtn = document.createElement('button');
        addBtn.textContent = 'Скрыть';
        Object.assign(addBtn.style, {
            padding: '4px',
            cursor: 'pointer',
            borderRadius: '3px',
            border: '1px solid #00bcd4',
            background: '#000',
            color: '#fff',
            fontWeight: 'bold',
            transition: 'background 0.2s'
        });
        addBtn.onmouseenter = () => addBtn.style.background = '#003a40';
        addBtn.onmouseleave = () => addBtn.style.background = '#000';
        body.appendChild(addBtn);

        // --- Блок списка (с фиксированной высотой и ресайзом) ---
        const listContainer = document.createElement('div');
        Object.assign(listContainer.style, {
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            height: '120px', // Фиксированная высота по умолчанию
            minHeight: '40px',
            overflow: 'hidden',
            border: '1px solid #222',
            borderRadius: '3px',
            background: '#080808'
        });

        const listDiv = document.createElement('div');
        listDiv.id = 'cw-item-hider-list';
        Object.assign(listDiv.style, {
            display: 'flex', flexWrap: 'wrap', gap: '4px',
            padding: '4px',
            overflowY: 'auto', // Ползунок прокрутки
            flex: '1',
            alignContent: 'flex-start'
        });
        listContainer.appendChild(listDiv);

        // Уголок для изменения размера (ресайз)
        const resizer = document.createElement('div');
        Object.assign(resizer.style, {
            position: 'absolute',
            bottom: '0',
            right: '0',
            width: '12px',
            height: '12px',
            cursor: 'ns-resize',
            background: 'linear-gradient(135deg, transparent 50%, #555 50%)',
            zIndex: '10',
            touchAction: 'none'
        });

        let isResizing = false;
        let startY = 0;
        let startHeight = 0;

        const startResize = (clientY) => {
            isResizing = true;
            startY = clientY;
            startHeight = listContainer.offsetHeight;
        };

        const doResize = (clientY) => {
            if (!isResizing) return;
            const deltaY = clientY - startY;
            const newHeight = Math.max(40, startHeight + deltaY);
            listContainer.style.height = newHeight + 'px';
        };

        const endResize = () => {
            isResizing = false;
            // Высоту не сохраняем, чтобы при перезагрузке она сбросилась
        };

        // События для мыши
        resizer.addEventListener('mousedown', (e) => { startResize(e.clientY); e.preventDefault(); e.stopPropagation(); });
        document.addEventListener('mousemove', (e) => doResize(e.clientY));
        document.addEventListener('mouseup', endResize);

        // События для тача
        resizer.addEventListener('touchstart', (e) => { startResize(e.touches[0].clientY); e.preventDefault(); e.stopPropagation(); }, { passive: false });
        document.addEventListener('touchmove', (e) => { if(isResizing) { doResize(e.touches[0].clientY); e.preventDefault(); } }, { passive: false });
        document.addEventListener('touchend', endResize);

        listContainer.appendChild(resizer);
        body.appendChild(listContainer);

        // --- Кнопка "Показать всё" с подтверждением ---
        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Показать всё';
        Object.assign(clearBtn.style, {
            padding: '4px',
            cursor: 'pointer',
            borderRadius: '3px',
            border: '1px solid #ff5252',
            background: '#000',
            color: '#fff',
            fontWeight: 'bold',
            transition: 'background 0.2s, color 0.2s'
        });
        clearBtn.onmouseenter = () => { if (!clearBtn.dataset.state || clearBtn.dataset.state === 'idle') clearBtn.style.background = '#400'; };
        clearBtn.onmouseleave = () => { if (!clearBtn.dataset.state || clearBtn.dataset.state === 'idle') clearBtn.style.background = '#000'; };

        let confirmTimer = null;
        let resetTimer = null;

        clearBtn.dataset.state = 'idle'; // idle, waiting, confirm

        clearBtn.onclick = () => {
            if (clearBtn.dataset.state === 'waiting') return; // Не кликабельна во время таймера

            if (clearBtn.dataset.state === 'idle') {
                // Шаг 1: Запуск таймера
                clearBtn.dataset.state = 'waiting';
                clearBtn.textContent = 'Подтвердить (3)';
                clearBtn.style.background = '#222';
                clearBtn.style.borderColor = '#555';
                clearBtn.style.color = '#888';
                clearBtn.style.cursor = 'default';

                let count = 3;
                confirmTimer = setInterval(() => {
                    count--;
                    if (count > 0) {
                        clearBtn.textContent = `Подтвердить (${count})`;
                    } else {
                        clearInterval(confirmTimer);
                        confirmTimer = null;

                        // Шаг 2: Таймер прошел, кнопка активна
                        clearBtn.dataset.state = 'confirm';
                        clearBtn.textContent = 'Подтвердить';
                        clearBtn.style.background = '#400'; // Темно-красный
                        clearBtn.style.borderColor = '#ff5252';
                        clearBtn.style.color = '#fff';
                        clearBtn.style.cursor = 'pointer';

                        // Запускаем таймер на отмену (10 секунд)
                        resetTimer = setTimeout(() => {
                            resetClearBtn();
                        }, 10000);
                    }
                }, 1000);
            }
            else if (clearBtn.dataset.state === 'confirm') {
                // Шаг 3: Подтверждено - очищаем
                clearTimeout(resetTimer);
                hiddenItemIds.clear();
                saveIds();
                renderList();
                hideItems();
                resetClearBtn();
            }
        };

        function resetClearBtn() {
            clearBtn.dataset.state = 'idle';
            clearBtn.textContent = 'Показать всё';
            clearBtn.style.background = '#000';
            clearBtn.style.borderColor = '#ff5252';
            clearBtn.style.color = '#fff';
            clearBtn.style.cursor = 'pointer';
            if (confirmTimer) { clearInterval(confirmTimer); confirmTimer = null; }
            if (resetTimer) { clearTimeout(resetTimer); resetTimer = null; }
        }

        body.appendChild(clearBtn);
        panel.appendChild(body);
        document.body.appendChild(panel);

        // ----- Свёрнутость -----
        function applyCollapsed() {
            if (isCollapsed) {
                body.style.display = 'none';
                btnCollapse.textContent = '+';
            } else {
                body.style.display = 'flex';
                btnCollapse.textContent = '–';
            }
        }

        btnCollapse.addEventListener('click', (e) => {
            e.stopPropagation();
            isCollapsed = !isCollapsed;
            saveCollapsed();
            applyCollapsed();
        });

        // ----- Рендер списка -----
        function renderList() {
            listDiv.innerHTML = '';
            hiddenItemIds.forEach(id => {
                const chip = document.createElement('span');
                chip.textContent = id + ' ×';
                Object.assign(chip.style, {
                    background: '#111',
                    border: '1px solid #555',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    userSelect: 'none'
                });
                chip.title = 'Нажмите, чтобы убрать из скрытых';
                chip.onclick = () => {
                    hiddenItemIds.delete(id);
                    saveIds();
                    renderList();
                    hideItems();
                };
                listDiv.appendChild(chip);
            });
        }

        addBtn.onclick = () => {
            const val = input.value.trim();
            if (val && /^\d+$/.test(val)) {
                hiddenItemIds.add(val);
                input.value = '';
                saveIds();
                renderList();
                hideItems();
            }
        };
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addBtn.click();
        });

        renderList();
        applyCollapsed();

        // ----- Перетаскивание панели -----
        let dragStartX = 0, dragStartY = 0;
        let panelStartLeft = 0, panelStartTop = 0;
        let dragging = false;

        const startDrag = (clientX, clientY) => {
            dragging = true;
            dragStartX = clientX;
            dragStartY = clientY;
            panelStartLeft = parseInt(panel.style.left) || 0;
            panelStartTop = parseInt(panel.style.top) || 0;
        };

        const doDrag = (clientX, clientY) => {
            if (!dragging) return;
            const dx = clientX - dragStartX;
            const dy = clientY - dragStartY;
            panel.style.left = (panelStartLeft + dx) + 'px';
            panel.style.top = (panelStartTop + dy) + 'px';
            clampToViewport(panel);
        };

        const endDrag = () => {
            if (!dragging) return;
            dragging = false;
            savePos();
        };

        header.addEventListener('mousedown', (e) => {
            if (e.target === btnCollapse) return;
            startDrag(e.clientX, e.clientY);
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => doDrag(e.clientX, e.clientY));
        document.addEventListener('mouseup', endDrag);

        header.addEventListener('touchstart', (e) => {
            if (e.target === btnCollapse) return;
            const touch = e.touches[0];
            startDrag(touch.clientX, touch.clientY);
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (!dragging) return;
            const touch = e.touches[0];
            doDrag(touch.clientX, touch.clientY);
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('touchend', endDrag);
        window.addEventListener('resize', () => clampToViewport(panel));
    }

    // ---------- Основной цикл ----------
    setInterval(() => {
        createControlPanel();
        hideItems();

        const itemList = document.getElementById('itemList');
        if (itemList && window.trackedItemList !== itemList) {
            if (window.itemHiderObserver) window.itemHiderObserver.disconnect();
            window.itemHiderObserver = new MutationObserver(hideItems);
            window.itemHiderObserver.observe(itemList, { childList: true, subtree: true });
            window.trackedItemList = itemList;
            hideItems();
        }
    }, 500);

})();
