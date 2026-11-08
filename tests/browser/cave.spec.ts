import { expect, test } from "@playwright/test";
import { caveEntranceInCell } from "../../src/world/caves.ts";

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
  await page.locator("#gameMenuButton").click();
  await page.locator("#inventoryButton").click();
  await expect(page.locator("#inventoryDialog")).toBeVisible();
  await page.locator("#inventoryTabMap").click();
  await expect(page.locator("#caveMapTitle")).toHaveText(entrance.name);
  await expect(page.locator("#worldMapDimensions")).toContainText("primeiro andar");
  const atlas=page.locator("#worldAtlasCanvas");
  await expect(atlas).toBeVisible();
  const sampled=await atlas.evaluate(node=>{
    const canvas=node as HTMLCanvasElement;
    const data=canvas.getContext("2d")?.getImageData(0,0,canvas.width,canvas.height).data;
    if(!data)return {opaque:0,light:0,colors:0};
    let opaque=0,light=0;
    const palette=new Set<string>();
    for(let i=0;i<data.length;i+=4){
      if(data[i+3]!==255)continue;
      opaque++;
      if(data[i]!>=240&&data[i+1]!>=240&&data[i+2]!>=240)light++;
      if(i%1024===0)palette.add([data[i],data[i+1],data[i+2]].join(","));
    }
    return {opaque,light,colors:palette.size};
  });
  expect(sampled.opaque).toBeGreaterThan(50000);
  expect(sampled.light).toBeGreaterThan(5);
  expect(sampled.colors).toBeGreaterThan(3);
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
  await page.locator("#gameMenuButton").click();
  await page.locator("#inventoryButton").click();
  await page.locator("#inventoryTabMap").click();
  await expect(page.locator("#caveMapTitle")).toHaveCount(0);
  await expect(page.locator("#worldMapDimensions")).toContainText("62.500");
  expect(errors).toEqual([]);
});
