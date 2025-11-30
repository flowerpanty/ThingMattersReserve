// 푸시 알림 전용 서비스 워커
// 캐싱 로직은 포함하지 않음 (이전 캐싱 문제 방지)

self.addEventListener('push', function (event) {
    if (!event.data) return;

    const data = event.data.json();
    const title = data.title || '새로운 알림';
    const options = {
        body: data.body || '',
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        data: data.data || {},
        vibrate: [100, 50, 100]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const urlToOpen = event.notification.data.url || '/dashboard';

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function (clientList) {
            // 이미 열려있는 창이 있으면 포커스
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            // 없으면 새 창 열기
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// PWA 설치 가능 조건을 위한 fetch 핸들러
self.addEventListener('fetch', function (event) {
    // 네트워크 요청을 그대로 통과시킴 (오프라인 지원을 위해서는 캐싱 전략 필요하지만, 현재는 설치 가능 조건 충족이 목표)
    // event.respondWith(fetch(event.request)); 
});

// 서비스 워커 즉시 활성화
self.addEventListener('install', function (event) {
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(self.clients.claim());
});
