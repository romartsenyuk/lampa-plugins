(function () {
    'use strict';

    var LampaSync = {
        name: 'Прогрес серій',
        apiKey: '',
        binId: '',

        init: function () {
            this.apiKey = localStorage.getItem('continue_sync_apiKey') || '';
            this.binId = localStorage.getItem('continue_sync_binId') || '';

            this.addMenuItem();
            
            // Тиха синхронізація при старті
            if (this.apiKey && this.binId) {
                setTimeout(this.syncFromCloud.bind(this, true), 3000);
            }

            // Слідкуємо за оновленням прогресу
            Lampa.Player.listener.follow('destroy', function(){
                LampaSync.syncToCloud(true);
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

            $('.menu__list').append(item);
        },

        showSettings: function () {
            var _this = this;
            var items = [
                { title: 'Ключ API', subtitle: this.apiKey || 'Натисніть для вводу', type: 'api' },
                { title: 'BIN ID', subtitle: this.binId || 'Створиться автоматично', type: 'bin' },
                { title: 'Синхронізувати зараз', subtitle: 'Push/Pull дані', type: 'sync' },
                { title: 'Діагностика', subtitle: 'Показати лог у консолі', type: 'debug' }
            ];

            Lampa.Select.show({
                title: this.name,
                items: items,
                onSelect: function (item) {
                    if (item.type === 'api') {
                        var val = prompt('Введіть X-Master-Key:', _this.apiKey);
                        if (val) {
                            _this.apiKey = val;
                            localStorage.setItem('continue_sync_apiKey', val);
                            _this.showSettings();
                        }
                    } else if (item.type === 'bin') {
                        var val = prompt('Введіть BIN ID:', _this.binId);
                        if (val) {
                            _this.binId = val;
                            localStorage.setItem('continue_sync_binId', val);
                            _this.showSettings();
                        }
                    } else if (item.type === 'sync') {
                        _this.syncToCloud(false);
                    } else if (item.type === 'debug') {
                        console.log('[LampaSync] Data found:', _this.getContinueData());
                        Lampa.Noty.show('Дані виведено в консоль (F12)');
                    }
                },
                onBack: function () {
                    Lampa.Controller.toggle('menu');
                }
            });
        },

        getContinueData: function() {
            var found = {};
            try {
                // Спроба 1: Lampa.Storage (найчастіше в нових версіях)
                var sData = Lampa.Storage.get('continue');
                if (sData) found = (typeof sData === 'string') ? JSON.parse(sData) : sData;

                // Спроба 2: localStorage (якщо перша пуста)
                if (Object.keys(found).length === 0) {
                    var lData = localStorage.getItem('continue');
                    if (lData) found = JSON.parse(lData);
                }
                
                // Спроба 3: Пошук у кеші (для Lampa MX)
                if (Object.keys(found).length === 0 && Lampa.Cache) {
                    var cData = Lampa.Cache.get('continue');
                    if (cData) found = cData;
                }
            } catch(e) { console.log('[LampaSync] Read error:', e); }
            return found;
        },

        syncToCloud: function (silent) {
            var _this = this;
            if (!this.apiKey) return;

            var data = this.getContinueData();
            if (Object.keys(data).length === 0) return;

            var url = this.binId ? 'https://api.jsonbin.io/v3/b/' + this.binId : 'https://api.jsonbin.io/v3/b';
            
            $.ajax({
                url: url,
                type: this.binId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.apiKey,
                    'X-Bin-Private': 'true'
                },
                data: JSON.stringify(data),
                success: function (res) {
                    if (!_this.binId && res.metadata) {
                        _this.binId = res.metadata.id;
                        localStorage.setItem('continue_sync_binId', _this.binId);
                    }
                    if (!silent) Lampa.Noty.show('Дані в хмарі');
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

                    // Записуємо всюди, де можливо
                    Lampa.Storage.set('continue', localData);
                    localStorage.setItem('continue', JSON.stringify(localData));
                    if (Lampa.Cache) Lampa.Cache.set('continue', localData);
                    
                    if (!silent) Lampa.Noty.show('Прогрес оновлено');
                }
            });
        }
    };

    if (window.appready) LampaSync.init();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') LampaSync.init();
    });
})();
