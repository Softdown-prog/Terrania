import { MAP_VERSION } from "../../../src/world/mapSize.ts";

/**
 * O ponto de partida dos testes de navegador: um jogador que **já voltou**, com um save igual ao de um jogo recém-começado (Cavaleiro,
 * na Vila, de vida cheia). Assim a tela de escolha do herói (ADR 0066), que é só para jogador novo, não cobre os testes que abrem o jogo
 * sem montar o próprio save. Quem testa o jogador novo troca por um armazenamento vazio (`test.use({ storageState: NEW_PLAYER_STATE })`).
 */
export const BASE_URL = "http://127.0.0.1:5173";
export const NEW_PLAYER_STATE = { cookies: [], origins: [] };
export const RETURNING_PLAYER_STATE = {
  cookies: [],
  origins: [{
    origin: BASE_URL,
    localStorage: [{
      name: "terrania-origins-v1",
      value: JSON.stringify({ mapVersion: MAP_VERSION, seed: 842136, x: 16, y: 16, hp: 100, kills: 0, defeated: [] }),
    }],
  }],
};
