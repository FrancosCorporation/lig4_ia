// Testes da IA de LLM 100% local (navegador): prompt com tabuleiro + colunas, extração de JSON,
// validação do menu, fallback no minimax e o caminho do motor — SEM rede (WebLLM roda no browser).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoInicial, soltar, linhaDeQueda } from '../js/lig4-rules.js';
import { candidatosAvaliados } from '../js/ai-minimax.js';
import {
  montaPrompt, extraiEscolha, validaEscolha, escolheViaLLM,
  carregaWebLLM, placaWebGPU, PADRAO, MODELOS,
} from '../js/llm.js';

test('montaPrompt: tabuleiro compacto + colunas com score + instrução de JSON', () => {
  const s = estadoInicial();
  const cands = candidatosAvaliados(s);
  assert.ok(cands.length >= 1, 'tem colunas avaliadas');
  const p = montaPrompt(s, cands, { lance: 2 });
  assert.ok(p.includes('6 linhas de 7 casas'), 'tabuleiro compacto');
  assert.ok(p.includes('voce (pretas) 0, brancas 0'), 'contagem de peças');
  assert.ok(p.includes('lance 2 do seu turno'), 'qual lance');
  assert.ok(p.includes('score'), 'cada coluna tem score do minimax');
  assert.ok(p.includes('1.'), 'lista numerada');
  assert.ok(p.includes('"i"'), 'pede JSON com o índice');
  assert.ok(p.includes(`numerados 1 a ${cands.length}`), 'limite explícito do menu');
  assert.ok(p.includes(`de 1 a ${cands.length}`), 'i com limite no final');
});

test('montaPrompt: colunas em letras A-G (o LLM lê colunas, não índice cru)', () => {
  const s = estadoInicial();
  const cands = candidatosAvaliados(s);
  const p = montaPrompt(s, cands);
  assert.ok(/coluna [A-G]/.test(p), 'coluna com letra');
});

test('candidatosAvaliados: todas as colunas estão LEGAIS (não cheias) e ordenadas', () => {
  const s = estadoInicial();
  const cands = candidatosAvaliados(s);
  assert.equal(cands.length, 7, '7 colunas livres no início');
  for (const c of cands) {
    assert.ok(linhaDeQueda(s, c.col) >= 0, 'coluna legal');
  }
  assert.ok(cands[0].score >= cands[cands.length - 1].score, 'ordenado do melhor pro pior');
});

test('escolheViaLLM: 1ª resposta inválida → RETRY com o limite → 2ª válida joga', async () => {
  const s = estadoInicial();
  let chamadas = 0;
  const r = await escolheViaLLM(s, { lance: 1 }, PADRAO, {
    chat: async (p) => {
      chamadas++;
      if (chamadas === 1) return '{"i": 42, "motivo": "inventei índice"}';
      assert.ok(p.includes('ERRO: i invalido'), 'retry avisa o limite');
      return '{"i": 1, "motivo": "segunda tentativa"}';
    },
  });
  assert.equal(chamadas, 2, 'duas chamadas');
  assert.equal(r.origem, 'llm');
  assert.equal(r.motivo, 'segunda tentativa');
});

test('escolheViaLLM: resposta válida na 1ª não gasta retry', async () => {
  const s = estadoInicial();
  let chamadas = 0;
  await escolheViaLLM(s, { lance: 1 }, PADRAO, {
    chat: async () => { chamadas++; return '{"i": 2, "motivo": "ok"}'; },
  });
  assert.equal(chamadas, 1);
});

test('extraiEscolha: JSON puro, dentro de ``` e no meio do texto', () => {
  assert.deepEqual(extraiEscolha('{"i":3,"motivo":"bom"}'), { i: 3, motivo: 'bom' });
  assert.deepEqual(extraiEscolha('```json\n{"i":1,"motivo":"x"}\n```'), { i: 1, motivo: 'x' });
  assert.deepEqual(extraiEscolha('Claro! Aqui está: {"i":2,"motivo":"y"} espero que sirva'), { i: 2, motivo: 'y' });
  assert.equal(extraiEscolha('não sei nada'), null);
  assert.equal(extraiEscolha(''), null);
  assert.equal(extraiEscolha('{quebrado'), null);
  assert.deepEqual(extraiEscolha('{"i":4,"motivo":"dupla"}}'), { i: 4, motivo: 'dupla' }, 'chave }} extra');
});

test('validaEscolha: só aceita índice dentro do menu', () => {
  const menu = [{ col: 3 }, { col: 2 }, { col: 4 }];
  const ok = validaEscolha({ i: 2, motivo: 'escolhi o 2' }, menu);
  assert.equal(ok.idx, 1, 'i é 1-based');
  assert.equal(ok.cand, menu[1]);
  assert.equal(ok.motivo, 'escolhi o 2');
  assert.equal(validaEscolha({ i: 0 }, menu), null, 'i=0 inválido');
  assert.equal(validaEscolha({ i: 4 }, menu), null, 'fora do menu');
  assert.equal(validaEscolha({ i: 'abc' }, menu), null, 'não numérico');
  assert.equal(validaEscolha(null, menu), null);
  const semMotivo = validaEscolha({ i: 1 }, menu);
  assert.ok(semMotivo.motivo.length > 0, 'motivo padrão quando falta');
});

test('PADRAO/MODELOS: modelo padrão existe na lista (é o Qwen que obedece o JSON)', () => {
  assert.ok(MODELOS.some(m => m.id === PADRAO.modelo), 'padrão na lista');
  assert.ok(PADRAO.modelo.includes('Qwen2.5-0.5B'), 'escolhido pelo teste real de velocidade/JSON');
});

test('escolheViaLLM: resposta válida → o LLM solta numa coluna LEGAL de verdade', async () => {
  const s = estadoInicial();
  const cands = candidatosAvaliados(s);
  const r = await escolheViaLLM(s, { lance: 1 }, PADRAO, {
    chat: async () => JSON.stringify({ i: 1, motivo: 'centro vale mais' }),
  });
  assert.equal(r.origem, 'llm');
  assert.equal(r.motivo, 'centro vale mais');
  assert.equal(r.lance.col, cands[0].col);
  const novo = soltar(s, r.lance.col); // a coluna precisa aceitar a peça
  assert.ok(novo, 'soltou');
  assert.equal(novo.turno, 'b', 'passou a vez pro preto');
});

test('escolheViaLLM: prompt chega inteiro pro modelo (tabuleiro + colunas)', async () => {
  const s = estadoInicial();
  let capturado = '';
  await escolheViaLLM(s, { lance: 2 }, PADRAO, {
    chat: async (p) => { capturado = p; return '{"i":1,"motivo":"x"}'; },
  });
  assert.ok(capturado.includes('CANDIDATOS'), 'vem com o menu avaliado');
  assert.ok(capturado.includes('lance 2 do seu turno'), 'contexto do turno');
});

test('escolheViaLLM: coluna cheia NUNCA entra no menu (o LLM só recebe colunas jogáveis)', async () => {
  let s = estadoInicial();
  for (let i = 0; i < 6; i++) s = soltar(s, 0); // enche a coluna 0
  const cands = candidatosAvaliados(s);
  assert.ok(!cands.some(c => c.col === 0), 'coluna cheia fora do menu');
  assert.equal(cands.length, 6, 'só as outras 6');
});

test('escolheViaLLM: motor quebrado/sem placa → fallback no minimax (o jogo nunca trava)', async () => {
  const s = estadoInicial();
  const r = await escolheViaLLM(s, { lance: 1 }, PADRAO, {
    chat: async () => { throw new Error('WebGPU indisponível neste navegador'); },
  });
  assert.equal(r.origem, 'minimax');
  assert.equal(r.lance, null, 'app aplica o minimax por fora');
  assert.ok(r.motivo.includes('WebGPU'), r.motivo);
});

test('escolheViaLLM: resposta fora do menu (i=99) → retry falha → fallback', async () => {
  const s = estadoInicial();
  const r = await escolheViaLLM(s, { lance: 1 }, PADRAO, {
    chat: async () => '{"i":99,"motivo":"inventei"}',
  });
  assert.equal(r.origem, 'minimax');
  assert.equal(r.lance, null);
  assert.ok(r.motivo.includes('inválida'), r.motivo);
});

test('escolheViaLLM: texto livre do modelo (sem JSON) → fallback', async () => {
  const s = estadoInicial();
  const r = await escolheViaLLM(s, { lance: 1 }, PADRAO, {
    chat: async () => 'Eu acho que devo jogar no meio, mas não sei...',
  });
  assert.equal(r.origem, 'minimax');
  assert.equal(r.lance, null);
});

test('escolheViaLLM: jogada do LLM é SEMPRE uma coluna do minimax (nunca inventa)', async () => {
  const s = estadoInicial();
  const cands = candidatosAvaliados(s);
  for (let i = 1; i <= cands.length; i++) {
    const r = await escolheViaLLM(s, { lance: 1 }, PADRAO, {
      chat: async () => JSON.stringify({ i, motivo: 'x' }),
    });
    assert.equal(r.origem, 'llm');
    assert.equal(r.lance.col, cands[i - 1].col, 'coluna = do menu (candidato ' + i + ')');
  }
});

test('carregaWebLLM fora do navegador: erro claro de WebGPU (sem rede, sem servidor)', async () => {
  await assert.rejects(() => carregaWebLLM(PADRAO.modelo), /WebGPU indisponível/, 'mensagem em pt-BR');
});

test('placaWebGPU: sem navigator.gpu no Node → null (modo minimax)', async () => {
  const p = await placaWebGPU();
  assert.equal(p, null);
});
