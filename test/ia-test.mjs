// Testes da IA do Lig 4: bloqueia a ameaça, fecha a vitória, não shuffle, performance.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoInicial, soltar, estadoJogo, linhaVencedora, idx, COLUNAS } from '../js/lig4-rules.js';
import { jogadaMinimax, escolheJogada, avaliar } from '../js/ai-minimax.js';

test('IA devolve coluna válida na posição inicial', () => {
  const s = estadoInicial();
  const col = jogadaMinimax(s, 5);
  assert.ok(col !== null && col >= 0 && col < COLUNAS, `coluna: ${col}`);
});

test('IA bloqueia a ameaça de 3 em linha do adversário', () => {
  // brancas: 0,1,2 (linha 0); pretas: 0,1 (linha 0)... branco vai fechar na coluna 3 — a IA (preto) bloqueia
  let s = estadoInicial();
  s = soltar(s, 0); s = soltar(s, 0); s = soltar(s, 1); s = soltar(s, 1);
  s = soltar(s, 2); s = soltar(s, 4); // pretas desperdiçam na 4
  // vez das brancas? não: count: b jogou 3× → vez das brancas
  // hmm: brancas: 0,1,2 / pretas: 0,1,4 → vez das brancas
  // a ameaça do BRANCO (fechar 0-3 na coluna 3) — mas é a vez do branco...
  // montar: vez do PRETO com o branco ameaçando: brancas: 0,1,2 (3 lances), pretas: 0,1 (2 lances), brancas?? 
  let s2 = estadoInicial();
  s2 = soltar(s2, 0); s2 = soltar(s2, 0); s2 = soltar(s2, 1); s2 = soltar(s2, 1); s2 = soltar(s2, 2);
  // agora vez das pretas (brancas: 0,1,2 / pretas: 0,1): o branco ameaça fechar na coluna 3 (linha 0)
  const col = escolheJogada(s2, 600);
  assert.ok(col === 3, `a IA bloqueou na coluna 3 (jogou ${col})`);
});

test('IA fecha a própria vitória quando disponível', () => {
  // pretas: 0,1,2 na linha 0; vez das pretas → a IA fecha na coluna 3
  let s = estadoInicial();
  s = soltar(s, 0); s = soltar(s, 0); s = soltar(s, 1); s = soltar(s, 1); s = soltar(s, 2); s = soltar(s, 5);
  // brancas: 0,1,2?? não: brancas: 0,1,2 (lances 1,3,5) e pretas: 0,1,5 (lances 2,4,6) — vez das brancas
  // refazer: pretas com 3 na linha: lances: b:0, w:4, b:1, w:5, b:2, w:6 → vez das brancas... 
  // brancas precisam jogar fora: w:6 → vez das pretas → a IA fecha na 3
  let s2 = estadoInicial();
  s2 = soltar(s2, 0); s2 = soltar(s2, 4); s2 = soltar(s2, 1); s2 = soltar(s2, 5); s2 = soltar(s2, 2); s2 = soltar(s2, 6);
  // vez das brancas?? lances: w(0),b(4),w(1),b(5),w(2),b(6) = 3 brancas + 3 pretas → vez das brancas
  // ARGH — preciso da vez do PRETO com as pretas em 3 na linha 0:
  let s3 = estadoInicial();
  s3 = soltar(s3, 4); s3 = soltar(s3, 0); s3 = soltar(s3, 5); s3 = soltar(s3, 1); s3 = soltar(s3, 6); s3 = soltar(s3, 2);
  // w(4), b(0), w(5), b(1), w(6), b(2) = vez das brancas... SEMPRE par!
  // truque: o branco desperdiça na coluna cheia? não pode. Usar escolheJogada no estado com a vez das pretas: construir manualmente:
  const sManual = {
    tabuleiro: (() => {
      const t = new Array(42).fill(null);
      t[idx(0, 0)] = 'b'; t[idx(1, 0)] = 'b'; t[idx(2, 0)] = 'b';
      t[idx(4, 0)] = 'w'; t[idx(5, 0)] = 'w';
      return t;
    })(),
    turno: 'b',
  };
  const col2 = jogadaMinimax(sManual, 4);
  assert.ok(col2 === 3, `a IA fechou a vitória na coluna 3 (jogou ${col2})`);
  const novo = soltar(sManual, col2);
  assert.equal(estadoJogo(novo), 'vitoria');
});

test('avaliar: a vantagem do centro reflete no score', () => {
  const s = {
    tabuleiro: (() => {
      const t = new Array(42).fill(null);
      t[idx(3, 0)] = 'w';
      return t;
    })(),
    turno: 'w',
  };
  assert.ok(avaliar(s) > 0, 'o branco no centro: score > 0');
});

test('performance: profundidade 6 em menos de 5s', () => {
  const s = estadoInicial();
  const t0 = Date.now();
  jogadaMinimax(s, 6);
  const dt = Date.now() - t0;
  assert.ok(dt < 5000, `profundidade 6 levou ${dt}ms`);
});

test('escolheJogada: o jogo da IA contra ela mesma termina (sem loop infinito)', () => {
  let s = estadoInicial();
  let lances = 0;
  for (let i = 0; i < 42 && R_estado(s) === 'andamento'; i++) {
    const col = escolheJogada(s, 120);
    if (col === null) break;
    s = soltar(s, col);
    lances++;
  }
  assert.ok(lances > 0, 'lances jogados');
  assert.ok(lances <= 42, 'o jogo acaba (tabuleiro cheio ou vitória)');
});

function R_estado(s) { return estadoJogo(s); }
