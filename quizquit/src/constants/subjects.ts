import { Subject } from '../types';

export const INITIAL_SUBJECTS: Omit<Subject, 'id'>[] = [
  { name: 'GK', description: 'A wide range of facts from around the world.', icon: 'Globe', difficulty: 'Beginner' },
  { name: 'Science', description: 'Explore the laws of nature, from atoms to galaxies.', icon: 'FlaskConical', difficulty: 'Intermediate' },
  { name: 'Maths', description: 'Numbers, equations, and logic puzzles.', icon: 'Calculator', difficulty: 'Intermediate' },
  { name: 'Geography', description: 'Maps, climates, and the physical features of Earth.', icon: 'Map', difficulty: 'Beginner' },
  { name: 'Technologies', description: 'The latest in gadgets, software, and digital innovation.', icon: 'Cpu', difficulty: 'Intermediate' },
  { name: 'Sports', description: 'Test your knowledge of athletes, teams, and sporting history.', icon: 'Trophy', difficulty: 'Beginner' },
  { name: 'Arts', description: 'Explore the world of creativity, from painting to sculpture.', icon: 'Palette', difficulty: 'Beginner' },
  { name: 'History', description: 'Events, civilizations, and the story of humanity.', icon: 'History', difficulty: 'Beginner' },
  { name: 'Literature', description: 'Classic works, famous authors, and literary movements.', icon: 'Book', difficulty: 'Beginner' },
  { name: 'Music', description: 'Theory, history, and famous compositions from all genres.', icon: 'Music', difficulty: 'Beginner' },
];
