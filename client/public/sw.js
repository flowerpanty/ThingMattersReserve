// 서비스 워커 - PWA 기능 및 웹 푸시 알림 처리

const CACHE_NAME = 'nothingmatters-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// 서비스 워커 설치 시 캐시 생성
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('캐시 생성 완료');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        return self.skipWaiting();
      })
  );
});

// 서비스 워커 활성화 시 오래된 캐시 삭제
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('오래된 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// 네트워크 요청 인터셉트 (캐시 우선 전략)
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // 캐시에서 발견되면 캐시된 버전 반환
        if (response) {
          return response;
        }

        // 캐시에 없으면 네트워크에서 가져오기
        return fetch(event.request).then(
          function(response) {
            // 유효한 응답인지 확인
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 응답을 복제하여 캐시에 저장
            var responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
    );
});

// 웹 푸시 알림 처리
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1,
        url: data.data?.url || '/'
      },
      actions: [
        {
          action: 'explore', 
          title: '확인하기',
          icon: '/icon-96x96.png'
        },
        {
          action: 'close', 
          title: '닫기'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// 알림 클릭 이벤트 처리
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'explore') {
    // 대시보드로 이동
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/dashboard')
    );
  } else if (event.action === 'close') {
    // 알림만 닫기
    event.notification.close();
  } else {
    // 기본 클릭 - 앱으로 이동
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  }
});