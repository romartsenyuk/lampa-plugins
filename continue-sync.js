(function () {
    'use strict';
    var LampaBackuper = {
        name: 'Лампа Синхро',
        last_sync_time: 0,
        init: function () {
            var _this = this;
            $('.js-backup-clean').remove();
            $('.menu__item').filter(function() {
                var t = $(this).text();
                return t.indexOf('Прогрес') > -1 || t.indexOf('Синхро') > -1 || t.indexOf('Хмарний') > -1;
            }).remove();

            setTimeout(function(){ _this.addMenuItem(); }, 2000);
            
            // 1. Авто-завантаження при старті (ТИХО)
            setTimeout(function(){ _this.pull(true); }, 1000);

            // 2. Слідкуємо за плеєром
            Lampa.Player.listener.follow('state', function(e){
                // Коли ставимо на паузу — миттєво зберігаємо
                if(e.state == 'pause') {
                    _this.sync(true);
                }
            });

            Lampa.Player.listener.follow('destroy', function(){
                // Коли закриваємо плеєр — теж зберігаємо
                _this.sync(true);
            });
        },
        addMenuItem: function () {
            var _this = this;
            if ($('.js-sync-clean').length > 0) return;
            var item = $('<li class="menu__item selector focusable js-sync-clean"><div class="menu__ico" style="color: #00ff95 !important;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></div><div class="menu__text">' + this.name + '</div></li>');
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
                    { title: 'API Ключ (Master Key)', action: 'api' },
                    { title: 'BIN ID (Код сховища)', action: 'bin' },
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

            // Захист від занадто частих запитів (не частіше ніж раз на 10 сек)
            var now = Date.now();
            if(silent && now - this.last_sync_time < 10000) return;
            this.last_sync_time = now;

            var allData = {
                continue: Lampa.Storage.get('continue') || {},
                favorite: Lampa.Storage.get('favorite') || {},
                settings: Lampa.Storage.get('settings') || {}
            };

            $.ajax({
                url: 'https://api.jsonbin.io/v3/b/' + bin,
                type: 'PUT',
                headers: { 'X-Master-Key': key, 'Content-Type': 'application/json' },
                data: JSON.stringify(allData),
                success: function () {
                    if (!silent) Lampa.Noty.show('Збережено!');
                }
            });
        },
        pull: function (silent) {
            var key = localStorage.getItem('cs_key'), bin = localStorage.getItem('cs_bin');
            if (!key || !bin) return;
            $.ajax({
                url: 'https://api.jsonbin.io/v3/b/' + bin + '/latest',
                headers: { 'X-Master-Key': key },
                success: function (res) {
                    if (res.record) {
                        var d = res.record;
                        if (d.continue) Lampa.Storage.set('continue', d.continue);
                        if (d.favorite) Lampa.Storage.set('favorite', d.favorite);
                        
                        if (window.Lampa && Lampa.Continue) Lampa.Continue.init();
                        if (!silent) {
                            Lampa.Noty.show('Відновлено!');
                            setTimeout(function(){ window.location.reload(); }, 500);
                        }
                    }
                }
            });
        }
    };
    LampaBackuper.init();
})();
