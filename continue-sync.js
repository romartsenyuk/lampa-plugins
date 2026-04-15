/**
 * Плагін 1: Синхронізація прогресу серій між пристроями
 * Використовує jsonbin.io як сховище
 * Автосинхронізація: при запуску + після перегляду
 * Повідомлення: тільки при помилках
 */
(function () {
  'use strict';

  var PLUGIN_ID = 'cs2';
  var API = 'https://api.jsonbin.io/v3/b';

  // ── Утиліти ──────────────────────────────────
  function getKey() { return localStorage.getItem(PLUGIN_ID + '_key') || ''; }
  function getBin() { return localStorage.getItem(PLUGIN_ID + '_bin') || ''; }
  function setKey(v) { localStorage.setItem(PLUGIN_ID + '_key', v); }
  function setBin(v) { localStorage.setItem(PLUGIN_ID + '_bin', v); }

  function err(msg) { Lampa.Noty.show('⚠ ' + msg, { time: 4000, type: 'error' }); }

  // ── Читаємо continue через Lampa.Storage ─────
  function getData() {
    try {
      var d = Lampa.Storage.get('continue');
      if (d && typeof d === 'object' && !Array.isArray(d)) return d;
    } catch(e) {}
    return {};
  }

  // ── Записуємо злиті дані назад ───────────────
  function setData(data) {
    try { Lampa.Storage.set('continue', data); } catch(e) {}
  }

  // ── Злиття: беремо більший прогрес ───────────
  function merge(local, remote) {
    var result = JSON.parse(JSON.stringify(local || {}));
    Object.keys(remote || {}).forEach(function(id) {
      var r = remote[id];
      var l = result[id];
      if (!l) {
        result[id] = r;
      } else {
        var rp = ((r.season || 1) * 10000) + ((r.episode || 1) * 10) + (r.time || 0);
        var lp = ((l.season || 1) * 10000) + ((l.episode || 1) * 10) + (l.time || 0);
        if (rp > lp) result[id] = r;
      }
    });
    return result;
  }

  // ── Завантажити на сервер ─────────────────────
  function push(onDone) {
    var key = getKey();
    var bin = getBin();
    if (!key) return;

    var payload = JSON.stringify({ data: getData(), ts: Date.now() });
    var method = bin ? 'PUT' : 'POST';
    var url = bin ? API + '/' + bin : API;

    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Master-Key', key);
    if (!bin) xhr.setRequestHeader('X-Bin-Name', 'LampaContinue');
    xhr.setRequestHeader('X-Bin-Private', 'true');

    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var res = JSON.parse(xhr.responseText);
          if (!bin && res.metadata && res.metadata.id) {
            setBin(res.metadata.id);
          }
        } catch(e) {}
        if (onDone) onDone(null);
      } else {
        err('Помилка збереження: ' + xhr.status);
        if (onDone) onDone(new Error(xhr.status));
      }
    };
    xhr.onerror = function() { err('Помилка мережі'); if (onDone) onDone(new Error('net')); };
    xhr.send(payload);
  }

  // ── Отримати з сервера і злити ────────────────
  function pull(onDone, showOk) {
    var key = getKey();
    var bin = getBin();
    if (!key || !bin) {
      err('Вкажіть API ключ та BIN ID');
      if (onDone) onDone(new Error('no_config'));
      return;
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', API + '/' + bin + '/latest', true);
    xhr.setRequestHeader('X-Master-Key', key);

    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          var remote = JSON.parse(xhr.responseText).record;
          var merged = merge(getData(), remote.data || {});
          setData(merged);
          if (showOk) Lampa.Noty.show('✓ Прогрес серій синхронізовано', { time: 2000 });
          if (onDone) onDone(null);
        } catch(e) {
          err('Помилка обробки даних');
          if (onDone) onDone(e);
        }
      } else if (xhr.status === 404) {
        // BIN порожній — просто пушимо
        push(onDone);
      } else {
        err('Помилка отримання: ' + xhr.status);
        if (onDone) onDone(new Error(xhr.status));
      }
    };
    xhr.onerror = function() { err('Помилка мережі'); if (onDone) onDone(new Error('net')); };
    xhr.send();
  }

  // ── Повна синхронізація pull → merge → push ──
  function sync(showOk) {
    var key = getKey();
    var bin = getBin();
    if (!key) return;
    if (!bin) { push(); return; }

    pull(function(e) {
      if (!e) push(function() {
        if (showOk) Lampa.Noty.show('✓ Синхронізовано', { time: 2000 });
      });
    }, false);
  }

  // ── Поле вводу (сумісне з усіма версіями) ────
  function showInput(title, current, onEnter) {
    // Lampa.Input.edit (новіші версії)
    if (Lampa.Input && typeof Lampa.Input.edit === 'function') {
      return Lampa.Input.edit({ title: title, value: current || '' }, function(v) {
        if (v !== null && v !== undefined) onEnter(v);
      });
    }
    // Lampa.Input.show (старіші версії)
    if (Lampa.Input && typeof Lampa.Input.show === 'function') {
      return Lampa.Input.show({ title: title, value: current || '', onEnter: onEnter });
    }
    // Власний оверлей — для iPhone та інших
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;padding:20px;box-sizing:border-box;';
    var lbl = document.createElement('div');
    lbl.textContent = title;
    lbl.style.cssText = 'color:#fff;font-size:18px;text-align:center;max-width:90%;';
    var inp = document.createElement('input');
    inp.type = 'text';
    inp.value = current || '';
    inp.style.cssText = 'padding:12px 16px;font-size:16px;width:100%;max-width:480px;background:#1a1a1a;color:#fff;border:2px solid #fff;border-radius:8px;outline:none;box-sizing:border-box;';
    var btn = document.createElement('button');
    btn.textContent = 'Зберегти';
    btn.style.cssText = 'padding:10px 32px;font-size:16px;background:#ff9500;color:#fff;border:none;border-radius:8px;cursor:pointer;';
    overlay.appendChild(lbl);
    overlay.appendChild(inp);
    overlay.appendChild(btn);
    document.body.appendChild(overlay);
    inp.focus();
    inp.select();

    function done() {
      document.body.removeChild(overlay);
      onEnter(inp.value);
    }
    btn.addEventListener('click', done);
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') done();
      if (e.key === 'Escape') document.body.removeChild(overlay);
    });
  }

  // ── Меню налаштувань ──────────────────────────
  function showSettings() {
    Lampa.Select.show({
      title: 'Синхронізація прогресу серій',
      items: [
        { title: '🔑 API ключ', subtitle: getKey() ? '✓ встановлено' : '⚠ не встановлено', action: 'key' },
        { title: '📦 BIN ID',   subtitle: getBin() || 'буде створено автоматично',           action: 'bin' },
        { title: '🔄 Синхронізувати',  subtitle: 'отримати + надіслати', action: 'sync' },
        { title: '⬆ Надіслати в хмару', subtitle: 'відправити локальні дані', action: 'push' },
        { title: '⬇ Завантажити з хмари', subtitle: 'отримати та злити', action: 'pull' },
      ],
      onSelect: function(item) {
        Lampa.Select.close();
        if (item.action === 'key') {
          showInput('API ключ (X-Master-Key з jsonbin.io)', getKey(), function(v) {
            setKey(v.trim());
            Lampa.Noty.show('✓ Ключ збережено', { time: 2000 });
          });
        } else if (item.action === 'bin') {
          showInput('BIN ID (залиште порожнім — створить сам)', getBin(), function(v) {
            setBin(v.trim());
            Lampa.Noty.show('✓ BIN ID збережено', { time: 2000 });
          });
        } else if (item.action === 'sync') {
          sync(true);
        } else if (item.action === 'push') {
          push(function(e) { if (!e) Lampa.Noty.show('✓ Надіслано', { time: 2000 }); });
        } else if (item.action === 'pull') {
          pull(null, true);
        }
      }
    });
  }

  // ── Додаємо пункт меню (один раз) ────────────
  function addMenuItem() {
    // Видаляємо старі версії якщо є
    document.querySelectorAll('[data-sync-menu]').forEach(function(el) { el.remove(); });

    var ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>';

    var list = document.querySelector('.menu__list');
    if (!list) return false;

    var li = document.createElement('li');
    li.className = 'menu__item selector';
    li.setAttribute('data-sync-menu', '1');
    li.setAttribute('tabindex', '0');
    li.innerHTML = '<div class="menu__ico" style="color:#ff9500">' + ICON + '</div><div class="menu__text">Прогрес серій</div>';
    li.addEventListener('click', showSettings);
    li.addEventListener('keydown', function(e) {
      if (e.keyCode === 13 || e.key === 'Enter') { e.preventDefault(); showSettings(); }
    });

    list.insertBefore(li, list.lastElementChild || null);
    return true;
  }

  // ── Хук на закриття плеєра ───────────────────
  function hookPlayer() {
    Lampa.Listener.follow('player', function(e) {
      if (e.type === 'destroy' || e.type === 'end') {
        setTimeout(function() {
          if (getKey() && getBin()) sync(false);
        }, 5000);
      }
    });
  }

  // ── Ініціалізація ─────────────────────────────
  function init() {
    hookPlayer();

    // Додаємо меню
    if (!addMenuItem()) {
      var obs = new MutationObserver(function() {
        if (addMenuItem()) obs.disconnect();
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }

    // Синхронізація при запуску (через 6 сек щоб CUB встиг завантажити дані)
    setTimeout(function() {
      if (getKey() && getBin()) sync(false);
    }, 6000);

    // Слідкуємо за авторизацією
    Lampa.Listener.follow('account', function(e) {
      if (e.type === 'auth' || e.type === 'login' || e.type === 'ready') {
        setTimeout(function() {
          if (getKey() && getBin()) sync(false);
        }, 4000);
      }
    });
  }

  // ── Старт ─────────────────────────────────────
  if (window.Lampa && Lampa.Storage && Lampa.Listener) {
    init();
  } else {
    var t = setInterval(function() {
      if (window.Lampa && Lampa.Storage && Lampa.Listener) {
        clearInterval(t);
        init();
      }
    }, 500);
  }

})();
