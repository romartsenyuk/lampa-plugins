(function () {
    'use strict';

    // Створюємо плагін як офіційний компонент Lampa
    window.LampaContinueSync = function (object) {
        var network = new Lampa.Reguest(); // Використовуємо внутрішній метод запитів Lampa
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [
            { title: 'Ключ API', subtitle: localStorage.getItem('continue_sync_apiKey') || 'Ввести', type: 'api' },
            { title: 'BIN ID', subtitle: localStorage.getItem('continue_sync_binId') || 'Створити', type: 'bin' },
            { title: 'Синхронізувати зараз', subtitle: 'Push/Pull дані', type: 'sync' }
        ];

        this.create = function () {
            var _this = this;
            this.prepare();
            return scroll.render();
        };

        this.prepare = function () {
            scroll.clear();
            items.forEach(function (item) {
                var el = Lampa.Template.get('button_items', item);
                el.on('hover:enter', function () {
                    if (item.type === 'api') {
                        var val = prompt('X-Master-Key:', item.subtitle);
                        if (val) {
                            localStorage.setItem('continue_sync_apiKey', val);
                            item.subtitle = val;
                            Lampa.Noty.show('Ключ збережено');
                        }
                    } else if (item.type === 'sync') {
                        LampaSyncCore.syncToCloud(false);
                    }
                });
                scroll.append(el);
            });
        };

        this.render = function () { return scroll.render(); };
    };

    var LampaSyncCore = {
        init: function () {
            this.addMenu();
            // Авто-синхронізація при старті
            if (localStorage.getItem('continue_sync_apiKey') && localStorage.getItem('continue_sync_binId')) {
                this.syncFromCloud(true);
            }
            // Збереження при виході
            Lampa.Player.listener.follow('destroy', () => this.syncToCloud(true));
        },

        addMenu: function () {
            var _this = this;
            var item = $('<li class="menu__item selector focusable">' +
                '<div class="menu__ico" style="color: #ff9500 !important;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 4.93L16.24 7.76M7.76 16.24L4.93 19.07M19.07 19.07L16.24 16.24M7.76 7.76L4.93 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
                '<div class="menu__text">Прогрес серій</div>' +
                '</li>');

            item.on('hover:enter click', function () {
                // Виклик налаштувань через промпти для надійності
                var key = localStorage.getItem('continue_sync_apiKey');
                var bin = localStorage.getItem('continue_sync_binId');
                
                Lampa.Select.show({
                    title: 'Прогрес серій',
                    items: [
                        {title: 'Ввести Ключ API', subtitle: key || 'Немає', action: 'api'},
                        {title: 'Ввести BIN ID', subtitle: bin || 'Немає', action: 'bin'},
                        {title: 'СИНХРОНІЗУВАТИ', subtitle: 'Вручну оновити дані', action: 'sync'}
                    ],
                    onSelect: function(a){
                        if(a.action == 'api'){
                            var v = prompt('API Key:', key);
                            if(v) localStorage.setItem('continue_sync_apiKey', v);
                        } else if(a.action == 'bin'){
                            var v = prompt('BIN ID:', bin);
                            if(v) localStorage.setItem('continue_sync_binId', v);
                        } else if(a.action == 'sync'){
                            _this.syncToCloud(false);
                        }
                    },
                    onBack: () => Lampa.Controller.toggle('menu')
                });
            });

            // Видаляємо дублі та ставимо після "Пізнавальне"
            $('.menu__list .menu__item').each(function(){ if($(this).text().indexOf('Прогрес серій') !== -1) $(this).remove(); });
            var target = $('.menu__list .menu__item').filter(function() { return $(this).text().indexOf('Пізнавальне') !== -1; });
            if (target.length) target.after(item);
            else $('.menu__list').append(item);
        },

        syncToCloud: async function (silent) {
            var key = localStorage.getItem('continue_sync_apiKey');
            var bin = localStorage.getItem('continue_sync_binId');
            if (!key) return;

            var data = Lampa.Storage.get('continue') || {};
            var url = bin ? 'https://api.jsonbin.io/v3/b/' + bin : 'https://api.jsonbin.io/v3/b';

            try {
                if(!silent) Lampa.Noty.show('З'єднання з сервером...');
                const resp = await fetch(url, {
                    method: bin ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Master-Key': key, 'X-Bin-Private': 'true' },
                    body: JSON.stringify(data)
                });
                const res = await resp.json();
                if (res.metadata && res.metadata.id) {
                    localStorage.setItem('continue_sync_binId', res.metadata.id);
                    if (!silent) Lampa.Noty.show('Синхронізовано!');
                }
            } catch (e) { if(!silent) alert('Помилка: ' + e.message); }
        },

        syncFromCloud: async function (silent) {
            var key = localStorage.getItem('continue_sync_apiKey');
            var bin = localStorage.getItem('continue_sync_binId');
            if (!key || !bin) return;

            try {
                const resp = await fetch('https://api.jsonbin.io/v3/b/' + bin + '/latest', {
                    headers: { 'X-Master-Key': key }
                });
                const res = await resp.json();
                if (res.record) {
                    Lampa.Storage.set('continue', res.record);
                    if (!silent) Lampa.Noty.show('Дані отримано');
                }
            } catch (e) {}
        }
    };

    // Старт
    if (window.appready) LampaSyncCore.init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') LampaSyncCore.init(); });
})();
