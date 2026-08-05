/**
 * R2.6 — catálogo das operações de escrita controlada em staging, e a máquina de estados
 * que decide qual delas pode rodar agora.
 *
 * POR QUE ISTO É UM MÓDULO, E NÃO UM `case` NO SHELL
 *
 * Toda decisão daqui é irreversível contra um ambiente real: adotar histórico, aplicar
 * migration, anular GTIN. Decisão em shell é decisão sem teste — e a única hora barata de
 * descobrir que a máquina de estados aceita uma ordem errada é aqui, num `bun run test`,
 * e não no meio de uma aplicação.
 *
 * NÃO EXISTE `apply-all`. A ausência é o desenho: uma operação que aplica tudo de uma vez
 * transforma nove checkpoints em um, e o valor inteiro deste workflow está nos checkpoints.
 */

export type Operacao =
  | "plan"
  | "adopt-seven-baseline"
  | "apply-normalization"
  | "apply-core-hardening"
  | "apply-contribution-hardening"
  | "remediate-demo-gtins"
  | "apply-r2a"
  | "apply-r2b"
  | "validate";

/**
 * As sete migrations anteriores a `20260803000000`. Staging foi medido como
 * materialmente equivalente a elas em R2.5 (`EXACT SEVEN-MIGRATION EQUIVALENT`, 309
 * objetos, 0 diferenças) — mas o histórico remoto está VAZIO, porque o schema foi aplicado
 * pelo editor SQL do painel e não pela CLI. A adoção só registra o que já existe.
 */
export const VERSOES_DO_BASELINE = [
  "20260727005424",
  "20260727155418",
  "20260727155726",
  "20260727155843",
  "20260729210000",
  "20260729223000",
  "20260730120000",
] as const;

/** As cinco pendentes, na única ordem em que podem ser aplicadas. */
export const VERSAO_NORMALIZACAO = "20260803000000";
export const VERSAO_HARDENING_CENTRAL = "20260803005000";
export const VERSAO_HARDENING_CONTRIBUICAO = "20260803007500";
export const VERSAO_R2A = "20260803010000";
export const VERSAO_R2B = "20260803020000";

export interface DefinicaoDeOperacao {
  /** Frase exata exigida no input. `null` = operação read-only, não exige frase. */
  readonly frase: string | null;
  /** Quantas versões o histórico remoto precisa ter ANTES desta operação. */
  readonly historicoAntes: number | null;
  /** Quantas versões o histórico terá DEPOIS. Igual a `historicoAntes` quando não aplica migration. */
  readonly historicoDepois: number | null;
  /** A migration que esta operação aplica, se aplicar alguma. */
  readonly versaoAlvo: string | null;
  /** Escreve no banco? */
  readonly escreve: boolean;
  readonly descricao: string;
}

export const OPERACOES: Readonly<Record<Operacao, DefinicaoDeOperacao>> = {
  plan: {
    frase: null,
    historicoAntes: null,
    historicoDepois: null,
    versaoAlvo: null,
    escreve: false,
    descricao: "auditoria read-only completa; não escreve nada",
  },
  "adopt-seven-baseline": {
    frase: "ADOPT SEVEN MIGRATIONS IN VIPRECO STAGING",
    historicoAntes: 0,
    historicoDepois: 7,
    versaoAlvo: null,
    escreve: true,
    descricao: "registra as sete versões históricas por `supabase migration repair`",
  },
  "apply-normalization": {
    frase: "APPLY NORMALIZATION TO VIPRECO STAGING",
    historicoAntes: 7,
    historicoDepois: 8,
    versaoAlvo: VERSAO_NORMALIZACAO,
    escreve: true,
    descricao: "aplica o contrato único de normalização",
  },
  "apply-core-hardening": {
    frase: "APPLY CORE HARDENING TO VIPRECO STAGING",
    historicoAntes: 8,
    historicoDepois: 9,
    versaoAlvo: VERSAO_HARDENING_CENTRAL,
    escreve: true,
    descricao: "revoga escrita pública de markets, products e prices",
  },
  "apply-contribution-hardening": {
    frase: "APPLY CONTRIBUTION HARDENING TO VIPRECO STAGING",
    historicoAntes: 9,
    historicoDepois: 10,
    versaoAlvo: VERSAO_HARDENING_CONTRIBUICAO,
    escreve: true,
    descricao: "revoga todo privilégio público das três tabelas de contribuição",
  },
  "remediate-demo-gtins": {
    frase: "NULL TWO DEMO GTINS IN VIPRECO STAGING",
    historicoAntes: 10,
    historicoDepois: 10,
    versaoAlvo: null,
    escreve: true,
    descricao: "anula exatamente dois GTINs demo inválidos, em transação",
  },
  "apply-r2a": {
    frase: "APPLY R2A TO VIPRECO STAGING",
    historicoAntes: 10,
    historicoDepois: 11,
    versaoAlvo: VERSAO_R2A,
    escreve: true,
    descricao: "aplica identidade e quantidade estruturada, e roda G7-POST",
  },
  "apply-r2b": {
    frase: "APPLY R2B TO VIPRECO STAGING",
    historicoAntes: 11,
    historicoDepois: 12,
    versaoAlvo: VERSAO_R2B,
    escreve: true,
    descricao: "aplica a integridade de GTIN",
  },
  validate: {
    frase: null,
    historicoAntes: null,
    historicoDepois: null,
    versaoAlvo: null,
    escreve: false,
    descricao: "validação final read-only do estado de staging",
  },
};

export const OPERACOES_VALIDAS = Object.keys(OPERACOES) as Operacao[];

export function ehOperacao(valor: string): valor is Operacao {
  return Object.prototype.hasOwnProperty.call(OPERACOES, valor);
}

/**
 * A ordem canônica das operações de escrita. `remediate-demo-gtins` vem ANTES de R2-A por
 * um motivo material: R2-B cria a constraint de GTIN válido, e um GTIN inválido presente
 * faria a constraint falhar. Remediar antes é o que torna a sequência possível.
 */
export const SEQUENCIA_DE_ESCRITA: readonly Operacao[] = [
  "adopt-seven-baseline",
  "apply-normalization",
  "apply-core-hardening",
  "apply-contribution-hardening",
  "remediate-demo-gtins",
  "apply-r2a",
  "apply-r2b",
];

export interface EstadoMedido {
  /** Quantas versões o histórico remoto tem AGORA. */
  readonly historicoRemoto: number;
  /** Os dois GTINs demo inválidos já foram anulados? */
  readonly gtinsInvalidos: number;
}

export interface Veredito {
  readonly pode: boolean;
  readonly motivos: readonly string[];
}

/**
 * Decide se `operacao` pode rodar contra `estado`.
 *
 * A pergunta que este código responde não é "a operação é válida?", e sim "a operação
 * anterior terminou?". São diferentes: aplicar R2-A com o histórico em 9 é uma operação
 * perfeitamente válida contra um banco no estado errado — e é assim que um passo pulado
 * vira um schema que ninguém sabe descrever.
 */
export function podeExecutar(operacao: Operacao, estado: EstadoMedido): Veredito {
  const definicao = OPERACOES[operacao];
  const motivos: string[] = [];

  if (definicao.historicoAntes !== null && estado.historicoRemoto !== definicao.historicoAntes) {
    motivos.push(
      `o histórico remoto tem ${estado.historicoRemoto} versão(ões), e '${operacao}' exige exatamente ${definicao.historicoAntes}. ` +
        (estado.historicoRemoto < definicao.historicoAntes
          ? "Alguma operação anterior não foi executada."
          : "Esta operação já foi executada, ou uma posterior foi."),
    );
  }

  // R2-B cria `products_gtin_valid`. Aplicá-la com GTIN inválido presente falha na
  // validação da constraint — e falhar no meio de uma migration é o pior lugar para
  // descobrir isso. R2-A é o passo anterior, e é onde a exigência passa a valer.
  if ((operacao === "apply-r2a" || operacao === "apply-r2b") && estado.gtinsInvalidos > 0) {
    motivos.push(
      `há ${estado.gtinsInvalidos} GTIN(s) inválido(s) em products. Rode 'remediate-demo-gtins' antes: R2-B cria a constraint que eles violam.`,
    );
  }

  if (operacao === "remediate-demo-gtins" && estado.gtinsInvalidos !== 2) {
    motivos.push(
      `a remediação exige exatamente 2 GTINs inválidos conhecidos, e foram medidos ${estado.gtinsInvalidos}. ` +
        (estado.gtinsInvalidos === 0
          ? "Nada a remediar — a operação já rodou."
          : "Um terceiro registro inválido é achado novo, e achado novo é decisão do Founder/PMO."),
    );
  }

  return { pode: motivos.length === 0, motivos };
}

/** A próxima operação de escrita pendente, ou `null` se a sequência terminou. */
export function proximaOperacao(estado: EstadoMedido): Operacao | null {
  return SEQUENCIA_DE_ESCRITA.find((op) => podeExecutar(op, estado).pode) ?? null;
}

/**
 * Confere a frase de confirmação. Comparação exata, sem `trim`, sem normalizar caixa.
 *
 * Aparar em silêncio é a mesma família de defeito que a validação do segredo de R2.3D
 * recusa: se a pessoa colou algo diferente do que a operação exige, a resposta certa é
 * dizer isso — e não adivinhar o que ela quis dizer.
 */
export function fraseConfere(operacao: Operacao, informada: string): boolean {
  const esperada = OPERACOES[operacao].frase;
  if (esperada === null) return true;
  return informada === esperada;
}
