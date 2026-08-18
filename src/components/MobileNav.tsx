import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        className="text-gray-700"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? <X size={28} /> : <Menu size={28} />}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 bg-white shadow-lg pb-4 px-4 space-y-3">
          <a
            href="/"
            className="block text-gray-700 hover:text-sunset-orange font-semibold py-2"
          >
            Home
          </a>
          <a
            href="/about-us"
            className="block text-gray-700 hover:text-sunset-orange font-semibold py-2"
          >
            About Us
          </a>
          <a
            href="/contact"
            className="block bg-gradient-tropical text-white px-6 py-2 rounded-full font-bold text-center"
          >
            Contact Us
          </a>
        </div>
      )}
    </div>
  );
}
