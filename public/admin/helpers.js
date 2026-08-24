(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CpHelpers = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  function slugify(s) {
    return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function fixUrl(v, kind) {
    if (v === undefined || v === null) return v;
    v = String(v).trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v)) return v;
    if (kind === 'instagram') {
      var handle = v.replace(/^@/, '').replace(/^(www\.)?instagram\.com\//i, '').replace(/[\/?#].*$/, '');
      if (handle && !/[.\s]/.test(handle)) return 'https://instagram.com/' + handle;
    }
    return 'https://' + v.replace(/^\/+/, '');
  }
  function fixLinks(map, plain, insta) {
    plain.forEach(function (k) { if (map.get(k)) map = map.set(k, fixUrl(map.get(k))); });
    insta.forEach(function (k) { if (map.get(k)) map = map.set(k, fixUrl(map.get(k), 'instagram')); });
    return map;
  }
  return { slugify: slugify, fixUrl: fixUrl, fixLinks: fixLinks };
});
