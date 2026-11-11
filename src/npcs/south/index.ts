import type { Npc, NpcAppearance } from "../types.ts";
import { southPoint } from "../../world/southCity.ts";

/** Doze habitantes de Poço Negro: todos são realmente encontráveis na superfície. */
function person(id:string,name:string,role:string,x:number,y:number):Npc {
  return {id,name,role,kind:"character",...southPoint(x,y)};
}
export const SOUTH_NPCS:readonly Npc[]=[
  person("south-gorrak","Gorrak, Senhor do Poço","Chefe dos Ermos",-18,-8),
  person("south-brutha","Brutha Pedra-Rubra","Ferreiro troll",-19,13),
  person("south-zinha","Zinha Dedos-de-Cobre","Mercadora goblin",8,-5),
  person("south-madame","Madame Víbora","Hospedeira",-8,15),
  person("south-pip","Pip Olhos-de-Areia","Batedor de caminhos",-6,-4),
  person("south-ixtal","Ixtal, o Destilador","Alquimista diabrete",19,-2),
  person("south-khemet","Sumo-Sacerdote Khemet","Sacerdote do Sol Negro",14,11),
  person("south-sylrael","Sylrael, a Sem-Casa","Exilada do oásis",-9,-5),
  person("south-hesh","Capitã Hesh","Guarda dos portões",2,-19),
  person("south-rukh","Domador Rukh","Tratador de lagartos",-23,15),
  person("south-marn","Coletor Marn","Guardião do ossuário",6,20),
  person("south-mirage","Velha Miragem","Vidente do deserto",8,-12),
];
type Look = NpcAppearance;
const robe="#5e2440",bronze="#b97a2a",poison="#8bd450";
export const SOUTH_NPC_LOOKS:Readonly<Record<string,Look>>={
  "south-gorrak":{robe,trim:bronze,accent:"#e0a24a",skin:"#6a8662",hair:"#3a3833",hairStyle:"bald",prop:"staff",width:1.38,species:"orc"},
  "south-brutha":{robe:"#6e4128",trim:"#e0a24a",accent:"#ff974a",skin:"#a8683e",hair:"#5a3a2d",hairStyle:"bald",prop:"hammer",width:1.63,apron:"#221a2b",species:"troll"},
  "south-zinha":{robe:"#8a3b5c",trim:bronze,accent:"#e0a24a",skin:"#669051",hair:"#342922",hairStyle:"short",prop:"scales",width:.74,species:"goblin"},
  "south-madame":{robe:"#356a1f",trim:poison,accent:"#cdd45b",skin:"#a5af80",hair:"#30273b",hairStyle:"bun",prop:"lantern",width:1.02},
  "south-pip":{robe:"#c9a468",trim:"#8f6f3f",accent:"#e3c58a",skin:"#ddb58a",hair:"#534236",hairStyle:"short",prop:"scroll",width:.75},
  "south-ixtal":{robe:"#5a4a63",trim:poison,accent:poison,skin:"#946fa5",hair:"#36142a",hairStyle:"bald",prop:"vial",width:.82,species:"imp"},
  "south-khemet":{robe:"#221a2b",trim:"#e0a24a",accent:"#b97a2a",skin:"#d3c3a0",hair:"#b97a2a",hairStyle:"bald",prop:"staff",width:1.13},
  "south-sylrael":{robe:"#c9b99d",trim:"#8f6f3f",accent:"#efe3c8",skin:"#edd3b0",hair:"#d3d8d7",hairStyle:"long",prop:"scroll",width:1,species:"elf"},
  "south-hesh":{robe:"#6e4128",trim:bronze,accent:"#8a3b5c",skin:"#6c8060",hair:"#392e29",hairStyle:"short",prop:"dagger",width:1.25,species:"orc"},
  "south-rukh":{robe:"#8f6f3f",trim:"#d3c3a0",accent:bronze,skin:"#ba8f64",hair:"#64452a",hairStyle:"short",prop:"whip",width:1.08},
  "south-marn":{robe:"#3a2f45",trim:"#d3c3a0",accent:"#efe3c8",skin:"#d1be9e",hair:"#4d473f",hairStyle:"bald",prop:"scales",width:.9},
  "south-mirage":{robe:"#36142a",trim:"#8a3b5c",accent:poison,skin:"#8367a0",hair:"#a8a1b1",hairStyle:"long",prop:"vial",width:.83,species:"imp"},
};
/** Rumores de missões não ativam estados de quest ou transações falsas. */
export const SOUTH_DIALOGUES:Readonly<Record<string,readonly string[]>>={
  "south-gorrak":["Poço Negro não é bondosa, viajante. Mas dentro dos muros ninguém derrama sangue sem a minha ordem.",
    "Todos pagam pedágio quando trazem caravanas. Você pode entrar e sair livremente por enquanto.",
    "Se quer saber por que a água escureceu, pergunte ao sacerdote e à elfa exilada."],
  "south-brutha":["A Fornalha dos Trolls mantém o bronze e as lâminas da cidade.",
    "Minha porta está aberta a visitas. Negócios de forja serão habilitados quando houver receitas do Sul.",
    "As ruínas ao sul escondem metal antigo; lá fora, os orcs não obedecem à lei de Gorrak."],
  "south-zinha":["Zinha Dedos-de-Cobre. Encontro valor até em casca de besouro!",
    "Dente Dourado, Élitro Prismático e Ferrão de Cristal Rubro são raridades cobiçadas.",
    "O Bazar compra os raros do Sul em moedas: quanto mais raro, mais eu pago. Mostre o que trouxe."],
  "south-madame":["Bem-vindo à Sombra do Escorpião. Aqui há um teto seguro, mesmo para um inimigo de ontem.",
    "Pode visitar os quartos. Um descanso custa 24 Terrania Gold: vida completa e sem veneno nem queimadura.",
    "Se procurar histórias, a água do poço mudou de cor numa noite sem lua."],
  "south-pip":["Sou Pip. A Estrada da Travessia chega pelo Portão das Presas, ao norte.",
    "O Portão dos Ossos leva às ruínas e às dunas. À leste há rastros do Obelisco Soterrado.",
    "Vi uma trilha de lama na direção do brejo, mas não marquei uma caverna segura ainda."],
  "south-ixtal":["Um frasco verde cura ou mata: depende de quem o prepara.",
    "Os diabretes recolhem veneno das víboras e dos escorpiões das dunas.",
    "Traga polpa de cacto, flor do deserto, erva do pântano e glândulas; eu preparo Poção Maior e Antídoto por moedas."],
  "south-khemet":["O Sol Negro observa tudo, sobretudo a água que deixou de refletir as estrelas.",
    "O Escaravelho Solar é um presságio nas ruínas. Não invoque a criatura dentro da cidade.",
    "O templo está aberto a peregrinos; a investigação do poço será uma missão futura."],
  "south-sylrael":["Fui expulsa do oásis depois que a água ganhou a cor de pedra sombria.",
    "Encontrei inscrições sob o poço, mas Gorrak não deixou que eu as copiasse.",
    "Procure os sinais das antigas palmeiras a oeste. Ainda não é uma missão registrada."],
  "south-hesh":["Capitã Hesh. Enquanto você estiver dentro das muralhas, os monstros não podem atacá-lo.",
    "Ao atravessar o Portão dos Ossos, a proteção termina. Vá preparado.",
    "Não autorizo duelos no centro, nem para orcs ou goblins."],
  "south-rukh":["Lagartos das Areias e Escaravelhos de Carga sobreviveriam onde cavalos caem.",
    "Vendo o Escaravelho de Carga (nível 30, 4 Cripta Coin e 50 Terrania Gold) e o Lagarto das Areias (nível 40, 12 Cripta Coin), já com a sela.",
    "Para montar é preciso a Cavalaria da espécie, treinada com Eron na Travessia. Monte aqui, no meu cercado."],
  "south-marn":["Trago ossos e troféus das ruínas; nenhum deles é igual ao do Poço Negro.",
    "O ossuário compra o saque comum das criaturas: rabos, carne, ossos. Pago em moedas, pouco por peça.",
    "Se escutar vozes na areia, volte pela estrada dos dois portões."],
  "south-mirage":["A água escura lembra um espelho que esqueceu o céu.",
    "O obelisco e o poço conhecem a mesma língua, mas nem todo mapa conhece o caminho.",
    "Volte quando os rumores ganharem uma missão. Hoje ofereço apenas palavras."],
};
