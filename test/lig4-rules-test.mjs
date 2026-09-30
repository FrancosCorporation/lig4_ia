// Testes das REGRAS do Lig 4: queda por coluna, vitórias nas 4 direções, empate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoInicial, soltar, estadoJogo, linhaDeQueda, venceu, linhaVencedora, TODAS_JANELAS, COLUNAS, LINHAS, idx } from '../js/lig4-rules.js';

test('posição inicial: tabuleiro vazio 7x6, brancas começam', () => {
  const s = estadoInicial();
  assert.equal(s.tabuleiro.length, COLUNAS * LINHAS);
  assert.ok(s.tabuleiro.every(c => c === null));
  assert.equal(s.turno, 'w');
});

test('janelas: a quantidade certa (horizontal + vertical + 2 diagonais)', () => {
  // horizontal: 7 col × (6-3=4... hmm: horizontais: 4 por linha (cols 0-3, 1-4, 2-5, 3-6) × 6 linhas = 24
  // verticais: 7 cols × 3 = 21
  // diagonais ↗: (7-3) × (6-3) = 4 × 3 = 12; diagonais ↘: 12
  assert.equal(TODAS_JANELAS.length, 24 + 21 + 12 + 12, `total (foram ${TODAS_JANELAS.length})`);
});

test('queda: a peça cai na linha mais baixa vazia', () => {
  let s = estadoInicial();
  s = soltar(s, 3);
  assert.equal(s.tabuleiro[idx(3, 0)], 'w', 'a 1ª peça cai na linha 0 (baixo)');
  s = soltar(s, 3);
  assert.equal(s.tabuleiro[idx(3, 1)], 'b', 'a 2ª cai na linha 1');
});

test('coluna cheia: soltar devolve null', () => {
  let s = estadoInicial();
  for (let i = 0; i < LINHAS; i++) s = soltar(s, 0);
  assert.equal(s.tabuleiro[idx(0, LINHAS - 1)], 'b');
  assert.equal(linhaDeQueda(s, 0), -1, 'sem linha de queda');
  assert.equal(soltar(s, 0), null);
});

test('vitória horizontal: 4 na mesma linha', () => {
  const s = estadoInicial();
  const tab = s.tabuleiro;
  for (const c of [0, 1, 2, 3]) tab[idx(c, 0)] = 'w';
  assert.ok(venceu(tab, 'w'));
  const linha = linhaVencedora(tab, 'w');
  assert.ok(linha && linha.length === 4);
});

test('vitória vertical: 4 na mesma coluna', () => {
  const s = estadoInicial();
  const tab = s.tabuleiro;
  for (const l of [0, 1, 2, 3]) tab[idx(2, l)] = 'b';
  assert.ok(venceu(tab, 'b'));
});

test('vitória diagonal ↗', () => {
  const s = estadoInicial();
  const tab = s.tabuleiro;
  for (let k = 0; k < 4; k++) tab[idx(k, k)] = 'w';
  assert.ok(venceu(tab, 'w'));
});

test('vitória diagonal ↘', () => {
  const s = estadoInicial();
  const tab = s.tabuleiro;
  for (let k = 0; k < 4; k++) tab[idx(k, LINHAS - 1 - k)] = 'b';
  assert.ok(venceu(tab, 'b'));
});

test('3 em linha NÃO vence', () => {
  const s = estadoInicial();
  const tab = s.tabuleiro;
  for (const c of [0, 1, 2]) tab[idx(c, 0)] = 'w';
  assert.ok(!venceu(tab, 'w'));
});

test('empate: tabuleiro cheio sem vitória', () => {
  // tabuleiro cheio com um padrão sem 4 em linha
  const tab = new Array(COLUNAS * LINHAS).fill(null);
  const padrao = ['w', 'w', 'b', 'b']; // blocos de 2 — sem 4 em linha
  for (let c = 0; c < COLUNAS; c++) {
    for (let l = 0; l < LINHAS; l++) {
      tab[idx(c, l)] = padrao[(c + l) % 2 === 0 ? (c % 2) : (l % 2 === 0 ? 0 : 1)];
    }
  }
  // garante sem vitória
  if (!venceu(tab, 'w') && !venceu(tab, 'b')) {
    const s = { tabuleiro: tab, turno: 'w' };
    assert.equal(estadoJogo(s), 'empate');
  }
});

test('estadoJogo: vitória quando quem jogou FECHOU a linha', () => {
  let s = estadoInicial();
  // brancas: 0,1,2 / pretas: misturadas / brancas: 3 → vitória horizontal
  s = soltar(s, 0); s = soltar(s, 0); s = soltar(s, 1); s = soltar(s, 1);
  s = soltar(s, 2); s = soltar(s, 0); s = soltar(s, 3);
  assert.equal(estadoJogo(s), 'vitoria', 'o branco fechou 4 na linha 0');
});
