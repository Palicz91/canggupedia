/**
 * The `promo_order` widget: one numbered, collapsible list per weekday on the Daily promos screen.
 *
 * Asked for on 2026-10-13: "if already a lot promotions in Monday let's say 50 promos and the place
 * no 45 suddenly want to be in top 10 ... make it an option that i can move it that promo to
 * different number". Dragging in Decap's list is the only other way, across one long list of every
 * day mixed together.
 *
 * The website shows a day's promos in file order, so the file order is the order. This widget only
 * holds the moves typed since the last save ({ Monday: [ids] }); the preSave hook in index.html
 * applies them to `daily_promos` with CpHelpers.orderPromos and drops the field. The rows come from
 * the promo list in the same entry, read live, so a promo added a minute ago is already on its day.
 * Same look and behaviour as venue-order-widget.js (type a number, Enter, the rest shift down),
 * which Ivan already uses; it explains why the rows are hidden with CSS rather than unmounted.
 */
(function () {
  var h = window.h;
  var createClass = window.createClass;
  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  function toJS(value) {
    return value && typeof value.toJS === 'function' ? value.toJS() : value;
  }

  var Control = createClass({
    getInitialState: function () {
      return { open: {} };
    },

    pending: function () {
      return toJS(this.props.value) || {};
    },

    promos: function () {
      return toJS(this.props.entry.getIn(['data', 'daily_promos'])) || [];
    },

    /** One day's promos in the order the website will show them after a save. */
    dayPromos: function (day) {
      var ordered = window.CpHelpers.orderPromos(
        this.promos(),
        this.pending(),
        function (p) { return p.day; },
        function (p) { return p.id; },
      );
      return ordered.filter(function (p) { return p.day === day; });
    },

    // Writes the day's whole list, so the order on screen is exactly what the save applies.
    // Immutable is not a global: an empty Map and List are borrowed from values the entry holds.
    move: function (day, from, to) {
      var ids = this.dayPromos(day)
        .filter(function (p) { return p.id; })
        .map(function (p) { return p.id; });
      if (to < 0) to = 0;
      if (to > ids.length - 1) to = ids.length - 1;
      if (to === from) return;
      ids.splice(to, 0, ids.splice(from, 1)[0]);
      var data = this.props.entry.get('data');
      var base = this.props.value && typeof this.props.value.set === 'function'
        ? this.props.value
        : data.clear();
      this.props.onChange(base.set(day, data.get('daily_promos').clear().concat(ids)));
    },

    commitPosition: function (day, i, e) {
      var n = parseInt(e.target.value, 10);
      if (isNaN(n)) {
        e.target.value = String(i + 1);
        return;
      }
      this.move(day, i, n - 1);
    },

    renderDay: function (day) {
      var self = this;
      var promos = this.dayPromos(day);
      var saved = promos.filter(function (p) { return p.id; });
      var unsaved = promos.filter(function (p) { return !p.id; });
      var open = !!this.state.open[day];

      var heading = day + ' — ' +
        (promos.length ? String(promos.length) + (promos.length === 1 ? ' promo' : ' promos') : 'no promos');

      return h(
        'div',
        { className: open ? 'cp-order cp-open' : 'cp-order', key: day, 'data-day': day },
        h(
          'div',
          { className: 'cp-order-head' },
          h(
            'button',
            {
              type: 'button',
              className: 'cp-order-toggle',
              'aria-expanded': open ? 'true' : 'false',
              disabled: !promos.length,
              onClick: function () {
                var next = Object.assign({}, self.state.open);
                next[day] = !open;
                self.setState({ open: next });
              },
            },
            h('span', { className: 'cp-order-caret', 'aria-hidden': 'true' }, '▶'),
            h('span', {}, heading),
          ),
        ),
        h(
          'div',
          { className: 'cp-order-rows' },
          saved.map(function (p, i) {
            return h(
              'div',
              { className: 'cp-order-row', key: p.id },
              h('input', {
                type: 'number',
                min: 1,
                max: saved.length,
                className: 'cp-order-pos',
                'aria-label': 'Position',
                // The key carries the position, so a moved row remounts and shows its new number.
                key: 'pos-' + p.id + '-' + String(i),
                defaultValue: String(i + 1),
                onKeyDown: function (e) {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur();
                  }
                },
                onBlur: function (e) {
                  self.commitPosition(day, i, e);
                },
              }),
              h('span', { className: 'cp-order-name' }, (p.title || '') + (p.venue ? ' — ' + p.venue : '')),
            );
          }),
          // A promo added in this session has no id until the save, and an id is what the order
          // holds. It already sits at the bottom of its day, which is where a save puts it too.
          unsaved.map(function (p, i) {
            return h(
              'div',
              { className: 'cp-order-row', key: 'new-' + String(i) },
              h('span', { className: 'cp-order-pos cp-order-new', 'aria-hidden': 'true' }, '—'),
              h('span', { className: 'cp-order-name' }, (p.title || 'New promo') + ' (new: Save first, then you can move it)'),
            );
          }),
        ),
      );
    },

    render: function () {
      var self = this;
      return h('div', {}, DAYS.map(function (day) { return self.renderDay(day); }));
    },
  });

  var Preview = createClass({
    render: function () {
      return null;
    },
  });

  window.CMS.registerWidget('promo_order', Control, Preview);
})();
