(function () {
    'use strict';

    function start() {
        var servers = [
            { title: 'Lampa.mx', url: 'https://lampa.mx' },
            { title: 'Сяйво', url: 'https://syayvo.com' }
        ];

        // Функція виклику списку
        var openMenu = function() {
            Lampa.Select.show({
                title: 'Вибір сервера',
                items: servers,
                onSelect: function (item) {
                    Lampa.Noty.show('Перехід на ' + item.title);
                    localStorage.setItem('host', item.url);
                    setTimeout(function () {
                        location.href = item.url;
                    }, 500);
                },
                onBack: function () {
                    Lampa.Controller.toggle('menu');
                }
            });
        };

        // Створення кнопки
        var btn = $('<li class="menu__item selector"><div class="menu__ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="16" height="16" rx="2" stroke="white" stroke-width="2"/></svg></div><div class="menu__text">Змінити хост</div></li>');
        
        btn.on('hover:enter', function () {
            openMenu();
        });

        // Додаємо в меню з невеликою затримкою для надійності
        setTimeout(function() {
            $('.menu .menu__list').append(btn);
        }, 1000);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') start(); });
})();
