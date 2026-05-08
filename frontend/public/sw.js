self.addEventListener('install', () => {
  console.log('[SW] install');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] activate');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('[SW] push event received', event.data ? 'has data' : 'no data');
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: '포트폴리오 알림', body: event.data.text() };
  }

  console.log('[SW] showing notification', payload.title);

  const title = payload.title ?? '포트폴리오 알림';
  const options = {
    body: payload.body ?? '',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    tag: payload.data?.eventType ?? 'portfolio-notification',
    renotify: true,
    data: payload.data ?? {},
    requireInteraction: payload.data?.severity === 'critical',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] notification clicked');
  event.notification.close();
  const portfolioId = event.notification.data?.portfolioId;
  const path = portfolioId ? `/analyzer?portfolioId=${portfolioId}` : '/analyzer';
  const target = self.location.origin + path;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/analyzer') && 'focus' in client) {
          client.focus();
          return client.navigate(target);
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(target);
      }
    }),
  );
});
