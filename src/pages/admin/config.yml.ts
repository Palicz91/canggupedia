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
  hint: 'Click **Choose an image**, then **Upload** to pick a photo from your computer. Or select one already in the library.',
});

const linkField = (label: string, name: string, hint: string, required = false) => ({
  label, name, widget: 'string', required, hint,
});

function venueCollection(cat: (typeof categories)[number], folder: string, singular: string, hoursExample: string) {
  return {
    name: `${cat.value}-venues`,
    label: cat.title,
    label_singular: singular,
    description: `${cat.title} venues. Each venue has an Area (Canggu or Uluwatu) and one or more types. Use the search box above to find a venue fast.`,
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
        hint: 'Only for a few favourites. This adds the badge on the card. To move a venue up or down, use **Venue order** in the left menu.' },
      linkField('Google Maps link', 'googleMapsUrl', 'Paste the link from Google Maps (Share → Copy link).', true),
      linkField('Instagram', 'instagramUrl', 'Paste the profile link or just the username, e.g. @cratecafe', true),
      { label: 'Opening hours', name: 'openingHours', widget: 'string', required: false,
        hint: `Either one line for the whole week, e.g. ${hoursExample} — or copy the hours straight off Google and paste them here. If you paste the full week, the website lays it out day by day on its own.` },
      { label: 'Price range', name: 'priceRange', widget: 'string', required: false, hint: 'e.g. $$ or 150k–300k IDR' },
      { label: 'Note', name: 'note', widget: 'text', required: false,
        hint: 'Shows as a yellow box when someone opens the venue. Good for "closed on Mondays" or "book ahead".' },
      { label: 'Discount code', name: 'discountCode', widget: 'string', required: false, hint: 'Shows in bold inside the venue popup.' },
      linkField('Table booking link', 'tableBookingUrl', 'Optional. Adds a green "Table Booking" button. WhatsApp links work: wa.me/62812…'),
      linkField('Guestlist link', 'guestlistUrl', 'Optional. Adds a blue "Guestlist" button.'),
      linkField('Ticket link', 'ticketUrl', 'Optional. Adds a purple "Ticket" button.'),
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
) {
  return {
    label,
    name,
    label_singular: 'venue',
    // Not Decap's `list`. That widget cannot start closed, cannot number its rows, and cannot be
    // reordered by anything except dragging — all three were reported on 2026-08-31. The custom
    // widget in public/admin/venue-order-widget.js does those, and explains why each of the
    // obvious config-only answers (`collapsed`, `summary`, `minimize_collapsed`) does not work.
    // The stored value is unchanged: a plain array of venue ids.
    widget: 'venue_order',
    required: false,
    hint,
    // Read by the widget as `field.get('field')` and rendered through Decap's own editorControl,
    // so this is a real relation control with live search, not a copy of one.
    field: {
      label: 'Venue',
      name: 'venue',
      widget: 'relation',
      collection: `${collectionValue}-venues`,
      value_field: 'id',
      display_fields: ['name', 'location'],
      search_fields: ['name'],
      // Each order file covers one area, so only offer that area's venues. Without this the
      // Canggu lists also offer Uluwatu venues (observed in e2e/admin-venue-order.spec.ts): picking
      // one saves happily and changes nothing, because the id never matches on that page.
      //
      // Deliberately NOT filtered by subcategory as well, even though the same trap exists for
      // types. `location` is a plain string; `subcategory` is an array, and Decap's filter does
      // not match inside arrays — probed directly, the unfiltered control offered 12 venues and
      // the subcategory-filtered one offered 0. An empty picker is worse than an over-full one.
      filters: [{ field: 'location', values: [area] }],
    },
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
  return categories.flatMap((cat) => [
    orderListField(
      cat.value,
      `${cat.title} — whole section`,
      cat.value,
      // Short on purpose. There are 21 of these lists per area, so a paragraph on each one
      // buries the actual controls under a wall of near-identical grey text — which is the
      // state that made this screen unusable in the first place. The full explanation lives
      // once, in the collection description at the top of the page.
      `Order of the ${areaLabel} ${cat.title} page, All tab.`,
      areaValue,
    ),
    ...cat.subcategories.map((sub) =>
      orderListField(
        subOrderKey(cat.value, sub.value),
        `${cat.title} — ${sub.name} tab only`,
        cat.value,
        `Only the ${sub.name} tab. Add just the ones you want at the top; leave empty to follow the section order above.`,
        areaValue,
      ),
    ),
  ]);
}

const venueOrderCollection = {
  name: 'venue-order',
  label: 'Venue order',
  description:
    'The order venues appear on the website. Open an area, drag a venue up or down, then Save. ' +
    'A venue you just created does not appear in these lists on its own — until you add it, it ' +
    'sits at the bottom of the website page. To move it up: scroll to the bottom of the right ' +
    'list, click Add venue, then type its name into the new row. ' +
    'Each section has a "whole section" list plus one list per tab. The tab lists only need the ' +
    'few venues you want pinned at the top — everything else keeps the order from the section ' +
    'list. A venue only shows on a tab if it has that type, so adding it to a tab list it does ' +
    'not belong to has no effect.',
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
          linkField('Ticket link', 'ticketUrl', 'Optional.'),
          { label: 'Ref', name: 'id', widget: 'hidden' },
        ],
      }],
    },
  ],
};

const categoriesCollection = {
  name: 'settings',
  label: 'Categories & types',
  description: 'The types you can pick on a venue (Brunch, Padel, Yoga…). Add or rename them here. A new type shows up in venue forms about 2 minutes after you press Put online now (reload this page).',
  editor: { preview: false },
  files: [{
    name: 'categories', label: 'Categories & types', file: 'src/data/categories.json', format: 'json',
    fields: [{
      label: 'Sections', name: 'categories', label_singular: 'section', widget: 'list',
      allow_add: false, allow_remove: false, collapsed: true, summary: '{{fields.title}}',
      hint: 'The four main sections of the website. Open one to add or rename its types. To add a whole new section, ask Adam.',
      fields: [
        { label: 'Section name', name: 'title', widget: 'string' },
        { label: 'Subtitle', name: 'description', widget: 'string', hint: 'Shows under the section name on the website.' },
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
  description: 'The front page of the website: the big heading and the two photos for Canggu and Uluwatu. Change one, then press Put online now.',
  editor: { preview: false },
  files: [{
    name: 'home', label: 'Home page', file: 'src/data/home.json', format: 'json',
    fields: [
      { label: 'Big heading', name: 'title', widget: 'string', hint: 'The large title at the top.' },
      { label: 'Line under it', name: 'tagline', widget: 'string' },
      { label: 'Short intro', name: 'intro', widget: 'text', hint: 'One sentence under the heading.' },
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
