(function () {
    'use strict';
    var LampaSync = {
        name: 'Прогрес серій',
        init: function () {
            var _this = this;
            // Видаляємо дублікати за текстом
            $('.menu__item').filter(function() {
                return $(this).text().trim() == 'Прогрес серій';
            }).remove();
            
            setTimeout(function(){ _this.addMenuItem(); }, 1000);
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
                    { title: 'ЗБЕРЕГТИ', action: 'sync' },
                    { title: 'ВІДНОВИТИ', action: 'pull' }
                ],
                onSelect: function (item) {
                    if (item.action === 'api') {
                        Lampa.Input.edit({ value: key, title: 'Master Key' }, function (v) {
                            if (v) { localStorage.setItem('cs_key', v.trim()); _this.showSettings(); }
                        });
                    } else if (item.action === 'bin') {
                        Lampa.Input.edit({ value: bin, title: 'BIN ID' }, function (v) {
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
            var data = Lampa.Storage.get('continue') || {};
            $.ajax({
                url: bin ? 'https://api.jsonbin.io/v3/b/' + bin : 'https://api.jsonbin.io/v3/b',
                type: bin ? 'PUT' : 'POST',
                headers: { 'X-Master-Key': key, 'Content-Type': 'application/json', 'X-Bin-Private': 'true' },
                data: JSON.stringify({backup: data}),
                success: function (res) {
                    if (!bin) localStorage.setItem('cs_bin', res.metadata.id);
                    Lampa.Noty.show('Збережено успішно!');
                },
                error: function () { Lampa.Noty.show('Помилка API'); }
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
                        Lampa.Storage.set('continue', res.record.backup);
                        Lampa.Noty.show('Готово! Перезапустіть Лампу');
                        setTimeout(function(){ window.location.reload(); }, 500);
                    }
                }
            });
        }
    };
    LampaSync.init();
})();
