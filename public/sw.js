self.addEventListener('push', function(event) {
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'TimeMate BD', body: event.data ? event.data.text() : 'নতুন নোটিফিকেশন এসেছে!' };
  }
  
  const options = {
    body: data.body || 'নতুন নোটিফিকেশন এসেছে!',
    icon: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
    vibrate: [200, 100, 200],
    data: data.data || {}
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'TimeMate BD', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
            break;
          }
        }
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
