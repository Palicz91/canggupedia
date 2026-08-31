/**
 * The `venue_order` widget: one numbered, collapsible list per section and per tab.
 *
 * It shows **every** venue that belongs to that list, already in the order the website will use,
 * and the only thing you can do to a row is type a new position. Reported on 2026-08-31, in order:
 *
 * 1. "the venue order looks caotic and super difficult to use" — 21 Decap lists open at once, 111
 *    rows, a ~12,000px page. Decap's `list` has no option to start closed, and using its own
 *    collapse unmounts the rows: they come back with every venue picker blank (measured — 29 rows,
 *    29 empty selects, still empty 15s later). `minimize_collapsed` has the same fault for the same
 *    reason. So rows here are hidden with CSS and never unmounted.
 * 2. "adding a position number to each and if i chnage 25 to 3 ... it moves to 3rd position and
 *    pushes everything down with one" — a widget rendered inside a list row cannot reorder the list
 *    around it, because Decap hands each control an onChange for its own value only. This one owns
 *    the whole array, so a move is a splice.
 * 3. "every subcategory is empty ... i want to see all businesses under each subcategory if i open
 *    it". The tab lists really were empty, and always had been: empty means "inherit the section
 *    order", which is correct behaviour and reads as a broken screen. Seventeen boxes saying
 *    "0 venues" told Ivan nothing about what the Dinner tab would actually look like.
 *
 * (3) is why there is no picker, no Add and no delete any more. The list is derived: every venue in
 * this area, this section and (for a tab) this subcategory is on it, so there is nothing to add —
 * a venue created five minutes ago is already in place, which also retires the old "I can't find
 * Billy Ho here" complaint. There is nothing useful to delete either: removing an id never removed
 * a venue from the site, it only dropped it to the bottom.
 *
 * The value on disk is unchanged — still a plain array of venue ids, still empty until a position
 * is actually typed, so an untouched tab keeps inheriting. Ordering comes from CpHelpers, which is
 * a hand port of src/lib/venues.ts held to it by test/venue-order-parity.test.ts; the widget must
 * never sort by anything else, or it starts lying about what the page will do.
 *
 * Immutable is not exposed as a global, so an empty List is borrowed from a value already held
 * rather than constructed.
 */
(function () {
  var h = window.h;
  var createClass = window.createClass;

  // Decap's own search action, the one the relation widget uses. An empty term returns every entry
  // in the collection (probed: 34 hits for food-venues, each with full `data`). There are 21
  // controls on the screen over 4 collections, so the promise is shared rather than the query
  // repeated per control.
  var venueCache = {};
  function loadVenues(query, collection) {
    if (!venueCache[collection]) {
      venueCache[collection] = query('cp-venue-order', collection, ['name'], '', undefined, 1000)
        .then(function (res) {
          var hits = (res && res.payload && res.payload.hits) || [];
          return hits
            .map(function (hit) {
              var d = hit.data || {};
              return {
                id: d.id,
                name: d.name,
                featured: !!d.featured,
                subcategory: d.subcategory,
                location: d.location,
              };
            })
            .filter(function (v) {
              return v.id;
            });
        })
        .catch(function () {
          return null; // handled in render: the heading says so rather than showing an empty list
        });
    }
    return venueCache[collection];
  }

  function toArray(value) {
    if (!value) return [];
    return typeof value.toJS === 'function' ? value.toJS() : [].concat(value);
  }

  var Control = createClass({
    getInitialState: function () {
      return { open: false, venues: undefined };
    },

    componentDidMount: function () {
      var self = this;
      this.mounted = true;
      loadVenues(this.props.query, this.props.field.get('collection')).then(function (venues) {
        if (self.mounted) self.setState({ venues: venues });
      });
    },

    componentWillUnmount: function () {
      this.mounted = false;
    },

    /** Every venue this list is responsible for, in the order the website will render them. */
    ids: function () {
      var field = this.props.field;
      var area = field.get('area');
      var sub = field.get('subcategory') || null;
      var venues = (this.state.venues || []).filter(function (v) {
        return v.location === area;
      });
      var stored = toArray(this.props.value);
      // A tab inherits its section's order until it holds one of its own. Read live from the entry,
      // so reordering the section above updates every tab under it without a save in between.
      var sectionOrder = sub
        ? toArray(this.props.entry.getIn(['data', field.get('section')]))
        : stored;
      return window.CpHelpers.effectiveOrder(
        venues,
        stored,
        sectionOrder,
        sub,
        toArray(field.get('sub_order')),
      );
    },

    names: function () {
      var map = {};
      (this.state.venues || []).forEach(function (v) {
        map[v.id] = v.name;
      });
      return map;
    },

    write: function (arr) {
      var v = this.props.value;
      var empty =
        v && typeof v.clear === 'function' ? v.clear() : this.props.field.toList().clear();
      this.props.onChange(empty.concat(arr));
    },

    // Writes the whole list, not just the moved id. Before the first move a tab list is empty and
    // inherited; the move is what turns it into an order of its own. It also quietly drops ids left
    // behind by a deleted venue, since they are not in the derived list.
    move: function (from, to) {
      var arr = this.ids();
      if (to < 0) to = 0;
      if (to > arr.length - 1) to = arr.length - 1;
      if (to === from) return;
      arr.splice(to, 0, arr.splice(from, 1)[0]);
      this.write(arr);
    },

    // Enter commits without reaching for the mouse; blur covers clicking away. Anything that is not
    // a number puts the row's own position back.
    commitPosition: function (i, e) {
      var n = parseInt(e.target.value, 10);
      if (isNaN(n)) {
        e.target.value = String(i + 1);
        return;
      }
      this.move(i, n - 1);
    },

    render: function () {
      var self = this;
      var open = this.state.open;
      var loaded = this.state.venues !== undefined;
      var failed = this.state.venues === null;
      var ids = loaded && !failed ? this.ids() : [];
      var names = this.names();

      var heading;
      if (!loaded) heading = 'Loading…';
      else if (failed) heading = 'Could not load the venues — reload the page';
      // Real and correct: "Rooftop" has no Canggu venues, and the website hides that tab entirely
      // (visibleSubcategories in src/lib/venues.ts). Saying so beats a bare "0 venues".
      else if (!ids.length) heading = 'Nothing in this tab yet';
      else if (ids.length === 1) heading = '1 venue';
      else heading = String(ids.length) + ' venues';

      return h(
        'div',
        { className: open ? 'cp-order cp-open' : 'cp-order' },
        h(
          'div',
          { className: 'cp-order-head' },
          h(
            'button',
            {
              type: 'button',
              className: 'cp-order-toggle',
              'aria-expanded': open ? 'true' : 'false',
              disabled: !ids.length,
              onClick: function () {
                self.setState({ open: !open });
              },
            },
            h('span', { className: 'cp-order-caret', 'aria-hidden': 'true' }, '▶'),
            h('span', {}, heading),
          ),
        ),
        h(
          'div',
          { className: 'cp-order-rows' },
          ids.map(function (id, i) {
            return h(
              'div',
              { className: 'cp-order-row', key: id },
              h('input', {
                type: 'number',
                min: 1,
                max: ids.length,
                className: 'cp-order-pos',
                'aria-label': 'Position',
                // The key carries the position, so a moved row remounts and shows its new number.
                key: 'pos-' + id + '-' + String(i),
                defaultValue: String(i + 1),
                onKeyDown: function (e) {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur();
                  }
                },
                onBlur: function (e) {
                  self.commitPosition(i, e);
                },
              }),
              // The id is the fallback, not the label: a venue deleted from under a stored order
              // would otherwise render as a blank row with a number next to it.
              h('span', { className: 'cp-order-name' }, names[id] || id),
            );
          }),
        ),
      );
    },
  });

  // The order screen has no custom preview template, so Decap falls back to rendering each widget's
  // preview. A list of ids says nothing the form does not already show.
  var Preview = createClass({
    render: function () {
      return null;
    },
  });

  window.CMS.registerWidget('venue_order', Control, Preview);
})();
