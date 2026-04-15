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
                var text = $(this).text().toLowerCase();
                if (text.indexOf('прогрес серій') !== -1) $(this).remove();
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
                    { title: 'API Ключ', subtitle: key ? 'Введено' : 'Натисніть для вводу', action: 'api' },
                    { title: 'BIN ID', subtitle: bin || 'Створиться автоматично', action: 'bin' },
                    { title: 'НАДІСЛАТИ В ХМАРУ', action: 'sync' },
                    { title: 'ЗАВАНТАЖИТИ З ХМАРИ', action: 'pull' }
                ],
                onSelect: function (item) {
                    if (item.action === 'api') {
                        Lampa.Input.edit({ title: 'Введіть API Key', value: key, free: true }, function (v) {
                            if (v) { localStorage.setItem('continue_sync_apiKey', v.trim()); _this.showSettings(); }
                        });
                    } else if (item.action === 'bin') {
                        Lampa.Input.edit({ title: 'Введіть BIN ID', value: bin, free: true }, function (v) {
                            if (v !== null) { localStorage.setItem('continue_sync_binId', v.trim()); _this.showSettings(); }
                        });
                    } else if (item.action === 'sync') {
                        _this.syncToCloud();
                    } else if (item.action === 'pull') {
                        _this.syncFromCloud();
                    }
                },
                onBack: function() { Lampa.Controller.toggle('menu'); }
            });
        },

        syncToCloud: function () {
            var key = localStorage.getItem('continue_sync_apiKey');
            var bin = localStorage.getItem('continue_sync_binId');
            if (!key) return Lampa.Noty.show('Потрібен API Ключ');

            var localData = Lampa.Storage.get('continue') || {};
            var url = bin ? 'https://api.jsonbin.io/v3/b/' + bin : 'https://api.jsonbin.io/v3/b';
            
            Lampa.Noty.show('Відправка даних...');

            $.ajax({
                url: url,
                type: bin ? 'PUT' : 'POST',
                headers: { 'X-Master-Key': key, 'Content-Type': 'application/json', 'X-Bin-Private': 'true' },
                data: JSON.stringify(localData),
                success: function (res) {
                    if (res.metadata && res.metadata.id) {
                        localStorage.setItem('continue_sync_binId', res.metadata.id);
                        Lampa.Noty.show('Збережено в хмару!');
                    }
                },
                error: function (xhr) {
                    Lampa.Noty.show('Помилка сервера: ' + xhr.status);
                }
            });
        },

        syncFromCloud: function () {
            var key = localStorage.getItem('continue_sync_apiKey');
            var bin = localStorage.getItem('continue_sync_binId');
            if (!key || !bin) return Lampa.Noty.show('Немає BIN ID');

            Lampa.Noty.show('Завантаження...');

            $.ajax({
                url: 'https://api.jsonbin.io/v3/b/' + bin + '/latest',
                type: 'GET',
                headers: { 'X-Master-Key': key },
                success: function (res) {
                    if (res.record) {
                        Lampa.Storage.set('continue', res.record);
                        Lampa.Noty.show('Успішно оновлено!');
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
