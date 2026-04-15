(function () {
    'use strict';

    var LampaSync = {
        name: 'Прогрес серій',
        apiKey: '',
        binId: '',

        init: function () {
            this.apiKey = localStorage.getItem('continue_sync_apiKey') || '';
            this.binId = localStorage.getItem('continue_sync_binId') || '';

            this.cleanupMenu(); // Спочатку видаляємо дублікати
            this.addMenuItem();
            
            if (this.apiKey && this.binId) {
                setTimeout(this.syncFromCloud.bind(this, true), 3000);
            }

            Lampa.Player.listener.follow('destroy', function(){
                LampaSync.syncToCloud(true);
            });
        },

        cleanupMenu: function () {
            // Видаляємо всі існуючі пункти з нашою назвою, щоб не було дублів
            $('.menu__list .menu__item').each(function () {
                if ($(this).text().indexOf('Прогрес серій') !== -1) {
                    $(this).remove();
                }
            });
        },

        addMenuItem: function () {
            var _this = this;
            var item = $('<li class="menu__item selector focusable">' +
                '<div class="menu__ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 4.93L16.24 7.76M7.76 16.24L4.93 19.07M19.07 19.07L16.24 16.24M7.76 7.76L4.93 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
                '<div class="menu__text">' + this.name + '</div>' +
                '</li>');

            item.on('hover:enter click', function () {
                _this.showSettings();
            });

            // Знаходимо розділ "Пізнавальне" і вставляємо відразу після нього
            var search_point = $('.menu__list .menu__item').filter(function() {
                return $(this).text().indexOf('Пізнавальне') !== -1;
            });

            if (search_point.length) {
                search_point.after(item);
            } else {
                $('.menu__list').append(item);
            }
        },

        showSettings: function () {
            var _this = this;
            Lampa.Select.show({
                title: this.name,
                items: [
                    { title: 'Ключ API', subtitle: this.apiKey || 'Ввести', type: 'api' },
                    { title: 'BIN ID', subtitle: this.binId || 'Створити', type: 'bin' },
                    { title: 'Синхронізувати зараз', type: 'sync' }
                ],
                onSelect: function (item) {
                    if (item.type === 'api') {
                        var val = prompt('X-Master-Key:', _this.apiKey);
                        if (val) {
                            _this.apiKey = val;
                            localStorage.setItem('continue_sync_apiKey', val);
                            _this.showSettings();
                        }
                    } else if (item.type === 'bin') {
                        var val = prompt('BIN ID:', _this.binId);
                        if (val) {
                            _this.binId = val;
                            localStorage.setItem('continue_sync_binId', val);
                            _this.showSettings();
                        }
                    } else if (item.type === 'sync') {
                        _this.syncToCloud(false);
                    }
                },
                onBack: function () { Lampa.Controller.toggle('menu'); }
            });
        },

        getContinueData: function() {
            var found = {};
            try {
                var sData = Lampa.Storage.get('continue');
                if (sData) found = (typeof sData === 'string') ? JSON.parse(sData) : sData;
                if (Object.keys(found).length === 0) {
                    var lData = localStorage.getItem('continue');
                    if (lData) found = JSON.parse(lData);
                }
            } catch(e) {}
            return found;
        },

        syncToCloud: function (silent) {
            var _this = this;
            if (!this.apiKey) return;
            var data = this.getContinueData();
            if (Object.keys(data).length === 0) return;

            $.ajax({
                url: this.binId ? 'https://api.jsonbin.io/v3/b/' + this.binId : 'https://api.jsonbin.io/v3/b',
                type: this.binId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Master-Key': this.apiKey, 'X-Bin-Private': 'true' },
                data: JSON.stringify(data),
                success: function (res) {
                    if (!_this.binId && res.metadata) {
                        _this.binId = res.metadata.id;
                        localStorage.setItem('continue_sync_binId', _this.binId);
                    }
                    if (!silent) Lampa.Noty.show('Збережено');
                }
            });
        },

        syncFromCloud: function (silent) {
            var _this = this;
            if (!this.apiKey || !this.binId) return;
            $.ajax({
                url: 'https://api.jsonbin.io/v3/b/' + this.binId + '/latest',
                type: 'GET',
                headers: { 'X-Master-Key': this.apiKey },
                success: function (res) {
                    var cloudData = res.record;
                    var localData = _this.getContinueData();
                    for (var key in cloudData) {
                        if (!localData[key] || (cloudData[key].time > localData[key].time)) {
                            localData[key] = cloudData[key];
                        }
                    }
                    Lampa.Storage.set('continue', localData);
                    localStorage.setItem('continue', JSON.stringify(localData));
                    if (!silent) Lampa.Noty.show('Оновлено');
                }
            });
        }
    };

    if (window.appready) LampaSync.init();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') LampaSync.init();
    });
})();
