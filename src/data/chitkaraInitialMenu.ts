import { WeekMenu, MealOccurrence, Dish } from '@/types/menu';
import { getWeekBoundaries } from '@/utils/dateUtils';

export interface ChitkaraTemplateMeal {
  slotId: 'breakfast' | 'lunch' | 'snacks' | 'dinner';
  name: string;
  startTime: string;
  endTime: string;
  dishes: {
    name: string;
    category?: Dish['category'];
    isVegetarian: boolean;
    isSpecial?: boolean;
    needsReview?: boolean;
    reviewNote?: string;
  }[];
}

export const CHITKARA_WEEK_TEMPLATE: Record<string, ChitkaraTemplateMeal[]> = {
  Monday: [
    {
      slotId: 'breakfast',
      name: 'Breakfast',
      startTime: '07:00',
      endTime: '10:00',
      dishes: [
        { name: 'Aloo Onion Paratha', category: 'Breads', isVegetarian: true },
        { name: 'Fresh Curd & Mango Pickle', category: 'Sides', isVegetarian: true },
        { name: 'White Amul Butter', category: 'Sides', isVegetarian: true },
        { name: 'Boiled Eggs / Egg Bhurji', category: 'Main', isVegetarian: false, isSpecial: true },
        { name: 'Special Masala Tea / Hot Milk', category: 'Beverage', isVegetarian: true },
        { name: 'Brown & White Bread with Fruit Jam', category: 'Breads', isVegetarian: true },
      ],
    },
    {
      slotId: 'lunch',
      name: 'Lunch',
      startTime: '12:00',
      endTime: '15:00',
      dishes: [
        { name: 'Rajma Masala (Jammu Style)', category: 'Main', isVegetarian: true },
        { name: 'Steamed Long Grain Basmati Rice', category: 'Rice', isVegetarian: true },
        { name: 'Seasonal Dry Mix Vegetable', category: 'Main', isVegetarian: true },
        { name: 'Fresh Phulka Chapati with Ghee', category: 'Breads', isVegetarian: true },
        { name: 'Boondi Raita with Roasted Cumin', category: 'Sides', isVegetarian: true },
        { name: 'Green Salad (Cucumber, Tomato, Onion)', category: 'Salad', isVegetarian: true },
      ],
    },
    {
      slotId: 'snacks',
      name: 'Evening Tea & Snacks',
      startTime: '16:00',
      endTime: '18:00',
      dishes: [
        { name: 'Crispy Samosa (1 pc)', category: 'Main', isVegetarian: true },
        { name: 'Saunth (Tamarind) & Mint Chutney', category: 'Sides', isVegetarian: true },
        { name: 'Adrak Elaichi Hot Tea', category: 'Beverage', isVegetarian: true },
      ],
    },
    {
      slotId: 'dinner',
      name: 'Dinner',
      startTime: '19:00',
      endTime: '22:00',
      dishes: [
        { name: 'Dal Tadka (Yellow Moong & Arhar)', category: 'Main', isVegetarian: true },
        { name: 'Kadai Paneer with Bell Peppers', category: 'Main', isVegetarian: true },
        { name: 'Jeera Rice', category: 'Rice', isVegetarian: true },
        { name: 'Tawa Butter Roti', category: 'Breads', isVegetarian: true },
        {
          name: 'Gulab Jamun (1 pc)',
          category: 'Dessert',
          isVegetarian: true,
          needsReview: true,
          reviewNote: 'Glare reflection on dessert column in printed notice',
        },
      ],
    },
  ],
  Tuesday: [
    {
      slotId: 'breakfast',
      name: 'Breakfast',
      startTime: '07:00',
      endTime: '10:00',
      dishes: [
        { name: 'Indori Veg Poha with Roasted Peanuts', category: 'Main', isVegetarian: true },
        { name: 'Ratlam Sev & Fresh Lemon Wedges', category: 'Sides', isVegetarian: true },
        { name: 'Mint Coriander Green Chutney', category: 'Sides', isVegetarian: true },
        { name: 'Boiled Sprouts Salad', category: 'Salad', isVegetarian: true },
        { name: 'Hot Filter Coffee / Masala Tea', category: 'Beverage', isVegetarian: true },
        { name: 'Bread & Butter', category: 'Breads', isVegetarian: true },
      ],
    },
    {
      slotId: 'lunch',
      name: 'Lunch',
      startTime: '12:00',
      endTime: '15:00',
      dishes: [
        { name: 'Punjabi Kadhi with Crispy Onion Pakoras', category: 'Main', isVegetarian: true },
        { name: 'Steamed Jeera Rice', category: 'Rice', isVegetarian: true },
        { name: 'Aloo Jeera dry sautéed with Hing', category: 'Main', isVegetarian: true },
        { name: 'Whole Wheat Tawa Roti', category: 'Breads', isVegetarian: true },
        { name: 'Lijjat Roasted Papad', category: 'Sides', isVegetarian: true },
        { name: 'Kachumber Salad with Sirka Onion', category: 'Salad', isVegetarian: true },
      ],
    },
    {
      slotId: 'snacks',
      name: 'Evening Tea & Snacks',
      startTime: '16:00',
      endTime: '18:00',
      dishes: [
        { name: 'Desi Masala Veg Macaroni', category: 'Main', isVegetarian: true },
        { name: 'Hot Ginger Tea', category: 'Beverage', isVegetarian: true },
      ],
    },
    {
      slotId: 'dinner',
      name: 'Dinner',
      startTime: '19:00',
      endTime: '22:00',
      dishes: [
        { name: 'Dal Makhani (Slow cooked with butter)', category: 'Main', isVegetarian: true },
        { name: 'Mughlai Shahi Paneer in Cashew Gravy', category: 'Main', isVegetarian: true },
        { name: 'Butter Tandoori Roti / Phulka', category: 'Breads', isVegetarian: true },
        { name: 'Matar Pulao', category: 'Rice', isVegetarian: true },
        { name: 'Chilled Fruit Custard', category: 'Dessert', isVegetarian: true },
      ],
    },
  ],
  Wednesday: [
    {
      slotId: 'breakfast',
      name: 'Breakfast',
      startTime: '07:00',
      endTime: '10:00',
      dishes: [
        { name: 'Steamed Rava Idli & Mini Onion Uttapam', category: 'Main', isVegetarian: true },
        { name: 'Hot Vegetable Sambar', category: 'Sides', isVegetarian: true },
        { name: 'Fresh Coconut Chutney & Tomato Chutney', category: 'Sides', isVegetarian: true },
        { name: 'Boiled Egg (2 pcs)', category: 'Main', isVegetarian: false, isSpecial: true },
        { name: 'Cornflakes with Warm Milk', category: 'Main', isVegetarian: true },
        { name: 'Hot Masala Tea', category: 'Beverage', isVegetarian: true },
      ],
    },
    {
      slotId: 'lunch',
      name: 'Lunch',
      startTime: '12:00',
      endTime: '15:00',
      dishes: [
        { name: 'Amritsari Chole Masala', category: 'Main', isVegetarian: true },
        { name: 'Fluffy Bhature / Fresh Chapati', category: 'Breads', isVegetarian: true },
        { name: 'Jeera Pulao Rice', category: 'Rice', isVegetarian: true },
        { name: 'Beetroot & Onion Salad with Green Chilli', category: 'Salad', isVegetarian: true },
        { name: 'Sweet Lassi (Chilled Glass)', category: 'Beverage', isVegetarian: true, isSpecial: true },
        { name: 'Mixed Punjabi Pickle', category: 'Sides', isVegetarian: true },
      ],
    },
    {
      slotId: 'snacks',
      name: 'Evening Tea & Snacks',
      startTime: '16:00',
      endTime: '18:00',
      dishes: [
        { name: 'Stuffed Paneer Bread Pakora', category: 'Main', isVegetarian: true },
        { name: 'Spicy Mint & Coriander Chutney', category: 'Sides', isVegetarian: true },
        { name: 'Cutting Chai', category: 'Beverage', isVegetarian: true },
      ],
    },
    {
      slotId: 'dinner',
      name: 'Dinner',
      startTime: '19:00',
      endTime: '22:00',
      dishes: [
        { name: 'Yellow Moong Dal Fry with Garlic Tadka', category: 'Main', isVegetarian: true },
        { name: 'Dum Aloo Kashmiri', category: 'Main', isVegetarian: true },
        { name: 'Steamed Fragrant Rice', category: 'Rice', isVegetarian: true },
        { name: 'Ghee Chapati', category: 'Breads', isVegetarian: true },
        {
          name: 'Semiya Kheer with Roasted Almonds',
          category: 'Dessert',
          isVegetarian: true,
          needsReview: true,
          reviewNote: 'Faded print on notice sheet, verify if Seviyan or Rice Kheer',
        },
      ],
    },
  ],
  Thursday: [
    {
      slotId: 'breakfast',
      name: 'Breakfast',
      startTime: '07:00',
      endTime: '10:00',
      dishes: [
        { name: 'Crispy Methi Paratha', category: 'Breads', isVegetarian: true },
        { name: 'Fresh Dahi & Mixed Pickle', category: 'Sides', isVegetarian: true },
        { name: 'Table Butter', category: 'Sides', isVegetarian: true },
        { name: 'Boiled Eggs', category: 'Main', isVegetarian: false },
        { name: 'Hot Milk & Chai', category: 'Beverage', isVegetarian: true },
        { name: 'Fresh Banana (1 pc)', category: 'Sides', isVegetarian: true },
      ],
    },
    {
      slotId: 'lunch',
      name: 'Lunch',
      startTime: '12:00',
      endTime: '15:00',
      dishes: [
        { name: 'Dal Palak (Lentils simmered with fresh spinach)', category: 'Main', isVegetarian: true },
        { name: 'Matar Paneer Curry', category: 'Main', isVegetarian: true },
        { name: 'Steamed Rice', category: 'Rice', isVegetarian: true },
        { name: 'Whole Wheat Phulka', category: 'Breads', isVegetarian: true },
        { name: 'Cucumber Onion Raita', category: 'Sides', isVegetarian: true },
        { name: 'Garden Fresh Green Salad', category: 'Salad', isVegetarian: true },
      ],
    },
    {
      slotId: 'snacks',
      name: 'Evening Tea & Snacks',
      startTime: '16:00',
      endTime: '18:00',
      dishes: [
        { name: 'Namkeen Mathri & Roasted Poha Mix', category: 'Main', isVegetarian: true },
        { name: 'Glucose Biscuits', category: 'Sides', isVegetarian: true },
        { name: 'Ginger Masala Tea', category: 'Beverage', isVegetarian: true },
      ],
    },
    {
      slotId: 'dinner',
      name: 'Dinner',
      startTime: '19:00',
      endTime: '22:00',
      dishes: [
        { name: 'Panchmel Dal (Five Lentil Rajasthani Melange)', category: 'Main', isVegetarian: true },
        { name: 'South Style Mix Veg Beans Carrot Poriyal', category: 'Main', isVegetarian: true },
        { name: 'Laccha Paratha & Tawa Roti', category: 'Breads', isVegetarian: true },
        { name: 'Green Peas Pulao', category: 'Rice', isVegetarian: true },
        {
          name: 'Moong Dal Halwa',
          category: 'Dessert',
          isVegetarian: true,
          needsReview: true,
          reviewNote: 'Glare reflection on dessert line, confirm with head chef',
        },
      ],
    },
  ],
  Friday: [
    {
      slotId: 'breakfast',
      name: 'Breakfast',
      startTime: '07:00',
      endTime: '10:00',
      dishes: [
        { name: 'Vegetable Upma with Mustard & Curry Leaves', category: 'Main', isVegetarian: true },
        { name: 'Fresh Coconut Chutney', category: 'Sides', isVegetarian: true },
        { name: 'Kala Chana Chaat (Boiled & Spiced)', category: 'Salad', isVegetarian: true },
        { name: 'Toasted Bread with Mixed Fruit Jam', category: 'Breads', isVegetarian: true },
        { name: 'Hot Masala Tea / Hot Bournvita Milk', category: 'Beverage', isVegetarian: true },
      ],
    },
    {
      slotId: 'lunch',
      name: 'Lunch',
      startTime: '12:00',
      endTime: '15:00',
      dishes: [
        { name: 'Punjabi Lobia Masala (Black-eyed peas curry)', category: 'Main', isVegetarian: true },
        { name: 'Aloo Baingan Sukha (Homestyle roasted)', category: 'Main', isVegetarian: true },
        { name: 'Jeera Basmati Rice', category: 'Rice', isVegetarian: true },
        { name: 'Phulka Chapati', category: 'Breads', isVegetarian: true },
        { name: 'Fresh Curd Bowl', category: 'Sides', isVegetarian: true },
        { name: 'Radish & Carrot Green Salad', category: 'Salad', isVegetarian: true },
      ],
    },
    {
      slotId: 'snacks',
      name: 'Evening Tea & Snacks',
      startTime: '16:00',
      endTime: '18:00',
      dishes: [
        { name: 'Crispy Veg Cutlet (2 pcs)', category: 'Main', isVegetarian: true },
        { name: 'Tomato Ketchup & Mint Dip', category: 'Sides', isVegetarian: true },
        { name: 'Hot Cardamom Chai', category: 'Beverage', isVegetarian: true },
      ],
    },
    {
      slotId: 'dinner',
      name: 'Dinner',
      startTime: '19:00',
      endTime: '22:00',
      dishes: [
        { name: 'Dal Bukhara / Dal Makhani', category: 'Main', isVegetarian: true },
        { name: 'Paneer Butter Masala (Rich Cashew Tomato gravy)', category: 'Main', isVegetarian: true, isSpecial: true },
        { name: 'Hydrabadi Veg Biryani with Fried Onions', category: 'Rice', isVegetarian: true },
        { name: 'Mint & Cucumber Burani Raita', category: 'Sides', isVegetarian: true },
        { name: 'Butter Tandoori Naan & Missi Roti', category: 'Breads', isVegetarian: true },
        { name: 'Vanilla Ice Cream Cup', category: 'Dessert', isVegetarian: true },
      ],
    },
  ],
  Saturday: [
    {
      slotId: 'breakfast',
      name: 'Breakfast',
      startTime: '07:00',
      endTime: '10:00',
      dishes: [
        { name: 'Gobhi & Mix Veg Stuffed Paratha', category: 'Breads', isVegetarian: true },
        { name: 'Fresh Cream Curd', category: 'Sides', isVegetarian: true },
        { name: 'Green Chilli Pickle & White Butter', category: 'Sides', isVegetarian: true },
        { name: 'Boiled Eggs', category: 'Main', isVegetarian: false },
        { name: 'Hot Tea & Milk', category: 'Beverage', isVegetarian: true },
      ],
    },
    {
      slotId: 'lunch',
      name: 'Lunch',
      startTime: '12:00',
      endTime: '15:00',
      dishes: [
        { name: 'Kashmiri Rajma Masala', category: 'Main', isVegetarian: true },
        { name: 'Steamed Rice', category: 'Rice', isVegetarian: true },
        { name: 'Kurkuri Bhindi Masala dry', category: 'Main', isVegetarian: true },
        { name: 'Tawa Butter Roti', category: 'Breads', isVegetarian: true },
        { name: 'Fried Fryums / Papad', category: 'Sides', isVegetarian: true },
        { name: 'Boondi Raita', category: 'Sides', isVegetarian: true },
      ],
    },
    {
      slotId: 'snacks',
      name: 'Evening Tea & Snacks',
      startTime: '16:00',
      endTime: '18:00',
      dishes: [
        { name: 'Mumbai Bhel Puri with Tangy Chutney & Sev', category: 'Main', isVegetarian: true },
        { name: 'Hot Spiced Lemon Tea', category: 'Beverage', isVegetarian: true },
      ],
    },
    {
      slotId: 'dinner',
      name: 'Dinner',
      startTime: '19:00',
      endTime: '22:00',
      dishes: [
        { name: 'Arhar Dal Tadka with Desi Ghee', category: 'Main', isVegetarian: true },
        { name: 'Amritsari Soya Chaap Masala Gravy', category: 'Main', isVegetarian: true },
        { name: 'Jeera Rice', category: 'Rice', isVegetarian: true },
        { name: 'Tandoori Roti', category: 'Breads', isVegetarian: true },
        {
          name: 'Crispy Jalebi with Rabdi',
          category: 'Dessert',
          isVegetarian: true,
          needsReview: true,
          reviewNote: 'Glare near right edge, check whether Jalebi or Imarti',
        },
      ],
    },
  ],
  Sunday: [
    {
      slotId: 'breakfast',
      name: 'Breakfast',
      startTime: '07:00',
      endTime: '10:00',
      dishes: [
        { name: 'Hot Fluffy Bedmi Puri (4 pcs)', category: 'Breads', isVegetarian: true, isSpecial: true },
        { name: 'Halwai Style Aloo Chana Tariwala Gravy', category: 'Main', isVegetarian: true, isSpecial: true },
        { name: 'Desi Ghee Sooji Ka Halwa', category: 'Dessert', isVegetarian: true },
        { name: 'Methi Pickle & Fried Green Chilli', category: 'Sides', isVegetarian: true },
        { name: 'Boiled Eggs', category: 'Main', isVegetarian: false },
        { name: 'Special Weekend Masala Tea / Milk', category: 'Beverage', isVegetarian: true },
      ],
    },
    {
      slotId: 'lunch',
      name: 'Lunch',
      startTime: '12:00',
      endTime: '15:00',
      dishes: [
        { name: 'Paneer Do Pyaza (Rich Onion capsicum gravy)', category: 'Main', isVegetarian: true, isSpecial: true },
        { name: 'Chana Dal Fry with Jeera Tadka', category: 'Main', isVegetarian: true },
        { name: 'Veg Dum Pulao with Fried Cashews', category: 'Rice', isVegetarian: true },
        { name: 'Soft Roomali Roti & Phulka', category: 'Breads', isVegetarian: true },
        { name: 'Pineapple / Mix Veg Raita', category: 'Sides', isVegetarian: true },
        { name: 'Green Salad', category: 'Salad', isVegetarian: true },
      ],
    },
    {
      slotId: 'snacks',
      name: 'Evening Tea & Snacks',
      startTime: '16:00',
      endTime: '18:00',
      dishes: [
        { name: 'Grilled Veg Coleslaw Sandwich', category: 'Main', isVegetarian: true },
        { name: 'Hot Filter Coffee / Tea', category: 'Beverage', isVegetarian: true },
      ],
    },
    {
      slotId: 'dinner',
      name: 'Dinner',
      startTime: '19:00',
      endTime: '22:00',
      dishes: [
        { name: 'Chitkara Special Dal Makhani', category: 'Main', isVegetarian: true },
        { name: 'Malai Kofta in Creamy Cashew Korma Gravy', category: 'Main', isVegetarian: true, isSpecial: true },
        { name: 'Tandoori Butter Naan & Chapati', category: 'Breads', isVegetarian: true },
        { name: 'Steamed Basmati Rice', category: 'Rice', isVegetarian: true },
        { name: 'Bengali Spongy Rasgulla (2 pcs)', category: 'Dessert', isVegetarian: true },
      ],
    },
  ],
};

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

/**
 * Generates a full WeekMenu object for any given target Monday date
 */
export function buildWeekMenuForDate(mondayDateStr: string): WeekMenu {
  const boundaries = getWeekBoundaries(mondayDateStr);
  const weekId = `week-${boundaries.monday}`;

  const days: Record<string, MealOccurrence[]> = {};

  const start = new Date(boundaries.monday + 'T12:00:00Z');

  DAY_NAMES.forEach((dayName, idx) => {
    const currentDate = new Date(start);
    currentDate.setUTCDate(start.getUTCDate() + idx);
    const dateStr = currentDate.toISOString().split('T')[0];

    const templateMeals = CHITKARA_WEEK_TEMPLATE[dayName] || [];

    days[dateStr] = templateMeals.map((tm) => {
      const mealId = `${dateStr}-${tm.slotId}`;
      return {
        id: mealId,
        date: dateStr,
        dayOfWeek: dayName,
        slotId: tm.slotId,
        name: tm.name,
        startTime: tm.startTime,
        endTime: tm.endTime,
        dishes: tm.dishes.map((d, dIdx) => ({
          id: `${mealId}-d${dIdx + 1}`,
          name: d.name,
          category: d.category || 'Main',
          isVegetarian: d.isVegetarian,
          isSpecial: d.isSpecial,
          needsReview: d.needsReview,
          reviewNote: d.reviewNote,
        })),
        ratingSummary: {
          average: 0,
          count: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
        updatedAt: new Date().toISOString(),
      };
    });
  });

  return {
    id: weekId,
    startDate: boundaries.monday,
    endDate: boundaries.sunday,
    label: boundaries.label,
    isPublished: true,
    publishedAt: new Date().toISOString(),
    publishedBy: 'admin@chitkara.edu.in',
    version: 1,
    days,
  };
}
