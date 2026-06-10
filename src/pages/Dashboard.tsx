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

function Dashboard() {
  
    const [publicacoesPorAno, setPublicacoesPorAno] = useState<PublicacaoPorAno[]>([]);
  
  const [citacoesPorAno, setCitacoesPorAno] = useState<CitacoesPorAno[]>([]);

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
      console.error(error);
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
            console.error(error);
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

  // =========================
  // LOAD
  // =========================
  useEffect(() => {
    carregarMetricas();
    carregarPublicacoesPorAno();
    carregarCitacoesPorAno();
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
    </main>
  );
}

export default Dashboard;