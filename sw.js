/* Descarte Certo: service worker.
   Guarda o app no aparelho para abrir sem internet depois da primeira visita.
   Quando alterar o index.html, troque o número em VERSAO para os celulares receberem a atualização. */
var VERSAO = "dc-v3";
var ARQUIVOS = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VERSAO).then(function (c) { return c.addAll(ARQUIVOS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (nomes) {
      return Promise.all(nomes.filter(function (n) { return n !== VERSAO; }).map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  /* Páginas: tenta a internet primeiro (para pegar atualizações); sem internet, usa a cópia guardada. */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function (r) {
        var copia = r.clone();
        caches.open(VERSAO).then(function (c) { c.put("index.html", copia); });
        return r;
      }).catch(function () {
        return caches.match("index.html").then(function (r) { return r || caches.match("./"); });
      })
    );
    return;
  }

  /* Demais arquivos do próprio site e fontes do Google: usa a cópia guardada e atualiza em segundo plano. */
  var fonte = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin === self.location.origin || fonte) {
    e.respondWith(
      caches.match(req).then(function (guardado) {
        var rede = fetch(req).then(function (r) {
          if (r && (r.ok || r.type === "opaque")) {
            var copia = r.clone();
            caches.open(VERSAO).then(function (c) { c.put(req, copia); });
          }
          return r;
        }).catch(function () { return guardado; });
        return guardado || rede;
      })
    );
  }
});
