(function () {
    'use strict';

    function startPlugin() {
        // Список ваших серверів
        var servers = [
            { title: 'Lampa.mx', url: 'https://lampa.mx' },
            { title: 'Сяйво', url: 'https://syayvo.com' }
        ];

        // 1. Реєструємо новий компонент для відображення списку серверів
        Lampa.Component.add('server_switch_component', function (object) {
            var comp = new Lampa.InteractionMain(object);

            comp.create = function () {
                var _this = this;
                
                servers.forEach(function (server) {
                    var card = Lampa.Template.get('button', { title: server.title });
                    
                    card.on('hover:enter', function () {
                        Lampa.Noty.show('Перехід на ' + server.title);
                        // Зберігаємо вибір і перенаправляємо
                        localStorage.setItem('host', server.url);
                        setTimeout(function () {
                            location.href = server.url;
                        }, 400);
                    });

                    _this.append(card);
                });
            };

            return comp;
        });

        // 2. Створюємо функцію для додавання кнопки в меню
        function addMenuButton() {
            var menu_item = $('<li class="menu__item selector" data-action="server_switch">' +
                '<div class="menu__ico">' +
                // Іконка серверів (три горизонтальні лінії або змініть на свій SVG)
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 15V17M12 7V9M21 12H19M5 12H3M17 12C17 14.7614 14.7614 17 12 17C9.23858 17 7 14.7614 7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                '</div>' +
                '<div class="menu__text">Змінити хост</div>' +
                '</li>
