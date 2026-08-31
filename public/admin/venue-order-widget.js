/**
 * The `venue_order` widget: one numbered, collapsible list of venues per section.
 *
 * Why this is not Decap's `list` widget, which is what it used to be. Two things were reported on
 * 2026-08-31 and neither can be configured away:
 *
 * 1. "the venue order looks caotic and super difficult to use" — 21 lists open at once, 111 rows,
 *    a ~12,000px page. Decap has no option to start a list closed, and using its own collapse
 *    unmounts the rows: they come back with every venue picker **blank** (measured — 29 rows, 29
 *    empty selects, still empty 15s later). `minimize_collapsed` has the same fault for the same
 *    reason. That is why the rows here are hidden with CSS and never unmounted.
 * 2. "adding a position number to each and if i chnage 25 to 3 ... it moves to 3rd position and
 *    pushes everything down with one" — a row widget cannot reorder its parent list, because Decap
 *    hands each control an onChange for its own value only. Owning the whole list is the only way
 *    to do it, so this widget owns the array and reordering is a splice.
 *
 * It does not reimplement the venue picker. `props.editorControl` is the same component Decap's own
 * object and list widgets render their children with, so each row still gets the real relation
 * control — live search over the backend, the area filter, resolved venue names — from the `field`
 * block in src/pages/admin/config.yml.ts. Dragging is gone; typing a position replaces it.
 *
 * Immutable is not exposed as a global, so an empty List is borrowed from a value already held
 * rather than constructed. Writing a plain array here would save correctly but hand the next render
 * a value Decap's own code does not expect.
 */
(function () {
  var h = window.h;
  var createClass = window.createClass;

  function toArray(value) {
    if (!value) return [];
    return typeof value.toJS === 'function' ? value.toJS() : [].concat(value);
  }

  var Control = createClass({
    getInitialState: function () {
      return { open: false };
    },

    write: function (arr) {
      var v = this.props.value;
      var empty =
        v && typeof v.clear === 'function' ? v.clear() : this.props.field.toList().clear();
      this.props.onChange(empty.concat(arr));
    },

    move: function (from, to) {
      var arr = toArray(this.props.value);
      if (to < 0) to = 0;
      if (to > arr.length - 1) to = arr.length - 1;
      if (to === from) return;
      arr.splice(to, 0, arr.splice(from, 1)[0]);
      this.write(arr);
    },

    remove: function (i) {
      var arr = toArray(this.props.value);
      arr.splice(i, 1);
      this.write(arr);
    },

    add: function () {
      var arr = toArray(this.props.value);
      arr.push('');
      this.setState({ open: true });
      this.write(arr);
    },

    // Enter is how a number gets typed and committed without reaching for the mouse; blur covers
    // clicking away. Anything that is not a number puts the row's own position back.
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
      var arr = toArray(this.props.value);
      var relationField = this.props.field.get('field');
      var EditorControl = this.props.editorControl;
      var open = this.state.open;

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
              onClick: function () {
                self.setState({ open: !open });
              },
            },
            h('span', { className: 'cp-order-caret', 'aria-hidden': 'true' }, '▶'),
            h('span', {}, arr.length === 1 ? '1 venue' : String(arr.length) + ' venues'),
          ),
          h(
            'button',
            { type: 'button', className: 'cp-order-add', onClick: this.add },
            'Add venue',
          ),
        ),
        h(
          'div',
          { className: 'cp-order-rows' },
          arr.map(function (id, i) {
            return h(
              'div',
              // Keyed by position, not by id: an id can repeat while a row is being picked, and
              // re-keying would unmount the picker and blank it.
              { className: 'cp-order-row', key: String(i) },
              h('input', {
                type: 'number',
                min: 1,
                max: arr.length,
                className: 'cp-order-pos',
                'aria-label': 'Position',
                // The key changes when a different venue lands on this row, which is what makes
                // the box show the new number after a move.
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
              h(
                'div',
                { className: 'cp-order-venue' },
                h(EditorControl, {
                  field: relationField,
                  value: id,
                  // editorControl reports changes as (field, value, metadata) — the field comes
                  // first because it is the same component Decap uses for a whole object of
                  // fields. Reading the first argument as the value writes "Map { label: Venue,
                  // ... }" into the order file, which is what happened on the first attempt.
                  onChange: function (field, v) {
                    var next = toArray(self.props.value);
                    next[i] = v === null || v === undefined ? '' : String(v);
                    self.write(next);
                  },
                }),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'cp-order-del',
                  'aria-label': 'Remove venue',
                  onClick: function () {
                    self.remove(i);
                  },
                },
                '×',
              ),
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
