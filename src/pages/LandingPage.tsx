import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  changelogEntries,
  formatChangelogDate,
  latestChangelogEntries,
} from "@/content/changelog";
import { useSeo } from "@/hooks/useSeo";

const SEO_TITLE = "OSRSTool | Metodos de Money Making para OSRS";
const SEO_DESCRIPTION =
  "OSRSTool te ayuda a encontrar metodos de money making en Old School RuneScape con filtros claros, comparacion rapida y novedades del producto.";
const SEO_KEYWORDS =
  "osrs tool, money making osrs, old school runescape gp, metodos osrs, osrs moneymaking";

const FEATURE_ITEMS = [
  {
    title: "Filtros avanzados",
    description:
      "Filtra por categoria, intensidad de clicks, nivel de riesgo y skills para encontrar metodos alineados a tu estilo.",
  },
{
    title: "Track de métodos",
    description:
      "Conoce el historial de profit/hr que ha tenido cada método para identificar tendencias y estabilidad en el mercado.",
  },
  {
    title: "Adaptados a tu usuario",
    description:
      "Filtra métodos por skills de tu usuario para conocer los mejores métodos que tienes disponible actualmente",
  },{
    title: "Datos reales",
    description:
      "Todos los precios y profit de metodos se actualizan cada 60 segundos para tener la información más fresca y real actualmente",
  },{
    title: "Fidelidad",
    description:
      "Conoce la factibilidad real de hacer un método con métricas avanzadas de impacto en el mercado.",
  },

];

export function LandingPage() {
  useSeo({
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    path: "/",
    keywords: SEO_KEYWORDS,
  });

  return (
    <div className="bg-[radial-gradient(circle_at_top_right,_#fef9c3,_#fff,_#e2e8f0_60%)]">
      <header className="mx-auto w-full max-w-6xl px-6 py-18 sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
          Welcome to OSRSTool
        </p>
        <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-slate-900 sm:text-6xl">
          Make money and train efficiently with real-time data.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-700 sm:text-2xl">
          OSRSTool es una herramienta avanzada de tiempo real para explorar métodos de training / money making adaptadas al las stats de cada usuario. 
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" className="bg-slate-900 text-white hover:bg-slate-800">
            <Link to="/allMethods">Explorar Money making methods</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#">Explorar Training methods</a>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 sm:px-10">
        {/* <section
          id="que-es-osrstool"
          className="rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-sm"
        >
          <h2 className="text-2xl font-bold text-slate-900">Que es OSRSTool</h2>
          <p className="mt-3 text-slate-700">
            OSRSTool centraliza métodos de money making y training en un solo sitio para responder una pregunta simple: “¿Qué me conviene hacer ahora?” Filtras por tu perfil, comparas variantes y eliges con información actualizada y accionable.
          </p>
        </section> */}

        <section
          id="para-quien"
          className="rounded-2xl border border-slate-200 bg-white/85 p-8 shadow-sm"
        >
          <h2 className="text-2xl font-bold text-slate-900">Para quien</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-semibold text-slate-900">Jugadores nuevos</h3>
              <p className="mt-2 text-sm text-slate-700">
                Encuentra los mejores métodos viables sin perder horas saltando entre guías, vídeos y hojas de cálculo.
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-semibold text-slate-900">Jugadores avanzados</h3>
              <p className="mt-2 text-sm text-slate-700">
               Optimiza tu tiempo haciendo el mejor método que peudas hacer actualmente según GP/h, XP/h, AFKiness y estabilidad del mercado.
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-semibold text-slate-900">Lazy players</h3>
              <p className="mt-2 text-sm text-slate-700">
               Encuentra métodos con bajo requerimiento de atención por hora para hacer dinero o entrenar.
              </p>
            </article>
             <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-semibold text-slate-900">Players focused on GP</h3>
              <p className="mt-2 text-sm text-slate-700">
                Haz solo aquellos métodos que actualmente sauqen mejor rendimiento por hora con data fresca y confiable, sin perder tiempo investigando cada precio.
              </p>
            </article>
             <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-semibold text-slate-900">Players focused on XP</h3>
              <p className="mt-2 text-sm text-slate-700">
               Sube de nivel de manera eficiente y realista con métodos que se ajusten a tu nivel actual.
              </p>
            </article>
          </div>
        </section>

        <section
          id="features"
          className="rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-sm"
        >
          <h2 className="text-2xl font-bold text-slate-900">Features</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {FEATURE_ITEMS.map((item) => (
              <article key={item.title} className="rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-700">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="como-funciona"
          className="rounded-2xl border border-slate-200 bg-white/85 p-8 shadow-sm"
        >
          <h2 className="text-2xl font-bold text-slate-900">Como funciona</h2>
          <ol className="mt-4 grid gap-3 text-slate-700 sm:grid-cols-2">
            <li className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              1. Entra a <Link to="/allMethods" className="font-semibold underline">/allMethods</Link>.
            </li>
            <li className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              2. Aplica filtros por categoria, skill y nivel de riesgo.
            </li>
            <li className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              3. Compara metodos y abre el detalle para revisar requisitos y variantes.
            </li>
            <li className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              4. Consulta el changelog para conocer mejoras recientes del producto.
            </li>
          </ol>
        </section>

        <section
          id="changelog"
          className="rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-sm"
        >
          <h2 className="text-2xl font-bold text-slate-900">Changelog de novedades</h2>
          <p className="mt-2 text-sm text-slate-700">
            Ultimas 5 novedades publicadas.
          </p>

          <div className="mt-5 grid gap-3">
            {latestChangelogEntries.map((entry) => (
              <article
                key={entry.slug}
                className="rounded-xl border border-slate-200 bg-slate-50 p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {formatChangelogDate(entry.date)} | {entry.version}
                </p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">{entry.title}</h3>
                <p className="mt-2 text-sm text-slate-700">{entry.summary}</p>
                <Link
                  to={`/changelog/${entry.slug}`}
                  className="mt-3 inline-block text-sm font-semibold text-slate-900 underline"
                >
                  Leer articulo completo
                </Link>
              </article>
            ))}
          </div>

          <details className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-900">
              Ver todo ({changelogEntries.length} entradas)
            </summary>
            <div className="mt-3 grid gap-2">
              {changelogEntries.map((entry) => (
                <Link
                  key={`all-${entry.slug}`}
                  to={`/changelog/${entry.slug}`}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  {formatChangelogDate(entry.date)} | {entry.version} - {entry.title}
                </Link>
              ))}
            </div>
          </details>
        </section>
      </main>
    </div>
  );
}

