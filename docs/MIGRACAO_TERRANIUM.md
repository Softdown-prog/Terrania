# Aproveitamento seletivo do Terranium (Softdown-prog/2d2)

O Terranium original permanece inalterado. Este repositório é independente e orientado ao navegador.

## Ideias que podemos aproveitar
- Separação entre motor e regras do jogo.
- Conceito de mapa dividido em regiões/chunks e câmera top-down.
- Modelos de atributos, itens, inventários, equipamentos, magias e combate.
- Dados de monstros, heróis e terrenos em arquivos estruturados.
- Editor de mapa que publica chunks explicitamente.

## O que não copiar diretamente
- Compilação C++20/CMake, janela SDL3 e carregamento PNG por SDL3_image.
- Texturas e animações baseadas em spritesheets/frames PNG.
- Lua nativa acoplada ao executável.
- Suposições de filesystem local ou dispositivos não presentes no navegador.

## Estratégia
1. Estudar as regras e interfaces do projeto antigo.
2. Reescrever apenas a lógica relevante em TypeScript puro.
3. Fazer testes unitários para converter conceitos em contratos estáveis.
4. Criar renderizadores Canvas procedurais com camadas de corpos/equipamentos.
5. Compartilhar cálculos determinísticos entre navegador e servidor.
6. Não levar código legado ao novo repositório sem revisão técnica e de licença.

Nenhum arquivo do projeto original precisa ser alterado para desenvolver Terrania: Origins.
