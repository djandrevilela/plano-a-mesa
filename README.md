# Plano à Mesa — Plano Alimentar Anual

Webapp estática (HTML + CSS + JS, sem frameworks) com plano de almoços e jantares para 1 ano inteiro (1 de janeiro a 31 de dezembro), pensada para uma família de 3 pessoas que cozinha pouco e prepara comida para a semana toda de uma vez.

## Como está organizado

- **`recipes.json`** — a base de dados de receitas (sopas, saladas e pratos). É o único ficheiro que precisa de editar para mudar o menu; a app lê-o em cada visita.
- **`app.js`** — gera o calendário automaticamente em **blocos de dias** (controlado pelo seletor "Cozinhar a cada", no topo): cada bloco recebe uma combinação de sopa + salada + prato para o almoço, e outra bem diferente para o jantar. Com o valor por omissão (2 dias), há sempre pelo menos 3-4 refeições diferentes de almoço e outras tantas de jantar em cada semana. Pode escolher "1 dia" para máxima variedade (cozinhar todos os dias), ou "1 semana" para voltar ao modelo de cozinhar uma vez só. As combinações vão rodando pelas listas de receitas ao longo do ano a ritmos ligeiramente diferentes, para não repetirem o mesmo padrão.
- **`index.html`** e **`style.css`** — estrutura e design (inspirado em azulejo português).

## Funcionalidades

- Vista de **calendário mensal** (Jan–Dez) e vista de **semana**.
- Clicar numa refeição mostra a sopa, a salada e o prato, com ingredientes e modo de preparo.
- Campo **"Pessoas à mesa"** no topo: todas as quantidades de ingredientes são recalculadas automaticamente (as receitas em `recipes.json` estão à base de 3 pessoas).
- Seletor **"Cozinhar a cada"**: 1, 2, 3 ou 7 dias — controla quantas refeições diferentes há por semana.
- Botão **"Selecionar refeições"**: marque quantos almoços/jantares quiser (de qualquer dia) e clique em **"Gerar lista de compras"** para obter uma lista consolidada, agrupada por categoria, com quantidades somadas — ideal para a ida ao supermercado antes do dia de cozinhar.

## Como editar o menu (`recipes.json`)

Cada receita tem esta forma:

```json
{
  "id": "frango-grelhado-legumes",
  "nome": "Frango Grelhado com Legumes Assados",
  "tempo": 35,
  "saudavel": true,
  "proteina": "carne",
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

- `qtd: null` com `unidade: "q.b."` significa "a gosto" — não é multiplicado pelo número de pessoas.
- As quantidades de todos os outros ingredientes estão à base de **3 pessoas** (`baseParaPessoas` no topo do ficheiro).
- Pode adicionar, remover ou editar receitas nas três listas: `sopas`, `saladas`, `pratos`. Quantas mais receitas tiver em cada lista, maior a variedade ao longo do ano. Atualmente há 20 sopas, 16 saladas e 31 pratos.

## Publicar no GitHub Pages

1. Crie um repositório novo no GitHub (ex.: `plano-alimentar`).
2. Faça upload destes 4 ficheiros para a raiz do repositório: `index.html`, `style.css`, `app.js`, `recipes.json`.
3. No repositório, vá a **Settings → Pages**.
4. Em "Source", escolha o branch `main` e a pasta `/ (root)`, e guarde.
5. Ao fim de 1–2 minutos, o site fica disponível em `https://SEU-UTILIZADOR.github.io/plano-alimentar/`.

Alternativa por linha de comandos:

```bash
git init
git add .
git commit -m "Plano alimentar familiar"
git branch -M main
git remote add origin https://github.com/SEU-UTILIZADOR/plano-alimentar.git
git push -u origin main
```

Depois de publicado, sempre que quiser mudar o menu basta editar `recipes.json` no GitHub (botão de lápis) e guardar — a app atualiza sozinha.

### Nota sobre abrir localmente

Se abrir `index.html` diretamente no browser (duplo clique), alguns browsers bloqueiam a leitura de `recipes.json` por segurança (política de `file://`). Para testar localmente, corra um servidor simples na pasta:

```bash
python3 -m http.server 8000
```

e abra `http://localhost:8000`.
