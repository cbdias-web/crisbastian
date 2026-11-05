export const plainManualText = (value = '') => String(value).replace(/\*\*/g, '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
export const normalizeManualText = (value = '') => plainManualText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const slug = (value) => normalizeManualText(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const href = (params) => `/Manual?${new URLSearchParams(params).toString()}`;

export function buildManualCatalog(sections, definitions) {
  const articles = [];
  const collections = definitions.map((definition) => {
    const collectionHref = href({ colecao: definition.id });
    const modules = definition.sections.map((id) => {
      const section = sections.find((entry) => entry.id === id);
      if (!section) return null;
      const sectionHref = href({ colecao: definition.id, modulo: id });
      const topics = section.content.map((block) => {
        const title = plainManualText(block.subtitle);
        const body = [block.text, ...(block.steps || []), ...(block.items || [])].filter(Boolean).join(' ');
        const articleId = `${id}/${slug(title)}`;
        const article = {
          id: articleId, title, block, body: plainManualText(body),
          collectionId: definition.id, collectionLabel: definition.label, collectionHref,
          sectionId: id, sectionTitle: section.title, sectionHref,
          href: href({ colecao: definition.id, modulo: id, artigo: articleId }),
          searchText: normalizeManualText(`${definition.label} ${section.title} ${title} ${body}`),
        };
        articles.push(article);
        return article;
      });
      return { ...section, href: sectionHref, articles: topics };
    }).filter(Boolean);
    return { ...definition, href: collectionHref, modules, articleCount: modules.reduce((total, module) => total + module.articles.length, 0) };
  });
  return { collections, articles };
}

export function searchManualArticles(articles, query) {
  const terms = normalizeManualText(query).split(/\s+/).filter(Boolean);
  return articles.filter((article) => terms.every((term) => article.searchText.includes(term)))
    .sort((a, b) => terms.reduce((score, term) => score + Number(normalizeManualText(b.title).includes(term)) - Number(normalizeManualText(a.title).includes(term)), 0));
}

export function manualExcerpt(article, query = '') {
  const terms = normalizeManualText(query).split(/\s+/).filter(Boolean);
  const position = terms.map((term) => normalizeManualText(article.body).indexOf(term)).find((index) => index >= 0) ?? 0;
  const start = Math.max(0, position - 45);
  const text = article.body.slice(start, start + 190);
  return `${start ? '…' : ''}${text}${start + 190 < article.body.length ? '…' : ''}`;
}