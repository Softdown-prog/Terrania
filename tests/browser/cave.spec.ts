import { expect, test } from "@playwright/test";
import { caveEntranceInCell } from "../../src/world/caves.ts";
import { CAVE_EXIT, CAVE_HEIGHT, CAVE_WIDTH } from "../../src/engine/rooms/CaveRoom.ts";

test("entrar na gruta solo, abrir mapa do andar e subir pela mesma saída (desktop/Android)", async ({ page }, info) => {
  const seed = 842136;
  const entrance = caveEntranceInCell(0, 0, seed);
  expect(entrance).not.toBeNull();
  if (!entrance) return;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(({seed,x,y}) => {
    localStorage.setItem("terrania-origins-v1",JSON.stringify({
      seed,x,y,hp:100,kills:0,defeated:[],
    }));
  }, {seed,x:entrance.x,y:entrance.y});
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  await expect(page.locator("#coords")).toHaveText(`X ${entrance.tileX} · Y ${entrance.tileY}`);
  const action=page.locator("#talkButton");
  await expect(action).toContainText("Entrar (E)");
  if(info.project.name==="android")await action.tap();
  else await action.click();
  await expect(page.locator("#coords")).toContainText("Subsolo");
  await expect(page.locator("#quest")).toHaveText(entrance.name);
  await expect(page.locator(".quest .stat-heading")).toContainText("EXPLORAÇÃO · SUBSOLO");
  await expect(page.locator("#battleSidebar")).toHaveCount(0);
  await page.locator("canvas#game").screenshot({path:test.info().outputPath("cave-scene.png")});
  await page.locator("#gameMenuButton").click();
  await page.locator("#inventoryButton").click();
  await expect(page.locator("#inventoryDialog")).toBeVisible();
  await page.locator("#inventoryTabMap").click();
  await expect(page.locator("#caveMapTitle")).toHaveText(entrance.name);
  await expect(page.locator("#worldMapDimensions")).toContainText("primeiro andar");
  const atlas=page.locator("#worldAtlasCanvas");
  await expect(atlas).toBeVisible();
  // The atlas uses ivory (#fff6dc) and gold (#f6d18e), not pure white.
  // Test the actual marker coordinates: a blank atlas with a pale caption
  // must never pass because a few bright pixels exist somewhere.
  const location=await page.locator("#atlasCoordinates").textContent();
  const coordinates=/X\s+(\d+)\s+·\s+Y\s+(\d+)/.exec(location ?? "");
  expect(coordinates, "posição subterrânea deve ser exibida no atlas").not.toBeNull();
  const position={x:Number(coordinates![1]),y:Number(coordinates![2])};
  const sampled=await atlas.evaluate((node,{position,exit,width,height})=>{
    const canvas=node as HTMLCanvasElement;
    const image=canvas.getContext("2d")?.getImageData(0,0,canvas.width,canvas.height);
    if(!image)return {opaque:0,colors:0,playerIvory:0,exitGold:0};
    const data=image.data;
    let opaque=0;
    const palette=new Set<string>();
    for(let i=0;i<data.length;i+=4){
      if(data[i+3]!==255)continue;
      opaque++;
      if(i%128===0)palette.add([data[i],data[i+1],data[i+2]].join(","));
    }
    const size=Math.min((canvas.width-26)/width,(canvas.height-48)/height);
    const ox=(canvas.width-width*size)/2;
    const oy=(canvas.height-height*size)/2+5;
    const markerPixels=(tile:{x:number;y:number},kind:"ivory"|"gold"):number=>{
      const cx=ox+(tile.x+.5)*size,cy=oy+(tile.y+.5)*size;
      let matched=0;
      for(let y=Math.max(0,Math.floor(cy-5));y<=Math.min(canvas.height-1,Math.ceil(cy+5));y++)
        for(let x=Math.max(0,Math.floor(cx-5));x<=Math.min(canvas.width-1,Math.ceil(cx+5));x++){
          const i=(y*canvas.width+x)*4;
          if(data[i+3]!==255)continue;
          const r=data[i]!,g=data[i+1]!,b=data[i+2]!;
          // Forgiving enough for Canvas antialiasing, strict enough to reject
          // the darker floor, rocky outline and background.
          const ivory=r>=230&&g>=210&&b>=175&&Math.abs(r-g)<25;
          const gold=r>=205&&g>=155&&b>=90&&r-g>=12&&g-b>=20;
          if(kind==="ivory"?ivory:gold)matched++;
        }
      return matched;
    };
    return {
      opaque,colors:palette.size,
      playerIvory:markerPixels(position,"ivory"),
      exitGold:markerPixels(exit,"gold"),
    };
  },{position,exit:CAVE_EXIT,width:CAVE_WIDTH,height:CAVE_HEIGHT});
  expect(sampled.opaque).toBeGreaterThan(50000);
  expect(sampled.colors).toBeGreaterThan(3);
  expect(sampled.playerIvory,"seta do jogador deve estar clara na posição real").toBeGreaterThan(3);
  expect(sampled.exitGold,"escada deve estar dourada no ponto real de saída").toBeGreaterThan(3);
  await atlas.screenshot({path:test.info().outputPath("cave-map.png")});
  await page.locator("#inventoryDialog .dialog-x").click();
  await expect(page.locator("#inventoryDialog")).not.toBeVisible();
  await page.locator("canvas#game").focus();
  await page.keyboard.down("s");
  try {
    // The player starts three tiles north of the exit and returns to the exact
    // surface checkpoint, not a generic spawn position or another seed.
    await expect(page.locator("#coords"), "a saída deve funcionar caminhando sobre a escada")
      .toHaveText(`X ${entrance.tileX} · Y ${entrance.tileY}`,{timeout:10000});
  } finally {
    await page.keyboard.up("s");
  }
  await expect(page.locator("#quest")).toHaveText("Proteja a clareira");
  await expect(page.locator(".quest .stat-heading")).toContainText("MISSÃO DA CLAREIRA");
  // Regression: the old CSS had pointer-events:none on the toast parent.
  // This must exercise a real tap/click, not call the Angular method directly.
  const dismiss=page.locator("#dismissTravelNotice");
  await expect(dismiss).toBeVisible();
  await expect(page.locator("#gameNotice")).toContainText("retornou à superfície");
  if(info.project.name==="android") await dismiss.tap();
  else await dismiss.click();
  await expect(page.locator("#gameNotice")).toHaveCount(0);
  // Without a combat target, the guidance must also be dismissible.
  const combatHelp=page.locator("#dismissCombatHelp");
  await expect(combatHelp).toBeVisible();
  if(info.project.name==="android") await combatHelp.tap();
  else await combatHelp.click();
  await expect(page.locator("#classicCombat")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("#classicCombat")).toHaveCount(0);
  await expect(page.locator("#gameNotice")).toHaveCount(0);
  await page.locator("#gameMenuButton").click();
  await page.locator("#inventoryButton").click();
  await page.locator("#inventoryTabMap").click();
  await expect(page.locator("#caveMapTitle")).toHaveCount(0);
  await expect(page.locator("#worldMapDimensions")).toContainText("62.500");
  expect(errors).toEqual([]);
});
