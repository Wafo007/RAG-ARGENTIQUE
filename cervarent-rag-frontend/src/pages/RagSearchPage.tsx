import Layout from '../components/Layout';
import RagSearchPanel from '../components/RagSearchPanel';

/**
 * Page dédiée à la recherche augmentée par IA, accessible depuis
 * le lien "Recherche RAG" de la barre latérale.
 */
export default function RagSearchPage() {
  return (
    <Layout withSidebar>
      <RagSearchPanel />
    </Layout>
  );
}
