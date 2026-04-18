(function () {
    'use strict';
    function start() {
        var srv = [
            { title: 'Lampa Main', url: 'https://lampa.mx' },
            { title: 'Сяйво ТВ', url: 'https://syayvo.com' }
        ];
        var open = function() {
            Lampa.Select.show({
                title: 'Оберіть сервер',
                items: srv,
                onSelect: function (i) {
                    localStorage.setItem('host', i.url);
                    Lampa.Noty.show('Перехід на ' + i.title);
                    setTimeout(function () { location.href = i.url; }, 500);
                },
                onBack: function () { Lampa.Controller.toggle('menu'); }
            });
        };
        var item = $('<li class="menu__item selector"><div class="menu__ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12h16M4 6h16M4 18h16" stroke="white" stroke-width="2" stroke-linecap="round"/></svg></div><div class="menu__text">ЗМІНИТИ СЕРВЕР</div></li>');
        item.on('hover:enter', open);
        $('.menu .menu__list').append(item);
    }
    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') start(); });
})();
