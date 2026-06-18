import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import "./../css/Dashboard.css";

type PublicacaoPorAno = {
  year: string;
  count: number;
};

type CitacoesPorAno = {
  year: string;
  count: number;
};

type Periodico = {
  journal: string;
  count: number;
};

type AutorRanking = {
  author: string;
  count: number;
};

type KeywordRanking = {
  keyword: string;
  count: number;
};

type ArticleOpenAccess = {
  open_access: string | null;
};

type OpenAccessChart = {
  name: string;
  value: number;
};

function Dashboard() {
  
  const [publicacoesPorAno, setPublicacoesPorAno] = useState<PublicacaoPorAno[]>([]);
  
  const [citacoesPorAno, setCitacoesPorAno] = useState<CitacoesPorAno[]>([]);

  const [topPeriodicos, setTopPeriodicos] = useState<Periodico[]>([]);

  const [topAutores, setTopAutores] = useState<AutorRanking[]>([]);

  const [topKeywords, setTopKeywords] = useState<KeywordRanking[]>([]);

  const [openAccessData, setOpenAccessData] = useState<OpenAccessChart[]>([]);

  const [metricas, setMetricas] = useState({
    artigos: 0,
    autoresUnicos: 0,
    totalCitacoes: 0,
    mediaCitacoes: 0,
    openAccessPct: 0,
  });

  // =========================
  // MÉTRICAS GERAIS
  // =========================
  async function carregarMetricas() {
    const { count: artigos } = await supabase
      .from("article")
      .select("*", { count: "exact", head: true });

    const { data: citacoesData } = await supabase
      .from("article")
      .select("cited_by, open_access");

    const totalCitacoes =
      citacoesData?.reduce((acc, item) => acc + (item.cited_by || 0), 0) || 0;

    const { data: autoresData } = await supabase
      .from("author")
      .select("id");

    const autoresUnicos = new Set(autoresData?.map((a) => a.id)).size;

    const mediaCitacoes = artigos ? totalCitacoes / artigos : 0;

    const openAccessCount =
      citacoesData?.filter((a) => a.open_access === true).length || 0;

    const openAccessPct = artigos ? (openAccessCount / artigos) * 100 : 0;

    setMetricas({
      artigos: artigos || 0,
      autoresUnicos,
      totalCitacoes,
      mediaCitacoes: Number(mediaCitacoes.toFixed(2)),
      openAccessPct: Number(openAccessPct.toFixed(2)),
    });
  }

  // =========================
  // PUBLICAÇÕES POR ANO
  // =========================
  async function carregarPublicacoesPorAno() {
    const { data, error } = await supabase.from("article").select("year");

    if (error || !data) {
      //console.error(error);
      return;
    }

    const contagem: Record<string, number> = {};

    data.forEach((item: { year: string | number | null }) => {
      const ano = item.year ? String(item.year) : "Desconhecido";
      contagem[ano] = (contagem[ano] || 0) + 1;
    });

    const formatado: PublicacaoPorAno[] = Object.entries(contagem)
      .map(([year, count]) => ({
        year,
        count,
      }))
      .sort((a, b) => Number(a.year) - Number(b.year));

    setPublicacoesPorAno(formatado);
  }

  async function carregarCitacoesPorAno() {
    const { data, error } = await supabase
      .from("article")
      .select("year, cited_by");

    if (error || !data) {
      // console.error(error);
      return;
    }

    const citacoesAno: Record<string, number> = {};

    data.forEach((item) => {
      const ano = item.year ? String(item.year) : "Desconhecido";
      const citacoes = Number(item.cited_by) || 0;

      citacoesAno[ano] = (citacoesAno[ano] || 0) + citacoes;
    });

    const resultado: CitacoesPorAno[] = Object.entries(citacoesAno)
      .map(([year, count]) => ({
      year,
      count,
      }))
      .sort((a, b) => Number(a.year) - Number(b.year));

      setCitacoesPorAno(resultado);
    }

    async function carregarTopPeriodicos() {
      const { data, error } = await supabase
        .from("article")
        .select("source_title");

      if (error || !data) {
        // console.error(error);
        return;
      }

      const contagem: Record<string, number> = {};

      data.forEach((item) => {
        if (!item.source_title) return;

        contagem[item.source_title] =
          (contagem[item.source_title] || 0) + 1;
      });

      const resultado = Object.entries(contagem)
        .map(([journal, count]) => ({
          journal,
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      //console.log(resultado);

      setTopPeriodicos(resultado);
    }

    async function carregarTopAutores() {

      const { data: articleAuthors, error: errorAA } = await supabase
        .from("article_author")
        .select("author_id");

      if (errorAA || !articleAuthors) {
        console.error(errorAA);
        return;
      }

      const { data: authors, error: errorAuthor } = await supabase
        .from("author")
        .select("id, name");

      if (errorAuthor || !authors) {
        console.error(errorAuthor);
        return;
      }

      const mapaAutores = new Map(
        authors.map(author => [author.id, author.name])
      );

      const contagem: Record<string, number> = {};

      articleAuthors.forEach(item => {

        const nome = mapaAutores.get(item.author_id);

        if (!nome) return;

        contagem[nome] = (contagem[nome] || 0) + 1;
      });

      const resultado = Object.entries(contagem)
        .map(([author, count]) => ({
          author,
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      //console.log(resultado);

      setTopAutores(resultado);
    }

    async function carregarTopKeywords() {
      const { data, error } = await supabase
        .from("article_keyword")
        .select(`
          keyword:keyword_id (
            keyword
          )
        `);

      if (error || !data) {
        console.error(error);
        return;
      }

      const contagem: Record<string, number> = {};

      data.forEach((item: any) => {
        const palavra = item.keyword?.keyword;

        if (!palavra) return;

        contagem[palavra] = (contagem[palavra] || 0) + 1;
      });

      const resultado = Object.entries(contagem)
        .map(([keyword, count]) => ({
          keyword,
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      console.log(resultado)
      console.log("ERROR KEYWORD:", error);
      console.log("DATA KEYWORD:", data);

      setTopKeywords(resultado);
    }

    async function carregarOpenAccess(): Promise<void> {
      const { data, error } = await supabase
        .from("article")
        .select("open_access");

      if (error || !data) {
        console.error(error);
        return;
      }

      const articles = data as ArticleOpenAccess[];

      const semOA = articles.filter(a => a.open_access === null).length;
      const comOA = articles.length - semOA;

      setOpenAccessData([
        { name: "Open Access", value: comOA },
        { name: "Sem Open Access", value: semOA },
      ]);
    }

  // =========================
  // LOAD
  // =========================
  useEffect(() => {
    carregarMetricas();
    carregarPublicacoesPorAno();
    carregarCitacoesPorAno();
    carregarTopPeriodicos();
    carregarTopAutores();
    carregarTopKeywords();
    carregarOpenAccess();
  }, []);

  // =========================
  // ESCALA DO GRÁFICO
  // =========================
  const maxCount = useMemo(() => {
    if (publicacoesPorAno.length === 0) return 1;
    return Math.max(...publicacoesPorAno.map((i) => i.count));
  }, [publicacoesPorAno]);

  const maxCitacoes = useMemo(() => {
    if (citacoesPorAno.length === 0) return 1;

    return Math.max(
        ...citacoesPorAno.map((item) => item.count)
    );
    }, [citacoesPorAno]);

  const maxPeriodicos = useMemo(() => {
    if (topPeriodicos.length === 0) return 1;

    return Math.max(...topPeriodicos.map((p) => p.count));
  }, [topPeriodicos]);

  const maxAutores = useMemo(() => {
    if (topAutores.length === 0) return 1;

    return Math.max(...topAutores.map((a) => a.count));
  }, [topAutores]);

  const maxKeywords = useMemo(() => {
    if (topKeywords.length === 0) return 1;

    return Math.max(...topKeywords.map((k) => k.count));
  }, [topKeywords]);

  return (
    <main className="page">
      {/* HEADER */}
      <header className="dashboard-header">
        <h1>Dashboard</h1>
      </header>

      {/* MÉTRICAS */}
      <section className="dashboard-metricas">
        <div className="metrica-card">
          <h3>Artigos</h3>
          <p>{metricas.artigos}</p>
        </div>

        <div className="metrica-card">
          <h3>Autores Únicos</h3>
          <p>{metricas.autoresUnicos}</p>
        </div>

        <div className="metrica-card">
          <h3>Total Citações</h3>
          <p>{metricas.totalCitacoes}</p>
        </div>

        <div className="metrica-card">
          <h3>Média Citações</h3>
          <p>{metricas.mediaCitacoes}</p>
        </div>

        <div className="metrica-card">
          <h3>Open Access</h3>
          <p>{metricas.openAccessPct}%</p>
        </div>
      </section>

      {/* GRÁFICO */}
      <section>
        {publicacoesPorAno.length > 0 && (
          <div className="grafico-container">
            <h2>Publicações por ano</h2>

            <div style={{ width: "100%", height: 350 }}>
              {/* BARRAS */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-end",
                  height: "300px",
                  padding: "20px",
                }}
              >
                {publicacoesPorAno.map((item) => {
                  const height = (item.count / maxCount) * 260;

                  return (
                    <div
                      key={item.year}
                      style={{
                        height: `${height}px`,
                        width: "40px",
                        background: "#3ecf8e",
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        color: "black",
                        fontSize: "12px",
                        borderRadius: "6px 6px 0 0",
                      }}
                      title={`${item.year}: ${item.count}`}
                    />
                  );
                })}
              </div>

              {/* LABELS */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  padding: "0 20px",
                }}
              >
                {publicacoesPorAno.map((item) => (
                  <div
                    key={item.year}
                    style={{
                      width: "40px",
                      textAlign: "center",
                      fontSize: "12px",
                    }}
                  >
                    {item.year}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section>
        {citacoesPorAno.length > 0 && (
            <div className="grafico-container">
            <h2>Citações por Ano de Publicação</h2>

            <div style={{ width: "100%", height: 350 }}>
                {/* Barras */}
                <div
                style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "flex-end",
                    height: "300px",
                    padding: "20px",
                    borderBottom: "1px solid #334155",
                }}
                >
                {citacoesPorAno.map((item) => {
                    const height = (item.count / maxCitacoes) * 260;

                    return (
                    <div
                        key={item.year}
                        style={{
                        height: `${height}px`,
                        width: "40px",
                        background: "#f59e0b",
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        color: "#000",
                        fontSize: "12px",
                        borderRadius: "6px 6px 0 0",
                        fontWeight: "bold",
                        }}
                        title={`${item.year}: ${item.count} citações`}
                    >
                        {item.count}
                    </div>
                    );
                })}
                </div>

                {/* Anos */}
                <div
                style={{
                    display: "flex",
                    gap: "8px",
                    padding: "10px 20px",
                }}
                >
                {citacoesPorAno.map((item) => (
                    <div
                    key={item.year}
                    style={{
                        width: "40px",
                        textAlign: "center",
                        fontSize: "12px",
                    }}
                    >
                    {item.year}
                    </div>
                ))}
                </div>
            </div>
            </div>
        )}
        </section>

        <section>
          {topPeriodicos.length > 0 && (
            <div className="grafico-container">
              <h2>Top 15 Periódicos</h2>

              {topPeriodicos.map((periodico) => {
                const width =
                  (periodico.count / maxPeriodicos) * 100;

                return (
                  <div
                    key={periodico.journal}
                    style={{
                      marginBottom: "12px",
                    }}
                  >
                    <div
                      style={{
                        marginBottom: "4px",
                        fontSize: "14px",
                      }}
                    >
                      {periodico.journal} ({periodico.count})
                    </div>

                    <div
                      style={{
                        background: "#1e293b",
                        borderRadius: "8px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${width}%`,
                          height: "28px",
                          background: "#3ecf8e",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </section>

      <section>
        {topAutores.length > 0 && (
          <div className="grafico-container">
            <h2>Top 20 Autores</h2>

            {topAutores.map((autor) => {
              const width =
                (autor.count / maxAutores) * 100;

              return (
                <div
                  key={autor.author}
                  style={{ marginBottom: "12px" }}
                >
                  <div
                    style={{
                      marginBottom: "4px",
                      fontSize: "14px",
                    }}
                  >
                    {autor.author} ({autor.count})
                  </div>

                  <div
                    style={{
                      background: "#1e293b",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${width}%`,
                        height: "28px",
                        background: "#3b82f6",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        {topKeywords.length > 0 && (
          <div className="grafico-container">
            <h2>Top 15 Palavras-Chave</h2>

            {topKeywords.map((item) => {
              const width =
                (item.count / maxKeywords) * 100;

              return (
                <div
                  key={item.keyword}
                  style={{ marginBottom: "12px" }}
                >
                  <div
                    style={{
                      marginBottom: "4px",
                      fontSize: "14px",
                    }}
                  >
                    {item.keyword} ({item.count})
                  </div>

                  <div
                    style={{
                      background: "#1e293b",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${width}%`,
                        height: "28px",
                        background: "#ef4444",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        {openAccessData.length > 0 && (
          <div className="grafico-container">
            {/* TÍTULO */}
            <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
              Open Access
            </h2>

            {/* PIZZA CENTRALIZADA */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  width: "220px",
                  height: "220px",
                  borderRadius: "50%",
                  background: `conic-gradient(
                    #3ecf8e 0% ${
                      (openAccessData[0]?.value /
                        (openAccessData[0]?.value + openAccessData[1]?.value)) *
                      100
                    }%,
                    #ef4444 0%
                  )`,
                }}
              />
            </div>

            {/* LEGENDA EM BAIXO */}
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                justifyContent: "center",
                gap: "24px",
                flexWrap: "wrap",
              }}
            >
              {openAccessData.map((item) => (
                <div key={item.name} style={{ display: "flex", alignItems: "center" }}>
                  <span
                    style={{
                      width: "12px",
                      height: "12px",
                      background:
                        item.name === "Open Access" ? "#3ecf8e" : "#ef4444",
                      display: "inline-block",
                      marginRight: "8px",
                      borderRadius: "2px",
                    }}
                  />
                  {item.name}: <strong style={{ marginLeft: "4px" }}>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default Dashboard;