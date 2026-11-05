import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import manualCollections from '@/components/manual/manualCollections';
import { buildManualCatalog, searchManualArticles } from '@/components/manual/manualKnowledge';
import CategoriasManual from '@/components/manual/CategoriasManual';
import ManualHero from '@/components/manual/ManualHero';
import ManualBreadcrumbs from '@/components/manual/ManualBreadcrumbs';
import ManualCollectionsDirectory from '@/components/manual/ManualCollectionsDirectory';
import ManualModuleDirectory from '@/components/manual/ManualModuleDirectory';
import ManualArticleList from '@/components/manual/ManualArticleList';
import ManualArticleReader from '@/components/manual/ManualArticleReader';
import ManualMissingContent from '@/components/manual/ManualMissingContent';

export default function ManualKnowledgeHub({ sections }) {
  const [params, setParams] = useSearchParams();
  const { collections, articles } = useMemo(() => buildManualCatalog(sections, manualCollections), [sections]);
  const modules = useMemo(() => collections.flatMap((entry) => entry.modules), [collections]);
  const rawSearch = params.get('busca') || '';
  const search = rawSearch.trim();
  const article = articles.find((entry) => entry.id === params.get('artigo'));
  const module = modules.find((entry) => entry.id === (article?.sectionId || params.get('modulo')));
  const collection = collections.find((entry) => entry.id === (article?.collectionId || module?.collectionId || params.get('colecao')));
  const missing = (params.has('artigo') && !article) || (params.has('modulo') && !module) || (params.has('colecao') && !collection);
  const home = !search && !collection && !module && !article && !missing;
  const results = useMemo(() => searchManualArticles(articles, search), [articles, search]);
  useEffect(() => {
    if (collection || module || article) document.getElementById('manual-workspace')?.scrollIntoView({ block: 'start' });
  }, [collection?.id, module?.id, article?.id]);
  const content = missing ? <ManualMissingContent />
    : search ? <ManualArticleList key={`search-${search}`} articles={results} title={`Resultados para “${search}”`} description="Resultados em todas as coleções, incluindo o conteúdo dos artigos." query={search} showPath />
    : article ? <ManualArticleReader article={article} module={module} />
    : module ? <ManualArticleList key={module.id} articles={module.articles} title={module.title} description="Selecione um assunto para consultar a orientação completa." />
    : collection ? <ManualModuleDirectory key={collection.id} collection={collection} />
    : <ManualCollectionsDirectory collections={collections} />;
  return (
    <div className="manual-page px-3 pb-10 pt-4 md:px-6">
      <div id="manual-workspace" className="manual-hub mx-auto grid max-w-[1440px] scroll-mt-24 overflow-clip rounded-2xl border border-border/40 shadow-2xl lg:grid-cols-[250px_minmax(0,1fr)]">
        <CategoriasManual collections={collections} activeCollection={collection} moduleCount={modules.length} articleCount={articles.length} />
        <div className="min-w-0">
          <ManualHero busca={rawSearch} onBusca={(value) => setParams(value ? { busca: value } : {}, { replace: true })} moduleCount={modules.length} articleCount={articles.length} compact={!home} />
          <div className="min-h-[580px] px-5 py-8 md:px-9 md:py-9">
            {!home && <div className="mb-8"><ManualBreadcrumbs collection={search ? null : collection} module={search ? null : module} article={search ? null : article} search={search} /></div>}
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}