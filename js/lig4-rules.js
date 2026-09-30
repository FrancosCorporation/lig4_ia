// Regras do Lig 4 (conecta 4) em JS puro — tabuleiro 7 colunas × 6 fileiras.
// Casa vazia = null | 'w' (branco) | 'b' (preto). Índice = coluna * 6 + linha (linha 0 = baixo).

export const COLUNAS = 7;
export const LINHAS = 6;

export function estadoInicial() {
  return { tabuleiro: new Array(COLUNAS * LINHAS).fill(null), turno: 'w' };
}

export const idx = (col, lin) => col * LINHAS + lin;
export const colDe = (i) => Math.floor(i / LINHAS);

// a linha onde a peça cai ao soltar na coluna (ou -1: coluna cheia)
export function linhaDeQueda(estado, col) {
  if (col < 0 || col >= COLUNAS) return -1;
  for (let l = 0; l < LINHAS; l++) {
    if (!estado.tabuleiro[idx(col, l)]) return l;
  }
  return -1;
}

// soltar na coluna (devolve o novo estado; null se a coluna está cheia)
export function soltar(estado, col) {
  const linha = linhaDeQueda(estado, col);
  if (linha < 0) return null;
  const tab = estado.tabuleiro.slice();
  tab[idx(col, linha)] = estado.turno;
  return { tabuleiro: tab, turno: estado.turno === 'w' ? 'b' : 'w' };
}

// TODAS as janelas de 4 em linha (horizontal, vertical, 2 diagonais)
export function janelas() {
  const out = [];
  for (let c = 0; c < COLUNAS; c++) {
    for (let l = 0; l < LINHAS; l++) {
      if (c + 3 < COLUNAS) out.push([idx(c, l), idx(c + 1, l), idx(c + 2, l), idx(c + 3, l)]);
      if (l + 3 < LINHAS) out.push([idx(c, l), idx(c, l + 1), idx(c, l + 2), idx(c, l + 3)]);
      if (c + 3 < COLUNAS && l + 3 < LINHAS) out.push([idx(c, l), idx(c + 1, l + 1), idx(c + 2, l + 2), idx(c + 3, l + 3)]);
      if (c + 3 < COLUNAS && l - 3 >= 0) out.push([idx(c, l), idx(c + 1, l - 1), idx(c + 2, l - 2), idx(c + 3, l - 3)]);
    }
  }
  return out;
}

export const TODAS_JANELAS = janelas();

// a cor venceu?
export function venceu(tab, cor) {
  return TODAS_JANELAS.some(w => w.every(i => tab[i] === cor));
}

// as casas da linha vencedora (para destacar na UI) ou null
export function linhaVencedora(tab, cor) {
  return TODAS_JANELAS.find(w => w.every(i => tab[i] === cor)) || null;
}

// estado do jogo: 'andamento' | 'vitoria' (quem tem a vez PERDEU) | 'empate' (tabuleiro cheio)
export function estadoJogo(estado) {
  const outro = estado.turno === 'w' ? 'b' : 'w';
  if (venceu(estado.tabuleiro, outro)) return 'vitoria';
  if (estado.tabuleiro.every(c => c !== null)) return 'empate';
  return 'andamento';
}
