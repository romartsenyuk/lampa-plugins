(function () {
    'use strict';
    // Змінив назву об'єкта, щоб уникнути конфліктів зі старими копіями
    var LampaSyncUltimate = {
        name: 'Лампа Синхро',
        init: function () {
            var _this = this;
            
            // 1. ПОВНЕ ВИДАЛЕННЯ ВСЬОГО СТАРОГО
            var killOld = function() {
                $('.js-backup-button, .js-sync-clean, .js-cloud-clean, .js-backup-clean').remove();
                $('.menu__item').filter(function() {
                    var t = $(this).text().toLowerCase();
                    return t.indexOf('синхро') > -1 || t.indexOf('хмарний') > -1 || t.indexOf('прогрес') > -1;
                }).remove();
            };

            killOld();
            setTimeout(killOld, 1000); // Повтор через секунду

            // 2. Додаємо одну чисту кнопку
            setTimeout(function(){ _this.addMenuItem(); }, 2000);
            
            // 3. Тихий старт
            setTimeout(function(){ _this.pull(true); }, 1500);

            // 4. Слідкуємо за паузою
            Lampa.Player.listener.follow('state', function(e){
                if(e.state == 'pause') _this.sync(true);
            });
            Lampa.Player.listener.follow('destroy', function(){
                _this.sync(true);
            });
        },
        addMenuItem: function () {
            var _this = this;
            if ($('.js-sync-ultimate').length > 0) return;
            
            var item = $('<li class="menu__item selector focusable js-sync-ultimate"><div class="menu__ico" style="color: #00ff95 !important;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></div><div class="menu__text">' + this.name + '</div></li>');
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
                    { title: 'API Ключ (Master Key)', subtitle: key ? 'ОК' : 'Порожньо', action: 'api' },
                    { title: 'BIN ID (Код)', subtitle: bin || 'Порожньо', action: 'bin' },
                    { title: 'СИНХРОНІЗУВАТИ ЗАРАЗ', action: 'sync_manual' },
                    { title: 'ВІДНОВИТИ ВРУЧНУ', action: 'pull_manual' }
                ],
                onSelect: function (item) {
                    if (item.action === 'api') {
                        Lampa.Input.edit({ value: key, title: 'Master Key' }, function (v) {
                            if (v) { localStorage.setItem('cs_key', v.trim()); _this.showSettings(); }
                        });
                    } else if (item.action === 'bin') {
                        Lampa.Input.edit({ value: bin, title: 'BIN ID' }, function (v) {
                            localStorage.setItem('cs_bin', v ? v.trim() : ''); _this.showSettings();
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
                success: function() { if(!silent) Lampa.Noty.show('Збережено!'); }
            });
        },
        pull: function (silent) {
            var key = localStorage.getItem('cs_key'), bin = localStorage.getItem('cs_bin');
            if (!key || !bin) return;
            $.ajax({
                url: 'https://api.jsonbin.io/v3/b/' + bin + '/latest',
                headers: { 'X-Master-Key': key, 'X-Bin-Meta': 'false' },
                success: function (res) {
                    if (res) {
                        if (res.continue) Lampa.Storage.set('continue', res.continue);
                        if (res.favorite) Lampa.Storage.set('favorite', res.favorite);
                        if (window.Lampa && Lampa.Continue) Lampa.Continue.init();
                        if (!silent) Lampa.Noty.show('Дані синхронізовано!');
                    }
                }
            });
        }
    };
    LampaSyncUltimate.init();
})();
