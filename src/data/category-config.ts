export const categoryConfigs: Record<
  string,
  Record<
    string,
    {
      title: string;
      description: string;
      subcategories: { name: string; value: string }[];
    }
  >
> = {
  canggu: {
    food: {
      title: 'Food & Dining',
      description: 'Discover the best restaurants and cafes in Canggu',
      subcategories: [
        { name: 'Brunch', value: 'brunch' },
        { name: 'Dinner', value: 'dinner' },
        { name: 'Healthy', value: 'healthy' },
        { name: 'Authentic', value: 'authentic' },
      ],
    },
    hangout: {
      title: 'Hangout Spots',
      description: 'Explore bars and party venues',
      subcategories: [
        { name: 'Party', value: 'party' },
        { name: 'Bars', value: 'bars' },
      ],
    },
    wellness: {
      title: 'Wellness & Fitness',
      description: 'Find your perfect wellness spot',
      subcategories: [
        { name: 'Gym', value: 'gym' },
        { name: 'Boxing', value: 'boxing' },
        { name: 'Padel', value: 'padel' },
        { name: 'Yoga', value: 'yoga' },
        { name: 'Pilates', value: 'pilates' },
        { name: 'Spa/Massage', value: 'spa' },
      ],
    },
    'fun-family': {
      title: 'Fun & Family',
      description: 'Family-friendly activities and attractions',
      subcategories: [
        { name: 'Waterpark', value: 'waterpark' },
        { name: 'Zoo', value: 'zoo' },
        { name: 'Activities', value: 'activities' },
      ],
    },
  },
  uluwatu: {
    food: {
      title: 'Food & Dining',
      description: 'Discover the best restaurants and cafes in Uluwatu',
      subcategories: [
        { name: 'Brunch', value: 'brunch' },
        { name: 'Dinner', value: 'dinner' },
        { name: 'Authentic', value: 'authentic' },
      ],
    },
    hangout: {
      title: 'Hangout Spots',
      description: 'Explore bars and party venues',
      subcategories: [
        { name: 'Party', value: 'party' },
        { name: 'Bars', value: 'bars' },
      ],
    },
    wellness: {
      title: 'Wellness & Fitness',
      description: 'Find your perfect wellness spot',
      subcategories: [
        { name: 'Gym', value: 'gym' },
        { name: 'Boxing', value: 'boxing' },
        { name: 'Padel', value: 'padel' },
        { name: 'Yoga', value: 'yoga' },
        { name: 'Pilates', value: 'pilates' },
        { name: 'Spa', value: 'spa' },
      ],
    },
    'fun-family': {
      title: 'Fun & Family',
      description: 'Family-friendly activities and attractions',
      subcategories: [
        { name: 'Waterpark', value: 'waterpark' },
        { name: 'Zoo', value: 'zoo' },
        { name: 'Activities', value: 'activities' },
      ],
    },
  },
};
