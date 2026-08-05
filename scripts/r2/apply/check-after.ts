#!/usr/bin/env bun
/**
 * R2.6 — a verificação posterior.
 *
 * Uma operação que roda sem erro é uma operação que não levantou exceção. Não é a mesma
 * coisa que uma operação que fez o que prometeu — e a diferença entre as duas é a razão
 * pela qual a sequência inteira precisa de um passo que MEDE o depois.
 *
 * Compara os fatos de antes e de depois, medidos pelos mesmos `.sql`. Sai em 1 quando o
 * estado posterior não é o previsto, e nesse caso o runner PARA a sequência.
 */
import { lerFatos, medir, todos } from "./fatos";
import { OPERACOES, ehOperacao } from "./operations";

const [operacao = "", caminhoAntes = "", caminhoDepois = ""] = process.argv.slice(2);

if (!ehOperacao(operacao)) {
  console.error(`Operacao desconhecida: '${operacao}'.`);
  process.exit(1);
}

const antes = medir(lerFatos(caminhoAntes));
const depois = medir(lerFatos(caminhoDepois));
const definicao = OPERACOES[operacao];
const problemas: string[] = [];

// 1. O histórico foi para onde deveria — nem menos (não aplicou), nem mais (aplicou várias).
if (definicao.historicoDepois !== null && depois.historicoRemoto !== definicao.historicoDepois) {
  problemas.push(
    `o historico remoto ficou em ${depois.historicoRemoto} versao(oes), e '${operacao}' previa ${definicao.historicoDepois}.` +
      (depois.historicoRemoto > definicao.historicoDepois
        ? " Mais de uma migration foi aplicada num disparo so — o checkpoint seguinte deixou de existir."
        : ""),
  );
}

// 2. Contagem de linha. NENHUMA operação desta sequência pode criar ou apagar linha.
//    A remediação de GTIN altera uma coluna de dois registros; o total continua 7.
for (const [tabela, valorAntes] of Object.entries(antes.linhas)) {
  const valorDepois = depois.linhas[tabela];
  if (valorAntes === null || valorDepois === null) continue;
  if (valorAntes !== valorDepois) {
    problemas.push(
      `public.${tabela} tinha ${valorAntes} linha(s) e passou a ter ${valorDepois}. Nenhuma operacao desta sequencia pode criar nem apagar linha.`,
    );
  }
}

// 3. GTIN. Depois da remediação não pode sobrar inválido; antes dela, o número não muda.
if (operacao === "remediate-demo-gtins") {
  if (depois.gtinsInvalidos !== 0) {
    problemas.push(
      `sobraram ${depois.gtinsInvalidos} GTIN(s) invalido(s) depois da remediacao. A transacao deveria ter revertido.`,
    );
  }
  if (antes.gtinsInvalidos - depois.gtinsInvalidos !== 2) {
    problemas.push(
      `a remediacao anulou ${antes.gtinsInvalidos - depois.gtinsInvalidos} GTIN(s), e o contrato e exatamente 2.`,
    );
  }
} else if (depois.gtinsInvalidos !== antes.gtinsInvalidos) {
  problemas.push(
    `a contagem de GTIN invalido mudou de ${antes.gtinsInvalidos} para ${depois.gtinsInvalidos} numa operacao que nao toca em dado.`,
  );
}

if (depois.gtinsDuplicados !== 0) {
  problemas.push(`ha ${depois.gtinsDuplicados} GTIN(s) duplicado(s) depois da operacao.`);
}

if (problemas.length > 0) {
  console.error(`Estado posterior inesperado depois de '${operacao}':\n`);
  for (const problema of problemas) console.error(`  - ${problema}`);
  console.error(
    "\nNAO continue a sequencia. O proximo passo pressupoe um estado que nao e o medido.",
  );
  process.exit(1);
}

process.stdout.write(
  [
    "### Estado medido depois da operação",
    "",
    "| Fato | Antes | Depois |",
    "| --- | --- | --- |",
    `| histórico de migrations | ${antes.historicoRemoto} | **${depois.historicoRemoto}** |`,
    `| GTINs inválidos | ${antes.gtinsInvalidos} | ${depois.gtinsInvalidos} |`,
    `| GTINs duplicados | ${antes.gtinsDuplicados} | ${depois.gtinsDuplicados} |`,
    ...Object.entries(antes.linhas).map(
      ([tabela, valor]) =>
        `| linhas em \`${tabela}\` | ${valor ?? "—"} | ${depois.linhas[tabela] ?? "—"} |`,
    ),
    "",
    // O default privilege medido, sempre — e não só quando alguém lembra de olhar.
    //
    // A primeira aplicação do hardening central em staging falhou em
    // `permission denied to change default privileges`: o usuário da conexão não é membro
    // do papel administrativo do Supabase que possui o default de `public`. As migrations
    // passaram a tratar isso por papel, aplicando onde conseguem — o que significa que a
    // herança pode continuar aberta, e "pode" não é resposta para uma pergunta de
    // segurança. Publicar o estado a cada operação transforma o resíduo em fato visível
    // em vez de um `RAISE WARNING` que ninguém lê.
    "### Default privileges de tabela em `public`, medidos agora",
    "",
    ...(todos(lerFatos(caminhoDepois), "priv.default_acl").length === 0
      ? ["Nenhuma entrada em `pg_default_acl` para tabelas em `public`."]
      : todos(lerFatos(caminhoDepois), "priv.default_acl").map((linha) => `- \`${linha}\``)),
    "",
  ].join("\n"),
);
