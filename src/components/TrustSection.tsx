import { Link } from "@tanstack/react-router";

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
    <section aria-labelledby="confianca-titulo" className="card-base space-y-3">
      <div>
        <h2 id="confianca-titulo" className="font-display text-xl sm:text-2xl">
          Preço com procedência
        </h2>
        <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
          Cada preço mostra mercado, fonte, atualização e validade.
        </p>
      </div>

      {isDemo ? (
        <p className="meta-text max-w-prose">
          Nesta demonstração, os preços são fictícios. No piloto, cada preço será publicado com
          origem identificada.
        </p>
      ) : null}

      <Link to="/como-funciona" className="btn-base btn-secondary btn-sm btn-touch-48">
        Entender como funciona
      </Link>
    </section>
  );
}
