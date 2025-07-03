
self.onmessage = function(e) {
  const nodes = e.data;
  const updated = nodes.map(n => ({
    ...n,
    x: n.x + (Math.random() - 0.5) * 50,
    y: n.y + (Math.random() - 0.5) * 50
  }));
  self.postMessage(updated);
};
