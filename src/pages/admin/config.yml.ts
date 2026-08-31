import type { APIRoute } from 'astro';
import { stringify } from 'yaml';
import { categories, locations } from '../../data/category-config';
import { subOrderKey } from '../../lib/venues';

const areaOptions = [
  ...Object.entries(locations).map(([value, label]) => ({ label, value })),
  { label: 'Seminyak', value: 'seminyak' },
];

const imageField = (label = 'Photo') => ({
  label, name: 'imageUrl', widget: 'image', choose_url: false,
  // "the library" was the media library, which is a name only the CMS uses — there is no door on
  // this screen labelled Library, so it named nothing Ivan could look for.
  hint: 'Click **Choose an image**, then **Upload** to pick a photo from your computer. Or pick one you uploaded before.',
});

// A field with nothing useful to say gets no hint at all rather than an empty grey line.
const linkField = (label: string, name: string, hint = '', required = false) => ({
  label, name, widget: 'string', required, ...(hint ? { hint } : {}),
});

function venueCollection(cat: (typeof categories)[number], folder: string, singular: string, hoursExample: string) {
  return {
    name: `${cat.value}-venues`,
    label: cat.title,
    label_singular: singular,
    description: `${cat.title} venues. Every venue has an Area (Canggu or Uluwatu) and one or more types. To find one fast, type its name in the search box at the top.`,
    folder,
    format: 'json',
    extension: 'json',
    create: true,
    delete: true,
    identifier_field: 'name',
    slug: '{{id}}',
    summary: "{{name}}   ·   {{location | upper}}   {{featured | ternary('⭐ Top pick', '')}}",
    sortable_fields: [
      { field: 'name', label: 'Name', default_sort: 'asc' },
      { field: 'location', label: 'Area' },
      { field: 'featured', label: 'Top pick' },
    ],
    view_filters: [
      { label: 'Canggu only', field: 'location', pattern: '^canggu$' },
      { label: 'Uluwatu only', field: 'location', pattern: '^uluwatu$' },
      { label: 'Top picks only', field: 'featured', pattern: true },
    ],
    view_groups: [{ label: 'Area', field: 'location' }],
    fields: [
      { label: 'Venue name', name: 'name', widget: 'string' },
      { label: 'Area', name: 'location', widget: 'select', default: 'canggu', options: areaOptions,
        hint: 'Decides which page the venue shows on (Canggu or Uluwatu).' },
      { label: 'Type', name: 'subcategory', widget: 'select', multiple: true, min: 1,
        options: cat.subcategories.map((s) => ({ label: s.name, value: s.value })),
        hint: 'Pick one or more. Missing a type? Add it under **Categories & types** in the left menu.' },
      imageField(),
      { label: 'Short description', name: 'description', widget: 'text', hint: '2 to 3 sentences. This shows on the venue card.' },
      { label: 'Show "Our Top Pick" badge', name: 'featured', widget: 'boolean', required: false, default: false,
        hint: 'Only for a few favourites. This adds the badge on the card. To move a venue up or down, use **Order of venues** in the left menu.' },
      linkField('Google Maps link', 'googleMapsUrl', 'Paste the link from Google Maps (Share → Copy link).', true),
      linkField('Instagram', 'instagramUrl', 'Paste the profile link or just the username, e.g. @cratecafe', true),
      { label: 'Opening hours', name: 'openingHours', widget: 'string', required: false,
        // Was three sentences describing two ways in and what each one does to the page. The short
        // version leads with the thing he actually does — copy off Google, paste.
        hint: `Copy the whole week off Google and paste it here — the website lays it out day by day. One line like ${hoursExample} works too.` },
      { label: 'Price range', name: 'priceRange', widget: 'string', required: false, hint: 'e.g. $$ or 150k–300k IDR' },
      { label: 'Note', name: 'note', widget: 'text', required: false,
        hint: 'Shows as a yellow box when someone opens the venue. Good for "closed on Mondays" or "book ahead".' },
      // "popup" was the only name this panel gave that panel; the Note hint two lines up already
      // called the same thing "when someone opens the venue", so both say it that way now.
      { label: 'Discount code', name: 'discountCode', widget: 'string', required: false,
        hint: 'Shows in bold when someone opens the venue.' },
      // No leading "Optional." on these three: the CMS already prints "(optional)" in the label of
      // every field that is not required, so the hint was saying it a second time.
      linkField('Table booking link', 'tableBookingUrl', 'Adds a green "Table Booking" button. WhatsApp links work: wa.me/62812…'),
      linkField('Guestlist link', 'guestlistUrl', 'Adds a blue "Guestlist" button.'),
      linkField('Ticket link', 'ticketUrl', 'Adds a purple "Ticket" button.'),
      { label: 'Ref', name: 'id', widget: 'hidden' },
      { label: 'Section', name: 'category', widget: 'hidden', default: cat.value },
    ],
  };
}

const byValue = Object.fromEntries(categories.map((c) => [c.value, c]));
const venueCollections = [
  venueCollection(byValue['food'], 'src/data/venues/food', 'food venue', '8AM – 10PM'),
  venueCollection(byValue['hangout'], 'src/data/venues/hangout', 'hangout venue', '5PM – 2AM'),
  venueCollection(byValue['wellness'], 'src/data/venues/wellness', 'wellness venue', '6AM – 10PM'),
  venueCollection(byValue['fun-family'], 'src/data/venues/fun-family', 'fun & family venue', '9AM – 6PM'),
];

/**
 * Decap cannot drag-reorder entries across a folder collection, so the running order lives
 * in its own file per area: a list of venue ids that Ivan drags. src/lib/venues.ts sorts by
 * that list, and anything missing from it falls to the bottom.
 */
function orderListField(
  name: string,
  label: string,
  collectionValue: string,
  hint: string,
  area: string,
  subOrder: string[],
  subcategory?: string,
) {
  return {
    label,
    name,
    // Not Decap's `list`. That widget cannot start closed, cannot number its rows, cannot be
    // reordered by anything except dragging, and shows only the ids already stored — so a tab
    // nobody has ordered yet renders as an empty box. All four were reported on 2026-08-31.
    // public/admin/venue-order-widget.js does the lot and explains why each of the obvious
    // config-only answers (`collapsed`, `summary`, `minimize_collapsed`) does not work.
    // The stored value is unchanged: a plain array of venue ids, empty until one is moved.
    widget: 'venue_order',
    required: false,
    hint,
    // Everything below is read by the widget off its own field definition. It queries the venue
    // collection through Decap's own search action, so the list is whatever is in the CMS right
    // now — a venue created a minute ago included.
    collection: `${collectionValue}-venues`,
    // One order file covers one area, so the list is narrowed to it. This used to be a Decap
    // relation `filters` entry and had to be, because without it the Canggu lists offered Uluwatu
    // venues: picking one saved happily and changed nothing, since the id never matches on that
    // page. The widget now derives the list instead of offering a picker, so the same guarantee
    // comes from the filter below rather than from Decap.
    area,
    // The sibling field holding the section order. A tab list inherits it until it has one of its
    // own, exactly as mergeOrder does on the site.
    section: collectionValue,
    // Left off the section's own list. Note this is applied by the widget, not by Decap: Decap's
    // relation filter cannot match inside an array, and `subcategory` is an array — probed
    // directly, a subcategory-filtered relation control offered 0 venues where the unfiltered one
    // offered 12.
    ...(subcategory ? { subcategory } : {}),
    // The tab order from category-config, used by the tie-break rule that ranks venues no one has
    // placed by hand. Without it the widget's order drifts from the website's for those venues.
    sub_order: subOrder,
  };
}

/**
 * One main list per section, then one optional list per type within it.
 *
 * The per-type lists start empty and empty means "use the main order", so nothing about the
 * site changes until Ivan actually drags something. That matters: he only wants a custom
 * Dinner order, and should not have to rebuild the other sixteen type lists to get it.
 *
 * This is 21 lists per area rather than 4. An empty list is only a label and an Add button,
 * so the screen stays short until the lists are used.
 */
function orderFieldsFor(areaLabel: string, areaValue: string) {
  return categories.flatMap((cat) => {
    const subOrder = cat.subcategories.map((s) => s.value);
    return [
      orderListField(
        cat.value,
        `${cat.title} — whole section`,
        cat.value,
        // Short on purpose. There are 21 of these lists per area, so a paragraph on each one
        // buries the actual controls under a wall of near-identical grey text — which is the
        // state that made this screen unusable in the first place. The full explanation lives
        // once, in the collection description at the top of the page.
        `The order on the ${areaLabel} ${cat.title} page, All tab.`,
        areaValue,
        subOrder,
      ),
      ...cat.subcategories.map((sub) =>
        orderListField(
          subOrderKey(cat.value, sub.value),
          `${cat.title} — ${sub.name} tab only`,
          cat.value,
          `Only the ${sub.name} tab. Until you move one here, it follows the section order above.`,
          areaValue,
          subOrder,
          sub.value,
        ),
      ),
    ];
  });
}

const venueOrderCollection = {
  name: 'venue-order',
  // "Venue order" reads as an order someone placed for a venue. This says what the screen is.
  label: 'Order of venues',
  description:
    'The order venues show up on the website. Open a list, type a new number next to a venue and ' +
    'press Enter — it jumps to that place and the rest shift down by one. Then press Save. ' +
    'Every list already holds every venue that belongs in it, including ones you added a minute ' +
    'ago, so there is nothing here to add. ' +
    'Each section has one list for the whole section plus one list per tab. A tab follows the ' +
    'section order until you move something inside it, and keeps its own order from then on.',
  editor: { preview: false },
  files: [
    {
      name: 'canggu', label: 'Canggu', file: 'src/data/venue-order/canggu.json', format: 'json',
      fields: orderFieldsFor('Canggu', 'canggu'),
    },
    {
      name: 'uluwatu', label: 'Uluwatu', file: 'src/data/venue-order/uluwatu.json', format: 'json',
      fields: orderFieldsFor('Uluwatu', 'uluwatu'),
    },
  ],
};

const areaSelect = {
  label: 'Area', name: 'location', widget: 'select', default: 'canggu',
  options: Object.entries(locations).map(([value, label]) => ({ label, value })),
};

const dealsCollection = {
  name: 'deals',
  label: 'Deals & events',
  description: 'Happy hours, daily promos and upcoming events. Open one, add or change an item, then Save. Press Put online now when you are done.',
  editor: { preview: false },
  files: [
    {
      name: 'happy-hours', label: 'Happy hours', file: 'src/data/happy-hours.json', format: 'json',
      fields: [{
        label: 'Happy hours', name: 'happy_hours', label_singular: 'happy hour', widget: 'list',
        summary: '{{fields.venue}} — {{fields.time}}',
        fields: [
          { label: 'Venue', name: 'venue', widget: 'string' },
          imageField(),
          { label: 'Days', name: 'days', widget: 'select', multiple: true,
            options: ['Daily', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
          { label: 'Time', name: 'time', widget: 'string', hint: 'e.g. 5PM – 7PM' },
          { label: 'Offer', name: 'offer', widget: 'string', hint: 'e.g. 2-for-1 cocktails' },
          areaSelect,
          linkField('Google Maps link', 'googleMapsUrl', 'Paste the link from Google Maps.', true),
          linkField('Instagram', 'instagramUrl', 'Profile link or username, e.g. @prettypoisonbali', true),
          { label: 'Ref', name: 'id', widget: 'hidden' },
        ],
      }],
    },
    {
      name: 'daily-promos', label: 'Daily promos', file: 'src/data/daily-promos.json', format: 'json',
      fields: [{
        label: 'Daily promos', name: 'daily_promos', label_singular: 'promo', widget: 'list',
        summary: '{{fields.day}} — {{fields.title}}',
        fields: [
          { label: 'Title', name: 'title', widget: 'string', hint: 'e.g. Taco Tuesday' },
          { label: 'Day', name: 'day', widget: 'select', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
          { label: 'Venue', name: 'venue', widget: 'string' },
          imageField(),
          { label: 'Description', name: 'description', widget: 'text' },
          areaSelect,
          linkField('Venue Instagram', 'venueInstagram', 'Profile link or username, e.g. @labrisabali', true),
          { label: 'Ref', name: 'id', widget: 'hidden' },
        ],
      }],
    },
    {
      name: 'events', label: 'Events', file: 'src/data/events.json', format: 'json',
      fields: [{
        label: 'Events', name: 'events', label_singular: 'event', widget: 'list',
        summary: '{{fields.date}} — {{fields.title}}',
        fields: [
          { label: 'Title', name: 'title', widget: 'string' },
          { label: 'Date', name: 'date', widget: 'datetime', format: 'YYYY-MM-DD', date_format: 'YYYY-MM-DD', time_format: false, picker_utc: true },
          { label: 'Venue', name: 'venue', widget: 'string' },
          imageField(),
          areaSelect,
          { label: 'Price', name: 'price', widget: 'string', hint: 'e.g. Free, or 150k IDR' },
          { label: 'Description', name: 'description', widget: 'text' },
          linkField('Ticket link', 'ticketUrl'),
          { label: 'Ref', name: 'id', widget: 'hidden' },
        ],
      }],
    },
  ],
};

const categoriesCollection = {
  name: 'settings',
  // Kept as "Categories" at Adam's request (2026-08-31) after a pass that had renamed it to
  // "Sections & types" for consistency with the order screen. It is the name he and Ivan use out
  // loud, which beats matching the rest of the panel. Do not rename it again.
  label: 'Categories & types',
  description: 'The types you can pick on a venue (Brunch, Padel, Yoga…). Add or rename them here. A new type appears on every venue about 2 minutes after you press Put online now — reload this page to see it.',
  editor: { preview: false },
  files: [{
    name: 'categories', label: 'Categories & types', file: 'src/data/categories.json', format: 'json',
    fields: [{
      label: 'Sections', name: 'categories', label_singular: 'section', widget: 'list',
      allow_add: false, allow_remove: false, collapsed: true, summary: '{{fields.title}}',
      hint: 'The four main sections of the website. Open one to add or rename its types. To add a whole new section, ask Adam.',
      fields: [
        { label: 'Section name', name: 'title', widget: 'string' },
        { label: 'Line under the section name', name: 'description', widget: 'string' },
        { label: 'Types', name: 'subcategories', label_singular: 'type', widget: 'list', summary: '{{fields.name}}',
          fields: [
            { label: 'Type name', name: 'name', widget: 'string', hint: 'e.g. Brunch, Padel, Rooftop' },
            { label: 'Key', name: 'value', widget: 'hidden' },
          ] },
        { label: 'Key', name: 'value', widget: 'hidden' },
      ],
    }],
  }],
};

/**
 * The front page. Only the parts Ivan should be able to change are here — the two area photos and
 * the three lines above them. The rest of that page is navigation and stays in the template, so
 * there is nothing on this screen he can press that breaks a link.
 */
const homeCollection = {
  name: 'home',
  label: 'Home page',
  description: 'The front page of the website: the three lines at the top and the two photos for Canggu and Uluwatu. Change what you need, press Save, then Put online now.',
  editor: { preview: false },
  files: [{
    name: 'home', label: 'Home page', file: 'src/data/home.json', format: 'json',
    // The three lines are named by where they sit, top to bottom, because that is the only way to
    // tell them apart on the screen: "Big heading / Line under it / Short intro" left two of them
    // describing the same place.
    fields: [
      { label: 'Big heading', name: 'title', widget: 'string', hint: 'The large title at the very top.' },
      { label: 'Second line', name: 'tagline', widget: 'string', hint: 'Right under the big heading.' },
      { label: 'Third line', name: 'intro', widget: 'text', hint: 'One sentence, under the two lines above.' },
      { ...imageField('Canggu photo'), name: 'cangguImage',
        hint: 'The photo on the Canggu card. Wide photos look best.' },
      { ...imageField('Uluwatu photo'), name: 'uluwatuImage',
        hint: 'The photo on the Uluwatu card. Wide photos look best.' },
    ],
  }],
};

export const GET: APIRoute = ({ site }) => {
  const siteUrl = (site?.toString() || 'https://canggupedia.netlify.app').replace(/\/$/, '');
  const backend =
    process.env.CMS_BACKEND === 'test-repo'
      ? { name: 'test-repo' }
      : {
          name: 'git-gateway',
          branch: process.env.HEAD || 'main',
          commit_messages: {
            create: 'Add {{collection}}: {{slug}} [skip netlify]',
            update: 'Update {{collection}}: {{slug}} [skip netlify]',
            delete: 'Remove {{collection}}: {{slug}} [skip netlify]',
            uploadMedia: 'Upload photo: {{path}} [skip netlify]',
            deleteMedia: 'Delete photo: {{path}} [skip netlify]',
          },
        };

  const config = {
    backend,
    publish_mode: 'simple',
    site_url: siteUrl,
    display_url: siteUrl,
    logo: { src: '/logo.svg', show_in_header: true },
    media_folder: 'public/images',
    public_folder: '/images',
    slug: { encoding: 'ascii', clean_accents: true },
    collections: [homeCollection, ...venueCollections, venueOrderCollection, dealsCollection, categoriesCollection],
  };

  return new Response(stringify(config, { lineWidth: 0, aliasDuplicateObjects: false }), {
    headers: { 'Content-Type': 'text/yaml; charset=utf-8' },
  });
};
