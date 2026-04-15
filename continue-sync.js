(function () {
    'use strict';
    var LampaSync = {
        name: 'Прогрес серій',
        init: function () { this.addMenuItem(); },
        addMenuItem: function () {
            var _this = this;
            var item = $('<li class="menu__item selector focusable"><div class="menu__ico" style="color: #ff9500 !important;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 4.93L16.24 7.76M7.76 16.24L4.93 19.07M19.07 19.07L16.24 16.24M7.76 7.76L4.93 4.93"/></svg></div><div class="menu__text">' + this.name + '</div></li>');
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
                        var v = prompt('Введіть Master Key:', key);
                        if (v) { localStorage.setItem('cs_key', v.trim()); _this.showSettings(); }
                    } else if (item.action === 'bin') {
                        var v = prompt('Введіть BIN ID (або залиште порожнім):', bin);
                        localStorage.setItem('cs_bin', v ? v.trim() : ''); _this.showSettings();
                    } else if (item.action === 'sync') { _this.sync(); }
                    else if (item.action === 'pull') { _this.pull(); }
                }
            });
        },
        sync: function () {
            var key = localStorage.getItem('cs_key');
            var bin = localStorage.getItem('cs_bin');
            if (!key) return Lampa.Noty.show('Введіть API Ключ');
            
            // Отримуємо дані і робимо їх "чистими" для сервера
            var data = Lampa.Storage.get('continue') || {};
            var cleanData = JSON.parse(JSON.stringify(data)); 

            Lampa.Noty.show('Спроба відправки...');
            $.ajax({
                url: bin ? 'https://api.jsonbin.io/v3/b/' + bin : 'https://api.jsonbin.io/v3/b',
                type: bin ? 'PUT' : 'POST',
                headers: { 'X-Master-Key': key, 'Content-Type': 'application/json', 'X-Bin-Private': 'true' },
                data: JSON.stringify(cleanData),
                success: function (res) {
                    if (res.metadata && res.metadata.id) {
                        localStorage.setItem('cs_bin', res.metadata.id);
                        Lampa.Noty.show('Успішно збережено!');
                    }
                },
                error: function (xhr) {
                    // Виводимо текст помилки від сервера для діагностики
                    var msg = xhr.responseJSON ? xhr.responseJSON.message : xhr.status;
                    Lampa.Noty.show('Помилка: ' + msg);
                    console.log('Sync Error Detail:', xhr.responseText);
                }
            });
        },
        pull: function () {
            var key = localStorage.getItem('cs_key');
            var bin = localStorage.getItem('cs_bin');
            if (!key || !bin) return Lampa.Noty.show('Немає даних');
            $.ajax({
                url: 'https://api.jsonbin.io/v3/b/' + bin + '/latest',
                headers: { 'X-Master-Key': key },
                success: function (res) {
                    if (res.record) {
                        Lampa.Storage.set('continue', res.record);
                        Lampa.Noty.show('Дані оновлено!');
                    }
                }
            });
        }
    };
    LampaSync.init();
})();
