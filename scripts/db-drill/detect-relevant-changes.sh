#!/usr/bin/env bash
# R2.3 - decide se a mudanca deste evento toca alguma coisa que o drill de schema
# realmente exercita.
#
# Por que existe: para virar required check, o workflow precisa ser REPORTADO em todo
# PR. Um check que nunca e reportado nao "passa por omissao" -- ele deixa o PR pendente
# para sempre, e a unica saida vira bypass de admin. Era exatamente o estado do
# db-schema-drill ate aqui: filtro `paths:` no nivel do workflow, e portanto nenhum
# report em PR documental (ver docs/evidence/r2/branch-protection.md).
#
# Mas subir Docker e reconstruir o schema inteiro num PR que so mexe em Markdown e
# desperdicio. Este detector separa as duas coisas: o gate final sempre reporta, o job
# pesado so roda quando ha o que reconstruir.
#
# Falha para o lado seguro: quando nao da para calcular o diff com confianca -- base
# ausente, revisao desconhecida, workflow_dispatch -- o veredito e "relevante" e o
# drill pesado roda. O custo do erro nessa direcao e um minuto de CI; na direcao
# oposta, e uma migration quebrada entrando na main sem ninguem reconstruir o schema.
#
# Saida: `true` ou `false` em stdout (linha unica), e `relevant=<valor>` em
# $GITHUB_OUTPUT quando estiver rodando no Actions. Diagnostico vai para stderr, para
# nao contaminar a leitura programatica.
set -euo pipefail

# Diretorios cujo conteudo o drill le ou executa.
RELEVANT_PREFIXES=(
  "supabase/migrations/"
  "scripts/db-drill/"
  "scripts/r2/"
)

# Arquivos avulsos que descrevem o banco ou o proprio drill.
RELEVANT_FILES=(
  "supabase/config.toml"
  "supabase/seed.sql"
  ".github/workflows/db-schema-drill.yml"
)

emit() {
  local value="$1" reason="$2"
  echo "==> relevante para o drill: $value ($reason)" >&2
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "relevant=$value" >>"$GITHUB_OUTPUT"
  fi
  echo "$value"
  exit 0
}

changed=""
if [ -n "${DRILL_CHANGED_FILES+definido}" ]; then
  # Lista injetada diretamente. Existe para o teste estatico exercitar a MESMA funcao
  # de classificacao que roda no CI, sem precisar montar um repositorio sintetico.
  changed="$DRILL_CHANGED_FILES"
elif [ -n "${DRILL_BASE_SHA:-}" ] && [ -n "${DRILL_HEAD_SHA:-}" ]; then
  # Compara a partir do merge-base, e nao ponta a ponta: sem isso, um PR antigo
  # herdaria como "mudanca sua" toda migration que entrou na main depois que ele nasceu.
  base="$DRILL_BASE_SHA"
  if merge_base="$(git merge-base "$DRILL_BASE_SHA" "$DRILL_HEAD_SHA" 2>/dev/null)"; then
    base="$merge_base"
  fi
  if ! changed="$(git diff --name-only "$base" "$DRILL_HEAD_SHA" 2>/dev/null)"; then
    emit true "nao foi possivel calcular o diff entre as revisoes informadas"
  fi
else
  emit true "sem base de comparacao (workflow_dispatch, primeiro push ou force push)"
fi

if [ -z "$changed" ]; then
  emit false "nenhum arquivo alterado"
fi

while IFS= read -r file; do
  [ -n "$file" ] || continue
  for prefix in "${RELEVANT_PREFIXES[@]}"; do
    case "$file" in
    "$prefix"*) emit true "$file" ;;
    esac
  done
  for exact in "${RELEVANT_FILES[@]}"; do
    if [ "$file" = "$exact" ]; then
      emit true "$file"
    fi
  done
done <<<"$changed"

emit false "nenhum dos arquivos alterados e lido pelo drill"
