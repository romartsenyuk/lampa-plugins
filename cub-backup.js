(function () {
    'use strict';
    var LampaCloud = {
        name: 'Хмарний Бекап',
        init: function () {
            var _this = this;
            // Очищення меню від старих версій
            $('.js-cloud-clean').remove();
            $('.menu__item').filter(function() {
                return $(this).text().indexOf('Прогрес') > -1 || $(this).text().indexOf('Хмарний') > -1;
            }).remove();

            setTimeout(function(){ _this.addMenuItem(); }, 2000);
        },
        addMenuItem: function () {
            var _this = this;
            if ($('.js-cloud-clean').length > 0) return;
            var item = $('<li class="menu__item selector focusable js-cloud-clean"><div class="menu__ico" style="color: #00d2ff !important;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg></div><div class="menu__text">' + this.name + '</div></li>');
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
                    { title: 'API Ключ (Master Key)', subtitle: key ? 'Налаштовано' : 'Порожньо', action: 'api' },
                    { title: 'BIN ID (Номер хмари)', subtitle: bin || 'Створиться при першому бекапі', action: 'bin' },
                    { title: 'ЗРОБИТИ ПОВНИЙ БЕКАП', subtitle: 'Відправити все в хмару зараз', action: 'sync' },
                    { title: 'ВІДНОВИТИ ВСЕ', subtitle: 'Завантажити історію, обране та інше', action: 'pull' }
                ],
                onSelect: function (item) {
                    if (item.action === 'api') {
                        Lampa.Input.edit({ value: key, title: 'Введіть Master Key' }, function (v) {
                            if (v) { localStorage.setItem('cs_key', v.trim()); _this.showSettings(); }
                        });
                    } else if (item.action === 'bin') {
                        Lampa.Input.edit({ value: bin, title: 'Введіть BIN ID' }, function (v) {
                            localStorage.setItem('cs_bin', v ? v.trim() : ''); _this.showSettings();
                        });
                    } else if (item.action === 'sync') { _this.sync(); }
                    else if (item.action === 'pull') { _this.pull(); }
                }
            });
        },
        sync: function () {
            var key = localStorage.getItem('cs_key'), bin = localStorage.getItem('cs_bin');
            if (!key) return Lampa.Noty.show('Потрібен API Ключ');

            // Збираємо АБСОЛЮТНО ВСЕ
            var fullData = {
                continue: Lampa.Storage.get('continue') || {},
                favorite: Lampa.Storage.get('favorite') || {},
                plugins: Lampa.Storage.get('plugins') || [],
                settings: Lampa.Storage.get('settings') || {}
            };

            Lampa.Noty.show('Створення повної копії...');
            $.ajax({
                url: bin ? 'https://api.jsonbin.io/v3/b/' + bin : 'https://api.jsonbin.io/v3/b',
                type: bin ? 'PUT' : 'POST',
                headers: { 'X-Master-Key': key, 'Content-Type': 'application/json', 'X-Bin-Private': 'true' },
                data: JSON.stringify({backup: fullData}),
                success: function (res) {
                    if (!bin) {
                        var newId = res.metadata.id;
                        localStorage.setItem('cs_bin', newId);
                    }
                    Lampa.Noty.show('Бекап успішно збережено!');
                },
                error: function () { Lampa.Noty.show('Помилка сервера'); }
            });
        },
        pull: function () {
            var key = localStorage.getItem('cs_key'), bin = localStorage.getItem('cs_bin');
            if (!key || !bin) return Lampa.Noty.show('Потрібен BIN ID');

            $.ajax({
                url: 'https://api.jsonbin.io/v3/b/' + bin + '/latest',
                headers: { 'X-Master-Key': key },
                success: function (res) {
                    if (res.record && res.record.backup) {
                        var d = res.record.backup;
                        
                        // Відновлюємо по черзі
                        if (d.continue) Lampa.Storage.set('continue', d.continue);
                        if (d.favorite) Lampa.Storage.set('favorite', d.favorite);
                        if (d.plugins) Lampa.Storage.set('plugins', d.plugins);
                        if (d.settings) Lampa.Storage.set('settings', d.settings);

                        Lampa.Noty.show('Все відновлено! Перезавантаження...');
                        setTimeout(function(){ window.location.reload(); }, 1500);
                    }
                },
                error: function() { Lampa.Noty.show('Помилка завантаження'); }
            });
        }
    };
    LampaCloud.init();
})();
