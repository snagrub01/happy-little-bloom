// Handle notification action clicks (Yes/No buttons)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "open" || !event.action) {
    // "Yes, Open App" or tapped the notification body
    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        return clients.openWindow("/");
      })
    );
  }
  // "dismiss" action — notification is already closed, do nothing
});
