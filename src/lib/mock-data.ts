import type { Project, User } from './definitions';

export const mockUser: User = {
  name: 'Alex Doe',
  email: 'alex.doe@example.com',
  avatarUrl: 'https://picsum.photos/seed/user/100/100',
};

export const mockProjects: Project[] = [
  {
    id: '1',
    title: 'The Crimson Cipher',
    description: 'A thrilling mystery set in Victorian London.',
    imageUrl: 'https://picsum.photos/seed/project1/600/800',
    imageHint: 'abstract painting',
    status: 'In Progress',
    lastUpdated: '2 days ago',
    chapters: [
      { id: 'c1', title: 'A Shadow in the Fog', content: 'The fog in London was thicker than pea soup, a perfect cover for nefarious deeds. Detective Sterling, a man whose reputation preceded him, felt a chill that had nothing to do with the weather. A new case had arrived, one that promised to unravel the very fabric of the city\'s high society.' },
      { id: 'c2', title: 'The Enigmatic Invitation', content: 'The invitation was delivered by a boy in rags, its wax seal bearing a symbol Sterling had never seen. It summoned him to a clandestine meeting at midnight, a meeting that could either solve the case or end his career—permanently.' },
      { id: 'c3', title: 'Whispers in the Dark', content: 'The abandoned warehouse creaked under the weight of secrets. Inside, shadows danced, and whispers spoke of a treasure, a betrayal, and a crimson cipher that held the key to it all.' },
    ],
  },
  {
    id: '2',
    title: 'Echoes of Nebula',
    description: 'A sci-fi epic spanning galaxies and generations.',
    imageUrl: 'https://picsum.photos/seed/project2/600/800',
    imageHint: 'misty forest',
    status: 'Draft',
    lastUpdated: '1 week ago',
    chapters: [
      { id: 'c1', title: 'The Last Starship', content: 'From the cryogenic slumber, Captain Eva Rostova awoke to the blaring alarms of the Ark. Their destination, Kepler-186f, was still centuries away, but something had gone terribly wrong.' },
      { idC: 'c2', title: 'A Signal from the Void', content: 'A faint, repeating signal, mathematically too perfect to be natural, was the source of the ship\'s emergency. It was a siren\'s call from a dead sector of space, a place no one was meant to explore.' },
    ],
  },
  {
id: '3',
    title: 'The Silent Garden',
    description: 'A heartwarming tale of a community coming together.',
    imageUrl: 'https://picsum.photos/seed/project4/600/800',
    imageHint: 'vintage library',
    status: 'Completed',
    lastUpdated: '1 month ago',
    chapters: [
      { id: 'c1', title: 'The Forgotten Plot', content: 'Old man Hemlock stared at the overgrown, forgotten plot of land behind his cottage. It was an eyesore, but in its tangled weeds, he saw a glimmer of potential—a garden for everyone.' },
    ],
  },
  {
    id: '4',
    title: 'Zero-Day',
    description: 'A high-stakes techno-thriller about a global cyber-attack.',
    imageUrl: 'https://picsum.photos/seed/project3/600/800',
    imageHint: 'futuristic city',
    status: 'In Progress',
    lastUpdated: '5 hours ago',
    chapters: [
      { id: 'c1', title: 'The Cascade', content: 'It started with a flicker. Stock markets blinked, power grids faltered, and communication satellites went silent. The world was oblivious, but for hacker codenamed "Nyx," it was the first sign of the digital apocalypse.' },
      { id: 'c2', title: 'The Ghost in the Machine', content: '' },
    ],
  },
];
