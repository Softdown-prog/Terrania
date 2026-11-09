import type { MountId } from "../actors/MountCatalog.ts";

/** Os roteiros são dados do mundo, não estado de HUD ou rede. */
export type QuestEventKind = "inspect" | "defeat" | "craft" | "collect" |
  "protect" | "interact" | "escort" | "traverse" | "ritual";
export interface MountQuestStep {
  readonly id: string; readonly event: QuestEventKind; readonly target: string;
  readonly count: number; readonly hint: string;
}
export interface MountQuestDefinition {
  readonly id: MountId; readonly title: string; readonly region: string;
  readonly origin: string; readonly trigger: string; readonly minimumLevel: number;
  readonly introduction: string; readonly initialGift: string;
  readonly steps: readonly MountQuestStep[];
  /** Não marcar jogável antes de existirem locais reais, controladores e testes. */
  readonly playable: boolean;
}
const step=(id:string,event:QuestEventKind,target:string,count:number,hint:string):MountQuestStep=>
  ({id,event,target,count,hint});
export const MOUNT_QUESTS: Readonly<Record<MountId,MountQuestDefinition>> = {
  warhorse:{
    id:"warhorse",title:"O Garrano Fugitivo",region:"Vila Inicial · Bosque Oeste",
    origin:"Eron · estábulos",minimumLevel:15,trigger:"Consertar o cercado e treinar Cavalaria I.",
    playable:true,initialGift:"Maçã Silvestre Doce",
    introduction:"Slimes romperam as cercas durante a noite. O cavalo ferido da guarnição fugiu ao Bosque Oeste. Eron teme que ele avance para o território dos monstros.",
    steps:[step("tracks","inspect","garrano-tracks",1,"Siga e examine as marcas de cascos na saída oeste."),
      step("slimes","defeat","slime",5,"Afaste cinco slimes desde que aceitou a missão."),
      step("halter","craft","cabresto",1,"Fabrique um cabresto com Eron (3 gel); você já tem a maçã doce."),
      step("calm","interact","warhorse",1,"Ofereça a maçã doce e acalme o cavalo."),
      step("return","escort","stablemaster",1,"Conduza o Garrano de volta ao estábulo para receber a sela.")],
  },
  "mountain-goat":{
    id:"mountain-goat",title:"Desafio da Garganta dos Ventos",region:"Oeste · montanhas",origin:"Velho Mineiro Bran · Vila do Cume",
    trigger:"Nível 25 e rota das minas desbloqueada.",minimumLevel:25,playable:false,initialGift:"Sal-Gema",
    introduction:"Um bando de bodes selvagens está cercado por predadores na Garganta dos Ventos. Seu líder protege os filhotes perto do precipício.",
    steps:[step("route","traverse","mine-trail",1,"Suba pela trilha das minas."),
      step("protect","protect","goat-herd",1,"Salve o bando dos predadores."),
      step("feed","interact","mountain-goat",1,"Ofereça Sal-Gema ao líder."),
      step("descent","traverse","cliff-descent",1,"Conclua a descida íngreme.")],
  },
  "imperial-elk":{
    id:"imperial-elk",title:"O Rei Invisível das Matas",region:"Noroeste · florestas",origin:"Armadilha de ferro destruída",
    trigger:"Nível 35 e investigação da armadilha.",minimumLevel:35,playable:false,initialGift:"Líquen da Lua",
    introduction:"Caçadores ilegais procuram o Alce Imperial, guardião da mata, depois de encontrarem uma armadilha retorcida.",
    steps:[step("trap","inspect","broken-trap",1,"Inspecione a armadilha."),
      step("trail","inspect","elk-tracks",1,"Encontre o alce antes dos caçadores."),
      step("free","interact","trapped-elk",1,"Liberte o animal da armadilha."),
      step("feed","interact","imperial-elk",1,"Alimente o alce com Líquen da Lua.")],
  },
  "fire-lion":{
    id:"fire-lion",title:"O Senhor das Chamas",region:"Oeste · cume vulcânico",origin:"Estátua com garras queimadas",
    trigger:"Nível 55 e exame da estátua.",minimumLevel:55,playable:false,initialGift:"Conselho do Ancião",
    introduction:"As Salamandras de Magma invadiram o território do Leão do Fogo e o Senhor das Chamas bloqueia o passo da montanha.",
    steps:[step("statue","inspect","scorched-statue",1,"Examine a estátua marcada por garras queimadas na trilha."),
      step("salamander","defeat","magma-salamander",1,"Enfrente uma Salamandra de Magma."),
      step("core","collect","Núcleo de Brasa",1,"Obtenha o Núcleo de Brasa como prova de respeito."),
      step("lion","interact","fire-lion",1,"Mostre o núcleo e prove coragem.")],
  },
  "sand-basilisk":{
    id:"sand-basilisk",title:"O Rastro Oculto do Oásis",region:"Sul · deserto",origin:"Carroça de água soterrada",
    trigger:"Nível 40 e inspeção da carroça.",minimumLevel:40,playable:false,initialGift:"Indicação do Mercador",
    introduction:"O lagarto fugiu com água e frutas para as ruínas. Ele está desidratado e em busca de alimento.",
    steps:[step("wagon","inspect","buried-wagon",1,"Investigue a carroça."),
      step("cactus","collect","Polpa de Cacto Hidratante",1,"Prepare polpa de cacto."),
      step("tail","inspect","tail-tracks",1,"Siga marcas da cauda até as ruínas."),
      step("feed","interact","sand-basilisk",1,"Acalme o lagarto com a polpa.")],
  },
  "cavern-bear":{
    id:"cavern-bear",title:"O Gigante Adormecido",region:"Norte · tundra glacial",origin:"Xamã · Vila da Tundra",
    trigger:"Nível 45 e conversa com xamã durante nevasca.",minimumLevel:45,playable:false,initialGift:"Conselho do Xamã",
    introduction:"O urso hiberna agressivamente dentro da Grande Caverna que protege as provisões da tribo.",
    steps:[step("fish","collect","Peixe do Gelo",1,"Pesque no rio congelado."),
      step("cave","traverse","glacial-cave",1,"Entre na caverna em silêncio."),
      step("bear","interact","cavern-bear",1,"Alimente o urso adormecido."),
      step("supplies","escort","supplies",1,"Libere as provisões da tribo.")],
  },
  "silver-unicorn":{
    id:"silver-unicorn",title:"A Bênção do Bosque Místico",region:"Leste · bosques celestiais",origin:"Fonte dos Anjos",
    trigger:"Nível 60, após purificar a Fonte dos Anjos.",minimumLevel:60,playable:false,initialGift:"Água Pura",
    introduction:"Uma aparição revela o Unicórnio de Prata, perseguido pelas sombras. Seu ritual precisa ser protegido.",
    steps:[step("fountain","protect","angels-fountain",1,"Afaste os espíritos sombrios e purifique a Fonte dos Anjos."),
      step("water","collect","Água Pura",1,"Colete água da fonte."),
      step("moon","ritual","full-moon",1,"Prepare ritual à meia-noite e lua cheia."),
      step("grove","protect","unicorn-grove",1,"Defenda o bosque dos espíritos.")],
  },
  "dark-griffin":{
    id:"dark-griffin",title:"O Salto de Fé",region:"Oeste/Norte · picos altos",origin:"Penas gigantes no penhasco",
    trigger:"Nível 65 e inspeção das penas.",minimumLevel:65,playable:false,initialGift:"Conselho do Escalador",
    introduction:"Caçadores tentam roubar os ovos do rei dos ventos. Para merecer o Grifo-Sombrio é preciso respeitar seu ninho e demonstrar coragem.",
    steps:[step("feathers","inspect","giant-feathers",1,"Examine as penas gigantes na borda do penhasco."),
      step("peak","traverse","griffin-peak",1,"Suba com Carne de Caça Lendária."),
      step("grip","interact","dark-griffin",1,"Proteja o ninho e alimente o grifo."),
      step("glide","traverse","guided-glide",1,"Realize salto planado controlado.")],
  },
  "cargo-beetle":{
    id:"cargo-beetle",title:"A Rota Perdida do Mercador",region:"Sul · deserto e pântanos",origin:"Carcaça do Verme da Areia",
    trigger:"Nível 30 e inspeção da carcaça.",minimumLevel:30,playable:false,initialGift:"Receita de Bálsamo de Ervas",
    introduction:"Um escaravelho ferido fugiu com a carga de um jovem mercador após um ataque do Verme da Areia.",
    steps:[step("carcass","inspect","sandworm-carcass",1,"Examine a carcaça do Verme da Areia e procure rastros."),
      step("balm","craft","Bálsamo de Ervas",1,"Prepare o Bálsamo de Ervas para tratar o animal."),
      step("cargo","collect","lost-cargo",3,"Recupere três caixas de carga."),
      step("beetle","escort","cargo-beetle",1,"Trate o animal e conduza-o à caravana.")],
  },
  "tidal-hippocampus":{
    id:"tidal-hippocampus",title:"O Cavalo do Mar",region:"Leste · recifes e ilhas",origin:"Velho Pescador · Vila Costeira",
    trigger:"Nível 40 e conversa com pescador.",minimumLevel:40,playable:false,initialGift:"Receita de Isca de Algas de Coral",
    introduction:"O Hipocampo está preso em redes de piratas e ferido entre os corais distantes. Ele ataca barcos por pânico.",
    steps:[step("bait","craft","Isca de Algas de Coral",1,"Fabrique a Isca de Algas de Coral com os materiais coletados."),
      step("sea","traverse","outer-reefs",1,"Navegue até os recifes."),
      step("nets","interact","pirate-nets",1,"Corte as redes dos piratas e liberte o Hipocampo."),
      step("care","interact","tidal-hippocampus",1,"Trate suas nadadeiras e ofereça a isca.")],
  },
};
