// 낫띵메터스 Service Worker — PWA + 푸시 알림

const CACHE_NAME = 'nothingmatters-v2';
const OFFLINE_ASSETS = [
    '/',
    '/dashboard',
    '/icon-192x192.png',
    '/icon-512x512.png',
];

// 설치 시 기본 셸 캐싱
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(OFFLINE_ASSETS).catch(() => {
                // 일부 리소스 캐싱 실패 무시
                console.log('일부 오프라인 리소스 캐싱 건너뜀');
            });
        })
    );
    self.skipWaiting();
});

// 활성화 시 이전 캐시 정리
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) => {
            return Promise.all(
                names
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Network-first 전략 (API는 항상 네트워크 우선)
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // API 요청은 네트워크만 사용
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(fetch(request));
        return;
    }

    // 정적 리소스는 Network-first + 캐시 fallback
    event.respondWith(
        fetch(request)
            .then((response) => {
                // 성공적 응답을 캐시에 저장
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // 네트워크 실패 시 캐시에서 서빙
                return caches.match(request).then((cached) => {
                    return cached || caches.match('/');
                });
            })
    );
});

// 푸시 알림 수신
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const title = data.title || '새로운 알림';
    const options = {
        body: data.body || '',
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        data: data.data || {},
        vibrate: [100, 50, 100],
        actions: [
            { action: 'open', title: '확인하기' },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// 알림 클릭 시 대시보드로 이동
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = event.notification.data.url || '/dashboard';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (let client of clientList) {
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
