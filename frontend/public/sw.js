self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: '포트폴리오 알림', body: event.data.text() };
  }

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
  event.notification.close();
  const portfolioId = event.notification.data?.portfolioId;
  const target = portfolioId ? `/analyzer?portfolioId=${portfolioId}` : '/analyzer';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/analyzer') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(target);
      }
    }),
  );
});
