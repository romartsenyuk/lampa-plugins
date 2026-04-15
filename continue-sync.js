/**
 * Lampa — синхронізація прогресу серій між пристроями
 * Синхронізує ТІЛЬКИ "continue" (який сезон/серія/час переглянуто)
 * Не чіпає закладки, історію, вподобайки — щоб не конфліктувати з CUB/Alpac
 *
 * Сховище: jsonbin.io (безкоштовно, https://jsonbin.io)
 */
(function () {
  "use strict";

  var ID       = "continue_sync";
  var API      = "https://api.jsonbin.io/v3/b";

  // ── Налаштування ──────────────────────────────
  // Заповніть тут, або введіть через меню плагіна
  var CFG = {
    apiKey: "",   // X-Master-Key з jsonbin.io
    binId:  "",   // залиште порожнім — створить автоматично при першому пуші
  };
  // ──────────────────────────────────────────────

  // Локальне сховище налаштувань
  function cfgGet(k)    { try { return JSON.parse(localStorage.getItem(ID+"_"+k)) || CFG[k]; } catch(e) { return CFG[k]; } }
  function cfgSet(k, v) { try { localStorage.setItem(ID+"_"+k, JSON.stringify(v)); } catch(e) {} }

  function apiKey() { return cfgGet("apiKey"); }
  function binId()  { return cfgGet("binId");  }

  function log(msg) { console.log("[ContinueSync]", msg); }

  function noty(msg, type) {
    if (window.Lampa && Lampa.Noty) Lampa.Noty.show(msg, { time: 3000, type: type||"info" });
  }

  // ── Читаємо "continue" з Lampa ─────────────
  function getLocal() {
    try {
      // Lampa.Storage.get або прямо з localStorage
      var data = null;
      if (window.Lampa && Lampa.Storage) {
        data = Lampa.Storage.get("continue");
      }
      if (!data) {
        var raw = localStorage.getItem("continue");
        data = raw ? JSON.parse(raw) : {};
      }
      return data || {};
    } catch(e) { return {}; }
  }

  // ── Записуємо злитий "continue" назад ──────
  function setLocal(data) {
    try {
      if (window.Lampa && Lampa.Storage) {
        Lampa.Storage.set("continue", data);
      }
      localStorage.setItem("continue", JSON.stringify(data));
    } catch(e) {}
  }

  // ── Злиття: беремо більший час перегляду ───
  function merge(local, remote) {
    var result = JSON.parse(JSON.stringify(local));
    Object.keys(remote).forEach(function(id) {
      var r = remote[id];
      var l = result[id];
      // Беремо той запис де більше переглянуто (time) або новіший (season/episode)
      if (!l) {
        result[id] = r;
      } else {
        var rProgress = (r.season || 1) * 1000 + (r.episode || 1);
        var lProgress = (l.season || 1) * 1000 + (l.episode || 1);
        if (rProgress > lProgress || (rProgress === lProgress && (r.time||0) > (l.time||0))) {
          result[id] = r;
        }
      }
    });
    return result;
  }

  // ── Завантажити на jsonbin ──────────────────
  function push(callback) {
    var key = apiKey();
    var bid = binId();
    if (!key) { noty("ContinueSync: вкажіть API ключ", "warning"); return; }

    var payload = { ts: Date.now(), continue: getLocal() };
    var method  = bid ? "PUT" : "POST";
    var url     = bid ? API+"/"+bid : API;

    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("X-Master-Key", key);
    if (!bid) xhr.setRequestHeader("X-Bin-Name", "LampaContinueSync");

    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        var res = JSON.parse(xhr.responseText);
        if (!bid && res.metadata && res.metadata.id) {
          cfgSet("binId", res.metadata.id);
          log("BIN створено: " + res.metadata.id);
        }
        // push silent
        if (callback) callback(null);
      } else {
        noty("Помилка пуш: " + xhr.status, "error");
        if (callback) callback(new Error(xhr.status));
      }
    };
    xhr.onerror = function() { noty("Помилка мережі", "error"); if (callback) callback(new Error("net")); };
    xhr.send(JSON.stringify(payload));
  }

  // ── Отримати з jsonbin і злити ──────────────
  function pull(callback) {
    var key = apiKey();
    var bid = binId();
    if (!key || !bid) { noty("ContinueSync: налаштуйте API ключ і BIN ID", "warning"); return; }

    var xhr = new XMLHttpRequest();
    xhr.open("GET", API+"/"+bid+"/latest", true);
    xhr.setRequestHeader("X-Master-Key", key);

    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          var remote  = JSON.parse(xhr.responseText).record;
          var local   = getLocal();
          var merged  = merge(local, remote.continue || {});
          setLocal(merged);
          // pull silent
          if (callback) callback(null);
        } catch(e) {
          noty("Помилка обробки даних", "error");
          if (callback) callback(e);
        }
      } else {
        noty("Помилка пул: " + xhr.status, "error");
        if (callback) callback(new Error(xhr.status));
      }
    };
    xhr.onerror = function() { noty("Помилка мережі", "error"); if (callback) callback(new Error("net")); };
    xhr.send();
  }

  // ── Повна синхронізація (pull → merge → push) 
  function sync(silent) {
    var key = apiKey();
    var bid = binId();
    if (!key) return;
    if (!bid) { push(); return; } // перший раз — просто пушимо

    var xhr = new XMLHttpRequest();
    xhr.open("GET", API+"/"+bid+"/latest", true);
    xhr.setRequestHeader("X-Master-Key", key);

    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          var remote = JSON.parse(xhr.responseText).record;
          var local  = getLocal();
          var merged = merge(local, remote.continue || {});
          setLocal(merged);
          // Одразу пушимо злитий результат
          push(function() {
            // sync silent
          });
        } catch(e) { if (!silent) noty("Помилка синхронізації", "error"); }
      } else if (xhr.status === 404) {
        push(); // BIN ще не існує — створюємо
      }
    };
    xhr.onerror = function() { if (!silent) noty("Помилка мережі", "error"); };
    xhr.send();
  }

  // ── Меню плагіна ───────────────────────────
  function openMenu() {
    Lampa.Select.show({
      title: "Синхронізація прогресу серій",
      items: [
        { title: "🔑 API ключ (X-Master-Key)", subtitle: apiKey() ? "✓ встановлено" : "⚠ не встановлено", action: "key" },
        { title: "📦 BIN ID",                  subtitle: binId()  || "буде створено автоматично",           action: "bin" },
        { title: "🔄 Синхронізувати зараз",    subtitle: "pull + push",                                     action: "sync" },
        { title: "⬆ Тільки завантажити",       subtitle: "відправити локальні дані",                        action: "push" },
        { title: "⬇ Тільки отримати",          subtitle: "злити з хмарними даними",                         action: "pull" },
      ],
      onSelect: function(item) {
        Lampa.Select.close();

        function showInput(title, current, onEnter) {
          if (Lampa.Input && typeof Lampa.Input.show === "function") {
            Lampa.Input.show({ title: title, value: current, onEnter: onEnter });
          } else if (Lampa.Keypad && typeof Lampa.Keypad.show === "function") {
            Lampa.Keypad.show({ title: title, value: current, onEnter: onEnter });
          } else {
            // Власне поле вводу як запасний варіант
            var overlay = document.createElement("div");
            overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;";
            var label = document.createElement("div");
            label.textContent = title;
            label.style.cssText = "color:#fff;font-size:20px;text-align:center;max-width:80vw;";
            var inp = document.createElement("input");
            inp.type = "text";
            inp.value = current || "";
            inp.style.cssText = "padding:12px 20px;font-size:18px;width:500px;max-width:80vw;background:#222;color:#fff;border:2px solid #fff;border-radius:8px;outline:none;";
            var hint = document.createElement("div");
            hint.textContent = "Enter — зберегти, Escape — скасувати";
            hint.style.cssText = "color:#aaa;font-size:14px;";
            overlay.appendChild(label);
            overlay.appendChild(inp);
            overlay.appendChild(hint);
            document.body.appendChild(overlay);
            inp.focus(); inp.select();
            function close(save) {
              var v = inp.value;
              document.body.removeChild(overlay);
              document.removeEventListener("keydown", onKey);
              if (save) onEnter(v);
            }
            function onKey(e) {
              if (e.key === "Enter")  { e.stopPropagation(); close(true);  }
              if (e.key === "Escape") { e.stopPropagation(); close(false); }
            }
            document.addEventListener("keydown", onKey);
          }
        }

        if (item.action === "key") {
          showInput("X-Master-Key з jsonbin.io", apiKey(), function(v) {
            cfgSet("apiKey", v.trim()); noty("Ключ збережено");
          });
        } else if (item.action === "bin") {
          showInput("BIN ID (порожньо = створити автоматично)", binId(), function(v) {
            cfgSet("binId", v.trim()); noty("BIN ID збережено");
          });
        } else if (item.action === "sync") {
          pull(function(err) {
            if (!err) push(function() { noty("✓ Синхронізовано", "success"); });
          });
        } else if (item.action === "push") {
          push(function() { noty("✓ Завантажено", "success"); });
        } else if (item.action === "pull") {
          pull(function() { noty("✓ Отримано", "success"); });
        }
      }
    });
  }

  // ── Додаємо пункт у меню Lampa ─────────────
  function addToMenu() {
    var ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>';
    var injected = false;

    function inject() {
      if (injected) return;

      // Спосіб 1: офіційний API (нові версії Lampa)
      if (window.Lampa && Lampa.Menu && Lampa.Menu.add) {
        Lampa.Menu.add({ id: ID, title: "Прогрес серій", icon: ICON, action: openMenu });
        injected = true;
        return;
      }

      // Спосіб 2: DOM + реєстрація в навігації Lampa
      var list = document.querySelector(".menu__list");
      if (!list) return;
      injected = true;

      var li = document.createElement("li");
      li.className = "menu__item selector";
      li.setAttribute("data-action", ID);
      li.innerHTML = '<div class="menu__ico">'+ICON+'</div><div class="menu__text">Прогрес серій</div>';

      // Клік мишею
      li.addEventListener("click", openMenu);

      // Клавіатура / пульт: Enter або OK (keyCode 13)
      li.setAttribute("tabindex", "0");
      li.addEventListener("keydown", function(e) {
        if (e.keyCode === 13 || e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          openMenu();
        }
      });

      // Вставляємо перед останнім пунктом
      list.insertBefore(li, list.lastElementChild || null);

      // Реєструємо в системі навігації Lampa
      // Lampa використовує Lampa.Controller для керування фокусом
      if (Lampa.Controller && Lampa.Controller.add) {
        // Після того як меню отримає фокус — додаємо наш елемент до навігації
        Lampa.Listener.follow("menu", function(e) {
          if (e.type === "open" || e.type === "show") {
            // Примусово включаємо наш елемент в навігацію
            setTimeout(function() {
              if (Lampa.Navigator && Lampa.Navigator.add) {
                Lampa.Navigator.add(li);
              }
            }, 100);
          }
        });
      }

      // Спроба одразу додати до навігатора
      setTimeout(function() {
        if (window.Lampa && Lampa.Navigator && Lampa.Navigator.add) {
          Lampa.Navigator.add(li);
        }
        // Деякі версії Lampa використовують jQuery-подібний фокус
        if (li.classList && !li.classList.contains("focused")) {
          li.setAttribute("tabindex", "0");
        }
      }, 500);

      log("Пункт меню додано");
    }

    inject();
    if (!injected) {
      // MutationObserver — чекаємо появи меню
      var obs = new MutationObserver(function() { inject(); if (injected) obs.disconnect(); });
      obs.observe(document.body, { childList: true, subtree: true });
      // Страхувальний таймер
      var t = setInterval(function() { inject(); if (injected) clearInterval(t); }, 1000);
      setTimeout(function() { clearInterval(t); }, 15000);
    }
  }

  // ── Хук на закриття плеєра ─────────────────
  function hookPlayer() {
    if (!window.Lampa || !Lampa.Listener) return;
    Lampa.Listener.follow("player", function(e) {
      if (e.type === "destroy" || e.type === "end") {
        // Через 5 секунд після закриття плеєра — синхронізуємо тихо
        setTimeout(function() { sync(true); }, 5000);
      }
    });
  }

  // ── Авто-синхронізація ─────────────────────
  // Пушимо після закриття плеєра (вже є в hookPlayer)
  // Тут просто заглушка щоб не ламати виклик startAuto()
  function startAuto() {}

  // ── Бекап в localStorage (додатковий захист) ──
  function saveBackup() {
    try {
      var data = getLocal();
      if (Object.keys(data).length > 0) {
        localStorage.setItem(ID + "_backup", JSON.stringify({
          ts: Date.now(),
          continue: data
        }));
      }
    } catch(e) {}
  }

  function restoreBackup() {
    try {
      var raw = localStorage.getItem(ID + "_backup");
      if (!raw) return false;
      var backup = JSON.parse(raw);
      if (!backup || !backup.continue) return false;
      var local = getLocal();
      var merged = merge(local, backup.continue);
      setLocal(merged);
      log("Відновлено з локального бекапу");
      return true;
    } catch(e) { return false; }
  }

  // ── Старт ──────────────────────────────────
  function init() {
    log("Запуск");
    addToMenu();
    hookPlayer();
    startAuto();

    // Зберігаємо бекап кожні 2 хвилини
    setInterval(saveBackup, 2 * 60 * 1000);

    // При запуску: спочатку відновлюємо з бекапу, потім тягнемо з хмари
    setTimeout(function() {
      restoreBackup();
      var local = getLocal();
      var keys = Object.keys(local);
      log("Локальний continue: " + keys.length + " записів. Ключі: " + keys.slice(0,3).join(", "));
      if (apiKey() && binId()) {
        sync(true);
      } else {
        log("API ключ або BIN ID не встановлено — синхронізація пропущена");
      }
    }, 8000);

    // Слідкуємо за входом в акаунт — після логіну відновлюємо дані
    if (Lampa.Listener) {
      Lampa.Listener.follow("account", function(e) {
        if (e.type === "auth" || e.type === "login" || e.type === "ready") {
          log("Акаунт авторизовано — відновлюємо прогрес...");
          setTimeout(function() {
            restoreBackup();
            if (apiKey() && binId()) sync(true);
          }, 3000);
        }
      });
    }
  }

  // Чекаємо Lampa
  if (window.Lampa && Lampa.Storage) {
    init();
  } else {
    var t = setInterval(function() {
      if (window.Lampa && Lampa.Storage) { clearInterval(t); init(); }
    }, 500);
  }

})();
