import { CAPITAL, CAPITAL_BUILDINGS, CAPITAL_TILE, capitalPoint, capitalPropsInView } from "../../../world/center/capital/index.ts";
import { hasSprite, releaseSprite } from "../../props/spriteCache.ts";
import { capitalBuildingSprite, capitalBuildingSpriteKey } from "./sceneryPainter.ts";

/** A que distância da muralha (em tiles) os sprites dos edifícios começam a ser preparados: bem antes de a cidade entrar na tela (meia tela de 1280 × 720 dá 20 × 11 tiles). */
export const CAPITAL_WARM_MARGIN = 28;

/**
 * Prepara os sprites dos edifícios da capital antes de aparecerem (ADR 0058): cada chamada pinta no máximo um, e só com a
 * câmera perto da cidade. Um edifício é um sprite grande; sem isto, dois que entram na tela juntos seriam pintados no mesmo
 * quadro. Devolve se pintou algum. Quem não passou por aqui (câmera que nasce dentro da cidade) é pintado na hora, como antes.
 */
export function warmCapitalSprites(cameraX: number, cameraY: number): boolean {
  if (!Number.isFinite(cameraX) || !Number.isFinite(cameraY)) return false;
  const center = capitalPoint(0, 0);
  if (Math.abs(cameraX - center.x) >= (CAPITAL.maxX + CAPITAL_WARM_MARGIN) * CAPITAL_TILE || Math.abs(cameraY - center.y) >= (CAPITAL.maxY + CAPITAL_WARM_MARGIN) * CAPITAL_TILE) return false;
  for (let i = 0; i < CAPITAL_BUILDINGS.length; i++) {
    if (hasSprite(capitalBuildingSpriteKey(i))) continue;
    capitalBuildingSprite(i);
    return true;
  }
  return false;
}

/**
 * Quanto a tela é aumentada, em px de mundo (em largura e em altura), para decidir que a câmera está longe da capital a ponto de
 * soltar os sprites: 2.000 px de folga para cada lado. A folga é a histerese: os sprites são preparados com a câmera a até 28 tiles
 * da muralha e só soltos quando nenhuma peça poderia aparecer nem numa tela 4.000 px maior; ir e voltar na beirada não repinta.
 */
export const CAPITAL_RELEASE_SLACK = 4000;

/**
 * Solta da memória os sprites dos edifícios da capital quando a câmera está longe dela (ADR 0061): cada um tem de 2,8 a 4,2 MB,
 * e os 21 somarão uns 70 MB, que pesam num celular de 4 GB. Só solta se nenhuma peça da capital poderia estar na tela, nem numa
 * tela `CAPITAL_RELEASE_SLACK` maior (a mesma regra que entrega as peças ao desenho, `capitalPropsInView`), então nunca solta
 * um sprite que está sendo desenhado. Devolve quantos soltou. Ao voltar, `warmCapitalSprites` repinta um por quadro.
 */
export function releaseCapitalSprites(cameraX: number, cameraY: number, width: number, height: number): number {
  if (![cameraX, cameraY, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return 0;
  if (capitalPropsInView(cameraX, cameraY, width + CAPITAL_RELEASE_SLACK, height + CAPITAL_RELEASE_SLACK).length > 0) return 0;
  let released = 0;
  for (let i = 0; i < CAPITAL_BUILDINGS.length; i++) if (releaseSprite(capitalBuildingSpriteKey(i))) released++;
  return released;
}
