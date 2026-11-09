import type { ImageSourcePropType } from 'react-native';

import berryCrown from '../assets/cake-shop/berry-crown.jpg';
import blueberryTart from '../assets/cake-shop/blueberry-tart.jpg';
import cherryCheesecake from '../assets/cake-shop/cherry-cheesecake.jpg';
import chocolateDonut from '../assets/cake-shop/chocolate-donut.jpg';
import chocolateLayer from '../assets/cake-shop/chocolate-layer.jpg';
import chocolateStrawberry from '../assets/cake-shop/chocolate-strawberry.jpg';
import confettiCake from '../assets/cake-shop/confetti-cake.jpg';
import creamPuffs from '../assets/cake-shop/cream-puffs.jpg';
import croissants from '../assets/cake-shop/croissants.jpg';
import eclairs from '../assets/cake-shop/eclairs.jpg';
import fruitTart from '../assets/cake-shop/fruit-tart.jpg';
import lemonTart from '../assets/cake-shop/lemon-tart.jpg';
import macaronBowl from '../assets/cake-shop/macaron-bowl.jpg';
import macaronTower from '../assets/cake-shop/macaron-tower.jpg';
import pastelMacarons from '../assets/cake-shop/pastel-macarons.jpg';
import pinkCupcake from '../assets/cake-shop/pink-cupcake.jpg';
import pinkDonut from '../assets/cake-shop/pink-donut.jpg';
import pinkMacarons from '../assets/cake-shop/pink-macarons.jpg';
import raspberryCupcake from '../assets/cake-shop/raspberry-cupcake.jpg';
import raspberryMacarons from '../assets/cake-shop/raspberry-macarons.jpg';
import raspberryTart from '../assets/cake-shop/raspberry-tart.jpg';
import roseWeddingCake from '../assets/cake-shop/rose-wedding-cake.jpg';
import sprinkleCake from '../assets/cake-shop/sprinkle-cake.jpg';
import strawberryCloud from '../assets/cake-shop/strawberry-cloud.jpg';
import strawberrySponge from '../assets/cake-shop/strawberry-sponge.jpg';
import strawberryTart from '../assets/cake-shop/strawberry-tart.jpg';
import whiteRoseCake from '../assets/cake-shop/white-rose-cake.jpg';
import { colors } from './theme';

export type Cake = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  image: ImageSourcePropType;
  tint: string;
  notes: string[];
};

export const SHOP_NAME = 'Sweet Mansion';

export const CAKES: Cake[] = [
  {
    id: 'strawberry-cloud',
    name: 'Strawberry Cloud',
    tagline: 'Fresh berries & cream',
    description:
      'Three layers of vanilla sponge with whipped mascarpone and strawberries picked this morning. Light as a cloud, sweet as June.',
    price: 42,
    image: strawberryCloud,
    tint: colors.red,
    notes: ['Vanilla', 'Mascarpone', 'Strawberry'],
  },
  {
    id: 'confetti-cake',
    name: 'Confetti Party',
    tagline: 'Sprinkles in every slice',
    description:
      'Buttermilk cake folded with rainbow sprinkles, finished with vanilla buttercream and candles for the big wish.',
    price: 38,
    image: confettiCake,
    tint: colors.yellowSoft,
    notes: ['Buttermilk', 'Buttercream', 'Sprinkles'],
  },
  {
    id: 'raspberry-tart',
    name: 'Raspberry Tart',
    tagline: 'Silky vanilla cream',
    description:
      'Butter shortcrust filled with vanilla crème pâtissière and crowned with raspberries and a cloud of cream.',
    price: 9,
    image: raspberryTart,
    tint: colors.pinkSoft,
    notes: ['Shortcrust', 'Crème pât', 'Raspberry'],
  },
  {
    id: 'blueberry-tart',
    name: 'Blueberry Tart',
    tagline: 'Wild berries, sugar dust',
    description:
      'Almond tart shell with lemon curd, piled high with wild blueberries and a snow of icing sugar.',
    price: 8,
    image: blueberryTart,
    tint: colors.blue,
    notes: ['Almond', 'Lemon curd', 'Blueberry'],
  },
  {
    id: 'lemon-tart',
    name: 'Lemon Meringue',
    tagline: 'Torched meringue',
    description:
      'Zesty lemon curd under a swirl of Italian meringue, torched to order so it stays crisp on top.',
    price: 7,
    image: lemonTart,
    tint: colors.yellow,
    notes: ['Lemon', 'Meringue', 'Shortbread'],
  },
  {
    id: 'cherry-cheesecake',
    name: 'Cherry Cheesecake',
    tagline: 'New York style',
    description:
      'Baked cream cheese filling on a graham crust, finished with sour cherries and dark chocolate drizzle.',
    price: 11,
    image: cherryCheesecake,
    tint: colors.purple,
    notes: ['Cream cheese', 'Cherry', 'Chocolate'],
  },
  {
    id: 'chocolate-layer',
    name: 'Midnight Layer',
    tagline: 'Dark chocolate mousse',
    description:
      'Four layers of dark chocolate sponge with chocolate mousse and a glossy cherry glaze.',
    price: 46,
    image: chocolateLayer,
    tint: colors.orange,
    notes: ['70% cocoa', 'Mousse', 'Cherry'],
  },
  {
    id: 'berry-crown',
    name: 'Berry Crown',
    tagline: 'A ring of summer fruit',
    description:
      'Butter bundt cake with lemon glaze, crowned with raspberries, strawberries and blackberries.',
    price: 34,
    image: berryCrown,
    tint: colors.pinkSoft,
    notes: ['Bundt', 'Lemon', 'Berries'],
  },
];

export const CAKES_BY_ID = Object.fromEntries(
  CAKES.map((cake) => [cake.id, cake])
);

export type Category = {
  id: string;
  name: string;
  count: number;
  image: ImageSourcePropType;
  tint: string;
  items: { name: string; price: number; image: ImageSourcePropType }[];
};

export const CATEGORIES: Category[] = [
  {
    id: 'macarons',
    name: 'Macarons',
    count: 14,
    image: pinkMacarons,
    tint: colors.pinkSoft,
    items: [
      { name: 'Pastel Box', price: 18, image: pastelMacarons },
      { name: 'Raspberry Rose', price: 3, image: raspberryMacarons },
      { name: 'Tower of Six', price: 15, image: macaronTower },
      { name: 'Chef’s Selection', price: 24, image: macaronBowl },
    ],
  },
  {
    id: 'tarts',
    name: 'Tarts',
    count: 9,
    image: strawberryTart,
    tint: colors.red,
    items: [
      { name: 'Strawberry Tart', price: 8, image: strawberryTart },
      { name: 'Raspberry Tart', price: 9, image: raspberryTart },
      { name: 'Fruit Garden', price: 10, image: fruitTart },
      { name: 'Lemon Meringue', price: 7, image: lemonTart },
    ],
  },
  {
    id: 'cupcakes',
    name: 'Cupcakes',
    count: 11,
    image: raspberryCupcake,
    tint: colors.purple,
    items: [
      { name: 'Raspberry Swirl', price: 5, image: raspberryCupcake },
      { name: 'Pink Velvet', price: 5, image: pinkCupcake },
      { name: 'Cream Puffs', price: 6, image: creamPuffs },
      { name: 'Éclair Trio', price: 9, image: eclairs },
    ],
  },
  {
    id: 'cakes',
    name: 'Cakes',
    count: 18,
    image: whiteRoseCake,
    tint: colors.yellowSoft,
    items: [
      { name: 'White Rose', price: 52, image: whiteRoseCake },
      { name: 'Rose Wedding', price: 180, image: roseWeddingCake },
      { name: 'Sprinkle Tower', price: 44, image: sprinkleCake },
      { name: 'Chocolate Berry', price: 39, image: chocolateStrawberry },
    ],
  },
  {
    id: 'donuts',
    name: 'Donuts',
    count: 7,
    image: pinkDonut,
    tint: colors.peri,
    items: [
      { name: 'Pink Glaze', price: 3, image: pinkDonut },
      { name: 'Choc Sprinkle', price: 3, image: chocolateDonut },
    ],
  },
  {
    id: 'pastries',
    name: 'Pastries',
    count: 12,
    image: croissants,
    tint: colors.orange,
    items: [
      { name: 'Butter Croissant', price: 3, image: croissants },
      { name: 'Strawberry Sponge', price: 6, image: strawberrySponge },
    ],
  },
];

export function formatPrice(price: number) {
  return `$${price.toFixed(2)}`;
}
