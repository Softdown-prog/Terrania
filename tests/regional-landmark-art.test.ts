import assert from "node:assert/strict";
import test from "node:test";
import { landmarkArtVariant, paintRegionalLandmark } from "../src/render/regionalLandmarkArt.ts";
import type { RegionalLandmarkKind } from "../src/world/regionalLandmarks.ts";

/** A tiny strict Canvas recorder works in Node without DOM, assets or GPU. */
function record(kind: RegionalLandmarkKind, variant: number): string[] {
  const commands: string[] = [];
  const gradient = () => ({
    addColorStop(position: number, color: string) {
      commands.push("stop:" + position + ":" + color);
    },
  });
  const c = {
    fillStyle: "", strokeStyle: "", lineWidth: 1,
    save() { commands.push("save"); },
    restore() { commands.push("restore"); },
    translate(x: number, y: number) { commands.push("translate:" + x + "," + y); },
    scale(x: number, y: number) { commands.push("scale:" + x + "," + y); },
    createLinearGradient(...args: number[]) {
      commands.push("linear:" + args.join(","));
      return gradient();
    },
    createRadialGradient(...args: number[]) {
      commands.push("radial:" + args.join(","));
      return gradient();
    },
    beginPath() { commands.push("path"); },
    closePath() { commands.push("close"); },
    moveTo(x: number, y: number) { commands.push("move:" + x + "," + y); },
    lineTo(x: number, y: number) { commands.push("line:" + x + "," + y); },
    ellipse(...args: number[]) { commands.push("ellipse:" + args.join(",")); },
    arc(...args: number[]) { commands.push("arc:" + args.join(",")); },
    fillRect(x: number, y: number, w: number, h: number) {
      commands.push("fillRect:" + [x, y, w, h].join(",") + ":" + this.fillStyle);
    },
    fill() { commands.push("fill:" + String(this.fillStyle)); },
    stroke() { commands.push("stroke:" + String(this.strokeStyle) + ":" + this.lineWidth); },
  } as unknown as CanvasRenderingContext2D;
  paintRegionalLandmark(c, kind, variant);
  return commands;
}

const kinds: RegionalLandmarkKind[] = [
  "ice-spire", "desert-obelisk", "coast-beacon", "mountain-monolith",
];

test("pintura procedural de quatro regiões é determinística e suficientemente detalhada", () => {
  const outputs = new Set<string>();
  for (const kind of kinds) {
    const commands = record(kind, 0);
    assert.deepEqual(commands, record(kind, 0), kind + ": desenho deve ser repetível");
    assert.ok(commands.filter(x => x.startsWith("fill")).length >= 26,
      kind + ": falta construção e materiais, não só uma silhueta plana");
    assert.ok(commands.filter(x => x.startsWith("stroke")).length >= 15,
      kind + ": falta acabamento de bordas, fissuras ou ornamentação");
    assert.ok(commands.some(x => x.startsWith("radial:")), kind + ": sombra ausente");
    assert.ok(commands.some(x => x.startsWith("linear:")), kind + ": sem relevo/volume");
    outputs.add(commands.join("|"));
  }
  assert.equal(outputs.size, kinds.length, "monumentos regionais devem ser distintos");
});

test("variantes ficam limitadas a quatro sprites por tipo e mudam detalhes sem aleatoriedade", () => {
  assert.deepEqual([0, .24, .25, .5, .75, 1, Number.NaN].map(landmarkArtVariant),
    [0, 0, 1, 2, 3, 3, 0]);
  for (const kind of kinds) {
    const previews = Array.from({length: 4}, (_, i) => record(kind, i).join("|"));
    assert.equal(new Set(previews).size, 4, kind + ": variante sem efeito visual");
    assert.equal(previews[3], record(kind, 3).join("|"), "seed visual flutuando");
  }
});
