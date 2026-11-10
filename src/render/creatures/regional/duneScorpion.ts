/** Silhueta e materiais exclusivos, mantendo as mesmas regras de combate. */
import type { ColorRamp } from "./geometry.ts";
import { organic, shard, headEyes, curvedLeg, carapaceDetail } from "./geometry.ts";

export const drawScorpion = (ctx: CanvasRenderingContext2D, c: ColorRamp): void => {
  for(const s of [-1,1]){
    for(let i=0;i<4;i++)curvedLeg(ctx,s*(9+i*2),-12+i*2,s*(20+i*2),-9+i*3,s*(25+i*3),-2+i,c,3);
    curvedLeg(ctx,s*11,-22,s*24,-24,s*30,-13,c,7);
    organic(ctx,s*30,-13,9,7,c,s*.3);
    shard(ctx,s*38,-14,5,11,c.light);
  }
  organic(ctx,0,-20,17,14,c);
  carapaceDetail(ctx,0,-20,14,11,c,12);
  const points:[[number,number],[number,number],[number,number],[number,number]]=[
    [10,-28],[16,-39],[11,-53],[1,-59]];
  for(let i=0;i<points.length;i++){
    const p=points[i]!;
    organic(ctx,p[0],p[1],7-i*.6,6-i*.4,c,-.2);
  }
  shard(ctx,-4,-61,6,17,c.accent);
  headEyes(ctx,[[-4,-25],[4,-25]],c,1.7);
};
