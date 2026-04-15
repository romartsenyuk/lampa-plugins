(function () {
    'use strict';
    var LampaSync = {
        name: 'Прогрес серій',
        init: function () {
            var _this = this;
            
            // Очищення меню від дублікатів (важливо для ТВ)
            $('.js-sync-clean').remove();
            $('.menu__item').filter(function() {
                var txt = $(this).text();
                return txt.indexOf('Прогрес серій') > -1 || txt.indexOf('Синхронізація') > -1;
            }).remove();

            // Додаємо кнопку. На ТВ затримка допомагає кнопці не зникати.
            setTimeout(function(){ _this.addMenuItem(); }, 2000);
            
            // Авто-завантаження при старті (тихе)
            setTimeout(function(){ _this.pull(true); }, 3000);
        },

        addMenuItem: function () {
            var _this = this;
            if ($('.js-sync-clean').length > 0) return;
            
            var item = $('<li class="menu__item selector focusable js-sync-clean"><div class="menu__ico" style="color: #ff9500 !important;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 4.93L16.24 7.76M7.76 16.24L4.93 19.07M19.07 19.07L16.24 16.24M7.76 7.76L4.93 4.93"/></svg></div><div class="menu__text">' + this.name + '</div></li>');
            
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
                    { title: 'API Ключ', subtitle: key ? 'Введено' : 'Порожньо', action: 'api' },
                    { title: 'BIN ID', subtitle: bin || 'Порожньо', action: 'bin' },
                    { title: 'НАДІСЛАТИ В ХМАРУ', action: 'sync' },
                    { title: 'ЗАВАНТАЖИТИ З ХМАРИ', action: 'pull' }
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
            
            var data = Lampa.Storage.get('continue') || {};
            Lampa.Noty.show('Синхронізація...');
            
            $.ajax({
                url: bin ? 'https://api.jsonbin.io/v3/b/' + bin : 'https://api.jsonbin.io/v3/b',
                type: bin ? 'PUT' : 'POST',
                headers: { 'X-Master-Key': key, 'Content-Type': 'application/json', 'X-Bin-Private': 'true' },
                data: JSON.stringify({backup: data}),
                success: function (res) {
                    if (!bin) localStorage.setItem('cs_bin', res.metadata.id);
                    Lampa.Noty.show('Збережено!');
                },
                error: function () { Lampa.Noty.show('Помилка сервера'); }
            });
        },

        pull: function (silent) {
            var key = localStorage.getItem('cs_key'), bin = localStorage.getItem('cs_bin');
            if (!key || !bin) return;
            
            $.ajax({
                url: 'https://api.jsonbin.io/v3/b/' + bin + '/latest',
                headers: { 'X-Master-Key': key },
                success: function (res) {
                    if (res.record && res.record.backup) {
                        // Запис даних
                        Lampa.Storage.set('continue', res.record.backup);
                        
                        // Оновлення інтерфейсу для ТВ та мобільних
                        if (window.Lampa && Lampa.Continue) Lampa.Continue.init();
                        
                        if (!silent) {
                            Lampa.Noty.show('Дані відновлено!');
                            // М'яке перезавантаження компонента
                            if (Lampa.Activity && Lampa.Activity.active().component === 'continue') {
                                Lampa.Activity.active().activity.render();
                            }
                        }
                    }
                }
            });
        }
    };

    LampaSync.init();
})();
