import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { NPCS, NPC_CHARACTERS, NPC_LOOKS, NPC_TALK_RANGE, npcDialogue, nearestNpc } from "../src/npcs/catalog.ts";
import { NPCS as legacyNPCS } from "../src/world/npcs.ts";
import { CENTER_NPCS, CENTER_NPC_LOOKS } from "../src/npcs/center/index.ts";
import { SOUTH_NPCS, SOUTH_NPC_LOOKS } from "../src/npcs/south/index.ts";
import { SOUTH_SIGNS, SOUTH_BUILDINGS } from "../src/world/southCity.ts";
import { BUILDINGS, SIGNS } from "../src/world/village.ts";

test("NPCs: cinco personagens únicos na vila central, sem NPCs inventados nas outras regiões",()=>{
  assert.equal(NPC_TALK_RANGE,82);
  assert.deepEqual(NPC_CHARACTERS.map(n=>n.id),["aela","mira","toren","lina","stablemaster"]);
  assert.deepEqual(NPC_CHARACTERS.map(n=>[n.x,n.y]),[[80,-16],[304,16],[538,32],[448,250],[384,112]]);
  assert.equal(new Set(NPC_CHARACTERS.map(n=>n.id)).size,5);
  assert.strictEqual(NPC_CHARACTERS,CENTER_NPCS);
  for(const id of ["aela","mira","toren","lina"])
    assert.strictEqual(NPC_LOOKS[id],CENTER_NPC_LOOKS[id]);
  assert.deepEqual(Object.keys(NPC_LOOKS).slice(0,4),["aela","mira","toren","lina"]);
  assert.equal(Object.keys(SOUTH_NPC_LOOKS).length,12);
  assert.equal(SOUTH_NPCS.length,12);
  for(const region of ["north","east","west"])
    assert.deepEqual(readdirSync("src/npcs/"+region),["README.md"]);
  assert.deepEqual(readdirSync("src/npcs/south").sort(),["README.md","index.ts"]);
});
test("NPCs: cada personagem tem ficha única e objetos de vila mantêm ordem",()=>{
  const files=readdirSync("src/npcs/center").filter(f=>f.endsWith(".ts")&&f!=="index.ts").sort();
  assert.deepEqual(files,["aela.ts","eron.ts","lina.ts","mira.ts","toren.ts"]);
  assert.strictEqual(NPCS,legacyNPCS);
  assert.equal(NPCS.length,5+SIGNS.length+BUILDINGS.length+
    SOUTH_NPCS.length+SOUTH_SIGNS.length+SOUTH_BUILDINGS.filter(b=>b.interior).length);
  assert.deepEqual(NPCS.slice(0,5),NPC_CHARACTERS);
  assert.equal(NPCS[5]?.kind,"sign");
  assert.equal(NPCS[NPCS.length-1]?.kind,"door");
  assert.equal(nearestNpc(16,16)?.id,"aela");
  assert.equal(nearestNpc(Number.NaN,0),null);
  assert.equal(nearestNpc(Infinity,0),null);
  assert.equal(nearestNpc(80+NPC_TALK_RANGE+.01,-16),null);
});
test("NPCs: falas originais independentes de reexportações e aliases",()=>{
  const npc=(id:string)=>NPCS.find(n=>n.id===id)!;
  const scenarios:ReadonlyArray<readonly [string,number,boolean,readonly string[]]>=[
    ["aela",0,false,[
      "Saudações, viajante! Sou Aela, a guardiã desta clareira.",
      "A gruta a leste abriga slimes. Preciso que derrote cinco deles lá dentro para aprender o combate.",
      "Siga as avenidas até o portão leste e entre na primeira caverna. Treine, saia e volte para receber sua recompensa!",
    ]],
    ["aela",2,false,[
      "Vejo que já começou a proteger a clareira. Continue firme!",
      "Você derrotou 2 de 5 slimes. Continue enfrentando os slimes na gruta de treinamento fora da vila.",
      "Use a espada com Espaço ou J; no celular, toque no botão ATACAR.",
    ]],
    ["aela",5,false,[
      "Você conseguiu! Cinco slimes derrotados. A vila está mais segura agora.",
      "Além das árvores há trilhas antigas e ruínas. Esta terra guarda muitos segredos.",
      "Volte quando quiser conversar. Mira conhece as estradas para as outras regiões.",
    ]],
    ["mira",0,false,[
      "Sou Mira, cartógrafa da Vila da Travessia.",
      "Siga a avenida até o portão leste. A gruta-escola fica fora da área protegida.",
      "Aela ainda precisa de ajuda com os slimes.",
    ]],
    ["mira",5,false,[
      "Aela me contou sobre sua vitória!",
      "Há ruínas e cavernas além da floresta. Por enquanto, conheça a vila.",
    ]],
    ["toren",0,false,[
      "Sou Toren, ferreiro.",
      "Aproxime-se da porta e pressione E. Leve a espada à caverna da missão de Aela.",
      "Ainda não ofereço comércio.",
    ]],
    ["toren",5,false,[
      "Parabéns por proteger a clareira!",
      "Minha oficina está aberta para visitas. Equipamentos serão adicionados depois.",
    ]],
    ["toren",2,true,[
      "Sou Toren, ferreiro da Vila da Travessia.",
      "Trouxe moedas? Vendo uma espada forjada aqui na vila por 30 Terrania Gold.",
    ]],
    ["lina",0,false,[
      "Sou Lina, anfitriã da Travessia.",
      "Entre na hospedaria pela porta atrás de mim.",
      "A hospedaria é um ponto seguro; monstros não cruzam a vila.",
    ]],
    ["lina",5,false,[
      "Obrigado por ajudar Aela!",
      "Visite a hospedaria. Mais histórias e tarefas chegarão depois.",
    ]],
    ["stablemaster",0,false,[
      "Sou Eron, guardião das montarias da Travessia. Antes de montar, construa o cercado e treine sua Cavalaria.",
      "Slimes romperam a cerca e o cavalo da guarnição fugiu ferido ao Bosque Oeste. O carpinteiro reparou o cercado, mas precisamos de sua ajuda.",
      "Depois de reconstruir o cercado e treinar Cavalaria I, entregarei a Maçã Silvestre Doce. Siga os cascos, afaste os slimes e traga o Garrano de volta.",
      "Cada montaria tem nível, sela e região próprios. As criaturas selvagens precisam de missões especiais.",
    ]],
    ["entrance",0,false,[
      "Vila da Travessia — área protegida contra monstros.",
      "Da praça, siga para leste até a gruta de treinamento.",
    ]],
    ["square",0,false,[
      "Aela precisa de cinco slimes derrotados na primeira gruta a leste.",
      "Os caminhos ligam hospedaria, mercado, arquivo, curandeiros e armazém.",
    ]],
  ];
  for(const [id,kills,forge,expected] of scenarios)
    assert.deepEqual(npcDialogue(npc(id),kills,forge),expected,`Falas alteradas: ${id}, kills=${kills}, forge=${forge}`);
  assert.match(npcDialogue(npc("forge"),0).join(" "),/Use E perto da porta/i);
});

test("NPCs: aparência da vila mantém paletas, acessórios e proporções anteriores",()=>{
  assert.deepEqual(
    Object.entries(CENTER_NPC_LOOKS).map(([id,look])=>[id,look.robe,look.prop,look.hairStyle,look.width]),
    [
      ["aela","#456f4d","staff","long",1],
      ["mira","#4f7c8a","scroll","short",1],
      ["toren","#7a5a43","hammer","bald",1.14],
      ["lina","#9a6c66","lantern","bun",1],
    ],
  );
  assert.equal(NPC_LOOKS.toren?.apron,"#3d3029");
  assert.equal(NPC_LOOKS.lina?.apron,"#eadfc2");
});

test("NPCs: Docker do backend empacota src/npcs",()=>{
  assert.match(readFileSync("server/Dockerfile","utf8"),/COPY src\/npcs \/work\/src\/npcs/);
});
