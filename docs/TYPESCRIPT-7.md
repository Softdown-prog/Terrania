# Compiladores TypeScript nesta branch

O servidor Node mantém TypeScript **7.0.2** e seu lock independente. O frontend Angular 22 usa TypeScript **6.0.3**, dentro da faixa oficial `>=6.0 <6.1` do compilador Angular. Não desativar a checagem de versão nem forçar uma dependência incompatível.

Referência: https://angular.dev/reference/versions

No frontend, `npm run typecheck` executa `ngc`, incluindo templates e injeção estritos. O build usa o compilador Angular AOT. O servidor continua compilando com `rewriteRelativeImportExtensions`.

As opções `strict`, `noImplicitOverride`, `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes` estão ativas em ambos os projetos. `strictTemplates` e `strictInjectionParameters` ficam em `angularCompilerOptions` no frontend.

Validar com os scripts npm documentados em [MIGRACAO_ANGULAR_PHASER3.md](MIGRACAO_ANGULAR_PHASER3.md).
