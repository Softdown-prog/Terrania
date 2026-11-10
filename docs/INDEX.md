# Terrania — índice de módulos e arquivos

> Gerado por \x60npm run architecture:index\x60. Não editar à mão. Fonte canônica: [architecture/modules.json](../architecture/modules.json).

Este índice informa **onde procurar**. Estado active = módulo utilizado na arquitetura atual; experimental/lab não implica serviço em produção nem capacidade validada.

| Módulo | Estado | Arquivos | Responsabilidade |
| --- | --- | ---: | --- |
| [Site e HUD Angular](indexes/angular-site.md) | active | 34 | /P/á/g/i/n/a/s/ /d/o/ /s/i/t/e/,/ /n/a/v/e/g/a/ç/ã/o/,/ /H/U/D/ /e/ /a/ç/õ/e/s/ /d/e/ /i/n/t/e/r/f/a/c/e/./ /N/ã/o/ /c/a/l/c/u/l/a/ /r/e/g/r/a/s/ /a/u/t/o/r/i/t/a/t/i/v/a/s/./ |
| [Orquestração Phaser](indexes/phaser-game.md) | active | 12 | /I/n/t/e/g/r/a/ /l/o/o/p/,/ /i/n/p/u/t/s/,/ /s/i/m/u/l/a/ç/ã/o/,/ /c/â/m/e/r/a/,/ /r/e/n/d/e/r/ /e/ /r/e/d/e/./ /E/v/i/t/a/r/ /t/r/a/n/s/f/e/r/i/r/ /r/e/g/r/a/s/ /d/o/ /m/o/t/o/r/ /p/a/r/a/ /e/s/t/e/ /a/d/a/p/t/a/d/o/r/./ |
| [Renderização e adaptadores Canvas](indexes/renderer.md) | active | 28 | /D/e/s/e/n/h/a/ /e/n/t/i/d/a/d/e/s/ /e/ /m/u/n/d/o/;/ /G/a/m/e/U/i/ /s/e/p/a/r/a/ /o/ /A/n/g/u/l/a/r/ /d/o/ /o/r/q/u/e/s/t/r/a/d/o/r/ /d/o/ /j/o/g/o/./ |
| [Regras e simulação offline](indexes/simulation.md) | active | 33 | /C/o/m/b/a/t/e/,/ /p/r/o/g/r/e/s/s/ã/o/,/ /i/n/v/e/n/t/á/r/i/o/,/ /e/q/u/i/p/a/m/e/n/t/o/,/ /l/o/o/t/ /e/ /n/a/v/e/g/a/ç/ã/o/;/ /s/e/m/ /D/O/M/,/ /P/h/a/s/e/r/ /o/u/ /A/n/g/u/l/a/r/./ |
| [Entidades jogáveis](indexes/actors.md) | active | 6 | /E/s/t/a/d/o/ /e/ /c/o/m/p/o/r/t/a/m/e/n/t/o/ /d/o/ /h/e/r/ó/i/ /e/ /d/a/s/ /c/r/i/a/t/u/r/a/s/;/ /c/a/t/á/l/o/g/o/ /i/n/i/c/i/a/l/ /d/e/ /e/s/p/é/c/i/e/s/ /s/e/p/a/r/a/d/o/ /d/a/s/ /i/n/s/t/â/n/c/i/a/s/./ |
| [Bestiário por região](indexes/monsters.md) | active | 42 | /F/i/c/h/a/s/ /i/n/d/i/v/i/d/u/a/i/s/ /d/e/ /c/r/i/a/t/u/r/a/s/ /c/l/a/s/s/i/f/i/c/a/d/a/s/ /p/o/r/ /r/e/g/i/ã/o/;/ /f/o/n/t/e/ /ú/n/i/c/a/ /d/e/ /a/t/r/i/b/u/t/o/s/ /e/ /l/o/o/t/,/ /s/e/m/ /d/u/p/l/i/c/a/r/ /I/A/ /n/e/m/ /r/e/n/d/e/r/i/z/a/ç/ã/o/./ |
| [NPCs por região](indexes/npcs.md) | active | 14 | /P/e/r/s/o/n/a/g/e/n/s/ /n/ã/o/ /j/o/g/á/v/e/i/s/ /s/e/p/a/r/a/d/o/s/ /p/o/r/ /r/e/g/i/ã/o/,/ /c/o/m/ /d/i/á/l/o/g/o/ /e/ /a/p/a/r/ê/n/c/i/a/ /e/m/ /f/i/c/h/a/s/ /i/n/d/i/v/i/d/u/a/i/s/./ |
| [Terreno, colisões e NPCs](indexes/world.md) | active | 20 | /M/u/n/d/o/ /p/r/o/c/e/d/u/r/a/l/ /d/e/t/e/r/m/i/n/í/s/t/i/c/o/ /r/e/g/i/o/n/a/l/i/z/a/d/o/,/ /b/i/o/m/a/s/,/ /d/i/f/i/c/u/l/d/a/d/e/,/ /t/i/l/e/s/,/ /c/o/l/i/s/ã/o/,/ /v/i/l/a/ /e/ /m/a/r/c/o/s/./ |
| [Entrada e controles](indexes/input.md) | active | 4 | /N/o/r/m/a/l/i/z/a/ç/ã/o/ /d/e/ /t/e/c/l/a/d/o/,/ /j/o/y/s/t/i/c/k/ /e/ /t/o/q/u/e/;/ /r/e/g/r/a/s/ /d/e/ /g/a/m/e/p/l/a/y/ /p/e/r/t/e/n/c/e/m/ /à/ /s/i/m/u/l/a/ç/ã/o/./ |
| [Rede cliente: presença e catálogo](indexes/client-network.md) | active | 3 | /C/o/n/s/u/l/t/a/s/ /H/T/T/P/ /d/o/ /s/i/t/e/:/ /c/o/n/t/a/d/o/r/ /d/e/ /q/u/e/m/ /e/s/t/á/ /j/o/g/a/n/d/o/ /e/ /c/a/t/á/l/o/g/o/ /d/e/ /i/t/e/n/s/./ /O/ /j/o/g/o/ /é/ /s/o/l/o/ /e/ /o/f/f/l/i/n/e/;/ /n/ã/o/ /h/á/ /c/o/n/e/x/ã/o/ /d/e/ /j/o/g/o/./ |
| [Persistência local](indexes/local-save.md) | active | 2 | /S/a/v/e/ /n/o/ /n/a/v/e/g/a/d/o/r/,/ /v/e/r/s/ã/o/ /e/ /c/o/m/p/a/t/i/b/i/l/i/d/a/d/e/;/ /n/ã/o/ /é/ /p/e/r/s/i/s/t/ê/n/c/i/a/ /a/u/t/o/r/i/t/a/t/i/v/a/ /o/n/l/i/n/e/./ |
| [QA e testes](indexes/quality.md) | active | 84 | /T/e/s/t/e/s/ /u/n/i/t/á/r/i/o/s/ /e/ /n/a/v/e/g/a/d/o/r/ /d/e/s/k/t/o/p///A/n/d/r/o/i/d/;/ /c/e/n/á/r/i/o/s/ /d/e/ /r/e/g/r/e/s/s/ã/o/ /e/ /r/o/b/ô/s/ /d/e/ /Q/A/./ |
| [Servidor Node atual](indexes/node-server.md) | active | 22 | /S/e/r/v/i/ç/o/ /H/T/T/P/:/ /c/o/n/t/a/d/o/r/ /d/e/ /q/u/e/m/ /e/s/t/á/ /j/o/g/a/n/d/o/,/ /c/a/t/á/l/o/g/o/ /d/e/ /i/t/e/n/s/ /(/P/o/s/t/g/r/e/S/Q/L/)/ /e/ /s/a/ú/d/e/./ /S/e/m/ /s/a/l/a/s/ /n/e/m/ /W/e/b/S/o/c/k/e/t/;/ /o/ /j/o/g/o/ /é/ /s/o/l/o/ /e/ /o/f/f/l/i/n/e/./ |
| [Motor Go autoritativo em validação](indexes/go-engine.md) | experimental | 24 | /I/m/p/l/e/m/e/n/t/a/ç/ã/o/ /G/o/ /d/e/ /r/e/g/r/a/s/ /e/ /p/a/r/i/d/a/d/e/;/ /s/u/b/s/t/i/t/u/i/ç/ã/o/ /d/o/ /b/a/c/k/e/n/d/ /a/t/i/v/o/ /r/e/q/u/e/r/ /d/e/c/i/s/ã/o/ /e/ /v/a/l/i/d/a/ç/ã/o/ /s/e/p/a/r/a/d/a/s/./ |
| [Executáveis e presença Go](indexes/go-runtime.md) | experimental | 28 | /W/o/r/k/e/r/,/ /g/a/t/e/w/a/y/,/ /l/a/b/o/r/a/t/ó/r/i/o/ /d/e/ /c/a/p/a/c/i/d/a/d/e/,/ /p/r/e/s/e/n/ç/a/ /e/ /s/c/r/i/p/t/s/ /d/e/ /p/a/r/i/d/a/d/e/./ |
| [Cluster e recuperação experimental Go](indexes/go-cluster.md) | lab | 62 | /H/a/n/d/o/f/f/,/ /e/p/o/c/h/s/,/ /a/u/t/o/s/c/a/l/e/ /e/ /l/a/b/o/r/a/t/ó/r/i/o/s/ /d/e/ /q/u/o/r/u/m/./ /N/ã/o/ /p/r/e/s/s/u/p/o/r/ /p/r/o/d/u/ç/ã/o/,/ /f/a/i/l/o/v/e/r/ /o/u/ /c/a/p/a/c/i/d/a/d/e/ /c/o/m/p/r/o/v/a/d/a/./ |
| [Módulo Rust espacial e entidades](indexes/rust-spatial.md) | experimental | 10 | /K/e/r/n/e/l/ /R/u/s/t/ /e/ /F/F/I/ /o/p/t/-/i/n/;/ /n/ã/o/ /é/ /s/e/r/v/i/d/o/r/ /d/e/ /r/e/d/e/./ |
| [Scripts, automação e CI](indexes/tooling.md) | active | 27 | /B/u/i/l/d/,/ /v/e/r/i/f/i/c/a/ç/ã/o/,/ /t/e/s/t/e/s/ /a/u/t/o/m/a/t/i/z/a/d/o/s/,/ /d/e/p/l/o/y/s/ /e/ /í/n/d/i/c/e/;/ /o/p/e/r/a/ç/õ/e/s/ /d/e/ /p/r/o/d/u/ç/ã/o/ /s/ã/o/ /f/l/u/x/o/s/ /d/i/s/t/i/n/t/o/s/./ |

**Outros arquivos:** [documentos, configurações e arquivos de entrada](indexes/_outros.md) (81).

Para regras de alteração, veja [AGENTS.md](../AGENTS.md), [manutenção](MANUTENCAO.md) e [ADR 0001](adr/0001-catalogo-e-fronteiras.md).
