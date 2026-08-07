import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

/**
 * "Preço com procedência" — o bloco compacto da Home (R3.3A, item 3 da remediação).
 *
 * =============================================================================
 * ERA UMA AULA; VIROU UMA FRASE E UMA PORTA
 * =============================================================================
 *
 * A seção anterior — "Nenhum preço aparece sozinho" — ocupava quatro cartões de atributo, três
 * regras com o seu porquê e um CTA. Ela estava certa no conteúdo e errada no lugar: quem chega
 * na Home quer ver preço, e a explicação de por que o preço é confiável só interessa a quem já
 * decidiu perguntar. Uma tela de descoberta que gasta um terço da rolagem explicando a si mesma
 * empurra os Achados para longe do polegar.
 *
 * O conteúdo NÃO foi descartado. As três regras — você compra na loja, o estoque é do mercado, a
 * ordem não é vendida — foram para `/como-funciona`, que é a rota que existe exatamente para
 * isso. Aqui fica o que a Home precisa dizer: o que acompanha todo preço, e onde ler o resto.
 *
 * A neutralidade continua declarada em público, com todas as letras, na rota de destino. Ela é
 * princípio inviolável do produto, não copy de apoio — e por isso a redução da Home só pôde
 * acontecer depois de o texto existir do outro lado.
 */
export function TrustSection({ isDemo }: { isDemo: boolean }) {
  return (
    // R3.3B trocou o `card-base` por uma superfície calma. O bloco estava desenhado como card —
    // borda, sombra, fundo branco —, e um card no rodapé compete pela mesma leitura que os cards
    // de Achado logo acima, que são a coisa que a tela existe para mostrar. Aqui a informação é
    // de apoio, e o desenho passou a dizer isso.
    <section
      aria-labelledby="confianca-titulo"
      className="bg-surface/70 border-border space-y-3 rounded-xl border p-5"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck aria-hidden="true" className="text-primary mt-0.5 size-6 shrink-0" />
        <div>
          <h2 id="confianca-titulo" className="font-display text-lg leading-tight sm:text-xl">
            Preço com procedência
          </h2>
          <p className="text-muted-foreground mt-1 max-w-prose text-sm">
            Cada preço mostra mercado, fonte, atualização e validade.
          </p>
          {isDemo ? (
            <p className="meta-text mt-1.5 max-w-prose">
              Nesta demonstração, os preços são fictícios. No piloto, cada preço será publicado com
              origem identificada.
            </p>
          ) : null}
        </div>
      </div>

      <Link
        to="/como-funciona"
        className="btn-base btn-secondary btn-sm btn-touch-48 w-full sm:w-auto"
      >
        Entender como funciona
      </Link>
    </section>
  );
}
