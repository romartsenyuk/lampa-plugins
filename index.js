(function () {
    'use strict';

    function start() {
        var servers = [
            { title: 'Lampa.mx', url: 'https://lampa.mx' },
            { title: 'Сяйво', url: 'https://syayvo.com' }
        ];

        Lampa.Component.add('sw_srv', function (object) {
            var comp = new Lampa.InteractionMain(object);
            comp.create = function () {
                var _this = this;
                servers.forEach(function (s) {
                    var card = Lampa.Template.get('button', { title: s.title });
                    card.on('hover:enter', function () {
                        localStorage.setItem('host', s.url);
                        location.href = s.url;
                    });
                    _this.append(card);
                });
            };
            return comp;
        });

        var btn = $('<li class="menu__item selector"><div class="menu__ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" stroke="white" stroke-width="2"/></svg></div><div class="menu__text">Змінити хост</div></li>');
        
        btn.on('hover:enter', function () {
            Lampa.Activity.push({
                title: 'Сервери',
                component: 'sw_srv',
                page: 1
            });
        });

        $('.menu .menu__list').append(btn);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') start(); });
})();
