(function () {
    'use strict';

    var LampaSync = {
        name: 'Синхронізація+',
        init: function () {
            var _this = this;
            
            $('.js-sync-clean').remove();
            $('.menu__item').filter(function() {
                return $(this).text().indexOf('Прогрес серій') > -1 || $(this).text().indexOf('Синхронізація+') > -1;
            }).remove();

            setTimeout(function(){ 
                _this.addMenuItem();
                _this.autoPull(); 
            }, 1500);

            Lampa.Player.listener.follow('destroy', function(){
                setTimeout(function(){ _this.sync(true); }, 5000); 
            });
        },

        addMenuItem: function () {
            var _this = this;
            if ($('.js-sync-clean').length > 0) return;
            var item = $('<li class="menu__item selector focusable js-sync-clean"><div class="menu__ico" style="color: #ff9500 !important;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg></div><div class="menu__text">' + this.name + '</div></li>');
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
                    { title: 'API Ключ', subtitle: key ? 'Налаштовано' : 'Порожньо', action: 'api' },
                    { title: 'BIN ID', subtitle: bin || 'Порожньо', action: 'bin' },
                    { title: 'Зберегти прогрес зараз', action: 'sync' },
                    { title: 'Відновити прогрес', action: 'pull' }
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
                    } else if (item.action === 'sync') { _this.sync(false); }
                    else if (item.action === 'pull') { _this.pull(false); }
                }
            });
        },

        sync: function (silent) {
            var key = localStorage.getItem('cs_key');
            var bin = localStorage.getItem('cs_bin');
            if (!key) return;
            
            var data = Lampa.Storage.get('continue') || {};
            if (!silent) Lampa.Noty.show('Відправка в хмару...');
            
            $.ajax({
                url: bin ? 'https://api.jsonbin.io/v3/b/' + bin : 'https://api.jsonbin.io/v3/b',
                type: bin ? 'PUT' : 'POST',
                headers: { 'X-Master-Key': key, 'Content-Type': 'application/json', 'X-Bin-Private': 'true' },
                data: JSON.stringify({backup: data}),
                success: function (res) {
                    if (!bin) localStorage.setItem('cs_bin', res.metadata.id);
                    if (!silent) Lampa.Noty.show('Збережено!');
                }
            });
        },

        autoPull: function () {
            var key = localStorage.getItem('cs_key');
            var bin = localStorage.getItem('cs_bin');
            if (key && bin) this.pull(true);
        },

        pull: function (silent) {
            var key = localStorage.getItem('cs_key');
            var bin = localStorage.getItem('cs_bin');
            if (!key || !bin) return;
            
            $.ajax({
                url: 'https://api.jsonbin.io/v3/b/' + bin + '/latest',
                headers: { 'X-Master-Key': key },
                success: function (res) {
                    if (res.record && res.record.backup) {
                        // 1. Записуємо дані в пам'ять
                        Lampa.Storage.set('continue', res.record.backup);
                        
                        // 2. ПРИМУСОВЕ ОНОВЛЕННЯ: Кажемо Лампі перечитати історію
                        if (Lampa.Activity && Lampa.Activity.active && Lampa.Activity.active().component === 'continue') {
                             Lampa.Activity.active().activity.render();
                        }
                        
                        if (!silent) {
                            Lampa.Noty.show('Дані відновлено! Перезавантажте розділ історії.');
                        }
                    }
                }
            });
        }
    };

    LampaSync.init();
})();
