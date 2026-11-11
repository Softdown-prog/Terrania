import { WELL_REWARD_COINS, WELL_SAMPLE_MATERIAL } from "../../engine/quests/south/well/state.ts";
import type { WellEvent } from "../../engine/quests/south/well/types.ts";
import { describeCoins } from "../../engine/character/coins/index.ts";

/**
 * Falas da missão "A Água Escura" (ADR 0031), acrescentadas ao fim do diálogo do NPC.
 * Só dados: a regra de quando cada uma aparece está em `WellInvestigation`.
 */
export const WELL_LINES: Record<WellEvent, readonly string[]> = {
  "heard:south-gorrak": [
    "Nova missão: A Água Escura.",
    "Gorrak: Na noite sem lua os baldes subiram negros. Meus batedores juram que há rastros de lama do brejo até a borda do poço.",
    "Gorrak: Quem envenena o meu poço envenena o meu povo. Ouça também Khemet e Sylrael e depois examine a água (a placa do poço).",
  ],
  "heard:south-khemet": [
    "Nova missão: A Água Escura.",
    "Khemet: O Sol Negro fechou o olho sobre a água, e ela deixou de refletir as estrelas. Não é veneno, é presságio.",
    "Khemet: O Escaravelho Solar surgiu nas ruínas na mesma noite. Pergunte também a Gorrak e a Sylrael.",
  ],
  "heard:south-sylrael": [
    "Nova missão: A Água Escura.",
    "Sylrael: Eu bebia dessa água antes de me expulsarem do oásis. Sempre foi doce.",
    "Sylrael: Naquela noite ouvi algo se arrastar lá embaixo, onde a corrente sai do poço. Fale com Gorrak e com Khemet também.",
  ],
  "sign-needs-witnesses": [
    "Você olha a água escura, mas não sabe o que procurar.",
    "Ouça primeiro as três versões: Gorrak, Khemet e Sylrael.",
  ],
  "well-inspected": [
    "Você desce um frasco na corda. A água sobe espessa, sem reflexo, com cheiro de brejo.",
    `Há algo tóxico misturado nela. Ixtal, o Destilador, pode comparar com ${WELL_SAMPLE_MATERIAL} do brejo (a hidra do brejo a deixa cair).`,
  ],
  "analysis-needs-sample": [
    `Ixtal: Cheirei o seu frasco. Traga-me ${WELL_SAMPLE_MATERIAL}, a da hidra do brejo, e eu comparo as duas.`,
  ],
  "analyzed": [
    `Ixtal mistura a ${WELL_SAMPLE_MATERIAL} com a água do poço: as duas escurecem do mesmo jeito.`,
    "Ixtal: É a toxina do brejo. Mas toxina sozinha não apaga o reflexo das estrelas; alguém ou algo a despeja na corrente. Conte a Gorrak.",
  ],
  "reported": [
    "Gorrak: Então o brejo é só o começo, e há mão por trás disso. Vigiarei a água.",
    `Recompensa de Gorrak: ${describeCoins(WELL_REWARD_COINS)}. Missão concluída: A Água Escura.`,
  ],
  "report-wallet-full": [
    "Gorrak quer pagar a recompensa, mas a sua carteira não comporta tanto dinheiro. Volte depois de gastar um pouco.",
  ],
};
