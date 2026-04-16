(function () {
    'use strict';
    var LampaSyncEvent = {
        name: 'Лампа Синхро PRO',
        init: function () {
            var _this = this;
            $('.js-sync-pro').remove();
            setTimeout(function(){ _this.addMenuItem(); }, 2000);
            
            // СЛУХАЧ ПЛЕЄРА: як тільки відео зупиняється — дані летять у хмару
            Lampa.Player.listener.follow('state', function (e) {
                if (e.state === 'pause' || e.state === 'stop' || e.state === 'end') {
                    _this.sync(true);
                }
            });

            // Авто-отримання при старті
            setTimeout(function(){ _this.pull(true); }, 3000);
        },
        addMenuItem: function () {
            var _this = this;
            var item = $('<li class="menu__item selector focusable js-sync-pro"><div class="menu__ico" style="color: #00ff95 !important;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></div><div class="menu__text">Синхро PRO</div></li>');
            item.on('click', function() { _this.showSettings(); });
            $('.menu__list').append(item);
        },
        showSettings: function () {
            var _this = this;
            var key = localStorage.getItem('cs_key') || '';
            var bin = localStorage.getItem('cs_bin') || '';
            Lampa.Select.show({
                title: 'Синхронізація',
                items: [
                    { title: 'КЛЮЧ API', action: 'api' },
                    { title: 'BIN ID', action: 'bin' },
                    { title: 'РУЧНИЙ PUSH', action: 'sync' },
                    { title: 'РУЧНИЙ PULL', action: 'pull' }
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
                    } else if (item.action === 'sync') { _this.sync(false); }
                    else if (item.action === 'pull') { _this.pull(false); }
                }
            });
        },
        sync: function (silent) {
            var key = localStorage.getItem('cs_key'), bin = localStorage.getItem('cs_bin');
            if (!key || !bin) return;

            // Збираємо все, що тільки можна знайти
            var dataToSync = {
                continue: Lampa.Storage.get('continue') || {},
                favorite: Lampa.Storage.get('favorite') || {},
                view: Lampa.Storage.get('view') || {},
                online_view: Lampa.Storage.get('online_view') || {},
                // Специфічні дані для серій
                timeline: Lampa.Storage.get('player_timeline') || {}
            };

            $.ajax({
                url: 'https://api.jsonbin.io/v3/b/' + bin,
                type: 'PUT',
                headers: { 'X-Master-Key': key, 'Content-Type': 'application/json' },
                data: JSON.stringify(dataToSync),
                success: function() { 
                    if(!silent) Lampa.Noty.show('Дані в хмарі!'); 
                }
            });
        },
        pull: function (silent) {
            var key = localStorage.getItem('cs_key'), bin = localStorage.getItem('cs_bin');
            if (!key || !bin) return;
            $.ajax({
                url: 'https://api.jsonbin.io/v3/b/' + bin + '/latest?nocache=' + Math.random(),
                headers: { 'X-Master-Key': key, 'X-Bin-Meta': 'false' },
                success: function (res) {
                    var data = res.record ? res.record : res;
                    if (data) {
                        if (data.continue) Lampa.Storage.set('continue', data.continue);
                        if (data.favorite) Lampa.Storage.set('favorite', data.favorite);
                        if (data.view) Lampa.Storage.set('view', data.view);
                        if (data.online_view) Lampa.Storage.set('online_view', data.online_view);
                        if (data.timeline) Lampa.Storage.set('player_timeline', data.timeline);
                        
                        if (!silent) {
                            Lampa.Noty.show('Синхронізовано!');
                            setTimeout(function(){ window.location.reload(); }, 300);
                        }
                    }
                }
            });
        }
    };
    LampaSyncEvent.init();
})();
