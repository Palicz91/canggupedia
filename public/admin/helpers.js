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

  /**
   * A hand port of subsOf / mergeOrder / sortVenues from src/lib/venues.ts, for the same reason
   * as parseOpeningHours above: the venue-order widget is a plain script and cannot import the
   * TypeScript the website sorts with.
   *
   * This one matters more than the hours port. The widget shows Ivan a numbered list and tells
   * him that is the order the page will use, so if the two rules disagree the CMS is lying about
   * the one thing it exists to control. test/venue-order-parity.test.ts runs this and the
   * TypeScript over every area, section and tab in src/data and fails on any difference.
   * **Change one, change both.**
   */
  function subsOf(v) {
    if (Array.isArray(v.subcategory)) return v.subcategory;
    return v.subcategory ? [v.subcategory] : [];
  }

  function mergeOrder(typeOrder, sectionOrder) {
    if (!typeOrder || !typeOrder.length) return sectionOrder;
    var pinned = {};
    var head = [];
    typeOrder.forEach(function (id) {
      if (Object.prototype.hasOwnProperty.call(pinned, id)) return;
      pinned[id] = true;
      head.push(id);
    });
    return head.concat(
      sectionOrder.filter(function (id) {
        return !Object.prototype.hasOwnProperty.call(pinned, id);
      })
    );
  }

  function sortVenues(venues, subOrder, orderIds) {
    // First occurrence wins, so a venue listed twice keeps its highest position.
    var rank = {};
    (orderIds || []).forEach(function (id, i) {
      if (!Object.prototype.hasOwnProperty.call(rank, id)) rank[id] = i;
    });
    function rankOf(id) {
      return Object.prototype.hasOwnProperty.call(rank, id) ? rank[id] : undefined;
    }
    function trailing(id) {
      var m = String(id).match(/-(\d+)$/);
      return m ? parseInt(m[1], 10) : NaN;
    }
    return venues.slice().sort(function (a, b) {
      var ra = rankOf(a.id);
      var rb = rankOf(b.id);
      if (ra !== undefined && rb !== undefined) return ra - rb;
      if (ra !== undefined) return -1;
      if (rb !== undefined) return 1;

      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      var subDiff = subOrder.indexOf(subsOf(a)[0]) - subOrder.indexOf(subsOf(b)[0]);
      if (subDiff !== 0) return subDiff;
      var aNum = trailing(a.id);
      var bNum = trailing(b.id);
      if (!isNaN(aNum) && !isNaN(bNum) && aNum !== bNum) return aNum - bNum;
      if (isNaN(aNum) !== isNaN(bNum)) return isNaN(aNum) ? 1 : -1;
      return String(a.name).localeCompare(String(b.name));
    });
  }

  /**
   * The venues one order list is responsible for, in the order the website will show them.
   *
   * `venues` is every venue of that section, already narrowed to the area. `stored` is what the
   * list holds today and is allowed to be empty: an untouched tab list inherits the section
   * order, exactly as subOrdersFor + mergeOrder do on the site. For a section's own list `stored`
   * IS the section order and `sectionOrder` is unused.
   */
  function effectiveOrder(venues, stored, sectionOrder, sub, subOrder) {
    var candidates = sub
      ? venues.filter(function (v) {
          return subsOf(v).indexOf(sub) !== -1;
        })
      : venues.slice();
    var orderIds = sub ? mergeOrder(stored, sectionOrder || []) : stored || [];
    return sortVenues(candidates, subOrder || [], orderIds).map(function (v) {
      return v.id;
    });
  }

  return {
    slugify: slugify,
    fixUrl: fixUrl,
    fixLinks: fixLinks,
    parseOpeningHours: parseOpeningHours,
    subsOf: subsOf,
    mergeOrder: mergeOrder,
    sortVenues: sortVenues,
    effectiveOrder: effectiveOrder,
    DAYS: DAYS
  };
});
