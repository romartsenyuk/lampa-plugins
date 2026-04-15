(function () {
    'use strict';

    var LampaSync = {
        name: 'Прогрес серій',
        init: function () {
            this.cleanup();
            this.addMenuItem();
            
            // Тиха перевірка при старті
            if (localStorage.getItem('continue_sync_apiKey') && localStorage.getItem('continue_sync_binId')) {
                this.syncFromCloud(true);
            }

            Lampa.Player.listener.follow('destroy', () => this.syncToCloud(true));
        },

        cleanup: function () {
            $('.menu__list .menu__item').each(function () {
                if ($(this).text().indexOf('Прогрес серій') !== -1) $(this).remove();
            });
        },

        addMenuItem: function () {
            var _this = this;
            var item = $('<li class="menu__item selector focusable">' +
                '<div class="menu__ico" style="color: #ff9500 !important;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 4.93L16.24 7.76M7.76 16.24L4.93 19.07M19.07 19.07L16.24 16.24M7.76 7.76L4.93 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
                '<div class="menu__text">' + this.name + '</div>' +
                '</li>');

            item.on('hover:enter click', () => _this.showSettings());
            
            var target = $('.menu__list .menu__item').filter(function() {
                return $(this).text().indexOf('Пізнавальне') !== -1;
            });
            if (target.length) target.after(item);
            else $('.menu__list').append(item);
        },

        showSettings: function () {
            var _this = this;
            var key = localStorage.getItem('continue_sync_apiKey') || '';
            var bin = localStorage.getItem('continue_sync_binId') || '';

            Lampa.Select.show({
                title: this.name,
                items: [
                    { title: 'Ввести Ключ API', subtitle: key || 'Немає', action: 'api' },
                    { title: 'Ввести BIN ID', subtitle: bin || 'Створиться автоматично', action: 'bin' },
                    { title: 'СИНХРОНІЗУВАТИ ЗАРАЗ', subtitle: 'Push/Pull дані', action: 'sync' }
                ],
                onSelect: function (item) {
                    if (item.action === 'api') {
                        var val = prompt('X-Master-Key:', key);
                        if (val) { localStorage.setItem('continue_sync_apiKey', val); _this.showSettings(); }
                    } else if (item.action === 'bin') {
                        var val = prompt('BIN ID (залиште порожнім для нового):', bin);
                        localStorage.setItem('continue_sync_binId', val || '');
                        _this.showSettings();
                    } else if (item.action === 'sync') {
                        _this.syncToCloud(false);
                    }
                },
                onBack: () => Lampa.Controller.toggle('menu')
            });
        },

        syncToCloud: async function (silent) {
            var key = localStorage.getItem('continue_sync_apiKey');
            var bin = localStorage.getItem('continue_sync_binId');
            if (!key) return !silent && Lampa.Noty.show('Помилка: Введіть API Key');

            // Отримуємо дані. Якщо порожньо — створюємо структуру, щоб не було помилки 400
            var localData = Lampa.Storage.get('continue') || {};
            if (Object.keys(localData).length === 0) {
                localData = { "_init": true, "timestamp": Date.now() };
            }

            var url = bin ? 'https://api.jsonbin.io/v3/b/' + bin : 'https://api.jsonbin.io/v3/b';
            
            try {
                const response = await fetch(url, {
                    method: bin ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Master-Key': key,
                        'X-Bin-Private': 'true'
                    },
                    body: JSON.stringify(localData)
                });
                
                const result = await response.json();
                if (result.metadata && result.metadata.id) {
                    localStorage.setItem('continue_sync_binId', result.metadata.id);
                    if (!silent) Lampa.Noty.show('Хмара оновлена успішно!');
                } else if (result.message) {
                    throw new Error(result.message);
                }
            } catch (e) {
                if (!silent) Lampa.Noty.show('Помилка: ' + e.message);
            }
        },

        syncFromCloud: async function (silent) {
            var key = localStorage.getItem('continue_sync_apiKey');
            var bin = localStorage.getItem('continue_sync_binId');
            if (!key || !bin) return;

            try {
                const response = await fetch('https://api.jsonbin.io/v3/b/' + bin + '/latest', {
                    headers: { 'X-Master-Key': key }
                });
                const result = await response.json();
                if (result.record) {
                    var cloudData = result.record;
                    var localData = Lampa.Storage.get('continue') || {};
                    
                    for (var key_data in cloudData) {
                        if (key_data === '_init') continue;
                        if (!localData[key_data] || (cloudData[key_data].time > localData[key_data].time)) {
                            localData[key_data] = cloudData[key_data];
                        }
                    }
                    Lampa.Storage.set('continue', localData);
                    if (!silent) Lampa.Noty.show('Прогрес отримано');
                }
            } catch (e) {}
        }
    };

    if (window.appready) LampaSync.init();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') LampaSync.init(); });
})();
