// ==UserScript==
// @name         Catwar Item Hider
// @namespace    http://tampermonkey.net/
// @version      1.0.1
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
        const rect = panel.getBoundingClientRect();
        const maxLeft = window.innerWidth - rect.width;
        const maxTop = window.innerHeight - rect.height;
        let left = parseInt(panel.style.left) || 0;
        let top = parseInt(panel.style.top) || 0;
        if (left < 0) left = 0;
        if (top < 0) top = 0;
        if (left > maxLeft) left = maxLeft;
        if (top > maxTop) top = maxTop;
        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
    }

    // ---------- Панель ----------
    function createControlPanel() {
        if (document.getElementById('cw-item-hider-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'cw-item-hider-panel';
        Object.assign(panel.style, {
            position: 'fixed',
            zIndex: '99999',
            background: 'rgba(0,0,0,0.78)',
            color: '#fff',
            padding: '0',
            borderRadius: '6px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '12px',
            width: '220px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            overflow: 'hidden'
        });

        // Позиция: либо сохранённая, либо по умолчанию справа снизу
        if (savedPos && typeof savedPos.left === 'number' && typeof savedPos.top === 'number') {
            panel.style.left = savedPos.left + 'px';
            panel.style.top = savedPos.top + 'px';
        } else {
            panel.style.right = '10px';
            panel.style.bottom = '10px';
        }

        // ----- Заголовок (за него тащим) -----
        const header = document.createElement('div');
        header.id = 'cw-item-hider-header';
        Object.assign(header.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 8px',
            background: 'rgba(255,255,255,0.08)',
            cursor: 'move',
            userSelect: 'none',
            fontWeight: 'bold'
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
            background: 'rgba(255,255,255,0.15)',
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
            border: '1px solid #888',
            background: '#222',
            color: '#fff'
        });
        body.appendChild(input);

        // Кнопка "Скрыть"
        const addBtn = document.createElement('button');
        addBtn.textContent = 'Скрыть';
        Object.assign(addBtn.style, {
            padding: '4px', cursor: 'pointer', borderRadius: '3px',
            border: 'none', background: '#4caf50', color: '#fff', fontWeight: 'bold'
        });
        body.appendChild(addBtn);

        // Список чипов
        const listDiv = document.createElement('div');
        listDiv.id = 'cw-item-hider-list';
        Object.assign(listDiv.style, {
            display: 'flex', flexWrap: 'wrap', gap: '4px',
            maxHeight: '100px', overflowY: 'auto'
        });
        body.appendChild(listDiv);

        // Кнопка "Показать всё"
        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Показать всё';
        Object.assign(clearBtn.style, {
            padding: '4px', cursor: 'pointer', borderRadius: '3px',
            border: 'none', background: '#f44336', color: '#fff', fontWeight: 'bold'
        });
        body.appendChild(clearBtn);

        panel.appendChild(body);
        document.body.appendChild(panel);

        // ----- Свёрнутость -----
        function applyCollapsed() {
            if (isCollapsed) {
                body.style.display = 'none';
                panel.style.width = '160px';
                btnCollapse.textContent = '+';
            } else {
                body.style.display = 'flex';
                panel.style.width = '220px';
                btnCollapse.textContent = '–';
            }
            clampToViewport(panel);
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
                    background: '#555', padding: '2px 6px', borderRadius: '10px',
                    cursor: 'pointer', fontSize: '11px', userSelect: 'none'
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
        clearBtn.onclick = () => {
            hiddenItemIds.clear();
            saveIds();
            renderList();
            hideItems();
        };

        renderList();
        applyCollapsed();

        // ----- Перетаскивание за заголовок -----
        let dragStartX = 0, dragStartY = 0;
        let panelStartLeft = 0, panelStartTop = 0;
        let dragging = false;

        header.addEventListener('mousedown', (e) => {
            // Не начинаем тащить, если нажали на кнопку сворачивания
            if (e.target === btnCollapse) return;
            dragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            const rect = panel.getBoundingClientRect();
            panelStartLeft = rect.left;
            panelStartTop = rect.top;
            // Переводим в absolute-координаты через left/top, убираем right/bottom
            panel.style.left = panelStartLeft + 'px';
            panel.style.top = panelStartTop + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            panel.style.left = (panelStartLeft + dx) + 'px';
            panel.style.top = (panelStartTop + dy) + 'px';
            clampToViewport(panel);
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            savePos();
        });

        // Если окно уменьшили — вернуть панель в видимую область
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
