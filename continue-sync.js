(function () {
    'use strict';

    var LampaSync = {
        name: 'Прогрес серій',
        apiKey: '',
        binId: '',

        init: function () {
            // Отримуємо ключі
            this.apiKey = localStorage.getItem('continue_sync_apiKey') || '';
            this.binId = localStorage.getItem('continue_sync_binId') || '';

            this.addMenuItem();
            
            // Авто-синхронізація при старті (тиха)
            if (this.apiKey && this.binId) {
                setTimeout(this.syncFromCloud.bind(this, true), 3000);
            }

            // Збереження після виходу з плеєра (коли статус серії оновився)
            Lampa.Player.listener.follow('destroy', function(){
                setTimeout(LampaSync.syncToCloud.bind(LampaSync, true), 2000);
            });
        },

        addMenuItem: function () {
            var _this = this;
            var menu_item = $('<li class="menu__item selector focusable" tabindex="0">' +
                '<div class="menu__ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 4.93L16.24 7.76M7.76 16.24L4.93 19.07M19.07 19.07L16.24 16.24M7.76 7.76L4.93 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
                '<div class="menu__text">' + this.name + '</div>' +
                '</li>');

            menu_item.on('hover:enter click', function () {
                _this.showSettings();
            });

            $('.menu__list').append(menu_item);
        },

        showSettings: function () {
            var _this = this;
            var items = [
                { title: 'Ключ API (X-Master-Key)', subtitle: this.apiKey || 'Натисніть для вводу', type: 'api' },
                { title: 'BIN ID', subtitle: this.binId || 'Натисніть "Синхронізувати зараз" для створення', type: 'bin' },
                { title: 'Синхронізувати зараз', subtitle: 'Злити дані з хмарою', type: 'sync' },
                { title: 'Отримати з хмари', subtitle: 'Завантажити історію на пристрій', type: 'pull' }
            ];

            Lampa.Select.show({
                title: this.name,
                items: items,
                onSelect: function (item) {
                    if (item.type === 'api') {
                        var val = prompt('Введіть X-Master-Key:', _this.apiKey);
                        if (val) {
                            _this.apiKey = val;
                            localStorage.setItem('continue_sync_apiKey', val);
                            _this.showSettings();
                        }
                    } else if (item.type === 'bin') {
                        var val = prompt('Введіть BIN ID:', _this.binId);
                        if (val) {
                            _this.binId = val;
                            localStorage.setItem('continue_sync_binId', val);
                            _this.showSettings();
                        }
                    } else if (item.type === 'sync') {
                        _this.syncToCloud(false);
                    } else if (item.type === 'pull') {
                        _this.syncFromCloud(false);
                    }
                },
                onBack: function () {
                    Lampa.Controller.toggle('menu');
                }
            });
        },

        // Універсальний метод отримання даних прогресу
        getContinueData: function() {
            var data = Lampa.Storage.get('continue') || localStorage.getItem('continue');
            try {
                return (typeof data === 'string') ? JSON.parse(data) : (data || {});
            } catch(e) { return {}; }
        },

        syncToCloud: function (silent) {
            var _this = this;
            if (!this.apiKey) return;

            var localData = this.getContinueData();
            var method = this.binId ? 'PUT' : 'POST';
            var url = this.binId ? 'https://api.jsonbin.io/v3/b/' + this.binId : 'https://api.jsonbin.io/v3/b';

            $.ajax({
                url: url,
                type: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.apiKey,
                    'X-Bin-Private': 'true'
                },
                data: JSON.stringify(localData),
                success: function (res) {
                    if (!_this.binId && res.metadata && res.metadata.id) {
                        _this.binId = res.metadata.id;
                        localStorage.setItem('continue_sync_binId', _this.binId);
                    }
                    if (!silent) Lampa.Noty.show('Прогрес збережено');
                }
            });
        },

        syncFromCloud: function (silent) {
            var _this = this;
            if (!this.apiKey || !this.binId) return;

            $.ajax({
                url: 'https://api.jsonbin.io/v3/b/' + this.binId + '/latest',
                type: 'GET',
                headers: { 'X-Master-Key': this.apiKey },
                success: function (res) {
                    var cloudData = res.record;
                    var localData = _this.getContinueData();
                    
                    // Злиття даних: залишаємо той прогрес, де час перегляду більший
                    for (var key in cloudData) {
                        if (!localData[key] || (cloudData[key].time > localData[key].time)) {
                            localData[key] = cloudData[key];
                        }
                    }

                    // Записуємо в обидва місця для надійності
                    Lampa.Storage.set('continue', localData);
                    localStorage.setItem('continue', JSON.stringify(localData));
                    
                    if (!silent) Lampa.Noty.show('Прогрес оновлено з хмари');
                }
            });
        }
    };

    // Запуск
    var start = function() {
        if (window.LampaSyncReady) return;
        window.LampaSyncReady = true;
        LampaSync.init();
    };

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') start();
    });

})();
