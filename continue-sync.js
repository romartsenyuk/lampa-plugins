(function () {
    'use strict';

    var LampaSync = {
        name: 'Прогрес серій',
        apiKey: '',
        binId: '',

        init: function () {
            // Завантаження збережених налаштувань
            this.apiKey = localStorage.getItem('continue_sync_apiKey') || '';
            this.binId = localStorage.getItem('continue_sync_binId') || '';

            this.cleanup();
            this.addMenuItem();
            
            // Якщо ключі є — тягнемо дані при старті
            if (this.apiKey && this.binId) {
                setTimeout(this.syncFromCloud.bind(this, true), 2000);
            }

            // Головна подія: збереження при виході з плеєра
            Lampa.Player.listener.follow('destroy', function(){
                LampaSync.syncToCloud(true);
            });
        },

        cleanup: function () {
            // Видаляємо всі старі копії меню
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

            // Ставимо після "Пізнавальне"
            var target = $('.menu__list .menu__item').filter(function() {
                return $(this).text().indexOf('Пізнавальне') !== -1;
            });

            if (target.length) target.after(item);
            else $('.menu__list').append(item);
        },

        showSettings: function () {
            var _this = this;
            Lampa.Select.show({
                title: this.name,
                items: [
                    { title: 'Ключ API', subtitle: this.apiKey || 'Натисніть, щоб ввести', type: 'api' },
                    { title: 'BIN ID', subtitle: this.binId || 'Натисніть "Синхронізувати зараз"', type: 'bin' },
                    { title: 'Синхронізувати зараз', subtitle: 'Push/Pull дані вручну', type: 'sync' },
                    { title: 'Очистити локальні дані', subtitle: 'Скидання історії на цьому пристрої', type: 'reset' }
                ],
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
                    } else if (item.type === 'reset') {
                        if(confirm('Видалити історію перегляду на цьому пристрої?')){
                            Lampa.Storage.set('continue', {});
                            localStorage.setItem('continue', '{}');
                            Lampa.Noty.show('Локальну історію очищено');
                        }
                    }
                },
                onBack: function () { Lampa.Controller.toggle('menu'); }
            });
        },

        getContinueData: function() {
            // Пряме звернення до пам'яті Lampa
            var data = Lampa.Storage.get('continue');
            if (!data) data = localStorage.getItem('continue');
            try {
                return (typeof data === 'string') ? JSON.parse(data) : (data || {});
            } catch(e) { return {}; }
        },

        syncToCloud: function (silent) {
            var _this = this;
            if (!this.apiKey) return;
            var data = this.getContinueData();
            
            // Якщо даних немає, не затираємо хмару пустим файлом
            if (Object.keys(data).length === 0 && this.binId) return;

            $.ajax({
                url: this.binId ? 'https://api.jsonbin.io/v3/b/' + this.binId : 'https://api.jsonbin.io/v3/b',
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
                    if (!silent) Lampa.Noty.show('Успішно збережено в хмару');
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
                    
                    // Злиття даних
                    for (var key in cloudData) {
                        if (!localData[key] || (cloudData[key].time > localData[key].time)) {
                            localData[key] = cloudData[key];
                        }
                    }

                    // Жорсткий запис у пам'ять Lampa
                    Lampa.Storage.set('continue', localData);
                    localStorage.setItem('continue', JSON.stringify(localData));
                    
                    if (!silent) Lampa.Noty.show('Прогрес підтягнуто з хмари');
                }
            });
        }
    };

    // Запуск плагіна
    var startPlugin = function() {
        if (window.LampaSyncLoaded) return;
        window.LampaSyncLoaded = true;
        LampaSync.init();
    };

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') startPlugin();
    });
})();
