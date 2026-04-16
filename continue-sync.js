(function () {
    'use strict';
    var LampaBackuper = {
        name: 'Лампа Синхро (Все в одному)',
        init: function () {
            var _this = this;
            // Повне очищення меню від будь-яких копій плагіна
            $('.js-backup-clean').remove();
            $('.menu__item').filter(function() {
                var t = $(this).text();
                return t.indexOf('Прогрес') > -1 || t.indexOf('Синхро') > -1 || t.indexOf('Хмарний') > -1;
            }).remove();

            setTimeout(function(){ _this.addMenuItem(); }, 2000);
            
            // Авто-завантаження при старті (через 3 сек після запуску)
            setTimeout(function(){ _this.pull(true); }, 3000);
        },
        addMenuItem: function () {
            var _this = this;
            if ($('.js-backup-clean').length > 0) return;
            var item = $('<li class="menu__item selector focusable js-backup-clean"><div class="menu__ico" style="color: #00ff95 !important;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></div><div class="menu__text">' + this.name + '</div></li>');
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
                    { title: 'API Ключ (Master Key)', subtitle: key ? 'Введено' : 'Порожньо', action: 'api' },
                    { title: 'BIN ID (Код сховища)', subtitle: bin || 'Створиться автоматично', action: 'bin' },
                    { title: 'ЗБЕРЕГТИ ВСЕ', subtitle: 'Історія + Обране + Налаштування', action: 'sync' },
                    { title: 'ВІДНОВИТИ ВСЕ', subtitle: 'Завантажити все з хмари', action: 'pull' }
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
                    else if (item.action === 'pull') { _this.pull(false); }
                }
            });
        },
        sync: function () {
            var key = localStorage.getItem('cs_key'), bin = localStorage.getItem('cs_bin');
            if (!key) return Lampa.Noty.show('Потрібен API Ключ');

            // Збираємо дані: історія, обране, налаштування
            var allData = {
                continue: Lampa.Storage.get('continue') || {},
                favorite: Lampa.Storage.get('favorite') || {},
                settings: Lampa.Storage.get('settings') || {}
            };

            Lampa.Noty.show('Синхронізація...');
            $.ajax({
                url: bin ? 'https://api.jsonbin.io/v3/b/' + bin : 'https://api.jsonbin.io/v3/b',
                type: bin ? 'PUT' : 'POST',
                headers: { 'X-Master-Key': key, 'Content-Type': 'application/json', 'X-Bin-Private': 'true' },
                data: JSON.stringify(allData),
                success: function (res) {
                    if (!bin) localStorage.setItem('cs_bin', res.metadata.id);
                    Lampa.Noty.show('Дані в хмарі успішно!');
                },
                error: function () { Lampa.Noty.show('Помилка сервера. Перевірте Ключ.'); }
            });
        },
        pull: function (silent) {
            var key = localStorage.getItem('cs_key'), bin = localStorage.getItem('cs_bin');
            if (!key || !bin) return;

            $.ajax({
                url: 'https://api.jsonbin.io/v3/b/' + bin + '/latest',
                headers: { 'X-Master-Key': key },
                success: function (res) {
                    var d = res.record;
                    if (d) {
                        if (d.continue) Lampa.Storage.set('continue', d.continue);
                        if (d.favorite) Lampa.Storage.set('favorite', d.favorite);
                        if (d.settings) Lampa.Storage.set('settings', d.settings);

                        if (!silent) {
                            Lampa.Noty.show('Відновлено! Перезавантаження...');
                            setTimeout(function(){ window.location.reload(); }, 1000);
                        }
                    }
                }
            });
        }
    };
    LampaBackuper.init();
})();
