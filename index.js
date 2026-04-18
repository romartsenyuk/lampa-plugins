(function () {
    'use strict';

    function startPlugin() {
        // Список ваших серверів
        var servers = [
            { title: 'Lampa Main', url: 'https://lampa.mx' },
            { title: 'Сяйво', url: 'https://syayvo.com' },
            { title: 'Lampa Lite', url: 'https://lite.lampa.mx' }
        ];

        // Додаємо кнопку в бічне меню
        Lampa.Component.add('server_switch', function (object) {
            var comp = new Lampa.InteractionMain(object);

            comp.create = function () {
                var items = servers.map(function (server) {
                    return {
                        title: server.title,
                        description: server.url,
                        url: server.url
                    };
                });

                // При натисканні на сервер
                items.forEach(function (item) {
                    var card = Lampa.Template.get('button', { title: item.title });
                    card.on('hover:enter', function () {
                        // Зміна хоста та перезавантаження
                        localStorage.setItem('host', item.url);
                        Lampa.Noty.show('Перемикаюсь на ' + item.title);
                        setTimeout(function () {
                            location.href = item.url;
                        }, 500);
                    });
                    comp.append(card);
                });
            };

            return comp;
        });

        // Додаємо пункт у меню
        var menu_item = $('<li class="menu__item selector" data-action="server_switch">' +
            '<div class="menu__ico">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7H20M4 12H20M4 17H20" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</div>' +
            '<div class="menu__text">Змінити сервер</div>' +
            '</li>');

        menu_item.on('hover:enter', function () {
            Lampa.Activity.push({
                url: '',
                title: 'Вибір сервера',
                component: 'server_switch',
                page: 1
            });
        });

        $('.menu .menu__list').append(menu_item);
    }

    // Чекаємо завантаження Lampa
    if (window.appready) startPlugin();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') startPlugin();
        });
    }
})();
