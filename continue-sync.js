(function () {
    'use strict';
    var LampaSyncV3 = {
        name: 'Лампа Синхро',
        init: function () {
            var _this = this;
            
            // 1. ЖОРСТКА ЗАЧИСТКА МЕНЮ
            var clearAll = function() {
                $('.menu__item').filter(function() {
                    var t = $(this).text().toLowerCase();
                    return (t.indexOf('синхро') > -1 || t.indexOf('хмарний') > -1) && !$(this).hasClass('js-sync-v3');
                }).remove();
            };
            clearAll();
            setTimeout(clearAll, 1000);
            setTimeout(clearAll, 5000);

            // 2. ДОДАЄМО ОДНУ КНОПКУ
            setTimeout(function(){ _this.addMenuItem(); }, 2000);
            
            // 3. АВТО-ПУЛЛ ПРИ СТАРТІ
            setTimeout(function(){ _this.pull(true); }, 1500);

            // 4. ПАУЗА = БЕКАП
            Lampa.Player.listener.follow('state', function(e){
                if(e.state == 'pause') _this.sync(true);
            });
        },
        addMenuItem: function () {
            var _this = this;
            if ($('.js-sync-v3').length > 0) return;
            var item = $('<li class="menu__item selector focusable js-sync-v3"><div class="menu__ico" style="color: #00ff95 !important;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></div><div class="menu__text">' + this.name + '</div></li>');
            item.on('click', function() { _this.showSettings(); });
            $('.menu__list').append(item);
        },
        showSettings: function () {
            var _this = this;
            var key = localStorage.getItem('cs_key') || '';
            var bin = localStorage.getItem('cs_bin') || '';
            Lampa.Select.show({
                title: this.name,
                items: [
                    { title: 'КЛЮЧ: ' + (key ? key.substring(0, 10) + '...' : 'НЕМАЄ'), action: 'api' },
                    { title: 'BIN ID: ' + (bin || 'НЕМАЄ'), action: 'bin' },
                    { title: 'ВІДПРАВИТИ (Push)', action: 'sync_manual' },
                    { title: 'ОТРИМАТИ (Pull)', action: 'pull_manual' }
                ],
                onSelect: function (item) {
                    if (item.action === 'api') {
                        Lampa.Input.edit({ value: key, title: 'Master Key' }, function (v) {
                            if (v) { localStorage.setItem('cs_key', v.trim()); _this.showSettings(); }
                        });
                    } else if (item.action === 'bin') {
                        Lampa.Input.edit({ value: bin, title: 'BIN ID' }, function (v) {
                            if (v) { localStorage.setItem('cs_bin', v.trim()); _this.showSettings(); }
                        });
                    } else if (item.action === 'sync_manual') { _this.sync(false); }
                    else if (item.action === 'pull_manual') { _this.pull(false); }
                }
            });
        },
        sync: function (silent) {
            var key = localStorage.getItem('cs_key'), bin = localStorage.getItem('cs_bin');
            if (!key || !bin) return;
            var allData = {
                continue: Lampa.Storage.get('continue') || {},
                favorite: Lampa.Storage.get('favorite') || {}
            };
            $.ajax({
                url: 'https://api.jsonbin.io/v3/b/' + bin,
                type: 'PUT',
                headers: { 'X-Master-Key': key, 'Content-Type': 'application/json' },
                data: JSON.stringify(allData),
                success: function() { if(!silent) Lampa.Noty.show('Дані в хмарі!'); },
                error: function(xhr) { if(!silent) Lampa.Noty.show('Помилка: ' + xhr.status); }
            });
        },
        pull: function (silent) {
            var key = localStorage.getItem('cs_key'), bin = localStorage.getItem('cs_bin');
            if (!key || !bin) return;
            // Додаємо random параметр, щоб обійти кеш сервера
            $.ajax({
                url: 'https://api.jsonbin.io/v3/b/' + bin + '/latest?nocache=' + Math.random(),
                headers: { 'X-Master-Key': key, 'X-Bin-Meta': 'false' },
                success: function (res) {
                    var data = res.record ? res.record : res;
                    if (data && data.continue) {
                        Lampa.Storage.set('continue', data.continue);
                        if (data.favorite) Lampa.Storage.set('favorite', data.favorite);
                        
                        // Примусово кажемо Лампі перечитати історію
                        if (window.Lampa && Lampa.Continue) {
                            Lampa.Continue.init();
                        }
                        
                        if (!silent) {
                            Lampa.Noty.show('Синхронізовано!');
                            setTimeout(function(){ window.location.reload(); }, 300);
                        }
                    }
                }
            });
        }
    };
    LampaSyncV3.init();
})();
