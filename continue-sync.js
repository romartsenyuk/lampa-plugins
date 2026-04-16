(function () {
    'use strict';
    var LampaSyncFinal = {
        name: 'Лампа Синхро',
        init: function () {
            var _this = this;
            $('.js-sync').remove();
            setTimeout(function(){ _this.addMenuItem(); }, 2000);
            setTimeout(function(){ _this.pull(true); }, 3000);
        },
        addMenuItem: function () {
            var _this = this;
            if ($('.js-sync').length > 0) return;
            var item = $('<li class="menu__item selector focusable js-sync"><div class="menu__ico" style="color: #00ff95 !important;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></div><div class="menu__text">' + this.name + '</div></li>');
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
                    { title: 'КЛЮЧ: ' + (key ? key.substring(0, 5) + '***' : 'НЕМАЄ'), action: 'api' },
                    { title: 'BIN ID: ' + (bin || 'НЕМАЄ'), action: 'bin' },
                    { title: 'ВІДПРАВИТИ ДАНІ', action: 'sync' },
                    { title: 'ОТРИМАТИ ДАНІ', action: 'pull' }
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
                    } else if (item.action === 'sync') { _this.sync(); }
                    else if (item.action === 'pull') { _this.pull(); }
                }
            });
        },
        sync: function () {
            var key = localStorage.getItem('cs_key'), bin = localStorage.getItem('cs_bin');
            if (!key || !bin) return;

            // Збираємо дані вручну прямо з localStorage, якщо Lampa.Storage.get підводить
            var dataToSync = {
                continue: JSON.parse(localStorage.getItem('lampa_continue') || '{}'),
                favorite: JSON.parse(localStorage.getItem('lampa_favorite') || '{}'),
                view: JSON.parse(localStorage.getItem('lampa_view') || '{}'),
                online_view: JSON.parse(localStorage.getItem('lampa_online_view') || '{}')
            };

            $.ajax({
                url: 'https://api.jsonbin.io/v3/b/' + bin,
                type: 'PUT',
                headers: { 'X-Master-Key': key, 'Content-Type': 'application/json' },
                data: JSON.stringify(dataToSync),
                success: function() { Lampa.Noty.show('Дані відправлено!'); }
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
                        if (data.continue) localStorage.setItem('lampa_continue', JSON.stringify(data.continue));
                        if (data.favorite) localStorage.setItem('lampa_favorite', JSON.stringify(data.favorite));
                        if (data.view) localStorage.setItem('lampa_view', JSON.stringify(data.view));
                        if (data.online_view) localStorage.setItem('lampa_online_view', JSON.stringify(data.online_view));
                        
                        if (!silent) {
                            Lampa.Noty.show('Синхронізовано!');
                            setTimeout(function(){ window.location.reload(); }, 500);
                        }
                    }
                }
            });
        }
    };
    LampaSyncFinal.init();
})();
