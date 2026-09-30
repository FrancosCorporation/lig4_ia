// UI do Lig 4 — grid 7x6, clique na coluna para soltar, destaque da linha vencedora, placar.
// O humano é o branco. A IA é o preto.

import { estadoInicial, soltar, estadoJogo, linhaVencedora, linhaDeQueda, COLUNAS, LINHAS, idx } from './lig4-rules.js';
import { escolheJogada } from './ai-minimax.js';

let estado = estadoInicial();
let modo = 'pc';
let placar = { w: 0, b: 0 };
let animando = false;
let vencedorCasas = null;

const $tab = document.getElementById('tabuleiro');
const $status = document.getElementById('status');
const $placar = document.getElementById('placar');
const $selModo = document.getElementById('modo');
const $reiniciar = document.getElementById('reiniciar');

function constroiTabuleiro() {
  $tab.innerHTML = '';
  // do topo (linha 5) para baixo (linha 0)
  for (let l = LINHAS - 1; l >= 0; l--) {
    for (let c = 0; c < COLUNAS; c++) {
      const casa = document.createElement('div');
      casa.className = 'casa';
      casa.dataset.i = idx(c, l);
      casa.dataset.col = c;
      casa.addEventListener('click', () => clique(c));
      $tab.appendChild(casa);
    }
  }
}

function pinta() {
  for (const casa of $tab.children) {
    const bi = parseInt(casa.dataset.i, 10);
    const p = estado.tabuleiro[bi];
    casa.textContent = p ? (p === 'w' ? '⚪' : '⚫') : '';
    casa.classList.toggle('vencedora', vencedorCasas && vencedorCasas.includes(bi));
    casa.classList.toggle('colAlvo', !p && animando === false && modo !== 'pvp' ? false : false);
  }
  $placar.textContent = `Brancas ${placar.w} × ${placar.b} Pretas`;
}

function avisa(msg) { $status.textContent = msg; }

function clique(col) {
  if (animando) return;
  if (estadoJogo(estado) !== 'andamento') return;
  if (linhaDeQueda(estado, col) < 0) { avisa('Coluna cheia!'); return; }

  const novo = soltar(estado, col);
  if (!novo) return;
  joga(novo, col);
}

function joga(novo, col) {
  estado = novo;
  const fim = estadoJogo(estado);
  const corJogou = estado.turno === 'w' ? 'b' : 'w';
  vencedorCasas = fim === 'vitoria' ? linhaVencedora(estado.tabuleiro, corJogou) : null;
  pinta();

  if (fim === 'vitoria') {
    const vencedor = corJogou === 'w' ? 'Brancas' : 'Pretas';
    placar[corJogou]++;
    avisa(`${vencedor} venceram! Clique em Reiniciar para nova partida.`);
    pinta();
    return;
  }
  if (fim === 'empate') { avisa('Empate (tabuleiro cheio).'); return; }
  avisa(estado.turno === 'w' ? 'Vez das brancas' : 'Vez das pretas');

  if (estado.turno === 'b' && modo !== 'pvp') {
    animando = true;
    avisa('A IA está pensando...');
    setTimeout(() => {
      const tempo = modo === 'impossivel' ? 2500 : 800;
      const col2 = escolheJogada(estado, tempo);
      animando = false;
      if (col2 !== null && col2 !== undefined) {
        const novo2 = soltar(estado, col2);
        if (novo2) joga(novo2, col2);
      } else {
        avisa('Sem lances.');
      }
    }, 120);
  }
}

$selModo.addEventListener('change', () => { modo = $selModo.value; reinicia(); });
$reiniciar.addEventListener('click', reinicia);

function reinicia() {
  estado = estadoInicial();
  animando = false;
  vencedorCasas = null;
  avisa('Vez das brancas');
  pinta();
}

constroiTabuleiro();
reinicia();

window.__lig4 = {
  get estado() { return estado; },
  get fase() { return animando ? 'ia' : 'humano'; },
};
