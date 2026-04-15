(function () {
    'use strict';

    var LampaSync = {
        name: 'Прогрес серій',
        
        init: function () {
            this.cleanup();
            this.addMenuItem();
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

            item.on('hover:enter click', function() { _this.showSettings(); });
            $('.menu__list').append(item);
        },

        showSettings: function () {
            var _this = this;
            var key = localStorage.getItem('continue_sync_apiKey') || '';
            var bin = localStorage.getItem('continue_sync_binId') || '';

            Lampa.Select.show({
                title: this.name,
                items: [
                    { title: 'API Ключ', subtitle: key ? 'Введено' : 'Порожньо', action: 'api' },
                    { title: 'BIN ID', subtitle: bin || 'Створиться автоматично', action: 'bin' },
                    { title: 'НАДІСЛАТИ В ХМАРУ', action: 'sync' },
                    { title: 'ЗАВАНТАЖИТИ З ХМАРИ', action: 'pull' }
                ],
                onSelect: function (item) {
                    try {
                        if (item.action === 'api') {
                            var v = prompt('Введіть API Key:', key);
                            if (v) { localStorage.setItem('continue_sync_apiKey', v.trim()); _this.showSettings(); }
                        } else if (item.action === 'bin') {
                            var v = prompt('Введіть BIN ID:', bin);
                            if (v !== null) { localStorage.setItem('continue_sync_binId', v.trim()); _this.showSettings(); }
                        } else if (item.action === 'sync') {
                            _this.syncToCloud();
                        } else if (item.action === 'pull') {
                            _this.syncFromCloud();
                        }
                    } catch(e) { Lampa.Noty.show('Помилка меню: ' + e.message); }
                },
                onBack: function() { Lampa.Controller.toggle('menu'); }
            });
        },

        syncToCloud: function () {
            var key = localStorage.getItem('continue_sync_apiKey');
            var bin = localStorage.getItem('continue_sync_binId');
            if (!key) return Lampa.Noty.show('Немає ключа');

            var localData = Lampa.Storage.get('continue') || {};
            var url = bin ? 'https://api.jsonbin.io/v3/b/' + bin : 'https://api.jsonbin.io/v3/b';
            
            Lampa.Noty.show('Відправка...');

            $.ajax({
                url: url,
                type: bin ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': key,
                    'X-Bin-Private': 'true'
                },
                data: JSON.stringify(localData),
                success: function (res) {
                    if (res.metadata && res.metadata.id) {
                        localStorage.setItem('continue_sync_binId', res.metadata.id);
                        Lampa.Noty.show('Успішно збережено!');
                    }
                },
                error: function (xhr) {
                    Lampa.Noty.show('Помилка: ' + xhr.status + ' ' + xhr.responseText);
                }
            });
        },

        syncFromCloud: function () {
            var key = localStorage.getItem('continue_sync_apiKey');
            var bin = localStorage.getItem('continue_sync_binId');
            if (!key || !bin) return Lampa.Noty.show('Немає даних для завантаження');

            Lampa.Noty.show('Завантаження...');

            $.ajax({
                url: 'https://api.jsonbin.io/v3/b/' + bin + '/latest',
                type: 'GET',
                headers: { 'X-Master-Key': key },
                success: function (res) {
                    if (res.record) {
                        Lampa.Storage.set('continue', res.record);
                        Lampa.Noty.show('Дані отримано! Перезавантажте розділ');
                    }
                },
                error: function (xhr) {
                    Lampa.Noty.show('Помилка завантаження: ' + xhr.status);
                }
            });
        }
    };

    LampaSync.init();
})();
