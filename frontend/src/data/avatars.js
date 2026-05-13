const DB = 'https://api.dicebear.com/7.x'

export const AVATAR_CATEGORIES = [
  {
    id: 'professionals',
    label: 'Professionals',
    icon: '💼',
    avatars: [
      { id: 'doctor',     label: 'Doctor',     url: `${DB}/lorelei/svg?seed=doctor&backgroundColor=transparent` },
      { id: 'lawyer',     label: 'Lawyer',     url: `${DB}/lorelei/svg?seed=lawyer&backgroundColor=transparent` },
      { id: 'engineer',   label: 'Engineer',   url: `${DB}/lorelei/svg?seed=engineer&backgroundColor=transparent` },
      { id: 'teacher',    label: 'Teacher',    url: `${DB}/lorelei/svg?seed=teacher&backgroundColor=transparent` },
      { id: 'chef',       label: 'Chef',       url: `${DB}/lorelei/svg?seed=chef&backgroundColor=transparent` },
      { id: 'pilot',      label: 'Pilot',      url: `${DB}/lorelei/svg?seed=pilot&backgroundColor=transparent` },
      { id: 'architect',  label: 'Architect',  url: `${DB}/lorelei/svg?seed=architect&backgroundColor=transparent` },
      { id: 'nurse',      label: 'Nurse',      url: `${DB}/lorelei/svg?seed=nurse&backgroundColor=transparent` },
      { id: 'scientist',  label: 'Scientist',  url: `${DB}/lorelei/svg?seed=scientist&backgroundColor=transparent` },
      { id: 'astronaut',  label: 'Astronaut',  url: `${DB}/lorelei/svg?seed=astronaut&backgroundColor=transparent` },
    ],
  },
  {
    id: 'animals',
    label: 'Animals',
    icon: '🦁',
    avatars: [
      { id: 'lion',      label: 'Lion',      url: `${DB}/bottts-neutral/svg?seed=lion&backgroundColor=transparent` },
      { id: 'tiger',     label: 'Tiger',     url: `${DB}/bottts-neutral/svg?seed=tiger&backgroundColor=transparent` },
      { id: 'bear',      label: 'Bear',      url: `${DB}/bottts-neutral/svg?seed=bear&backgroundColor=transparent` },
      { id: 'fox',       label: 'Fox',       url: `${DB}/bottts-neutral/svg?seed=fox&backgroundColor=transparent` },
      { id: 'wolf',      label: 'Wolf',      url: `${DB}/bottts-neutral/svg?seed=wolf&backgroundColor=transparent` },
      { id: 'eagle',     label: 'Eagle',     url: `${DB}/bottts-neutral/svg?seed=eagle&backgroundColor=transparent` },
      { id: 'dolphin',   label: 'Dolphin',   url: `${DB}/bottts-neutral/svg?seed=dolphin&backgroundColor=transparent` },
      { id: 'elephant',  label: 'Elephant',  url: `${DB}/bottts-neutral/svg?seed=elephant&backgroundColor=transparent` },
      { id: 'owl',       label: 'Owl',       url: `${DB}/bottts-neutral/svg?seed=owl&backgroundColor=transparent` },
      { id: 'panda',     label: 'Panda',     url: `${DB}/bottts-neutral/svg?seed=panda&backgroundColor=transparent` },
    ],
  },
  {
    id: 'fantasy',
    label: 'Fantasy',
    icon: '🧙',
    avatars: [
      { id: 'wizard',     label: 'Wizard',     url: `${DB}/fun-emoji/svg?seed=wizard&backgroundColor=transparent` },
      { id: 'knight',     label: 'Knight',     url: `${DB}/fun-emoji/svg?seed=knight&backgroundColor=transparent` },
      { id: 'ninja',      label: 'Ninja',      url: `${DB}/fun-emoji/svg?seed=ninja&backgroundColor=transparent` },
      { id: 'pirate',     label: 'Pirate',     url: `${DB}/fun-emoji/svg?seed=pirate&backgroundColor=transparent` },
      { id: 'superhero',  label: 'Superhero',  url: `${DB}/fun-emoji/svg?seed=superhero&backgroundColor=transparent` },
      { id: 'robot',      label: 'Robot',      url: `${DB}/fun-emoji/svg?seed=robot&backgroundColor=transparent` },
      { id: 'alien',      label: 'Alien',      url: `${DB}/fun-emoji/svg?seed=alien&backgroundColor=transparent` },
      { id: 'vampire',    label: 'Vampire',    url: `${DB}/fun-emoji/svg?seed=vampire&backgroundColor=transparent` },
      { id: 'dragon',     label: 'Dragon',     url: `${DB}/fun-emoji/svg?seed=dragon&backgroundColor=transparent` },
      { id: 'fairy',      label: 'Fairy',      url: `${DB}/fun-emoji/svg?seed=fairy&backgroundColor=transparent` },
    ],
  },
  {
    id: 'sports',
    label: 'Sports',
    icon: '⚽',
    avatars: [
      { id: 'footballer',   label: 'Football',    url: `${DB}/adventurer/svg?seed=footballer&backgroundColor=transparent` },
      { id: 'basketball',   label: 'Basketball',  url: `${DB}/adventurer/svg?seed=basketball&backgroundColor=transparent` },
      { id: 'swimmer',      label: 'Swimmer',     url: `${DB}/adventurer/svg?seed=swimmer&backgroundColor=transparent` },
      { id: 'runner',       label: 'Runner',      url: `${DB}/adventurer/svg?seed=runner&backgroundColor=transparent` },
      { id: 'cyclist',      label: 'Cyclist',     url: `${DB}/adventurer/svg?seed=cyclist&backgroundColor=transparent` },
      { id: 'tennis',       label: 'Tennis',      url: `${DB}/adventurer/svg?seed=tennis&backgroundColor=transparent` },
      { id: 'boxer',        label: 'Boxer',       url: `${DB}/adventurer/svg?seed=boxer&backgroundColor=transparent` },
      { id: 'surfer',       label: 'Surfer',      url: `${DB}/adventurer/svg?seed=surfer&backgroundColor=transparent` },
      { id: 'climber',      label: 'Climber',     url: `${DB}/adventurer/svg?seed=climber&backgroundColor=transparent` },
      { id: 'skier',        label: 'Skier',       url: `${DB}/adventurer/svg?seed=skier&backgroundColor=transparent` },
    ],
  },
  {
    id: 'nature',
    label: 'Nature',
    icon: '🌿',
    avatars: [
      { id: 'sun',        label: 'Sun',        url: `${DB}/thumbs/svg?seed=sun&backgroundColor=transparent` },
      { id: 'moon',       label: 'Moon',       url: `${DB}/thumbs/svg?seed=moon&backgroundColor=transparent` },
      { id: 'star',       label: 'Star',       url: `${DB}/thumbs/svg?seed=star&backgroundColor=transparent` },
      { id: 'tree',       label: 'Tree',       url: `${DB}/thumbs/svg?seed=tree&backgroundColor=transparent` },
      { id: 'flower',     label: 'Flower',     url: `${DB}/thumbs/svg?seed=flower&backgroundColor=transparent` },
      { id: 'mountain',   label: 'Mountain',   url: `${DB}/thumbs/svg?seed=mountain&backgroundColor=transparent` },
      { id: 'ocean',      label: 'Ocean',      url: `${DB}/thumbs/svg?seed=ocean&backgroundColor=transparent` },
      { id: 'fire',       label: 'Fire',       url: `${DB}/thumbs/svg?seed=fire&backgroundColor=transparent` },
      { id: 'lightning',  label: 'Lightning',  url: `${DB}/thumbs/svg?seed=lightning&backgroundColor=transparent` },
      { id: 'rainbow',    label: 'Rainbow',    url: `${DB}/thumbs/svg?seed=rainbow&backgroundColor=transparent` },
    ],
  },
  {
    id: 'tech',
    label: 'Tech',
    icon: '💻',
    avatars: [
      { id: 'tech1',  label: 'Matrix',   url: `${DB}/identicon/svg?seed=matrix&backgroundColor=transparent` },
      { id: 'tech2',  label: 'Circuit',  url: `${DB}/identicon/svg?seed=circuit&backgroundColor=transparent` },
      { id: 'tech3',  label: 'Pixel',    url: `${DB}/identicon/svg?seed=pixel&backgroundColor=transparent` },
      { id: 'tech4',  label: 'Code',     url: `${DB}/identicon/svg?seed=code&backgroundColor=transparent` },
      { id: 'tech5',  label: 'Binary',   url: `${DB}/identicon/svg?seed=binary&backgroundColor=transparent` },
      { id: 'tech6',  label: 'Data',     url: `${DB}/identicon/svg?seed=data&backgroundColor=transparent` },
      { id: 'tech7',  label: 'Crypto',   url: `${DB}/identicon/svg?seed=crypto&backgroundColor=transparent` },
      { id: 'tech8',  label: 'Cloud',    url: `${DB}/identicon/svg?seed=cloud&backgroundColor=transparent` },
      { id: 'tech9',  label: 'AI',       url: `${DB}/identicon/svg?seed=artificial&backgroundColor=transparent` },
      { id: 'tech10', label: 'Cyber',    url: `${DB}/identicon/svg?seed=cyber&backgroundColor=transparent` },
    ],
  },
  {
    id: 'faces',
    label: 'Faces',
    icon: '😊',
    avatars: [
      { id: 'face1',  label: 'Alex',    url: `${DB}/micah/svg?seed=Alex&backgroundColor=transparent` },
      { id: 'face2',  label: 'Sam',     url: `${DB}/micah/svg?seed=Sam&backgroundColor=transparent` },
      { id: 'face3',  label: 'Jordan',  url: `${DB}/micah/svg?seed=Jordan&backgroundColor=transparent` },
      { id: 'face4',  label: 'Casey',   url: `${DB}/micah/svg?seed=Casey&backgroundColor=transparent` },
      { id: 'face5',  label: 'Morgan',  url: `${DB}/micah/svg?seed=Morgan&backgroundColor=transparent` },
      { id: 'face6',  label: 'Taylor',  url: `${DB}/micah/svg?seed=Taylor&backgroundColor=transparent` },
      { id: 'face7',  label: 'Riley',   url: `${DB}/micah/svg?seed=Riley&backgroundColor=transparent` },
      { id: 'face8',  label: 'Quinn',   url: `${DB}/micah/svg?seed=Quinn&backgroundColor=transparent` },
      { id: 'face9',  label: 'Drew',    url: `${DB}/micah/svg?seed=Drew&backgroundColor=transparent` },
      { id: 'face10', label: 'Jamie',   url: `${DB}/micah/svg?seed=Jamie&backgroundColor=transparent` },
    ],
  },
  {
    id: 'abstract',
    label: 'Abstract',
    icon: '🎨',
    avatars: [
      { id: 'abs1',  label: 'Shape 1',   url: `${DB}/shapes/svg?seed=alpha&backgroundColor=transparent` },
      { id: 'abs2',  label: 'Shape 2',   url: `${DB}/shapes/svg?seed=beta&backgroundColor=transparent` },
      { id: 'abs3',  label: 'Shape 3',   url: `${DB}/shapes/svg?seed=gamma&backgroundColor=transparent` },
      { id: 'abs4',  label: 'Shape 4',   url: `${DB}/shapes/svg?seed=delta&backgroundColor=transparent` },
      { id: 'abs5',  label: 'Shape 5',   url: `${DB}/shapes/svg?seed=epsilon&backgroundColor=transparent` },
      { id: 'abs6',  label: 'Shape 6',   url: `${DB}/shapes/svg?seed=zeta&backgroundColor=transparent` },
      { id: 'abs7',  label: 'Shape 7',   url: `${DB}/shapes/svg?seed=eta&backgroundColor=transparent` },
      { id: 'abs8',  label: 'Shape 8',   url: `${DB}/shapes/svg?seed=theta&backgroundColor=transparent` },
      { id: 'abs9',  label: 'Shape 9',   url: `${DB}/shapes/svg?seed=iota&backgroundColor=transparent` },
      { id: 'abs10', label: 'Shape 10',  url: `${DB}/shapes/svg?seed=kappa&backgroundColor=transparent` },
    ],
  },
  {
    id: 'pixel',
    label: 'Pixel Art',
    icon: '🕹️',
    avatars: [
      { id: 'pix1',  label: 'Hero',      url: `${DB}/pixel-art/svg?seed=hero&backgroundColor=transparent` },
      { id: 'pix2',  label: 'Warrior',   url: `${DB}/pixel-art/svg?seed=warrior&backgroundColor=transparent` },
      { id: 'pix3',  label: 'Mage',      url: `${DB}/pixel-art/svg?seed=mage&backgroundColor=transparent` },
      { id: 'pix4',  label: 'Rogue',     url: `${DB}/pixel-art/svg?seed=rogue&backgroundColor=transparent` },
      { id: 'pix5',  label: 'Paladin',   url: `${DB}/pixel-art/svg?seed=paladin&backgroundColor=transparent` },
      { id: 'pix6',  label: 'Ranger',    url: `${DB}/pixel-art/svg?seed=ranger&backgroundColor=transparent` },
      { id: 'pix7',  label: 'Bard',      url: `${DB}/pixel-art/svg?seed=bard&backgroundColor=transparent` },
      { id: 'pix8',  label: 'Druid',     url: `${DB}/pixel-art/svg?seed=druid&backgroundColor=transparent` },
      { id: 'pix9',  label: 'Monk',      url: `${DB}/pixel-art/svg?seed=monk&backgroundColor=transparent` },
      { id: 'pix10', label: 'Shaman',    url: `${DB}/pixel-art/svg?seed=shaman&backgroundColor=transparent` },
    ],
  },
  {
    id: 'classic',
    label: 'Classic',
    icon: '👤',
    avatars: [
      { id: 'cls1',  label: 'Classic 1',   url: `${DB}/personas/svg?seed=spendly1&backgroundColor=transparent` },
      { id: 'cls2',  label: 'Classic 2',   url: `${DB}/personas/svg?seed=spendly2&backgroundColor=transparent` },
      { id: 'cls3',  label: 'Classic 3',   url: `${DB}/personas/svg?seed=spendly3&backgroundColor=transparent` },
      { id: 'cls4',  label: 'Classic 4',   url: `${DB}/personas/svg?seed=spendly4&backgroundColor=transparent` },
      { id: 'cls5',  label: 'Classic 5',   url: `${DB}/personas/svg?seed=spendly5&backgroundColor=transparent` },
      { id: 'cls6',  label: 'Classic 6',   url: `${DB}/personas/svg?seed=spendly6&backgroundColor=transparent` },
      { id: 'cls7',  label: 'Classic 7',   url: `${DB}/personas/svg?seed=spendly7&backgroundColor=transparent` },
      { id: 'cls8',  label: 'Classic 8',   url: `${DB}/personas/svg?seed=spendly8&backgroundColor=transparent` },
      { id: 'cls9',  label: 'Classic 9',   url: `${DB}/personas/svg?seed=spendly9&backgroundColor=transparent` },
      { id: 'cls10', label: 'Classic 10',  url: `${DB}/personas/svg?seed=spendly10&backgroundColor=transparent` },
    ],
  },
]

export const WALLET_COLORS = [
  { id: 'blue',   label: 'Ocean Blue',    hex: '#3B82F6', gradient: 'from-blue-500 to-blue-700' },
  { id: 'purple', label: 'Royal Purple',  hex: '#8B5CF6', gradient: 'from-purple-500 to-purple-700' },
  { id: 'green',  label: 'Forest Green',  hex: '#10B981', gradient: 'from-emerald-500 to-emerald-700' },
  { id: 'red',    label: 'Ruby Red',      hex: '#EF4444', gradient: 'from-red-500 to-red-700' },
  { id: 'orange', label: 'Sunset Orange', hex: '#F97316', gradient: 'from-orange-500 to-orange-700' },
  { id: 'pink',   label: 'Rose Pink',     hex: '#EC4899', gradient: 'from-pink-500 to-pink-700' },
  { id: 'yellow', label: 'Golden',        hex: '#F59E0B', gradient: 'from-amber-500 to-amber-600' },
  { id: 'teal',   label: 'Teal',          hex: '#14B8A6', gradient: 'from-teal-500 to-teal-700' },
  { id: 'indigo', label: 'Deep Indigo',   hex: '#6366F1', gradient: 'from-indigo-500 to-indigo-700' },
  { id: 'gray',   label: 'Slate',         hex: '#6B7280', gradient: 'from-gray-500 to-gray-700' },
]

// Helper: get avatar URL for a wallet
export function getAvatarUrl(wallet) {
  if (!wallet) return `${DB}/personas/svg?seed=default&backgroundColor=transparent`
  if (wallet.avatar_photo) return wallet.avatar_photo
  if (wallet.avatar_type === 'dicebear' || !wallet.avatar_type) {
    return `${DB}/personas/svg?seed=${wallet.avatar_value || 'default'}&backgroundColor=transparent`
  }
  return `${DB}/personas/svg?seed=${wallet.id}&backgroundColor=transparent`
}

// Helper: get color hex for a wallet
export function getWalletColor(colorId) {
  return WALLET_COLORS.find(c => c.id === colorId) || WALLET_COLORS[0]
}

// Find avatar URL by id across all categories
export function findAvatarById(avatarId) {
  for (const cat of AVATAR_CATEGORIES) {
    const found = cat.avatars.find(a => a.id === avatarId)
    if (found) return found.url
  }
  return `${DB}/personas/svg?seed=${avatarId}&backgroundColor=transparent`
}
