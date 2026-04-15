(function () {
    'use strict';

    var LampaSync = {
        name: 'Прогрес серій',

        init: function () {
            var _this = this;

            $('.js-sync-clean').remove();

            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') {
                    _this.addMenuItem();
                    _this.autoPull();
                }
            });

            // після перегляду
            Lampa.Listener.follow('full', function (e) {
                if (e.type === 'complite') {
                    _this.sync('auto');
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

                    if (item.action === 'sync') _this.sync('manual');
                    if (item.action === 'pull') _this.pull(true);
                }
            });
        },

        mergeData: function (local, cloud) {
            local = local || {};
            cloud = cloud || {};

            Object.keys(cloud).forEach(function (key) {
                if (!local[key] || (cloud[key].time || 0) > (local[key].time || 0)) {
                    local[key] = cloud[key];
                }
            });

            return local;
        },

        sync: function (type) {
            var key = localStorage.getItem('cs_key');
            var bin = localStorage.getItem('cs_bin');

            if (!key || !bin) {
                Lampa.Noty.show('❌ Нема API або BIN');
                return;
            }

            var data = {
                continue: Lampa.Storage.get('continue') || {},
                history: Lampa.Storage.get('history') || {}
            };

            if (type !== 'auto') Lampa.Noty.show('🔄 Синхронізація...');

            $.ajax({
                url: 'https://api.jsonbin.io/v3/b/' + bin,
                type: 'PUT',
                headers: {
                    'X-Master-Key': key,
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({backup: data}),
                success: function () {
                    if (type !== 'auto') {
                        Lampa.Noty.show('✅ Синхронізовано');
                    }
                },
                error: function () {
                    Lampa.Noty.show('❌ Помилка синку');
                }
            });
        },

        pull: function (manual) {
            var _this = this;
            var key = localStorage.getItem('cs_key');
            var bin = localStorage.getItem('cs_bin');

            if (!key || !bin) {
                if (manual) Lampa.Noty.show('❌ Нема API або BIN');
                return;
            }

            if (manual) Lampa.Noty.show('🔄 Отримання...');

            $.ajax({
                url: 'https://api.jsonbin.io/v3/b/' + bin + '/latest',
                headers: { 'X-Master-Key': key },
                success: function (res) {
                    if (res.record && res.record.backup) {
                        var cloud = res.record.backup;

                        var localContinue = Lampa.Storage.get('continue') || {};
                        var localHistory = Lampa.Storage.get('history') || {};

                        var mergedContinue = _this.mergeData(localContinue, cloud.continue);
                        var mergedHistory = _this.mergeData(localHistory, cloud.history);

                        Lampa.Storage.set('continue', mergedContinue);
                        Lampa.Storage.set('history', mergedHistory);

                        if (manual) Lampa.Noty.show('✅ Дані оновлено');
                    }
                },
                error: function () {
                    Lampa.Noty.show('❌ Помилка отримання');
                }
            });
        },

        autoPull: function () {
            var _this = this;

            setTimeout(function () {
                _this.pull(false);
                Lampa.Noty.show('☁️ Синхронізація при запуску');
            }, 2000);
        }
    };

    LampaSync.init();
})();
