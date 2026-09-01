# 🍽️ Plano à Mesa

Plano alimentar anual (1 jan – 31 dez) para uma família que cozinha pouco e come bem. Webapp estática — só HTML, CSS e JavaScript, sem frameworks nem build — pronta para publicar no GitHub Pages e **instalar como app** no telemóvel.

> Sopa + acompanhamento + prato, à moda portuguesa, com opções internacionais. Ajusta quantidades ao número de pessoas, respeita restrições alimentares e gera lista de compras.

---

## Índice

- [Funcionalidades](#funcionalidades)
- [Publicar no GitHub Pages](#publicar-no-github-pages)
- [Instalar no telemóvel (PWA)](#instalar-no-telemóvel-pwa)
- [Estrutura de ficheiros](#estrutura-de-ficheiros)
- [Editar o menu — `recipes.json`](#editar-o-menu--recipesjson)
- [Como funciona a rotação de receitas](#como-funciona-a-rotação-de-receitas)
- [Testar localmente](#testar-localmente)

---

## Funcionalidades

- **Calendário anual** (vista de mês e vista de semana) com almoço e jantar todos os dias, de 1 de janeiro a 31 de dezembro, para qualquer ano.
- **Cozinha pouco, come variado**: escolha de quantos em quantos dias quer cozinhar (1, 2, 3 ou 7 dias) — o plano gera automaticamente combinações diferentes de sopa, acompanhamento e prato a cada bloco de dias, sem repetir sempre o mesmo padrão ao longo do ano.
- **Pratos-salada**: quando o prato principal já é uma salada completa (ex.: Salada César com Frango, Poke Bowl de Salmão), o acompanhamento não é duplicado.
- **Pessoas à mesa**: um único campo recalcula todas as quantidades de ingredientes.
- **Dieta e restrições**: filtro para vegetariano, sem glúten, sem lactose e alergias (ovo, peixe, marisco, frutos secos, soja) — o plano só usa receitas compatíveis.
- **Lista de compras**: selecione as refeições que quiser (ou use os atalhos "Selecionar os 7 almoços/jantares" da semana) e receba uma lista consolidada, agrupada por categoria, com checkboxes para ir riscando no supermercado.
- **Instalável como app** no Android e no iOS, com ícone próprio e funcionamento offline básico.
- **Design responsivo**, pensado primeiro para o telemóvel (vista de semana com scroll horizontal, modais em formato de "folha" no fundo do ecrã, áreas de toque maiores).

---

## Publicar no GitHub Pages

1. Crie um repositório novo no GitHub (ex.: `plano-a-mesa`).
2. Faça upload de **todos** os ficheiros e pastas deste projeto para a raiz do repositório (`index.html`, `style.css`, `app.js`, `recipes.json`, `manifest.json`, `sw.js` e a pasta `icons/`).
3. No repositório, vá a **Settings → Pages**.
4. Em "Source", escolha o branch `main` e a pasta `/ (root)`, e guarde.
5. Ao fim de 1–2 minutos, o site fica disponível em `https://SEU-UTILIZADOR.github.io/plano-a-mesa/`.

Alternativa por linha de comandos:

```bash
git init
git add .
git commit -m "Plano à Mesa"
git branch -M main
git remote add origin https://github.com/SEU-UTILIZADOR/plano-a-mesa.git
git push -u origin main
```

> ⚠️ A app **tem de ser servida via HTTPS** (o GitHub Pages já trata disso) para a instalação PWA e o service worker funcionarem — não funcionam em `http://` simples fora de `localhost`.

Sempre que quiser mudar o menu, edite `recipes.json` diretamente no GitHub (ícone de lápis) e guarde — a app atualiza-se sozinha na visita seguinte.

---

## Instalar no telemóvel (PWA)

Depois de publicado no GitHub Pages (com HTTPS):

**Android (Chrome):**
Abra o site — aparece um botão **"Instalar app"** no topo. Toque nele e confirme. O ícone fica no ecrã principal como qualquer outra app.

**iPhone / iPad (Safari):**
Abra o site no Safari (tem de ser o Safari, não o Chrome) → toque no botão **"Instalar app"**, que mostra o passo a passo:
1. Toque no ícone de **Partilhar** (quadrado com seta para cima) na barra do Safari.
2. Escolha **"Adicionar ao Ecrã Principal"**.
3. Confirme em **"Adicionar"**.

Depois de instalada, a app abre em ecrã inteiro, sem a barra do browser, e guarda o essencial em cache para continuar a mostrar o plano mesmo com ligação fraca.

---

## Estrutura de ficheiros

```
plano-a-mesa/
├── index.html          # estrutura da página
├── style.css            # design (inspirado em azulejo português)
├── app.js                # toda a lógica: calendário, filtros, lista de compras, PWA
├── recipes.json         # base de dados de receitas — o único ficheiro que precisa de editar para mudar o menu
├── manifest.json        # metadados da PWA (nome, ícones, cor do tema)
├── sw.js                  # service worker (cache offline)
├── icons/                # ícones da app em vários tamanhos
└── README.md
```

---

## Editar o menu — `recipes.json`

Cada receita tem esta forma:

```json
{
  "id": "frango-grelhado-legumes",
  "nome": "Frango Grelhado com Legumes Assados",
  "tempo": 35,
  "saudavel": true,
  "proteina": "carne",
  "vegetariano": false,
  "alergenios": [],
  "ehSalada": false,
  "ingredientes": [
    { "nome": "peito de frango", "qtd": 450, "unidade": "g" },
    { "nome": "sal", "qtd": null, "unidade": "q.b." }
  ],
  "preparo": [
    "Temperar o frango...",
    "Levar ao forno..."
  ]
}
```

| Campo | Descrição |
|---|---|
| `qtd: null`, `unidade: "q.b."` | Ingrediente "a gosto" — não é multiplicado pelo número de pessoas. |
| As restantes quantidades | Estão à base de **3 pessoas** (`baseParaPessoas`, definido no topo do ficheiro). |
| `vegetariano` | `true`/`false` — usado pelo filtro "Vegetariano". |
| `alergenios` | Lista com zero ou mais de: `"gluten"`, `"lactose"`, `"ovo"`, `"peixe"`, `"marisco"`, `"frutos-secos"`, `"soja"`. Usado pelos filtros de dieta e alergias. |
| `ehSalada` | Só existe em `pratos`. `true` quando o prato principal já é uma salada completa (ex.: Salada de Atum com Grão) — nesse caso o plano não junta um acompanhamento extra. |

O ficheiro tem três listas: `sopas`, `saladas` (acompanhamentos leves) e `pratos` (principais, incluindo os que são `ehSalada: true`). Pode adicionar, remover ou editar receitas livremente em qualquer uma delas — quantas mais receitas, maior a variedade ao longo do ano. Atualmente há 20 sopas, 16 saladas e 43 pratos.

---

## Como funciona a rotação de receitas

Em vez de guardar um menu fixo dia a dia, a app **gera o calendário automaticamente**:

- O ano é dividido em blocos de N dias consecutivos (N = o valor escolhido em "Cozinhar a cada": 1, 2, 3 ou 7).
- Cada bloco recebe uma sopa, um acompanhamento e um prato para o almoço, e uma combinação diferente para o jantar — para não repetir sempre o mesmo prato-base.
- Os índices avançam a ritmos diferentes em cada lista (sopas, acompanhamentos, pratos), para que as combinações não caiam sempre no mesmo padrão semana após semana.
- Se houver filtros de dieta/alergias ativos, a rotação usa apenas as receitas compatíveis nesse momento.

Não há, portanto, 365 entradas fixas gravadas em ficheiro — o calendário para **qualquer ano** é sempre calculado a partir de `recipes.json`, o que torna trivial adicionar receitas novas ou ajustar preferências sem reescrever um plano inteiro.

---

## Testar localmente

Abrir `index.html` a fazer duplo clique nem sempre funciona: alguns browsers bloqueiam a leitura de `recipes.json` e o registo do service worker em ficheiros `file://`. Sirva a pasta com um servidor simples:

```bash
python3 -m http.server 8000
```

e abra `http://localhost:8000`. A instalação como app (PWA) só é possível depois de publicado com HTTPS (ex.: GitHub Pages); em `localhost` o botão de instalar pode não aparecer, mas o resto da app funciona normalmente.
