import { CAPITAL_STREETS } from "../../src/world/center/capital/index.ts";
export * from "../../src/world/center/capital/index.ts";
/** O retângulo da praça, como a planta o define (a rua `praca-dos-povos`). */
export const CAPITAL_PLAZA_FOR_TESTS = CAPITAL_STREETS.find(s => s.id === "praca-dos-povos")!.rect;
