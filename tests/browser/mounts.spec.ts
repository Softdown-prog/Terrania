import { test, expect } from "@playwright/test";
import { experienceForLevel } from "../../src/engine/Experience.ts";

/** Test real mobile/desktop clicks against the stable NPC, not a mocked callback. */
test("Estábulo: construir, treinar e iniciar quest na UI Android/desktop", async ({page},info)=>{
  await page.addInitScript(xp=>{
    localStorage.setItem("terrania-origins-v1",JSON.stringify({
      seed:842136,x:384,y:112,hp:100,kills:5,defeated:[],
      experience:xp,inventory:{gel:20,potion:0,questRewardClaimed:false},
    }));
  },experienceForLevel(15));
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  const action=page.locator("#talkButton");
  await expect(action).toContainText("Conversar");
  if(info.project.name==="android")await action.tap();
  else await action.click();
  const npc=page.locator("#npcDialog");
  await expect(npc).toBeVisible();
  await expect(page.locator("#npcName")).toHaveText("Eron");
  await expect(page.locator("#stableProgress")).toContainText("Estábulo 0/3");
  await page.locator("#buildStable").click();
  await expect(page.locator("#stableProgress")).toContainText("Estábulo 1/3");
  await expect(page.locator("#stableProgress")).toContainText("8 gel");
  await page.locator("#trainRiding").click();
  await expect(page.locator("#stableProgress")).toContainText("Cavalaria 1/3");
  await page.locator("#startWarhorseQuest").click();
  await expect(page.locator("#mountQuestHint")).toContainText("0/5");
  await expect(page.locator(".mount-roster-entry")).toHaveCount(10);
  await expect(page.locator("#npcTradeFeedback")).toContainText("Garrano Fugitivo");
  expect(errors).toEqual([]);
});
test("Montaria: save validado não pode exigir multiplayer; UI exibe desmontar",async ({page},info)=>{
  await page.addInitScript(xp=>{
    localStorage.setItem("terrania-origins-v1",JSON.stringify({
      seed:842136,x:384,y:112,hp:100,kills:5,defeated:[],experience:xp,
      mounts:{stableTier:1,ridingTier:1,owned:["warhorse"],saddled:["warhorse"]},
    }));
  },experienceForLevel(15));
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("#talkButton")).toBeVisible();
  if(info.project.name==="android")await page.locator("#talkButton").tap();
  else await page.locator("#talkButton").click();
  await expect(page.locator("#rideWarhorse")).toBeVisible();
  await page.locator("#rideWarhorse").click();
  await expect(page.locator("#mountStatus")).toContainText("Cavalo de Batalha");
  await expect(page.locator("#mountStatus")).toContainText("180");
  await page.locator("#npcDialog .dialog-x").click();
  await expect(page.locator("#mountStatus button")).toBeVisible();
  if(info.project.name==="android")await page.locator("#mountStatus button").tap();
  else await page.locator("#mountStatus button").click();
  await expect(page.locator("#mountStatus")).toHaveCount(0);
  expect(errors).toEqual([]);
});
