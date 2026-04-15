(function () {
    'use strict';

    var LampaSync = {
        name: 'Прогрес серій',
        apiKey: '',
        binId: '',

        init: function () {
            this.apiKey = localStorage.getItem('continue_sync_apiKey') || '';
            this.binId = localStorage.getItem('continue_sync_binId') || '';

            this.cleanup();
            this.addMenuItem();
            
            // Авто-синхронізація при старті (тиха)
            if (this.apiKey && this.binId) {
                this.syncFromCloud(true);
            }

            // Збереження при виході з плеєра
            Lampa.Player.listener.follow('destroy', () => {
                this.syncToCloud(true);
            });
        },

        cleanup: function () {
            $('.menu__list .menu__item').each(function () {
                if ($(this).text().indexOf('Прогрес серій') !== -1) $(this).remove();
            });
        },

        addMenuItem: function () {
            var _this = this;
            var item = $('<li class="menu__item selector focusable">' +
                '<div class="menu__ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 4.93L16.24 7.76M7.76 16.24L4.93 19.07M19.07 19.07L16.24 16.24M7.76 7.76L4.93 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
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
            Lampa.Select.show({
                title: this.name,
                items: [
                    { title: 'Ключ API', subtitle: this.apiKey || 'Натисніть для вводу', type: 'api' },
                    { title: 'BIN ID', subtitle: this.binId || 'Створиться автоматично', type: 'bin' },
                    { title: 'Синхронізувати зараз', subtitle: 'Перевірити зв’язок', type: 'sync' }
                ],
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
                        Lampa.Noty.show('Запуск синхронізації...');
                        _this.syncToCloud(false);
                    }
                },
                onBack: () => Lampa.Controller.toggle('menu')
            });
        },

        getContinueData: function() {
            try {
                var data = Lampa.Storage.get('continue') || localStorage.getItem('continue') || '{}';
                return (typeof data === 'string') ? JSON.parse(data) : data;
            } catch(e) { return {}; }
        },

        syncToCloud: async function (silent) {
            if (!this.apiKey) {
                if (!silent) Lampa.Noty.show('Помилка: Немає ключа API');
                return;
            }

            const data = this.getContinueData();
            const url = this.binId ? `https://api.jsonbin.io/v3/b/${this.binId}` : 'https://api.jsonbin.io/v3/b';
            
            try {
                const response = await fetch(url, {
                    method: this.binId ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Master-Key': this.apiKey,
                        'X-Bin-Private': 'true'
                    },
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) throw new Error('Статус сервера: ' + response.status);

                const result = await response.json();
                if (result.metadata && result.metadata.id) {
                    this.binId = result.metadata.id;
                    localStorage.setItem('continue_sync_binId', this.binId);
                    if (!silent) Lampa.Noty.show('Успішно збережено в хмару!');
                }
            } catch (e) {
                console.error('LampaSync Error:', e);
                if (!silent) Lampa.Noty.show('Помилка: ' + e.message);
            }
        },

        syncFromCloud: async function (silent) {
            if (!this.apiKey || !this.binId) return;

            try {
                const response = await fetch(`https://api.jsonbin.io/v3/b/${this.binId}/latest`, {
                    headers: { 'X-Master-Key': this.apiKey }
                });
                
                if (!response.ok) throw new Error('Статус: ' + response.status);

                const result = await response.json();
                const cloudData = result.record || {};
                const localData = this.getContinueData();

                let updated = false;
                for (let key in cloudData) {
                    if (!localData[key] || (cloudData[key].time > localData[key].time)) {
                        localData[key] = cloudData[key];
                        updated = true;
                    }
                }

                if (updated) {
                    Lampa.Storage.set('continue', localData);
                    localStorage.setItem('continue', JSON.stringify(localData));
                    if (!silent) Lampa.Noty.show('Дані з хмари отримано!');
                } else {
                    if (!silent) Lampa.Noty.show('Локальні дані вже актуальні');
                }
            } catch (e) {
                if (!silent) Lampa.Noty.show('Помилка завантаження: ' + e.message);
            }
        }
    };

    if (window.appready) LampaSync.init();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') LampaSync.init(); });
})();
