/* APLI-MUMBAI Service Worker for Web Push Notifications */

self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'APLI-MUMBAI Railway Alert',
        body: event.data.text()
      };
    }
  } else {
    data = {
      title: 'APLI-MUMBAI Railway Alert',
      body: 'Service status update available for your route.'
    };
  }

  // Remove [TEST/MOCK EVENT] prefix if present in push title for clean presentation
  let titleStr = (data.title || 'APLI-MUMBAI Railway Alert').replace(/^\[TEST\/MOCK EVENT\]\s*/i, '');

  const options = {
    body: data.body || 'Railway disruption update.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/dashboard'
    }
  };

  event.waitUntil(self.registration.showNotification(titleStr, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
