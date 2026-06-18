import { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import "./../css/Dashboard.css";
import ForceGraph2D from "react-force-graph-2d";
import type { ForceGraphMethods } from "react-force-graph-2d";

const fgRef = useRef<ForceGraphMethods | null>(null);

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

type GrupoConceitual = {
  grupo: string;
  count: number;
};

type ArticleOpenAccess = {
  open_access: string | null;
};

type OpenAccessChart = {
  name: string;
  value: number;
};

type LanguageChart = {
  name: string;
  value: number;
};
type KeywordMap = {
  conceito: string;
  keywords: string[];
}; 

type WordCloudItem = {
  text: string;
  value: number;
};

type CoauthorNode = {
  name: string;
  count: number;
};

type CoauthorLink = {
  source: string;
  target: string;
  count: number;
};

function Dashboard() {
  
  const [publicacoesPorAno, setPublicacoesPorAno] = useState<PublicacaoPorAno[]>([]);
  
  const [citacoesPorAno, setCitacoesPorAno] = useState<CitacoesPorAno[]>([]);

  const [topPeriodicos, setTopPeriodicos] = useState<Periodico[]>([]);

  const [topAutores, setTopAutores] = useState<AutorRanking[]>([]);

  const [topKeywords, setTopKeywords] = useState<KeywordRanking[]>([]);

  const [topGruposConceituais, setTopGruposConceituais] =
  useState<GrupoConceitual[]>([]);

  const [openAccessData, setOpenAccessData] = useState<OpenAccessChart[]>([]);

  const [languageData, setLanguageData] = useState<LanguageChart[]>([]);

  const [keywordMap, setKeywordMap] =
  useState<KeywordMap[]>([]);

const [wordCloudData, setWordCloudData] =
  useState<WordCloudItem[]>
  ([]);

  const [coauthorNodes, setCoauthorNodes] =
  useState<CoauthorNode[]>([]);

const [coauthorLinks, setCoauthorLinks] =
  useState<CoauthorLink[]>([]);

  const fgRef = useRef<ForceGraphMethods | null>(null);

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
      citacoesData?.filter((a) => a.open_access !== null).length || 0;

   const openAccessPct = artigos
    ? (openAccessCount / artigos) * 100
    : 0;

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

    async function carregarGruposConceituais() {
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

  const grupos: Record<string, string[]> = {
    "Taxonomia e Espécies": [
      "mandaçaia",
      "uruçú",
      "plebeia",
      "tetragonula",
      "friseomelita",
      "melipona",
      "partamona",
      "lophotrigona",
      "anthophila",
      "apidae",
      "meliponina"
    ],

    "Ecologia e Conservação": [
      "pollination",
      "wild pollinators",
      "bee conservation",
      "distribution",
      "niche overlap",
      "colony loss",
      "seasonality",
      "nestedness"
    ],

    "Comportamento e Forrageamento": [
      "foraging",
      "flight activity",
      "flight activities",
      "generalist forager",
      "selective pollen",
      "colony gathering",
      "garbage removal"
    ],

    "Produtos Apícolas": [
      "honey production",
      "propolis",
      "cerumen",
      "polyphenols",
      "flavonoids",
      "antioxidant activity",
      "physicochemical",
      "pollinic sample",
      "pollinic type"
    ],

    "Microbiologia e Saúde": [
      "gut microbiota",
      "lactobacillaceae",
      "bacteria diversity",
      "bee virus",
      "microbiological",
      "significant metabolites",
      "biological activities",
      "stingless bee therapy",
      "expectorant activity"
    ],

    "Ninhos e Colônias": [
      "nest volume",
      "nest development",
      "stingless bee nest",
      "intranidal temperature",
      "humidity",
      "relative volume"
    ],

    "Botânica e Recursos Florais": [
      "bee forage",
      "bee forage plants",
      "flowering calendar",
      "fabaceae",
      "plants",
      "pollen",
      "stored pollen",
      "pot pollen"
    ],

    "Genética e Evolução": [
      "dna barcode",
      "gene rearrangement",
      "phylogenetic comparative methods",
      "eusociality",
      "symmetry"
    ],

    "Meliponicultura e Produção": [
      "box hive",
      "sugar syrup",
      "income source",
      "livestock",
      "bee product yield"
    ],

    "Aspectos Sociais e Políticos": [
      "ethnozoology",
      "patrimonio biocultural",
      "digital biopiracy",
      "environmental politics",
      "swot analysis",
      "innovation",
      "pedagogy"
    ]
  };

  const contagem: Record<string, number> = {};

  Object.keys(grupos).forEach((grupo) => {
    contagem[grupo] = 0;
  });

  data.forEach((item: any) => {
    const keyword =
      item.keyword?.keyword?.toLowerCase() || "";

    Object.entries(grupos).forEach(([grupo, palavras]) => {
      if (
        palavras.some((p) =>
          keyword.includes(p.toLowerCase())
        )
      ) {
        contagem[grupo]++;
      }
    });
  });

  const resultado = Object.entries(contagem)
    .map(([grupo, count]) => ({
      grupo,
      count,
    }))
    .filter((g) => g.count > 0)
    .sort((a, b) => b.count - a.count);

  setTopGruposConceituais(resultado);
}

async function carregarMapaKeywords() {
  const { data, error } = await supabase
    .from("keyword")
    .select("keyword");

  if (error || !data) {
    console.error(error);
    return;
  }

  const conceitos: Record<string, string[]> = {
    "Polinização": [
      "pollination",
      "pollen",
      "pollinic",
      "stored pollen",
      "selective pollen",
      "pot pollen"
    ],

    "Produtos Apícolas": [
      "honey",
      "propolis",
      "cerumen",
      "flavonoids",
      "polyphenols"
    ],

    "Abelhas Sem Ferrão": [
      "stingless bee",
      "native bee",
      "native stingless bees",
      "meliponina"
    ],

    "Forrageamento": [
      "foraging",
      "bee forage",
      "bee pasture",
      "generalist forager"
    ],

    "Microbiota e Saúde": [
      "gut microbiota",
      "bacteria",
      "lactobacillaceae",
      "virus",
      "microbiological"
    ],

    "Ninhos e Colônias": [
      "nest",
      "colony",
      "intranidal",
      "humidity"
    ]
  };

  const resultado: KeywordMap[] = [];

  Object.entries(conceitos).forEach(([conceito, termos]) => {

    const relacionadas = data
      .map((item) => item.keyword)
      .filter((keyword) =>
        termos.some((termo) =>
          keyword.toLowerCase().includes(
            termo.toLowerCase()
          )
        )
      );

    if (relacionadas.length > 0) {
      resultado.push({
        conceito,
        keywords: relacionadas,
      });
    }
  });

  setKeywordMap(resultado);
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

    

    async function carregarIdiomas(): Promise<void> {
      const { data, error } = await supabase
        .from("article")
        .select("language_original_document");

      if (error || !data) {
        console.error(error);
        return;
      }

      let english = 0;
      let spanish = 0;
      let portuguese = 0;
      let other = 0;

      data.forEach((item: { language_original_document: string | null }) => {
        const lang = item.language_original_document;

        if (!lang) {
          other++;
          return;
        }

        const normalized = lang.toLowerCase();

        if (normalized.includes("english")) english++;
        else if (normalized.includes("spanish")) spanish++;
        else if (normalized.includes("portuguese")) portuguese++;
        else other++;
      });

      setLanguageData([
        { name: "English", value: english },
        { name: "Spanish", value: spanish },
        { name: "Portuguese", value: portuguese },
        { name: "Other", value: other },
      ]);
    }

    async function carregarWordCloud() {
  const { data, error } = await supabase
    .from("article_keyword")
    .select(`
      keyword:keyword_id (
        keyword
      )
    `);

  if (error || !data) return;

  const contagem: Record<string, number> = {};

  data.forEach((item: any) => {
    const palavra = item.keyword?.keyword;

    if (!palavra) return;

    contagem[palavra] =
      (contagem[palavra] || 0) + 1;
  });

  const resultado = Object.entries(contagem)
    .map(([text, value]) => ({
      text,
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 100);

  setWordCloudData(resultado);
}

async function carregarMapaCoautoria() {

  const { data, error } = await supabase
    .from("author")
    .select("name");

  if (error || !data) {
    console.error(error);
    return;
  }

  const nodeCount: Record<string, number> = {};
  const linkCount: Record<string, number> = {};

  data.forEach((registro) => {

    if (!registro.name) return;

    const autores = registro.name
  .split(";")
  .map((a: string) => a.trim())
  .filter(Boolean);

    autores.forEach((autor: string) => {
  nodeCount[autor] =
    (nodeCount[autor] || 0) + 1;
});

    for (let i = 0; i < autores.length; i++) {

      for (
        let j = i + 1;
        j < autores.length;
        j++
      ) {

        const pair = [
          autores[i],
          autores[j],
        ]
          .sort()
          .join("|");

        linkCount[pair] =
          (linkCount[pair] || 0) + 1;
      }
    }
  });

  const nodes = Object.entries(nodeCount)
    .map(([name, count]) => ({
      name,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 25);

  const nomesVisiveis = new Set(
    nodes.map((n) => n.name)
  );

  const links = Object.entries(linkCount)
    .map(([pair, count]) => {

      const [source, target] =
        pair.split("|");

      return {
        source,
        target,
        count,
      };
    })
    .filter(
      (link) =>
        nomesVisiveis.has(link.source) &&
        nomesVisiveis.has(link.target)
    );

  setCoauthorNodes(nodes);
  setCoauthorLinks(links);
}

const maxWordCloud = useMemo(() => {
  if (wordCloudData.length === 0) return 1;

  return Math.max(
    ...wordCloudData.map((w) => w.value)
  );
}, [wordCloudData]);



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
    carregarIdiomas();
    carregarGruposConceituais();
    carregarMapaKeywords();
    carregarWordCloud();
    carregarMapaCoautoria();
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

  const maxGrupoConceitual = useMemo(() => {
    if (topGruposConceituais.length === 0) return 1;

    return Math.max(
      ...topGruposConceituais.map((g) => g.count)
    );
  }, [topGruposConceituais]);


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
  {topGruposConceituais.length > 0 && (
    <div className="grafico-container">
      <h2>Grupos Conceituais</h2>

      {topGruposConceituais.map((item) => {
        const width =
          (item.count / maxGrupoConceitual) * 100;

        return (
          <div
            key={item.grupo}
            style={{ marginBottom: "12px" }}
          >
            <div
              style={{
                marginBottom: "4px",
                fontSize: "14px",
              }}
            >
              {item.grupo} ({item.count})
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
                  background: "#8b5cf6",
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

      <section>
        {languageData.length > 0 && (
          <div className="grafico-container">
            <h2 style={{ textAlign: "center", marginBottom: "20px" , marginTop:"20px"}}>
              Idiomas dos Artigos
            </h2>

            {/* PIZZA */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  width: "220px",
                  height: "220px",
                  borderRadius: "50%",
                  background: `conic-gradient(
                    #3b82f6 0% ${
                      (languageData[0]?.value /
                        languageData.reduce((a, b) => a + b.value, 0)) *
                      100
                    }%,
                    #f59e0b ${
                      (languageData[0]?.value /
                        languageData.reduce((a, b) => a + b.value, 0)) *
                      100
                    }% ${
                      ((languageData[0]?.value + languageData[1]?.value) /
                        languageData.reduce((a, b) => a + b.value, 0)) *
                      100
                    }%,
                    #10b981 0%
                  )`,
                }}
              />
            </div>

            {/* LEGENDA */}
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                justifyContent: "center",
                gap: "20px",
                flexWrap: "wrap",
              }}
            >
              {languageData.map((item) => (
                <div key={item.name} style={{ display: "flex", alignItems: "center" }}>
                  <span
                    style={{
                      width: "12px",
                      height: "12px",
                      background:
                        item.name === "English"
                          ? "#3b82f6"
                          : item.name === "Spanish"
                          ? "#f59e0b"
                          : item.name === "Portuguese"
                          ? "#10b981"
                          : "#6b7280",
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

<section>
  {wordCloudData.length > 0 && (
    <div className="grafico-container">
      <h2>Nuvem de Palavras-Chave</h2>

      <div
        style={{
          minHeight: "500px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "12px",
          padding: "30px",
          lineHeight: 1.2,
        }}
      >
        {wordCloudData.map((word, index) => {
          const fontSize =
            14 + (word.value / maxWordCloud) * 60;

          const rotate =
            index % 5 === 0
              ? "rotate(-10deg)"
              : index % 7 === 0
              ? "rotate(10deg)"
              : "rotate(0deg)";

          return (
            <span
              key={word.text}
              style={{
                fontSize: `${fontSize}px`,
                fontWeight:
                  word.value > maxWordCloud * 0.4
                    ? 700
                    : 500,
                transform: rotate,
                display: "inline-block",
                opacity: 0.9,
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </div>
  )}
</section>

<section>
  {coauthorNodes.length > 0 && (
    <div className="grafico-container">
      <h2>Mapa de Coautoria</h2>

      <div
        style={{
          height: "700px",
          background: "#ffffff",
          borderRadius: "10px",
        }}
      >
        <ForceGraph2D
  graphData={{
    nodes: coauthorNodes.map((n) => ({
      id: n.name,
      val: n.count,
    })),
    links: coauthorLinks.map((l) => ({
      source: l.source,
      target: l.target,
      value: l.count,
    })),
  }}
  nodeLabel="id"
  nodeRelSize={6}
  nodeVal={(node: any) => node.val}
  nodeColor={() => "#3b82f6"}

  linkWidth={(link: any) => Math.sqrt(link.value)}
  linkColor={() => "rgba(120,120,120,0.25)"}

  cooldownTicks={300}
  d3AlphaDecay={0.03}
  d3VelocityDecay={0.45}

/>
      </div>
    </div>
  )}
</section>

      
    </main>
  );
}

export default Dashboard;