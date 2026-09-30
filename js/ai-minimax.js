// IA do Lig 4 — Minimax (negamax) com poda alfa-beta, iterative deepening e avaliação
// por JANELAS DE 4 (3+1 = urgente, 2+2 = bom, centro vale mais). O padrão da série:
// iterative deepening com orçamento de tempo + variedade na escolha.

import { estadoInicial, soltar, estadoJogo, linhaDeQueda, TODAS_JANELAS, COLUNAS, LINHAS, idx } from './lig4-rules.js';

export function avaliar(estado, cor = estado.turno) {
  const tab = estado.tabuleiro;
  let score = 0;
  const outro = cor === 'w' ? 'b' : 'w';

  for (const w of TODAS_JANELAS) {
    let meus = 0, dele = 0;
    for (const i of w) {
      if (tab[i] === cor) meus++;
      else if (tab[i] === outro) dele++;
    }
    if (meus > 0 && dele > 0) continue;       // janela misturada: inútil
    if (meus === 3) score += 60;              // 3+1: um lance da vitória
    else if (meus === 2) score += 12;         // 2+2
    else if (meus === 1) score += 2;
    if (dele === 3) score -= 70;              // o adversário com 3+1: bloquear URGENTE
    else if (dele === 2) score -= 14;
  }

  // a coluna do centro vale mais (participa de mais janelas)
  for (let l = 0; l < LINHAS; l++) {
    const p = tab[idx(3, l)];
    if (p === cor) score += 8;
    else if (p === outro) score -= 8;
  }

  return score;
}

function ordena(estado) {
  // colunas centrais primeiro (mais janelas)
  const ordem = [3, 2, 4, 1, 5, 0, 6];
  return ordem.filter(c => linhaDeQueda(estado, c) >= 0);
}

function busca(estado, profundidade, alpha, beta) {
  const fim = estadoJogo(estado);
  if (fim === 'vitoria') return -100000 - profundidade * 100; // quem tem a vez PERDEU
  if (fim === 'empate') return 0;
  if (profundidade === 0) return avaliar(estado);

  let melhor = -Infinity;
  for (const col of ordena(estado)) {
    const v = -busca(soltar(estado, col), profundidade - 1, -beta, -alpha);
    if (v > melhor) melhor = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break; // poda
  }
  return melhor;
}

// profundidade FIXA (usado nos testes)
export function jogadaMinimax(estado, profundidade = 5) {
  const colunas = ordena(estado);
  if (!colunas.length) return null;
  let melhor = null, melhorV = -Infinity;
  let alpha = -Infinity;
  for (const col of colunas) {
    const v = -busca(soltar(estado, col), profundidade - 1, -Infinity, -alpha);
    if (v > melhorV) { melhorV = v; melhor = col; }
    if (melhorV > alpha) alpha = melhorV;
  }
  return melhor;
}

// ITERATIVE DEEPENING + variedade (≤ 15cp do melhor sorteia — evita jogo previsível)
export function escolheJogada(estado, tempoMs = 1000, opts = {}) {
  const profMax = opts.profMax ?? 64;
  const ruido = opts.ruido ?? 0;
  const colunas = ordena(estado);
  if (!colunas.length) return null;
  const t0 = Date.now();
  let melhor = colunas[0];
  let scores = new Map();
  for (let prof = 1; prof <= profMax; prof++) {
    const scoresProf = new Map();
    let melhorV = -Infinity, melhorDaProf = null;
    let alpha = -Infinity;
    let completo = true;
    for (const col of colunas) {
      const v = -busca(soltar(estado, col), prof - 1, -Infinity, -alpha);
      scoresProf.set(col, v);
      if (v > melhorV) { melhorV = v; melhorDaProf = col; }
      if (melhorV > alpha) alpha = melhorV;
      if (Date.now() - t0 > tempoMs) { completo = false; break; }
    }
    if (completo) {
      scores = scoresProf;
      if (melhorDaProf !== null) melhor = melhorDaProf;
    }
    if (!completo || Date.now() - t0 > tempoMs) break;
  }
  const melhorScore = scores.get(melhor) || 0;
  if (ruido > 0) {
    let melhorComRuido = null, melhorV = -Infinity;
    for (const cand of colunas) {
      const v = (scores.get(cand) ?? -Infinity) + (Math.random() * 2 - 1) * ruido;
      if (v > melhorV) { melhorV = v; melhorComRuido = cand; }
    }
    return melhorComRuido ?? melhor;
  }
  const candidatos = colunas.filter(c => {
    const v = scores.get(c);
    return v !== undefined && v >= melhorScore - 15;
  });
  if (candidatos.length > 1) return candidatos[Math.floor(Math.random() * candidatos.length)];
  return melhor;
}
