// 서비스 워커 - 웹 푸시 알림 처리
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore', 
          title: '확인하기',
          icon: '/favicon.ico'
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
      clients.openWindow('/dashboard')
    );
  } else if (event.action === 'close') {
    // 알림만 닫기
    event.notification.close();
  } else {
    // 기본 클릭 - 앱으로 이동
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});