/**
 * Mercados do seletor "Seu mercado habitual" da Home, resolvidos no servidor (loader da rota).
 *
 * =============================================================================
 * ESTACIONADO EM R3.3A — NÃO É CHAMADO POR NENHUMA ROTA HOJE
 * =============================================================================
 *
 * O seletor saiu da Home: personalização não é escopo do MVP, e um seletor na primeira tela
 * declarava o contrário. Ele continua vivo em `/produto/$productId`, na variante compacta — mas
 * lá ele resolve a lista no cliente, e não passa por este serviço.
 *
 * O arquivo fica, e a razão é que a ideia foi **adiada, não rejeitada**: "preferência de mercado
 * / mercado habitual / personalização futura" está registrada como POST-MVP em
 * `docs/product/ROADMAP-MVP-v3.md` §4. Quando o seletor voltar à Home, ele volta com o
 * pré-carregamento de servidor que este módulo já resolve — inclusive o tratamento de falha
 * abaixo, que é a parte que custou a escrever. Apagá-lo agora seria jogar fora o trabalho para
 * reescrevê-lo igual depois.
 *
 * Por que existe: o `UsualMarketPicker` buscava a lista no cliente, então o HTML inicial da Home
 * saía com "Carregando mercados…" — o último carregamento visível da primeira dobra depois do
 * PR #31. Resolvendo no loader, a lista já chega renderizada.
 *
 * A fonte segue o modo do ambiente (`@/lib/app-mode`), o mesmo dos Achados:
 * - `demo`   — **fonte ativa hoje**: fixture versionado, sem nenhuma consulta ao Supabase.
 * - `piloto` — dormente: consulta o catálogo.
 *
 * Falha do Supabase **não pode derrubar a Home**. No modo piloto, um erro de rede vira `null`
 * (e não uma exceção que quebraria o loader inteiro, levando junto os Achados). `null` significa
 * "o servidor não resolveu" e devolve ao componente o seu comportamento próprio de cliente —
 * carregar, e oferecer "Tentar novamente" se também falhar lá. Nenhuma tela vazia.
 */
import { appMode, type AppMode } from "@/lib/app-mode";
import { DEMO_MARKETS } from "@/lib/demo-opportunities";
import type { Market } from "@/types/domain";

export async function loadHomeMarkets(source: AppMode = appMode()): Promise<Market[] | null> {
  if (source === "demo") {
    // Cópia rasa: o fixture é um módulo compartilhado entre requisições e nunca deve ser
    // entregue por referência a algo que possa mutá-lo.
    return DEMO_MARKETS.map((market) => ({ ...market }));
  }

  try {
    const { getMarkets } = await import("@/services/catalog");
    return await getMarkets();
  } catch (error) {
    console.error("Não foi possível carregar os mercados no servidor.", error);
    return null;
  }
}
