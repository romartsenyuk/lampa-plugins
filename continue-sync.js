(function () {
    'use strict';

    var LampaSync = {
        name: 'Прогрес серій',

        init: function () {
            var _this = this;

            // Видаляємо тільки свій пункт
            $('.js-sync-clean').remove();

            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') {
                    _this.addMenuItem();
                    _this.autoPull(); // авто синхронізація при старті
                }
            });

            // після перегляду
            Lampa.Listener.follow('full', function (e) {
                if (e.type === 'complite') {
                    _this.sync();
                }
            });
        },

        addMenuItem: function () {
            if ($('.js-sync-clean').length) return;

            var _this = this;

            var item = $(`
                <li class="menu__item selector focusable js-sync-clean">
                    <div class="menu__ico">☁️</div>
                    <div class="menu__text">${this.name}</div>
                </li>
            `);

            item.on('click', function () {
                _this.showSettings();
            });

            $('.menu__list').append(item);
        },

        showSettings: function () {
            var _this = this;
            var key = localStorage.getItem('cs_key') || '';
            var bin = localStorage.getItem('cs_bin') || '';

            Lampa.Select.show({
                title: this.name,
                items: [
                    { title: 'API Ключ', subtitle: key ? 'OK' : 'Нема', action: 'api' },
                    { title: 'BIN ID', subtitle: bin || 'Нема', action: 'bin' },
                    { title: 'Синхронізація', action: 'sync' },
                    { title: 'Отримати', action: 'pull' }
                ],
                onSelect: function (item) {
                    if (item.action === 'api') {
                        Lampa.Input.edit({
                            value: key,
                            title: 'API Key'
                        }, function (v) {
                            if (v) localStorage.setItem('cs_key', v.trim());
                        });
                    }

                    if (item.action === 'bin') {
                        Lampa.Input.edit({
                            value: bin,
                            title: 'BIN ID'
                        }, function (v) {
                            if (v) localStorage.setItem('cs_bin', v.trim());
                        });
                    }

                    if (item.action === 'sync') _this.sync();
                    if (item.action === 'pull') _this.pull();
                }
            });
        },

        // MERGE даних (важливо!)
        mergeData: function (local, cloud) {
            local = local || {};
            cloud = cloud || {};

            Object.keys(cloud).forEach(function (key) {
                if (!local[key] || cloud[key].time > local[key].time) {
                    local[key] = cloud[key];
                }
            });

            return local;
        },

        sync: function () {
            var key = localStorage.getItem('cs_key');
            var bin = localStorage.getItem('cs_bin');

            if (!key) return;

            var data = Lampa.Storage.get('continue') || {};

            $.ajax({
                url: 'https://api.jsonbin.io/v3/b/' + bin,
                type: 'PUT',
                headers: {
                    'X-Master-Key': key,
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({backup: data}),
                error: function () {
                    Lampa.Noty.show('❌ Помилка синхронізації');
                }
            });
        },

        pull: function () {
            var _this = this;
            var key = localStorage.getItem('cs_key');
            var bin = localStorage.getItem('cs_bin');

            if (!key || !bin) return;

            $.ajax({
                url: 'https://api.jsonbin.io/v3/b/' + bin + '/latest',
                headers: { 'X-Master-Key': key },
                success: function (res) {
                    if (res.record && res.record.backup) {
                        var local = Lampa.Storage.get('continue') || {};
                        var merged = _this.mergeData(local, res.record.backup);

                        Lampa.Storage.set('continue', merged);
                    }
                },
                error: function () {
                    Lampa.Noty.show('❌ Помилка отримання');
                }
            });
        },

        autoPull: function () {
            this.pull();
        }
    };

    LampaSync.init();
})();
