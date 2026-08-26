import { useState } from 'react';
import { MapPin, ArrowLeft, X } from 'lucide-react';
import { toHref } from '../lib/links';
import { subsOf, sortVenues, visibleSubcategories } from '../lib/venues';

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

const PLACEHOLDER_LOGO = '/images/pediafamlogo.webp';

function VenueImage({
  src,
  alt,
  className,
  rounded = '',
}: {
  src?: string;
  alt: string;
  className: string;
  rounded?: string;
}) {
  const [failed, setFailed] = useState(false);
  const usable = Boolean(src && src.trim()) && !failed;

  if (!usable) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 ${rounded}`}
        role="img"
        aria-label={`${alt} — no photo yet`}
      >
        <img src={PLACEHOLDER_LOGO} alt="" className="w-24 max-w-[60%] opacity-40" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

interface Venue {
  id: string;
  slug?: string;
  name: string;
  description: string;
  imageUrl?: string;
  category: string;
  subcategory: string | string[];
  location: string;
  googleMapsUrl: string;
  instagramUrl: string;
  openingHours?: string;
  priceRange?: string;
  featured?: boolean;
  discountCode?: string;
  note?: string;
  tableBookingUrl?: string;
  guestlistUrl?: string;
  ticketUrl?: string;
}

interface CategoryConfig {
  title: string;
  description: string;
  subcategories: { name: string; value: string }[];
}

interface Props {
  venues: Venue[];
  config: CategoryConfig;
  /** Venue ids in the order Ivan dragged them, from src/data/venue-order/<area>.json. */
  order?: string[];
  category: string;
  location: string;
  backHref: string;
  backLabel: string;
  bgGradient: string;
}

export default function VenueGrid({
  venues,
  config,
  order,
  category,
  location,
  backHref,
  backLabel,
  bgGradient,
}: Props) {
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);

  const subOrder = config.subcategories.map((s) => s.value);
  const pills = visibleSubcategories(config.subcategories, venues);

  const base = activeSubcategory
    ? venues.filter((v) => subsOf(v).includes(activeSubcategory))
    : venues;
  const filteredVenues = sortVenues(base, subOrder, order);

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient}`}>
      <div className="container mx-auto px-4 py-12">
        <a
          href={backHref}
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-sunset-orange mb-6 font-semibold"
        >
          <ArrowLeft size={20} />
          <span>{backLabel}</span>
        </a>

        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-display font-bold text-gray-800 mb-4">
            {config.title}
          </h1>
          <p className="text-xl text-gray-600">{config.description}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <button
            onClick={() => setActiveSubcategory(null)}
            className={`px-6 py-2 rounded-full font-semibold transition-all cursor-pointer ${
              !activeSubcategory
                ? 'bg-gradient-tropical text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All
          </button>
          {pills.map((sub) => (
            <button
              key={sub.value}
              onClick={() => setActiveSubcategory(sub.value)}
              className={`px-6 py-2 rounded-full font-semibold transition-all cursor-pointer ${
                activeSubcategory === sub.value
                  ? 'bg-gradient-tropical text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>

        {filteredVenues.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {filteredVenues.map((venue) => (
              <div
                key={venue.slug || venue.id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden card-hover"
              >
                <div className="relative h-48">
                  <VenueImage
                    key={venue.imageUrl || 'none'}
                    src={venue.imageUrl}
                    alt={venue.name}
                    className="w-full h-full object-cover"
                  />
                  {venue.featured && (
                    <div className="absolute top-4 right-4 bg-gradient-tropical text-white px-3 py-1 rounded-full text-sm font-bold">
                      Our Top Pick
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="font-display font-bold text-2xl text-gray-800 mb-2">
                    {venue.name}
                  </h3>
                  <p className="text-gray-600 mb-6 line-clamp-3">
                    {venue.description}
                  </p>
                  <div className="flex space-x-2 mb-2">
                    {toHref(venue.googleMapsUrl) && (
                    <a
                      href={toHref(venue.googleMapsUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center space-x-2 bg-sunset-orange text-white py-2 px-4 rounded-xl hover:bg-sunset-coral transition-colors font-semibold"
                    >
                      <MapPin size={16} />
                      <span>Map</span>
                    </a>
                    )}
                    {toHref(venue.instagramUrl, 'instagram') && (
                    <a
                      href={toHref(venue.instagramUrl, 'instagram')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center space-x-2 bg-pink-500 text-white py-2 px-4 rounded-xl hover:bg-pink-600 transition-colors font-semibold"
                    >
                      <InstagramIcon size={16} />
                      <span>IG</span>
                    </a>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedVenue(venue)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-xl font-semibold hover:bg-gray-300 transition w-full mt-2 cursor-pointer"
                  >
                    MORE
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-xl text-gray-600 mb-4">
              No venues found in this category yet.
            </p>
            <p className="text-gray-500">Check back soon for new additions!</p>
          </div>
        )}

        {selectedVenue && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn"
            onClick={() => setSelectedVenue(null)}
          >
            <div
              className="max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 relative mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedVenue(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 cursor-pointer"
              >
                <X size={22} />
              </button>

              <div className="relative w-full h-56 mb-4">
                <VenueImage
                  key={selectedVenue.imageUrl || 'none'}
                  src={selectedVenue.imageUrl}
                  alt={selectedVenue.name}
                  className="w-full h-full object-cover rounded-xl"
                  rounded="rounded-xl"
                />
              </div>

              <h2 className="text-3xl font-bold mb-3">{selectedVenue.name}</h2>
              <p className="text-gray-600 mb-6">
                {selectedVenue.description}
                {selectedVenue.discountCode && (
                  <>
                    <br /><br />
                    <strong>TICKETS DISCOUNT CODE: {selectedVenue.discountCode}</strong>
                  </>
                )}
              </p>

              {(selectedVenue.openingHours || selectedVenue.priceRange) && (
                <div className="bg-gray-50 rounded-xl p-4 mb-6 text-gray-700">
                  {selectedVenue.openingHours && (
                    <p className="mb-2">
                      <span className="font-semibold text-gray-800">Opening Hours: </span>
                      {selectedVenue.openingHours}
                    </p>
                  )}
                  {selectedVenue.priceRange && (
                    <p>
                      <span className="font-semibold text-gray-800">Price Range: </span>
                      {selectedVenue.priceRange}
                    </p>
                  )}
                </div>
              )}

              {selectedVenue.note && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4 mb-6 whitespace-pre-line">
                  <strong>Note: {selectedVenue.note}</strong>
                </div>
              )}

              <div className="flex space-x-2 mb-3">
                {toHref(selectedVenue.googleMapsUrl) && (
                <a
                  href={toHref(selectedVenue.googleMapsUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center space-x-2 bg-sunset-orange text-white py-2 px-4 rounded-xl hover:bg-sunset-coral transition"
                >
                  <MapPin size={18} />
                  <span>Map</span>
                </a>
                )}
                {toHref(selectedVenue.instagramUrl, 'instagram') && (
                <a
                  href={toHref(selectedVenue.instagramUrl, 'instagram')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center space-x-2 bg-pink-500 text-white py-2 px-4 rounded-xl hover:bg-pink-600 transition"
                >
                  <InstagramIcon size={18} />
                  <span>Instagram</span>
                </a>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {toHref(selectedVenue.tableBookingUrl) && (
                  <a
                    href={toHref(selectedVenue.tableBookingUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center bg-emerald-500 text-white py-2 px-4 rounded-xl font-semibold hover:bg-emerald-600 transition"
                  >
                    Table Booking
                  </a>
                )}
                {toHref(selectedVenue.guestlistUrl) && (
                  <a
                    href={toHref(selectedVenue.guestlistUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center bg-blue-500 text-white py-2 px-4 rounded-xl font-semibold hover:bg-blue-600 transition"
                  >
                    Guestlist
                  </a>
                )}
                {toHref(selectedVenue.ticketUrl) && (
                  <a
                    href={toHref(selectedVenue.ticketUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center bg-purple-500 text-white py-2 px-4 rounded-xl font-semibold hover:bg-purple-600 transition"
                  >
                    Ticket
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
