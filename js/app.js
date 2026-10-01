// UI do Lig 4 — grid 7x6, clique na coluna para soltar, destaque da linha vencedora, placar.
// O humano é o branco. A IA é o preto.

import { estadoInicial, soltar, estadoJogo, linhaVencedora, linhaDeQueda, COLUNAS, LINHAS, idx } from './lig4-rules.js';
import { escolheJogada } from './ai-minimax.js';
import { escolheViaLLM, carregaWebLLM, placaWebGPU, PADRAO as LLM_PADRAO } from './llm.js';

let estado = estadoInicial();
let modo = 'medio'; // pvp | facil | medio | dificil | llm
let placar = { w: 0, b: 0 };
let animando = false;
let vencedorCasas = null;
let sessao = 0; // guarda anti-race: reiniciar no meio do "pensando" não deixa a IA jogar no jogo novo

const $tab = document.getElementById('tabuleiro');
const $status = document.getElementById('status');
const $placar = document.getElementById('placar');
const $selModo = document.getElementById('modo');
const $reiniciar = document.getElementById('reiniciar');
const $llmBox = document.getElementById('llm-box');
const $llmModelo = document.getElementById('llm-modelo');
const $llmCarregar = document.getElementById('llm-carregar');
const $llmStatus = document.getElementById('llm-status');

function cfgLLM() {
  return { modelo: $llmModelo.value || LLM_PADRAO.modelo };
}
function salvaCfgLLM() {
  try { localStorage.setItem('lig4-llm', JSON.stringify({ modelo: $llmModelo.value })); } catch {}
}
try { // recupera o que tava salvo
  const s = JSON.parse(localStorage.getItem('lig4-llm') || '{}');
  if (s.modelo) $llmModelo.value = s.modelo;
} catch {}
function sincronizaPainelLLM() {
  $llmBox.hidden = modo !== 'llm';
}
// carrega o modelo NA PLACA do jogador (1ª vez baixa ~350MB e fica no cache; depois é 100% local)
async function carregaModeloLLM() {
  const placa = await placaWebGPU();
  if (!placa) {
    $llmStatus.textContent = '⚠ WebGPU desligado — ative UMA vez: chrome://flags/#enable-unsafe-webgpu → Enabled → reabra o navegador (fica pra sempre). Funciona até SEM placa de vídeo: roda na CPU (SwiftShader)';
    return;
  }
  $llmStatus.textContent = 'placa ' + placa.vendor + (placa.arquitetura ? '/' + placa.arquitetura : '') + ' — preparando… 0%';
  try {
    await carregaWebLLM(cfgLLM().modelo, p => {
      $llmStatus.textContent = 'baixando modelo… ' + Math.round(p * 100) + '%';
    });
    $llmStatus.textContent = '✔ modelo pronto na placa (' + placa.vendor + ') — roda 100% local';
  } catch (e) {
    $llmStatus.textContent = '⚠ ' + (e && e.message ? e.message : e);
  }
}
$llmCarregar.addEventListener('click', carregaModeloLLM);
$llmModelo.addEventListener('change', () => { salvaCfgLLM(); if (modo === 'llm') carregaModeloLLM(); });

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
    const idSessao = sessao;
    if (modo === 'llm') {
      avisa('IA LLM pensando…');
      escolheViaLLM(estado, { lance: 1 }, cfgLLM(), {
        progresso: p => { if (sessao === idSessao) $llmStatus.textContent = 'baixando modelo… ' + Math.round(p * 100) + '%'; },
      }).then(r => {
        if (sessao !== idSessao || !animando) return; // reiniciado no meio
        animando = false;
        if (r.origem === 'llm') avisa('IA LLM: ' + r.motivo);
        else avisa('LLM fora — ' + r.motivo + ' (minimax joga)');
        const col2 = r.lance ? r.lance.col : escolheJogada(estado, 800); // fallback: minimax assume
        if (col2 !== null && col2 !== undefined) {
          const novo2 = soltar(estado, col2);
          if (novo2) joga(novo2, col2);
        } else {
          avisa('Sem lances.');
        }
      });
      return;
    }
    avisa('A IA está pensando...');
    setTimeout(() => {
      if (sessao !== idSessao) return; // reiniciado no meio
      const cfg = modo === 'facil' ? { tempo: 150, opts: { profMax: 1, ruido: 90 } }
                : modo === 'dificil' ? { tempo: 3000 } : { tempo: 800 };
      const col2 = escolheJogada(estado, cfg.tempo, cfg.opts || {});
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

$selModo.addEventListener('change', () => {
  modo = $selModo.value;
  sincronizaPainelLLM();
  if (modo === 'llm') carregaModeloLLM(); // começa a baixar o modelo já, no ato de escolher o modo
  else $llmStatus.textContent = '';
  reinicia();
});
$reiniciar.addEventListener('click', reinicia);

function reinicia() {
  sessao++;
  estado = estadoInicial();
  animando = false;
  vencedorCasas = null;
  avisa('Vez das brancas');
  pinta();
}

constroiTabuleiro();
sincronizaPainelLLM();
reinicia();

window.__lig4 = {
  get estado() { return estado; },
  get fase() { return animando ? 'ia' : 'humano'; },
  get modo() { return modo; },
};
