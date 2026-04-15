/**
 * Плагін 2: Бекап всіх даних Lampa в CUB акаунт
 * Зберігає: закладки, вподобайки, історію, прогрес серій, налаштування
 * Відновлення в будь-який момент одним натисканням
 */
(function () {
  'use strict';

  var PLUGIN_ID = 'cub_backup';
  var API = 'https://api.jsonbin.io/v3/b';

  function getKey() { return localStorage.getItem(PLUGIN_ID + '_key') || ''; }
  function getBin() { return localStorage.getItem(PLUGIN_ID + '_bin') || ''; }
  function setKey(v) { localStorage.setItem(PLUGIN_ID + '_key', v); }
  function setBin(v) { localStorage.setItem(PLUGIN_ID + '_bin', v); }
  function getLastDate() { return localStorage.getItem(PLUGIN_ID + '_date') || 'Ніколи'; }
  function setLastDate() { localStorage.setItem(PLUGIN_ID + '_date', new Date().toLocaleString('uk-UA')); }

  function noty(msg, type) { Lampa.Noty.show(msg, { time: 3000, type: type || 'info' }); }
  function err(msg) { noty('⚠ ' + msg, 'error'); }

  // ── Збираємо ВСІ дані Lampa ──────────────────
  var KEYS = ['continue', 'history', 'bookmarks', 'likes', 'later', 'quality', 'lang', 'notice'];

  function collectAll() {
    var result = { version: 1, date: Date.now(), items: {} };
    KEYS.forEach(function(k) {
      try {
        var v = Lampa.Storage.get(k);
        if (v !== null && v !== undefined) result.items[k] = v;
      } catch(e) {}
    });
    return result;
  }

  // ── Відновлюємо дані в Lampa ─────────────────
  function applyAll(backup) {
    if (!backup || !backup.items) return false;
    Object.keys(backup.items).forEach(function(k) {
      try { Lampa.Storage.set(k, backup.items[k]); } catch(e) {}
    });
    return true;
  }

  // ── Зберегти бекап на сервер ─────────────────
  function save(onDone) {
    var key = getKey();
    var bin = getBin();
    if (!key) { err('Вкажіть API ключ'); return; }

    noty('Збереження бекапу...');
    var payload = JSON.stringify(collectAll());
    var method = bin ? 'PUT' : 'POST';
    var url = bin ? API + '/' + bin : API;

    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Master-Key', key);
    if (!bin) xhr.setRequestHeader('X-Bin-Name', 'LampaFullBackup');
    xhr.setRequestHeader('X-Bin-Private', 'true');

    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var res = JSON.parse(xhr.responseText);
          if (!bin && res.metadata && res.metadata.id) setBin(res.metadata.id);
        } catch(e) {}
        setLastDate();
        noty('✓ Бекап збережено — ' + new Date().toLocaleString('uk-UA'));
        if (onDone) onDone(null);
      } else {
        err('Помилка збереження: ' + xhr.status);
        if (onDone) onDone(new Error(xhr.status));
      }
    };
    xhr.onerror = function() { err('Помилка мережі'); if (onDone) onDone(new Error('net')); };
    xhr.send(payload);
  }

  // ── Відновити бекап з сервера ─────────────────
  function restore(onDone) {
    var key = getKey();
    var bin = getBin();
    if (!key || !bin) { err('Вкажіть API ключ та BIN ID'); return; }

    noty('Отримання бекапу...');
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API + '/' + bin + '/latest', true);
    xhr.setRequestHeader('X-Master-Key', key);

    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          var backup = JSON.parse(xhr.responseText).record;
          var ok = applyAll(backup);
          if (ok) {
            noty('✓ Бекап відновлено! Перезапустіть Lampa.');
          } else {
            err('Бекап порожній або пошкоджений');
          }
          if (onDone) onDone(null);
        } catch(e) {
          err('Помилка обробки даних');
          if (onDone) onDone(e);
        }
      } else {
        err('Помилка отримання: ' + xhr.status);
        if (onDone) onDone(new Error(xhr.status));
      }
    };
    xhr.onerror = function() { err('Помилка мережі'); if (onDone) onDone(new Error('net')); };
    xhr.send();
  }

  // ── Поле вводу ───────────────────────────────
  function showInput(title, current, onEnter) {
    if (Lampa.Input && typeof Lampa.Input.edit === 'function') {
      return Lampa.Input.edit({ title: title, value: current || '' }, function(v) {
        if (v !== null && v !== undefined) onEnter(v);
      });
    }
    if (Lampa.Input && typeof Lampa.Input.show === 'function') {
      return Lampa.Input.show({ title: title, value: current || '', onEnter: onEnter });
    }
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
    btn.style.cssText = 'padding:10px 32px;font-size:16px;background:#27ae60;color:#fff;border:none;border-radius:8px;cursor:pointer;';
    overlay.appendChild(lbl);
    overlay.appendChild(inp);
    overlay.appendChild(btn);
    document.body.appendChild(overlay);
    inp.focus(); inp.select();
    function done() { document.body.removeChild(overlay); onEnter(inp.value); }
    btn.addEventListener('click', done);
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') done();
      if (e.key === 'Escape') document.body.removeChild(overlay);
    });
  }

  // ── Підтвердження відновлення ─────────────────
  function confirmRestore() {
    Lampa.Select.show({
      title: '⚠ Відновити бекап?',
      items: [
        { title: '✓ Так, відновити', subtitle: 'Поточні дані будуть замінені', action: 'yes' },
        { title: '✗ Скасувати', action: 'no' },
      ],
      onSelect: function(item) {
        Lampa.Select.close();
        if (item.action === 'yes') restore();
      }
    });
  }

  // ── Меню плагіна ─────────────────────────────
  function showSettings() {
    Lampa.Select.show({
      title: 'Бекап Lampa',
      items: [
        { title: '🔑 API ключ', subtitle: getKey() ? '✓ встановлено' : '⚠ не встановлено', action: 'key' },
        { title: '📦 BIN ID',   subtitle: getBin() || 'буде створено автоматично',           action: 'bin' },
        { title: '💾 Зберегти бекап',   subtitle: 'Зберегти всі дані в хмару', action: 'save' },
        { title: '♻ Відновити бекап',   subtitle: 'Останній: ' + getLastDate(), action: 'restore' },
      ],
      onSelect: function(item) {
        Lampa.Select.close();
        if (item.action === 'key') {
          showInput('API ключ (X-Master-Key з jsonbin.io)', getKey(), function(v) {
            setKey(v.trim()); noty('✓ Ключ збережено');
          });
        } else if (item.action === 'bin') {
          showInput('BIN ID (залиште порожнім — створить сам)', getBin(), function(v) {
            setBin(v.trim()); noty('✓ BIN ID збережено');
          });
        } else if (item.action === 'save') {
          save();
        } else if (item.action === 'restore') {
          confirmRestore();
        }
      }
    });
  }

  // ── Додаємо пункт меню ────────────────────────
  function addMenuItem() {
    document.querySelectorAll('[data-backup-menu]').forEach(function(el) { el.remove(); });

    var ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/></svg>';

    var list = document.querySelector('.menu__list');
    if (!list) return false;

    var li = document.createElement('li');
    li.className = 'menu__item selector';
    li.setAttribute('data-backup-menu', '1');
    li.setAttribute('tabindex', '0');
    li.innerHTML = '<div class="menu__ico" style="color:#27ae60">' + ICON + '</div><div class="menu__text">Бекап Lampa</div>';
    li.addEventListener('click', showSettings);
    li.addEventListener('keydown', function(e) {
      if (e.keyCode === 13 || e.key === 'Enter') { e.preventDefault(); showSettings(); }
    });

    list.insertBefore(li, list.lastElementChild || null);
    return true;
  }

  // ── Ініціалізація ─────────────────────────────
  function init() {
    if (!addMenuItem()) {
      var obs = new MutationObserver(function() {
        if (addMenuItem()) obs.disconnect();
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (window.Lampa && Lampa.Storage && Lampa.Listener) {
    init();
  } else {
    var t = setInterval(function() {
      if (window.Lampa && Lampa.Storage && Lampa.Listener) { clearInterval(t); init(); }
    }, 500);
  }

})();
