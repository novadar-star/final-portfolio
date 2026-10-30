// community.js — click a photo to see it larger.
// Uses the native <dialog>: Escape closes it and focus returns for free.
(function () {
  var viewer = document.getElementById('cmViewer');
  if (!viewer || typeof viewer.showModal !== 'function') return;

  // the viewer's image is made here so the page never ships an <img> without a source
  var img = document.createElement('img');
  img.alt = '';
  viewer.querySelector('figure').insertBefore(img, viewer.querySelector('figcaption'));
  var cap = document.getElementById('cmViewerCap');
  var closeBtn = viewer.querySelector('.cm-viewer-close');

  document.querySelectorAll('.cm-inspect').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var source = btn.querySelector('img');
      var figure = btn.closest('figure');
      var caption = figure ? figure.querySelector('figcaption') : null;
      img.src = source.currentSrc || source.src;
      img.alt = source.alt;
      cap.textContent = caption ? caption.textContent.trim() : source.alt;
      viewer.showModal();
    });
  });

  closeBtn.addEventListener('click', function () { viewer.close(); });

  // clicking the dark backdrop (outside the photo) closes it
  viewer.addEventListener('click', function (e) {
    if (e.target === viewer) viewer.close();
  });
})();
