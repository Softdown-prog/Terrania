import './style.css';
import { Game } from './game/Game.ts';
const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('Canvas principal não encontrado.');
new Game(canvas);
