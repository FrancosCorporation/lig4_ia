# Lig 4 com IA

Eu queria jogar Lig 4 no navegador com uma IA que joga de verdade — bloqueia a ameaça, fecha a própria vitória e joga de posição. Então construí o meu: o jogo inteiro é HTML, CSS e JavaScript puro, e a IA (Minimax com poda alfa-beta e avaliação por janelas de 4) roda dentro do browser.

## O que tem

- **Avaliação por janelas de 4** (o que faz a IA do Lig 4 jogar forte): cada janela de 4 casas em linha conta — 3 minhas + 1 vazia = um lance da vitória (+60), 2+2 = boa posição (+12), o adversário com 3+1 = bloquear URGENTE (−70); janela misturada vale nada; a coluna do centro vale mais (participa de mais janelas)
- **Minimax (negamax) com poda alfa-beta + iterative deepening** com orçamento de tempo (PC = 800ms ≈ profundidade 7-9, Impossível = 2500ms ≈ 10-13)
- **Variedade na escolha**: entre colunas quase equivalentes (≤ 15cp) a IA sorteia — o jogo nunca sai igual
- **3 modos**: Jogador × Jogador, Jogador × PC, Impossível
- **Placar de sessão** e destaque da linha vencedora (verde + contorno dourado)

## Como rodar

```bash
npm start          # sobe o servidor estático em http://localhost:3347
npm test           # 17 testes das regras + da IA (node --test)
```

**Jogue online agora**: https://francoscorporation.github.io/lig4_ia/ — o jogo é 100% estático (servidor só serve arquivos). Para rodar local use `npm start` (abrir o index.html direto via file:// não carrega os módulos ES do navegador).

## Como foi testado

17 testes automatizados (node --test) cobrindo as regras e a IA, todos passando:

- **Regras (10)**: tabuleiro 7×6 vazio · a quantidade certa de janelas (24 horizontais + 21 verticais + 24 diagonais) · a peça cai na linha mais baixa · coluna cheia devolve null · vitórias nas 4 direções (horizontal, vertical, diagonais ↗ e ↘) · 3 em linha NÃO vence · empate com o tabuleiro cheio · o estado do jogo (vitória quando quem jogou fechou)
- **IA (7)**: coluna válida na posição inicial · **bloqueia a ameaça de 3 em linha do adversário** (joga na coluna exata) · **fecha a própria vitória quando disponível** · a vantagem do centro no score · profundidade 6 em menos de 5s · o jogo da IA contra ela mesma termina (sem loop infinito) · escolheJogada com orçamento de tempo

## Estrutura

```
lig4_ia/
├── index.html         # o jogo
├── style.css          # grid 7x6 no padrão do tabuleiro azul
├── server.js          # servidor estático (sem build)
├── js/
│   ├── lig4-rules.js  # regras: queda por coluna, janelas de 4, vitórias, empate
│   ├── ai-minimax.js  # negamax com poda + avaliação por janelas + iterative deepening
│   └── app.js         # UI: clique na coluna, destaque da vitória, placar, modos
└── test/
    ├── lig4-rules-test.mjs
    └── ia-test.mjs
```

## Sobre a série

Este é o quinto jogo da série de jogos com IA: [Jogo da Velha](https://github.com/FrancosCorporation/jogo_da_velha_ia) → [Xadrez](https://github.com/FrancosCorporation/xadrez_ia) → [Futebol de Botão](https://github.com/FrancosCorporation/botao_ia) → [Damas](https://github.com/FrancosCorporation/damas_ia) → Lig 4. Jogos clássicos no navegador, com IA rodando no browser, sem dependência externa e com testes provando as regras.

Código aberto: https://github.com/FrancosCorporation/lig4_ia
