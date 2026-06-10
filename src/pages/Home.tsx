import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import "./../css/Home.css";

type LinhaTabela = Record<string, unknown>;

const tabelas = [
  {
    nome: "article",
    label: "Artigos",
    colunas: [
      "id",
      "title",
      "year",
      "source_title",
      "volume",
      "issue",
      "art_no",
      "page_start",
      "page_end",
      "cited_by",
      "doi",
      "link",
      "molecular_sequence_numbers",
      "chemicals_cas",
      "tradenames",
      "manufacturers",
      "correspondence_address",
      "editors",
      "publisher",
      "sponsors",
      "conference_name",
      "conference_date",
      "conference_location",
      "conference_code",
      "issn",
      "isbn",
      "issn_isbn",
      "coden",
      "pubmed_id",
      "language_original_document",
      "abbreviated_source_title",
      "document_type",
      "publication_stage",
      "open_access",
      "source",
      "eid",
    ],
  },
  {
    nome: "author",
    label: "Autores",
    colunas: ["id", "name", "full_name", "scopus_author_id"],
  },
  {
    nome: "keyword",
    label: "Keywords",
    colunas: ["id", "keyword", "type"],
  },
  {
    nome: "references",
    label: "Referências",
    colunas: ["id", "article_id", "reference_text"],
  },
  {
    nome: "funding",
    label: "Financiamentos",
    colunas: ["id", "article_id", "funding_details", "funding_texts"],
  },
  {
    nome: "affiliation",
    label: "Afiliações",
    colunas: ["id", "name"],
  },
];

function Home() {
  const [dados, setDados] = useState<LinhaTabela[]>([]);
  const [tabelaAtual, setTabelaAtual] = useState("");
  const [labelAtual, setLabelAtual] = useState("");
  const [colunasAtuais, setColunasAtuais] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [mensagemTransformacao, setMensagemTransformacao] = useState("");

  async function buscarDados(tabela: {
    nome: string;
    label: string;
    colunas: string[];
  }) {
    setCarregando(true);
    setErro("");
    setTabelaAtual(tabela.nome);
    setLabelAtual(tabela.label);
    setColunasAtuais(tabela.colunas);
    setDados([]);
    setBusca("");

    const { data, error } = await supabase
      .from(tabela.nome)
      .select(tabela.colunas.join(", "))
      .range(0, 999);

    if (error) {
      setErro(`Erro ao buscar "${tabela.nome}": ${error.message}`);
      setCarregando(false);
      return;
    }

    setDados(data || []);
    setCarregando(false);
  }

  async function limparAbstractNulo() {
    const confirmar = window.confirm(
      "Tem certeza que deseja apagar os artigos com abstract nulo ou vazio?"
    );

    if (!confirmar) return;

    setMensagemTransformacao("Limpando artigos com abstract nulo...");

    const { data: apagadosNulos, error: erroNulos } = await supabase
      .from("article")
      .delete()
      .is("abstract", null)
      .select("id");

    if (erroNulos) {
      setMensagemTransformacao("");
      setErro(`Erro ao limpar abstracts nulos: ${erroNulos.message}`);
      return;
    }

    const { data: apagadosVazios, error: erroVazios } = await supabase
      .from("article")
      .delete()
      .eq("abstract", "")
      .select("id");

    if (erroVazios) {
      setMensagemTransformacao("");
      setErro(`Erro ao limpar abstracts vazios: ${erroVazios.message}`);
      return;
    }

    const totalApagado =
      (apagadosNulos?.length || 0) + (apagadosVazios?.length || 0);

    setMensagemTransformacao(
      `Limpeza concluída. ${totalApagado} artigo(s) removido(s).`
    );

    if (tabelaAtual === "article") {
      const tabelaArticle = tabelas.find((t) => t.nome === "article");

      if (tabelaArticle) {
        buscarDados(tabelaArticle);
      }
    }
  }

  async function criarColunaIssnIsbn() {
  setMensagemTransformacao("Preenchendo ISSN/ISBN...");

  const { error } = await supabase
    .from("article")
    .update({
      issn_isbn: null,
    })
    .neq("id", 0);

  if (error) {
    setErro(error.message);
    return;
  }

  setMensagemTransformacao("Operação concluída.");
}

async function tratarTipoAcesso() {
  setMensagemTransformacao("Tratando tipo de acesso...");

  const { error } = await supabase.rpc("tratar_tipo_acesso");

  if (error) {
    setErro(error.message);
    setMensagemTransformacao("");
    return;
  }

  setMensagemTransformacao(
    "Tipo de acesso tratado com sucesso."
  );

  if (tabelaAtual === "article") {
    const tabelaArticle = tabelas.find(
      (t) => t.nome === "article"
    );

    if (tabelaArticle) {
      buscarDados(tabelaArticle);
    }
  }
}

async function tratarDoi() {
  setMensagemTransformacao("Tratando DOI...");

  const { error } = await supabase.rpc("tratar_doi");

  if (error) {
    setErro(error.message);
    setMensagemTransformacao("");
    return;
  }

  setMensagemTransformacao(
    "DOI tratado com sucesso."
  );

  if (tabelaAtual === "article") {
    const tabelaArticle = tabelas.find(
      (t) => t.nome === "article"
    );

    if (tabelaArticle) {
      buscarDados(tabelaArticle);
    }
  }
}

  function formatarValor(valor: unknown) {
  if (valor === null || valor === undefined) {
    return "Sem dados";
  }

  if (typeof valor === "string" && valor.trim() === "") {
    return "Sem dados";
  }

  if (typeof valor === "object") {
    return JSON.stringify(valor);
  }

  return String(valor);
}

  const dadosFiltrados = useMemo(() => {
    if (!busca.trim()) return dados;

    return dados.filter((linha) =>
      Object.values(linha).some((valor) =>
        formatarValor(valor).toLowerCase().includes(busca.toLowerCase())
      )
    );
  }, [dados, busca]);

  return (
    <main className="page">
      <section className="hero">
        <span className="tag">Supabase Database</span>
        <h1>ArticleDB</h1>
        <p>
          Clique em uma tabela para visualizar os dados importados do Supabase.
        </p>
      </section>

      <section className="layout">
        <aside className="sidebar">
          <h2>Transformação de Dados</h2>
          <p>
            Use estas funções para limpar e organizar os dados da tabela de
            artigos.
          </p>

          <div className="botoes-transformacao">
  <button
    className="botao-transformacao"
    onClick={limparAbstractNulo}
  >
    Limpar abstract nulo
  </button>

  <button
    className="botao-transformacao"
    onClick={criarColunaIssnIsbn}
  >
    Criar coluna ISSN/ISBN
  </button>

  <button
  className="botao-transformacao"
  onClick={tratarTipoAcesso}
>
  Tratar Tipo de Acesso
</button>

<button
  className="botao-transformacao"
  onClick={tratarDoi}
>
  Tratar DOI
</button>
</div>

          {mensagemTransformacao && (
            <div className="mensagem-transformacao">
              {mensagemTransformacao}
            </div>
          )}
        </aside>

        <section className="panel">
          <div className="botoes">
            {tabelas.map((tabela) => (
              <button
                key={tabela.nome}
                className={tabelaAtual === tabela.nome ? "ativo" : ""}
                onClick={() => buscarDados(tabela)}
              >
                {tabela.label}
              </button>
            ))}
          </div>

          {!tabelaAtual && (
            <div className="empty">
              <h2>Nenhuma tabela selecionada</h2>
              <p>Escolha uma tabela acima para carregar os dados.</p>
            </div>
          )}

          {tabelaAtual && (
            <div className="info">
              <div>
                <h2>{labelAtual}</h2>
                <p>
                  Tabela: <strong>{tabelaAtual}</strong>
                </p>
              </div>

              <div className="contador">
                {dadosFiltrados.length} registro(s)
              </div>
            </div>
          )}

          {dados.length > 0 && (
            <div className="search-box">
              <input
                type="text"
                placeholder="Buscar nos dados..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          )}

          {carregando && <div className="loading">Carregando dados...</div>}

          {erro && <div className="erro">{erro}</div>}

          {!carregando &&
            !erro &&
            tabelaAtual &&
            dadosFiltrados.length === 0 && (
              <div className="empty">
                <h2>Nenhum dado encontrado</h2>
                <p>Essa tabela está vazia ou a busca não encontrou resultados.</p>
              </div>
            )}

          {dadosFiltrados.length > 0 && (
            <div className="tabela-card">
              <div className="tabela-scroll">
                <table>
                  <thead>
                    <tr>
                      {colunasAtuais.map((coluna) => (
                        <th key={coluna}>{coluna}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {dadosFiltrados.map((linha, index) => (
                      <tr key={index}>
                        {colunasAtuais.map((coluna) => (
                          <td key={coluna}>{formatarValor(linha[coluna])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="aviso">
                Arraste a tabela para o lado para visualizar o restante das
                colunas.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default Home;