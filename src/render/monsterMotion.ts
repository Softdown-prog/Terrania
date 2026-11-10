import type { RegionalCreatureKind } from "../monsters/catalog.ts";
import { SPECIES_BEHAVIORS } from "../monsters/behavior.ts";
import { hashString } from "./draw.ts";

export interface MonsterMotionVisual {
  readonly kind: RegionalCreatureKind;
  readonly id?: string;
  readonly moving?: number;
  readonly motionPhase?: number;
}
export interface MonsterPose {
  readonly lift:number;
  readonly sway:number;
  readonly tilt:number;
  readonly stretchX:number;
  readonly stretchY:number;
}
/** O passo só anima se houve movimento no mundo; flutuação continua em idle. */
export function monsterPose(actor:MonsterMotionVisual,time:number):MonsterPose {
  const spec=SPECIES_BEHAVIORS[actor.kind];
  const moving=Math.max(0,Math.min(1,actor.moving??0));
  const p=actor.motionPhase??0,s=Math.sin(p),foot=Math.abs(s),hop=Math.max(0,s);
  const breathe=Math.sin(time*1.4+hashString(actor.id??actor.kind)*7)*.32;
  let lift=breathe,sway=0,tilt=0,stretchX=1,stretchY=1;
  switch(spec.gait){
    case "stomp":lift-=1.5*foot*moving;stretchY-=.07*(1-foot)*moving;break;
    case "lumber":lift-=.7*foot*moving;tilt=s*.027*moving;break;
    case "stride":lift-=1.8*foot*moving;tilt=s*.045*moving;break;
    case "gallop":lift-=2.9*hop*moving;stretchY+=.05*s*moving;break;
    case "scuttle":sway=s*1.8*moving;tilt=-.025*s*moving;break;
    case "skitter":sway=s*2.1*moving;lift-=1.2*hop*moving;break;
    case "slither":sway=s*2.8*moving;tilt=s*.055*moving;break;
    case "crawl":lift-=.6*foot*moving;stretchX+=.045*s*moving;break;
    case "hover":lift-=2.4+1.2*Math.sin(time*2+p*.25);break;
    case "float":lift-=2.1+1.7*Math.sin(time*1.8+p*.3);sway=Math.cos(time*1.3)*.8;break;
    case "flap":lift-=1.5+2.8*Math.max(0,Math.sin(time*3.2+p*.3));tilt=.028*Math.sin(time*3.2);break;
    case "hop":lift-=5*hop*moving;stretchY+=.08*s*moving;break;
    case "burrow":lift-=1.1*foot*moving;stretchY-=.05*s*moving;break;
  }
  return {lift,sway,tilt,stretchX,stretchY};
}
