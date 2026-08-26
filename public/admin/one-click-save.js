/* One click on Save actually saves.
 *
 * Decap's save control is a dropdown, not a button: clicking it only opens a little menu, and the
 * "Save now" item inside it is what commits. Ivan clicked Save, saw a menu, assumed the CMS was
 * broken and gave up — so nothing ever reached Git, photos included (a picked photo is held in the
 * browser and only uploaded when the entry is saved). That is the whole "adding pictures doesn't
 * work" bug.
 *
 * This presses "Save now" for him. If the menu never appears, the dropdown is simply left open and
 * he can click it himself, exactly as before.
 */
(function () {
  var TOGGLE = '[role="button"][class*="StyledDropdownButton"]';
  var ITEM = '[role="menu"] [role="menuitem"]';
  // Matches the publishNow label set in index.html. Kept loose so a relabel can't silently break it.
  var SAVE_NOW = /^save now$/i;

  function menuIsOpen() {
    return !!document.querySelector(ITEM);
  }

  function saveNowItem() {
    var items = document.querySelectorAll(ITEM);
    for (var i = 0; i < items.length; i++) {
      if (SAVE_NOW.test(items[i].textContent.trim())) return items[i];
    }
    return null;
  }

  document.addEventListener('click', function (e) {
    var toggle = e.target && e.target.closest && e.target.closest(TOGGLE);
    if (!toggle) return;
    // Capture phase runs before React opens the menu, so this still reads the pre-click state:
    // an open menu means he is closing it on purpose. Leave him alone.
    if (menuIsOpen()) return;

    var tries = 0;
    (function press() {
      var item = saveNowItem();
      if (item) return item.click();
      if (++tries < 20) setTimeout(press, 25);
    })();
  }, true);
})();
