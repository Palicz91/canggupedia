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

  /**
   * A hand port of parseOpeningHours from src/lib/hours.ts, kept byte-for-byte equivalent in
   * behaviour so the CMS preview shows what the website will actually render.
   *
   * Why a copy at all: the website renderer is TypeScript compiled by Astro, and this file is a
   * plain script the admin page loads straight from /admin/. There is no build step between them
   * to share through. Before this existed the preview printed the raw string, so Ivan pasted a
   * week out of Google, saw one run-on line, and reported the hours as broken — while the live
   * page was already showing a correct day-by-day table.
   *
   * The drift risk is real and is covered by a test: test/hours.test.ts runs this function and
   * the TypeScript one over every opening-hours string in src/data plus every fixture, and fails
   * if they ever disagree. Change one, change both.
   */
  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  var DAY_PATTERN =
    /\b(monday|mon|tuesday|tues|tue|wednesday|wednes|weds|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat|sunday|sun)\b/gi;

  var CANONICAL = {
    mon: 'Monday', monday: 'Monday',
    tue: 'Tuesday', tues: 'Tuesday', tuesday: 'Tuesday',
    wed: 'Wednesday', weds: 'Wednesday', wednes: 'Wednesday', wednesday: 'Wednesday',
    thu: 'Thursday', thur: 'Thursday', thurs: 'Thursday', thursday: 'Thursday',
    fri: 'Friday', friday: 'Friday',
    sat: 'Saturday', saturday: 'Saturday',
    sun: 'Sunday', sunday: 'Sunday'
  };

  var CLOCK = '\\d{1,2}(?:[:.]\\d{2})?\\s*(?:am|pm)?';
  var DASH = '(?:[-–—−‐]+|to|till|til|until)';
  var OPEN_ENDED = '(?:late(?:\\s*night)?|midnight|close|closing)';
  var RANGE = CLOCK + '\\s*' + DASH + '\\s*(?:' + CLOCK + '|' + OPEN_ENDED + ')';
  var SEPARATOR = '(?:[,&/;+]|and)';
  var HOURS_TEXT = new RegExp(
    '^(?:closed|' + RANGE + '(?:\\s*' + SEPARATOR + '\\s*' + RANGE + ')*)$',
    'i'
  );

  function cleanHours(raw) {
    return raw
      .replace(/\s+/g, ' ')
      .replace(/^[\s:\-–—−‐,;|]+/, '')
      .replace(/[\s,;|.]+$/, '')
      .trim();
  }

  function parseOpeningHours(input) {
    if (!input) return null;

    var matches = [];
    DAY_PATTERN.lastIndex = 0;
    var m;
    while ((m = DAY_PATTERN.exec(input)) !== null) matches.push(m);
    if (matches.length < 2) return null;

    // Anything written before the first day name has nowhere to go in a table, so it would
    // simply vanish from the page. Printing the line as typed beats silently dropping it.
    if (/[a-z0-9]/i.test(input.slice(0, matches[0].index || 0))) return null;

    var found = {};
    for (var i = 0; i < matches.length; i++) {
      var start = (matches[i].index || 0) + matches[i][0].length;
      var end = i + 1 < matches.length ? (matches[i + 1].index || input.length) : input.length;
      var hours = cleanHours(input.slice(start, end));

      if (!hours || !HOURS_TEXT.test(hours)) return null;

      var day = CANONICAL[matches[i][1].toLowerCase()];
      if (Object.prototype.hasOwnProperty.call(found, day)) return null;
      found[day] = hours;
    }

    return DAYS.filter(function (d) {
      return Object.prototype.hasOwnProperty.call(found, d);
    }).map(function (d) {
      return { day: d, hours: found[d] };
    });
  }

  return {
    slugify: slugify,
    fixUrl: fixUrl,
    fixLinks: fixLinks,
    parseOpeningHours: parseOpeningHours,
    DAYS: DAYS
  };
});
