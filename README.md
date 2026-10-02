# Lig 4 com IA

Eu queria jogar Lig 4 no navegador com uma IA que joga de verdade — bloqueia a ameaça, fecha a própria vitória e joga de posição. Então construí o meu: o jogo inteiro é HTML, CSS e JavaScript puro, e a IA (Minimax com poda alfa-beta e avaliação por janelas de 4) roda dentro do browser.

## O que tem

- **Avaliação por janelas de 4** (o que faz a IA do Lig 4 jogar forte): cada janela de 4 casas em linha conta — 3 minhas + 1 vazia = um lance da vitória (+60), 2+2 = boa posição (+12), o adversário com 3+1 = bloquear URGENTE (−70); janela misturada vale nada; a coluna do centro vale mais (participa de mais janelas)
- **Minimax (negamax) com poda alfa-beta + iterative deepening** com orçamento de tempo — quanto mais fundo, mais forte
- **Variedade na escolha**: entre colunas quase equivalentes (≤ 15cp) a IA sorteia — o jogo nunca sai igual
- **4 modos**: Jogador × Jogador · **IA Fácil** (busca rasa + ruído ±90cp na escolha — erra lances de verdade) · **IA Média** (800ms) · **IA Difícil** (3000ms de iterative deepening — mais fundo)
- **Placar de sessão** e destaque da linha vencedora (verde + contorno dourado)
- **Modo LLM: a IA de verdade roda DENTRO do navegador** (separado abaixo)

## Modo LLM — inteligência artificial local, sem servidor

Escolha "LLM (roda no navegador)" no seletor Modo. Aí o jogo para de usar o minimax e passa a
chamar uma **LLM de verdade** — mas tudo rodando na sua própria máquina:

- **Zero servidor, zero API**: a biblioteca WebLLM está embutida no repositório
  (`js/vendor/webllm.esm.js`) e o modelo (Qwen2.5-0.5B, ~350MB) é baixado **uma única vez**
  pelo navegador, fica no cache local e a inferência acontece **dentro do navegador**.
  Depois do primeiro download, joga 100% offline.
- **NÃO depende de placa de vídeo** — o jogo escolhe o motor sozinho:
  - **Com WebGPU**: o modelo roda na GPU via WebLLM (~64 tok/s no Qwen2.5-0.5B) — o caminho rápido;
  - **Sem WebGPU / sem placa nenhuma**: o **mesmo modelo** (GGUF `q4_k_m`, ~350MB) roda na
    **RAM/CPU do seu sistema** com o llama.cpp compilado em WebAssembly (`@wllama/wllama`,
    embutido em `js/vendor/wllama/`). Funciona em qualquer navegador moderno — sem flag, sem
    driver, sem instalar nada. É mais lento (depende do seu processador) — para jogar rápido,
    ative o WebGPU (abaixo, opcional).
- **O LLM não inventa lance**: o jogo manda pra ele o menu de colunas que o MINIMAX já
  avaliou (com o score de cada uma) e ele escolhe UMA — respondendo
  `{"i": <nº>, "motivo": "<frase em pt-BR>"}`. Resposta fora do menu, JSON torto
  ou falha de qualquer motor → uma segunda tentativa com o limite explícito e, se ainda assim falhar,
  **o minimax clássico assume** (o jogo nunca trava).
- **Modelos testados à mão**: o Qwen2.5-0.5B-Instruct (64,5 tok/s na GPU, JSON perfeito) e o
  SmolLM2-360M (mais leve) ficam disponíveis no painel; o Qwen3-0.6B foi testado e DESCARTADO
  (gasta tokens "pensando" e não obedece o JSON). O modo CPU usa o Qwen2.5-0.5B em GGUF (mesmo modelo, quantização compatível com o llama.cpp).
- **Quer velocidade máxima? (opcional)** — ative o WebGPU uma vez e ele fica pra sempre:
  1. abra `chrome://flags/#enable-unsafe-webgpu` (no Brave: `brave://flags/#enable-unsafe-webgpu`)
  2. ponha **Enabled** e clique em **Relaunch** (reabra o navegador)
  3. recarregue o jogo — pronto, o painel mostra a placa e o modelo carrega na GPU
  Sem isso, o modo LLM segue funcionando na RAM do seu sistema (é só mais lento).

## Como rodar

```bash
npm start          # sobe o servidor estático em http://localhost:3347
npm test           # 42 testes: regras + IA minimax + LLM (node --test)
```

**Jogue online agora**: https://francoscorporation.github.io/lig4_ia/ — o jogo é 100% estático (servidor só serve arquivos). Para rodar local use `npm start` (abrir o index.html direto via file:// não carrega os módulos ES do navegador).

## Como foi testado

42 testes automatizados (node --test) cobrindo as regras, a IA e o modo LLM, todos passando:

- **Regras (10)**: tabuleiro 7×6 vazio · a quantidade certa de janelas (24 horizontais + 21 verticais + 24 diagonais) · a peça cai na linha mais baixa · coluna cheia devolve null · vitórias nas 4 direções (horizontal, vertical, diagonais ↗ e ↘) · 3 em linha NÃO vence · empate com o tabuleiro cheio · o estado do jogo (vitória quando quem jogou fechou)
- **IA (7)**: coluna válida na posição inicial · **bloqueia a ameaça de 3 em linha do adversário** (joga na coluna exata) · **fecha a própria vitória quando disponível** · a vantagem do centro no score · profundidade 6 em menos de 5s · o jogo da IA contra ela mesma termina (sem loop infinito) · escolheJogada com orçamento de tempo
- **Modo LLM (24)**: prompt com tabuleiro compacto + colunas + limites · colunas em letras A-G · colunas são SEMPRE legais (coluna cheia nunca entra no menu) · extração de JSON (puro, em ``` e com chave `}}` extra) · validação só aceita índice dentro do menu · retry na 2ª tentativa · fallback no minimax em qualquer falha · o lance do LLM solta de verdade na coluna do menu · motor WebLLM sobe no browser e a jogada do modelo local aparece com motivo em pt-BR · seleção de motor (sem WebGPU → CPU na RAM do sistema · com placa → GPU · download que falha não é mascarado)

## Estrutura

```
lig4_ia/
├── index.html         # o jogo
├── style.css          # grid 7x6 no padrão do tabuleiro azul
├── server.js          # servidor estático (sem build)
├── js/
│   ├── lig4-rules.js  # regras: queda por coluna, janelas de 4, vitórias, empate
│   ├── ai-minimax.js  # negamax com poda + avaliação por janelas + iterative deepening + candidatos pro LLM
│   ├── llm.js         # modo LLM: prompt, validação de JSON, motor WebLLM, fallback
│   ├── vendor/
│   │   ├── webllm.esm.js  # WebLLM embutido (5,8MB) — caminho rápido (WebGPU), sem CDN
│   │   └── wllama/        # wllama embutido (index.js + wllama.wasm 8,1MB) — caminho CPU/RAM
│   └── app.js         # UI: clique na coluna, destaque da vitória, placar, modos, painel do LLM
└── test/
    ├── lig4-rules-test.mjs
    ├── ia-test.mjs
    └── llm-test.mjs
```

## Sobre a série

Este é o quinto jogo da série de jogos com IA: [Jogo da Velha](https://github.com/FrancosCorporation/jogo_da_velha_ia) → [Xadrez](https://github.com/FrancosCorporation/xadrez_ia) → [Futebol de Botão](https://github.com/FrancosCorporation/botao_ia) → [Damas](https://github.com/FrancosCorporation/damas_ia) → Lig 4. Jogos clássicos no navegador, com IA rodando no browser, sem dependência externa e com testes provando as regras.

Código aberto: https://github.com/FrancosCorporation/lig4_ia
