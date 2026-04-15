(function () {
    'use strict';

    var LampaSync = {
        name: 'Прогрес серій',
        
        init: function () {
            this.cleanup();
            this.addMenuItem();
            
            if (localStorage.getItem('continue_sync_apiKey') && localStorage.getItem('continue_sync_binId')) {
                this.syncFromCloud(true);
            }

            // Використовуємо один обробник для плеєра
            Lampa.Player.listener.remove('destroy', this.syncOnPlayerDestroy);
            Lampa.Player.listener.follow('destroy', this.syncOnPlayerDestroy);
        },

        syncOnPlayerDestroy: function() {
            LampaSync.syncToCloud(true);
        },

        cleanup: function () {
            // Жорстке видалення всіх можливих копій за текстом та класом
            $('.menu__list .menu__item').each(function () {
                var text = $(this).text().toLowerCase();
                if (text.indexOf('прогрес серій') !== -1) {
                    $(this).remove();
                }
            });
        },

        addMenuItem: function () {
            var _this = this;
            var item = $('<li class="menu__item selector focusable">' +
                '<div class="menu__ico" style="color: #ff9500 !important;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 4.93L16.24 7.76M7.76 16.24L4.93 19.07M19.07 19.07L16.24 16.24M7.76 7.76L4.93 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
                '<div class="menu__text">' + this.name + '</div>' +
                '</li>');

            item.on('hover:enter click', function() { _this.showSettings(); });
            
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
                    { title: 'API Ключ', subtitle: key ? 'Введено (натисніть для зміни)' : 'Порожньо', action: 'api' },
                    { title: 'BIN ID', subtitle: bin || 'Створиться автоматично', action: 'bin' },
                    { title: 'НАДІСЛАТИ В ХМАРУ', subtitle: 'Push (з цього пристрою)', action: 'sync' },
                    { title: 'ЗАВАНТАЖИТИ З ХМАРИ', subtitle: 'Pull (на цей пристрій)', action: 'pull' }
                ],
                onSelect: function (item) {
                    if (item.action === 'api') {
                        setTimeout(function() {
                            var v = prompt('Введіть API Key:', key);
                            if (v !== null) {
                                localStorage.setItem('continue_sync_apiKey', v.trim());
                                _this.showSettings();
                            }
                        }, 200);
                    } else if (item.action === 'bin') {
                        setTimeout(function() {
                            var v = prompt('Введіть BIN ID:', bin);
                            if (v !== null) {
                                localStorage.setItem('continue_sync_binId', v.trim());
                                _this.showSettings();
                            }
                        }, 200);
                    } else if (item.action === 'sync') {
                        _this.syncToCloud(false);
                    } else if (item.action === 'pull') {
                        _this.syncFromCloud(false);
                    }
                },
                onBack: function() { Lampa.Controller.toggle('menu'); }
            });
        },

        syncToCloud: function (silent) {
            var key = localStorage.getItem('continue_sync_apiKey');
            var bin = localStorage.getItem('continue_sync_binId');
            if (!key) return;

            var localData = Lampa.Storage.get('continue') || {};
            var url = bin ? 'https://api.jsonbin.io/v3/b/' + bin : 'https://api.jsonbin.io/v3/b';
            
            var xhr = new XMLHttpRequest();
            xhr.open(bin ? 'PUT' : 'POST', url, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('X-Master-Key', key);
            xhr.setRequestHeader('X-Bin-Private', 'true');

            xhr.onload = function () {
                if (xhr.status >= 200 && xhr.status < 300) {
                    var res = JSON.parse(xhr.responseText);
                    if (res.metadata && res.metadata.id) {
                        localStorage.setItem('continue_sync_binId', res.metadata.id);
                        if (!silent) Lampa.Noty.show('Збережено в хмару');
                    }
                } else if (!silent) {
                    Lampa.Noty.show('Помилка сервера: ' + xhr.status);
                }
            };
            xhr.onerror = function() { if (!silent) Lampa.Noty.show('Помилка мережі'); };
            xhr.send(JSON.stringify(localData));
        },

        syncFromCloud: function (silent) {
            var key = localStorage.getItem('continue_sync_apiKey');
            var bin = localStorage.getItem('continue_sync_binId');
            if (!key || !bin) return;

            if (!silent) Lampa.Noty.show('Завантаження...');

            var xhr = new XMLHttpRequest();
            xhr.open('GET', 'https://api.jsonbin.io/v3/b/' + bin + '/latest', true);
            xhr.setRequestHeader('X-Master-Key', key);

            xhr.onload = function () {
                if (xhr.status === 200) {
                    var res = JSON.parse(xhr.responseText);
                    var cloudData = res.record || {};
                    var localData = Lampa.Storage.get('continue') || {};
                    var updated = false;

                    for (var id in cloudData) {
                        if (!localData[id] || (cloudData[id].time > localData[id].time)) {
                            localData[id] = cloudData[id];
                            updated = true;
                        }
                    }
                    if (updated) {
                        Lampa.Storage.set('continue', localData);
                        if (!silent) Lampa.Noty.show('Прогрес синхронізовано!');
                    } else {
                        if (!silent) Lampa.Noty.show('Дані вже актуальні');
                    }
                } else if (!silent) {
                    Lampa.Noty.show('Помилка: ' + xhr.status);
                }
            };
            xhr.onerror = function() { if (!silent) Lampa.Noty.show('Помилка з’єднання'); };
            xhr.send();
        }
    };

    // Очищення перед ініціалізацією
    LampaSync.cleanup();
    if (window.appready) LampaSync.init();
    else Lampa.Listener.follow('app', function(e) {
        if (e.type === 'ready') LampaSync.init();
    });
})();
