import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, DoorOpen, Sparkles, Store } from "lucide-react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { WhatsAppGlyph } from "@/components/WhatsAppCta";
import { DemoNote } from "@/components/DemoNote";
import { consumerWhatsappLink } from "@/lib/whatsapp";

/**
 * =============================================================================
 * TELA 5 DO NORTH STAR — RECEBER OS ACHADOS NO WHATSAPP
 * =============================================================================
 *
 * Tela de APRESENTAÇÃO da retenção, e nada além disso (§6 do mandato). Não há infraestrutura de
 * R7 aqui: nenhum formulário, nenhum cadastro, nenhum envio, nenhuma automação. O que existe é
 * o convite, desenhado, para o Founder conseguir mostrar do que se trata.
 *
 * =============================================================================
 * A COPY, E AS PROMESSAS QUE ELA NÃO FAZ
 * =============================================================================
 *
 * A referência escreve "As melhores ofertas todos os dias". As duas metades são proibidas: "as
 * melhores" é superlativo sem universo, e "todos os dias" é uma frequência que ninguém se
 * comprometeu a manter. Cada benefício aqui descreve o que a mensagem CONTÉM — produto, preço,
 * mercado — ou o que ela não faz, e nunca com que ritmo ela chega.
 *
 * "Quando tiver novidade" é a única frase sobre tempo, e ela é honesta justamente por não
 * marcar hora: diz que só chega quando há o que dizer.
 *
 * =============================================================================
 * O CTA FALHA FECHADO
 * =============================================================================
 *
 * Sem número configurado — que é o estado de staging hoje —, o botão não vira link quebrado nem
 * conversa com número errado: ele fica desabilitado, e uma linha abaixo dele explica por quê. Um
 * botão que promete abrir o WhatsApp e não abre custa mais confiança numa entrevista do que um
 * botão que diz "ainda não está ligado".
 */
export const Route = createFileRoute("/whatsapp")({
  component: WhatsAppPage,
  head: () => ({
    meta: [
      { title: "Receber os Achados de Artemis no WhatsApp — ViPreço" },
      {
        name: "description",
        content:
          "Receba no WhatsApp os achados de Artemis: produto, preço e mercado, quando tiver novidade.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const BENEFICIOS = [
  {
    icone: <Sparkles aria-hidden="true" className="text-primary size-5 shrink-0" />,
    titulo: "Novos achados",
    texto: "Avisamos quando aparece um preço novo nos mercados monitorados.",
  },
  {
    icone: <Store aria-hidden="true" className="text-primary size-5 shrink-0" />,
    titulo: "Produto, preço e mercado",
    texto: "A mensagem diz o que é, quanto custa e onde foi observado.",
  },
  {
    icone: <DoorOpen aria-hidden="true" className="text-primary size-5 shrink-0" />,
    titulo: "Saída simples",
    texto: "É só pedir para parar, e para de chegar.",
  },
] as const;

function WhatsAppPage() {
  const href = consumerWhatsappLink();

  return (
    <AppShell>
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center">
          <Link
            to="/"
            aria-label="Voltar para os Achados"
            className="btn-base btn-quiet size-12 shrink-0 rounded-full p-0"
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </Link>
        </div>

        {/* O elemento gráfico é PRÓPRIO — um balão de conversa com uma etiqueta de preço, dois
            signos que o produto já usa. Nenhum logotipo de terceiro é reproduzido. */}
        <div className="flex justify-center pt-2">
          <BalaoComEtiqueta />
        </div>

        <div className="space-y-2 text-center">
          <h1 className="font-display text-[1.75rem] leading-[1.15] font-extrabold sm:text-[2rem]">
            Receba os Achados
            <br />
            de Artemis
          </h1>
          <p className="text-muted-foreground mx-auto max-w-[30ch] text-sm">
            Os preços que observamos nos mercados de Artemis, direto no seu WhatsApp.
          </p>
        </div>

        <ul className="space-y-2.5">
          {BENEFICIOS.map((b) => (
            <li
              key={b.titulo}
              className="bg-secondary/55 border-secondary-foreground/12 flex items-start gap-3 rounded-xl border p-3.5"
            >
              {b.icone}
              <div className="min-w-0">
                <p className="text-[0.9375rem] leading-tight font-bold">{b.titulo}</p>
                <p className="text-muted-foreground mt-0.5 text-sm leading-snug">{b.texto}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="space-y-2">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-base btn-primary btn-touch-48 w-full text-base"
            >
              <WhatsAppGlyph />
              Quero receber no WhatsApp
            </a>
          ) : (
            <>
              <button
                type="button"
                disabled
                aria-describedby="whatsapp-indisponivel"
                className="btn-base btn-primary btn-touch-48 w-full text-base opacity-55"
              >
                <WhatsAppGlyph />
                Quero receber no WhatsApp
              </button>
              <p id="whatsapp-indisponivel" className="text-muted-foreground text-center text-xs">
                O canal ainda não está ligado nesta demonstração.
              </p>
            </>
          )}
          <p className="text-muted-foreground text-center text-xs">
            É gratuito, e você pode sair quando quiser.
          </p>
        </div>

        <DemoNote className="text-center" />
      </div>
    </AppShell>
  );
}

/** Balão de conversa com etiqueta de preço — desenho próprio, sem marca de terceiro. */
function BalaoComEtiqueta(): ReactNode {
  return (
    <svg
      viewBox="0 0 200 180"
      className="size-40 sm:size-44"
      role="img"
      aria-label="Ilustração de uma mensagem com uma etiqueta de preço"
    >
      <defs>
        <linearGradient id="wa-balao" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f7a56" />
          <stop offset="0.55" stopColor="#178a5f" />
          <stop offset="1" stopColor="#0e5c3c" />
        </linearGradient>
        <linearGradient id="wa-tag" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7cf6c" />
          <stop offset="1" stopColor="#e0a92f" />
        </linearGradient>
      </defs>

      {/* faíscas */}
      <g stroke="#0e5c3c" strokeWidth="6" strokeLinecap="round" opacity="0.75">
        <path d="M38 34l-9-9M100 16v-11M162 34l9-9" />
      </g>
      <g stroke="#f5c24b" strokeWidth="6" strokeLinecap="round">
        <path d="M28 66h-12M176 62h12" />
      </g>

      {/* balão */}
      <path
        d="M100 26c-36 0-65 25-65 56 0 15 7 29 19 39l-6 24 27-13c8 3 16 4 25 4 36 0 65-25 65-54s-29-56-65-56z"
        fill="url(#wa-balao)"
      />
      {/* fone estilizado dentro do balão */}
      <path
        d="M83 66c-3 3-4 8-2 13 5 15 18 27 33 31 5 1 10 0 13-3l5-5c2-2 1-5-1-6l-13-7c-2-1-4-1-6 1l-4 4c-6-3-12-9-15-15l4-4c2-2 2-4 1-6l-7-13c-1-2-4-3-6-1z"
        fill="#fbf7ec"
      />

      {/* etiqueta de preço */}
      <g transform="rotate(-14 150 132)">
        <path
          d="M118 116h44a8 8 0 0 1 6 3l20 22a6 6 0 0 1 0 8l-20 22a8 8 0 0 1-6 3h-44a8 8 0 0 1-8-8v-42a8 8 0 0 1 8-8z"
          fill="url(#wa-tag)"
        />
        <circle cx="128" cy="145" r="6.5" fill="#fbf7ec" />
        <text
          x="158"
          y="154"
          textAnchor="middle"
          fontFamily="Helvetica, Arial, sans-serif"
          fontSize="30"
          fontWeight="700"
          fill="#5c3e11"
        >
          %
        </text>
      </g>
    </svg>
  );
}
