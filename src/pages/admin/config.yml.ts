import type { APIRoute } from 'astro';
import { stringify } from 'yaml';
import { categories, locations } from '../../data/category-config';

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
        hint: 'Only for a few favourites. Top picks always show first in their section.' },
      linkField('Google Maps link', 'googleMapsUrl', 'Paste the link from Google Maps (Share → Copy link).', true),
      linkField('Instagram', 'instagramUrl', 'Paste the profile link or just the username, e.g. @cratecafe', true),
      { label: 'Opening hours', name: 'openingHours', widget: 'string', required: false, hint: `e.g. ${hoursExample}` },
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
    collections: [...venueCollections, dealsCollection, categoriesCollection],
  };

  return new Response(stringify(config, { lineWidth: 0, aliasDuplicateObjects: false }), {
    headers: { 'Content-Type': 'text/yaml; charset=utf-8' },
  });
};
