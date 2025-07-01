import type { Song } from './types';
import { shuffle } from './utilities';

const DAFT_PUNK = 'Daft Punk';

const ALBUM_COVERS = {
  DISCOVERY: 'https://upload.wikimedia.org/wikipedia/en/0/0d/Humanafterall.jpg',
  HUMAN_AFTER_ALL:
    'https://upload.wikimedia.org/wikipedia/en/0/0d/Humanafterall.jpg',
  HOMEWORK:
    'https://upload.wikimedia.org/wikipedia/en/9/9c/Daftpunk-homework.jpg',
  RANDOM_ACCESS_MEMORIES:
    'https://upload.wikimedia.org/wikipedia/en/a/a7/Random_Access_Memories.jpg',
};

export const SONGS: Song[] = shuffle([
  {
    id: 'one-more-time',
    title: 'One More Time',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.DISCOVERY,
  },
  {
    id: 'digital-love',
    title: 'Digital Love',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.DISCOVERY,
  },
  {
    id: 'nightvision',
    title: 'Nightvision',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.DISCOVERY,
  },
  {
    id: 'something-about-us',
    title: 'Something About Us',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.DISCOVERY,
  },
  {
    id: 'veridis-quo',
    title: 'Veridis Quo',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.DISCOVERY,
  },
  {
    id: 'make-love',
    title: 'Make Love',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.HUMAN_AFTER_ALL,
  },
  {
    id: 'television-rules-the-nation',
    title: 'Television Rules the Nation',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.HUMAN_AFTER_ALL,
  },
  {
    id: 'phoenix',
    title: 'Phoenix',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.HOMEWORK,
  },
  {
    id: 'revolution-909',
    title: 'Revolution 909',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.HOMEWORK,
  },
  {
    id: 'around-the-world',
    title: 'Around the World',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.HOMEWORK,
  },
  {
    id: 'within',
    title: 'Within',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.RANDOM_ACCESS_MEMORIES,
  },
  {
    id: 'touch',
    title: 'Touch (feat. Paul Williams)',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.RANDOM_ACCESS_MEMORIES,
  },
  {
    id: 'beyond',
    title: 'Beyond',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.RANDOM_ACCESS_MEMORIES,
  },
  {
    id: 'motherboard',
    title: 'Motherboard',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.RANDOM_ACCESS_MEMORIES,
  },
  {
    id: 'one-more-time-2',
    title: 'One More Time',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.DISCOVERY,
  },
  {
    id: 'digital-love-2',
    title: 'Digital Love',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.DISCOVERY,
  },
  {
    id: 'nightvision-2',
    title: 'Nightvision',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.DISCOVERY,
  },
  {
    id: 'something-about-us-2',
    title: 'Something About Us',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.DISCOVERY,
  },
  {
    id: 'veridis-quo-2',
    title: 'Veridis Quo',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.DISCOVERY,
  },
  {
    id: 'make-love-2',
    title: 'Make Love',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.HUMAN_AFTER_ALL,
  },
  {
    id: 'television-rules-the-nation-2',
    title: 'Television Rules the Nation',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.HUMAN_AFTER_ALL,
  },
  {
    id: 'phoenix-2',
    title: 'Phoenix',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.HOMEWORK,
  },
  {
    id: 'revolution-909-2',
    title: 'Revolution 909',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.HOMEWORK,
  },
  {
    id: 'around-the-world-2',
    title: 'Around the World',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.HOMEWORK,
  },
  {
    id: 'within-2',
    title: 'Within',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.RANDOM_ACCESS_MEMORIES,
  },
  {
    id: 'touch-2',
    title: 'Touch (feat. Paul Williams)',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.RANDOM_ACCESS_MEMORIES,
  },
  {
    id: 'beyond-2',
    title: 'Beyond',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.RANDOM_ACCESS_MEMORIES,
  },
  {
    id: 'motherboard-2',
    title: 'Motherboard',
    artist: DAFT_PUNK,
    cover: ALBUM_COVERS.RANDOM_ACCESS_MEMORIES,
  },
]);
