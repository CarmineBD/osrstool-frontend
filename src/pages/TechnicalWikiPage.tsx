import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useSeo } from "@/hooks/useSeo";

type WikiCategorySlug = "general" | "metricas" | "uso";

type WikiSection = {
  id: string;
  label: string;
  title: string;
  description: string;
  content: ReactNode;
};

type WikiCategory = {
  slug: WikiCategorySlug;
  title: string;
  shortDescription: string;
  intro: string;
  sections: WikiSection[];
};

type WikiDelayedNavigationState = {
  pendingSectionId?: string;
  delayedScrollMs?: number;
};

const CATEGORY_ORDER: WikiCategorySlug[] = ["general", "metricas", "uso"];

const WIKI_CATEGORIES: Record<WikiCategorySlug, WikiCategory> = {
  general: {
    slug: "general",
    title: "Vision general",
    shortDescription:
      "Que hace la app, de donde sale la data, cada cuanto cambia y como leerla.",
    intro:
      "Esta categoria explica la base del producto en lenguaje simple: que ves, de donde sale y como interpretar cambios sin caer en decisiones por picos.",
    sections: [
      {
        id: "overview",
        label: "Que hace la app",
        title: "Que hace OSRSTool",
        description: "Objetivo del producto en lenguaje simple.",
        content: (
          <div className="space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              OSRSTool te ayuda a elegir metodos para ganar GP o entrenar skills
              con datos recientes y comparables.
            </p>
            <p>
              En vez de abrir muchas paginas, aqui tienes una unica vista con
              rentabilidad, estabilidad de mercado, dificultad practica y
              requisitos.
            </p>
            <Separator />
            <p>
              No muestra solo un numero final. Tambien muestra contexto para
              responder: "esto paga bien, pero podre ejecutarlo de verdad
              ahora?"
            </p>
          </div>
        ),
      },
      {
        id: "sources",
        label: "De donde sale la data",
        title: "Origen real de la informacion",
        description: "Fuentes que usa backend para construir metricas.",
        content: (
          <div className="space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              El backend junta varias fuentes oficiales y luego unifica todo
              para que sea legible:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Precios de tradeables: API oficial de precios de OSRS Wiki
                (`/api/v1/osrs/latest`).
              </li>
              <li>
                Volumen horario por item: API de OSRS Wiki (`/api/v1/osrs/1h`).
              </li>
              <li>
                Catalogo de items base: OSRS Wiki mapping
                (`/api/v1/osrs/mapping`).
              </li>
              <li>
                Perfil de cuenta (si pones username): sync.runescape.wiki
                (levels, quests, diaries).
              </li>
              <li>
                Metodos/variantes/requisitos: base de datos propia (definida por
                administradores).
              </li>
            </ul>
            <p>
              Si una API externa se cae o retrasa, la app puede devolver estado
              parcial y avisos.
            </p>
          </div>
        ),
      },
      {
        id: "refresh",
        label: "Cada cuanto se actualiza",
        title: "Frecuencia real de actualizacion",
        description: "Porque los valores cambian incluso sin tocar filtros.",
        content: (
          <div className="space-y-3 text-sm leading-relaxed text-slate-700">
            <ul className="list-disc space-y-1 pl-5">
              <li>Precios de items: cada 1 minuto.</li>
              <li>Profits de metodos (high/low): cada 1 minuto.</li>
              <li>Captura de historial de profits: cada 5 minutos.</li>
              <li>
                Volumen acumulado 24h: una vez por hora (pipeline horario).
              </li>
              <li>
                Frontend: refresco automatico periodico (la frecuencia exacta
                depende de tu cliente).
              </li>
            </ul>
            <Separator />
            <p>
              Nota avanzada: en tradeables se actualizan sobre todo items con
              cambios recientes de precio. En untradeables se recalcula por
              reglas para mantener consistencia.
            </p>
          </div>
        ),
      },
      {
        id: "data-reading",
        label: "Como leer cambios",
        title: "Cuando un numero sube o baja, que significa",
        description: "Guia rapida para no sobre reaccionar.",
        content: (
          <div className="space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              Una subida puntual de `highProfit` no siempre significa "mejor
              metodo del dia". Puede ser un pico corto por poco volumen.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Valida `lowProfit` para escenario conservador.</li>
              <li>Mira `marketImpact` para saber si el mercado te aguanta.</li>
              <li>Usa historial para confirmar si es tendencia o ruido.</li>
            </ul>
          </div>
        ),
      },
    ],
  },
  metricas: {
    slug: "metricas",
    title: "Como se calculan metricas",
    shortDescription:
      "Formulas reales para untradeables, GP/hr, market move, trend y score.",
    intro:
      "Aqui tienes una explicacion matematica, pero en lenguaje humano, de como se calculan los campos mas importantes en backend.",
    sections: [
      {
        id: "untradeables",
        label: "Untradeables",
        title: "Como se valora un item sin precio directo",
        description:
          "Reglas que transforman items no tradeables en valor util.",
        content: (
          <div className="space-y-4 text-sm leading-relaxed text-slate-700">
            <p>
              Si un item no tiene precio de mercado directo, backend aplica
              reglas para poder incluirlo en el calculo de profit.
            </p>
            <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">FIXED</p>
                <p className="text-sm">
                  Precio fijo manual: `low = L`, `high = H`.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">RECIPE</p>
                <p className="text-sm">
                  Se suma el coste de componentes: `low = SUM(cantidad_i *
                  low_i)` y `high = SUM(cantidad_i * high_i)`.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  BEST_RECIPE
                </p>
                <p className="text-sm">
                  Si hay varias recetas validas, se usa la mas barata para cada
                  banda: `bestLow = MIN(low_receta)` y `bestHigh =
                  MIN(high_receta)`.
                </p>
              </div>
            </div>
            <p>
              Resultado: los untradeables entran en el mismo pipeline que el
              resto de items.
            </p>
          </div>
        ),
      },
      {
        id: "profit",
        label: "GP/hr alto y bajo",
        title: "Formula exacta de High Profit y Low Profit",
        description: "No es un solo numero: son 2 escenarios.",
        content: (
          <div className="space-y-3 text-sm leading-relaxed text-slate-700">
            <p>Para cada variante, backend calcula dos bandas:</p>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
              <p>`outputsLow = SUM(output.qty * output.lowPrice)`</p>
              <p>`outputsHigh = SUM(output.qty * output.highPrice)`</p>
              <p>`inputsHigh = SUM(input.qty * input.highPrice)`</p>
              <p>`inputsLow = SUM(input.qty * input.lowPrice)`</p>
              <Separator />
              <p>`lowProfit = outputsLow - inputsHigh`</p>
              <p>`highProfit = outputsHigh - inputsLow`</p>
            </div>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                `High Profit` es optimista (vendes caro y compras barato).
              </li>
              <li>
                `Low Profit` es conservador (vendes barato y compras caro).
              </li>
            </ul>
            <p>
              Importante: el profit sale de `inputs/outputs` y precios. El campo
              `actionsPerHour` existe como metadata del metodo, pero este
              calculo no lo multiplica aparte.
            </p>
          </div>
        ),
      },
      {
        id: "gp-per-xp",
        label: "GP por XP",
        title: "Como se calcula GP/XP",
        description: "Solo se calcula cuando eliges una skill concreta.",
        content: (
          <div className="space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              Si filtras por skill, backend toma la XP/h de esa skill dentro de
              `xpHour` y calcula:
            </p>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
              <p>`gpPerXpHigh = highProfit / xpHour(skillSeleccionada)`</p>
              <p>`gpPerXpLow = lowProfit / xpHour(skillSeleccionada)`</p>
            </div>
            <p>
              Si la variante no da XP para esa skill, no entra en ese
              filtro/ordenacion.
            </p>
          </div>
        ),
      },
      {
        id: "market-move",
        label: "% market move",
        title: "Formula real de market impact (instant y slow)",
        description:
          "Mide cuanto pesa tu metodo contra el volumen real del mercado.",
        content: (
          <div className="space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              Para cada item se estima su "share" de mercado por hora y luego se
              pondera por valor economico del item.
            </p>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-xs sm:text-sm">
              <p>`volumePerHour = max(epsilon, volume24h / 24)`</p>
              <p>`shareItem = quantity / volumePerHour`</p>
              <p>`valueItem = quantity * priceWeight`</p>
              <p>
                `weightedShare = SUM((valueItem / SUM(valueItem)) * shareItem)`
              </p>
              <Separator />
              <p>
                `impactInstant = alpha * shareInputsInstant + (1-alpha) *
                shareOutputsInstant`
              </p>
              <p>
                `impactSlow = alpha * shareInputsSlow + (1-alpha) *
                shareOutputsSlow`
              </p>
            </div>
            <ul className="list-disc space-y-1 pl-5">
              <li>Por defecto: `alpha = 0.5` y `epsilon = 1`.</li>
              <li>
                `instant`: para inputs usa precio/volumen high; para outputs usa
                low (escenario de ejecucion rapida).
              </li>
              <li>
                `slow`: para inputs usa low; para outputs usa high (escenario
                paciente).
              </li>
              <li>
                Si falta volumen de un item, ese item se trata como impacto
                maximo local.
              </li>
              <li>El valor puede superar 1.0 (no esta capado por arriba).</li>
            </ul>
          </div>
        ),
      },
      {
        id: "trends",
        label: "Tendencias",
        title: "Como se calcula trend 1h, 24h, semana y mes",
        description: "Cambio porcentual respecto a snapshots pasados.",
        content: (
          <div className="space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              El backend compara el `highProfit` actual con el ultimo valor
              historico disponible antes de cada ventana de tiempo.
            </p>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
              <p>`trend% = ((highActual - highPasado) / highPasado) * 100`</p>
            </div>
            <p>
              Si no hay dato pasado valido para esa ventana, la tendencia queda
              en `null`.
            </p>
          </div>
        ),
      },
      {
        id: "scores",
        label: "AFKiness y clicks",
        title: "AFKiness, Click Intensity y Risk Level",
        description: "Como interpretar estos campos sin confundirse.",
        content: (
          <div className="space-y-3 text-sm leading-relaxed text-slate-700">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>AFKiness:</strong> cuanto margen de atencion tienes en
                ese metodo.
              </li>
              <li>
                <strong>Click Intensity:</strong> demanda de interaccion (mas
                alto = mas activo).
              </li>
              <li>
                <strong>Risk level:</strong> riesgo estimado por la
                configuracion del metodo.
              </li>
            </ul>
            <p>
              Estos campos vienen del diseño de variantes (no de telemetria
              automatica en tiempo real). Sirven para adaptar resultados a tu
              estilo de juego.
            </p>
          </div>
        ),
      },
    ],
  },
  uso: {
    slug: "uso",
    title: "Como usar mejor la app",
    shortDescription:
      "Filtros, historial, username, variantes, likes y lectura avanzada.",
    intro:
      "Esta categoria te ayuda a tomar decisiones mas robustas: no solo ver tablas, sino entender por que un metodo aparece arriba o abajo.",
    sections: [
      {
        id: "filters",
        label: "Filtros y ordenamiento",
        title: "Como filtrar y ordenar sin sesgo",
        description: "Atajos para llegar a metodos ejecutables de verdad.",
        content: (
          <div className="space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              Puedes filtrar por skill, categoria, AFK minimo, click intensity
              maxima, nivel de riesgo, si da XP y si es rentable.
            </p>
            <p>
              Puedes ordenar por `highProfit`, `xpHour`, `gpPerXp`, `likes`,
              `afkiness` o `clickIntensity`.
            </p>
            <Separator />
            <p>
              Regla practica: para estabilidad prioriza `lowProfit +
              marketImpact + trend`, no solo `highProfit`.
            </p>
          </div>
        ),
      },
      {
        id: "variants-mode",
        label: "best vs all",
        title: "Diferencia entre variantes best y all",
        description: "Por que a veces ves una sola variante por metodo.",
        content: (
          <div className="space-y-3 text-sm leading-relaxed text-slate-700">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>best:</strong> muestra solo la variante con mayor
                `highProfit` de cada metodo.
              </li>
              <li>
                <strong>all:</strong> muestra una fila por variante para
                comparacion fina.
              </li>
            </ul>
            <p>
              Si estas explorando rapido, usa `best`. Si vas a optimizar
              detalle, usa `all`.
            </p>
          </div>
        ),
      },
      {
        id: "history",
        label: "Historial y tendencias",
        title: "No decidir solo por el valor actual",
        description: "Usa agregacion temporal para separar ruido de tendencia.",
        content: (
          <div className="space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              El historico soporta distintos rangos (`24h`, `1m`, `1y`, `all`) y
              agregaciones:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>avg:</strong> promedio por bucket temporal.
              </li>
              <li>
                <strong>close:</strong> ultimo valor del bucket.
              </li>
              <li>
                <strong>ohlc:</strong> open/high/low/close para lectura tipo
                velas.
              </li>
            </ul>
            <p>
              El backend ajusta granularidad automaticamente para no devolverte
              miles de puntos inutiles.
            </p>
          </div>
        ),
      },
      {
        id: "user-context",
        label: "Modo con username",
        title: "Personalizacion real con tu cuenta",
        description: "Filtra metodos segun niveles, quests y diaries.",
        content: (
          <div className="space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              Al poner username, backend cruza tus stats con los requisitos de
              cada variante: levels, quests y achievement diaries.
            </p>
            <p>
              Ademas devuelve `missingRequirements` para mostrarte exactamente
              que te falta desbloquear.
            </p>
            <Separator />
            <p>Reglas clave:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Si un requisito pide `Combat`, se valida contra `Attack`,
                `Strength` y `Defence`.
              </li>
              <li>
                En quests, tu stage debe ser mayor o igual al stage requerido.
              </li>
              <li>
                En diaries, el tier pedido debe estar marcado como completo.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: "likes",
        label: "Likes y favoritos",
        title: "Como usar likes para priorizar",
        description: "Senal social util, pero no absoluta.",
        content: (
          <div className="space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              Puedes marcar metodos con like y luego filtrar por `likedByMe`
              para tu lista personal.
            </p>
            <p>
              Los likes ayudan a descubrir metodos populares, pero no sustituyen
              tus filtros de rentabilidad y estabilidad.
            </p>
          </div>
        ),
      },
      {
        id: "frontend",
        label: "Como leer pantallas",
        title: "Flujo recomendado para decidir mejor",
        description: "Secuencia simple para elegir con menos errores.",
        content: (
          <div className="space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              <strong>1) Tabla principal:</strong> filtra por tu objetivo
              (profit, xp o comodidad).
            </p>
            <p>
              <strong>2) Detalle de variante:</strong> valida inputs/outputs,
              requisitos, trend e impacto de mercado.
            </p>
            <p>
              <strong>3) Historial:</strong> confirma que no sea un pico
              aislado.
            </p>
            <p>
              <strong>4) Ejecucion:</strong> empieza por escenario conservador
              (`lowProfit`) y ajusta segun mercado real.
            </p>
          </div>
        ),
      },
    ],
  },
};

function isWikiCategorySlug(
  value: string | undefined,
): value is WikiCategorySlug {
  return value === "general" || value === "metricas" || value === "uso";
}

function categoryPath(slug: WikiCategorySlug) {
  return slug === "general" ? "/wiki/technical" : `/wiki/technical/${slug}`;
}

function sectionPath(slug: WikiCategorySlug, sectionId: string) {
  return `${categoryPath(slug)}#${sectionId}`;
}

function SectionCard({
  section,
  isHighlighted,
}: {
  section: WikiSection;
  isHighlighted: boolean;
}) {
  return (
    <section
      id={section.id}
      className={cn(
        "scroll-mt-24 space-y-3 rounded-md px-2 py-5 -mx-2 transition-all duration-700",
        isHighlighted && "bg-sky-50 ring-1 ring-sky-200",
      )}
    >
      <h2 className="text-3xl font-bold tracking-tight text-slate-900">
        {section.title}
      </h2>
      <p className="text-sm text-slate-600">{section.description}</p>
      <div>{section.content}</div>
    </section>
  );
}

function TechnicalWikiContent({
  requestedCategory,
}: {
  requestedCategory?: string;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const delayedNavigationState =
    (location.state as WikiDelayedNavigationState | null) ?? null;
  const pendingDelayedSectionId = delayedNavigationState?.pendingSectionId;
  const categorySlug =
    requestedCategory === undefined
      ? "general"
      : isWikiCategorySlug(requestedCategory)
        ? requestedCategory
        : null;
  const category = categorySlug ? WIKI_CATEGORIES[categorySlug] : null;
  const [activeSection, setActiveSection] = useState<string>("");
  const [highlightedSection, setHighlightedSection] = useState<string | null>(
    null,
  );
  const [isHeaderHighlighted, setIsHeaderHighlighted] = useState(false);
  const sectionHighlightTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const headerHighlightTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const hasMountedRef = useRef(false);

  useSeo({
    title: category
      ? `${category.title} | Wiki OSRSTool`
      : "Categoria no encontrada | Wiki OSRSTool",
    description: category
      ? `${category.title}: ${category.shortDescription}`
      : "La categoria solicitada no existe en la wiki.",
    path: category ? categoryPath(category.slug) : "/wiki/technical",
    keywords: "osrstool wiki, osrs guide",
  });

  useEffect(() => {
    if (!category) return;
    setActiveSection(category.sections[0]?.id ?? "");
  }, [category]);

  useEffect(() => {
    return () => {
      if (sectionHighlightTimeoutRef.current) {
        clearTimeout(sectionHighlightTimeoutRef.current);
      }
      if (headerHighlightTimeoutRef.current) {
        clearTimeout(headerHighlightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!category) return;
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (location.hash) return;
    if (pendingDelayedSectionId) return;

    if (headerHighlightTimeoutRef.current) {
      clearTimeout(headerHighlightTimeoutRef.current);
    }
    setIsHeaderHighlighted(true);
    headerHighlightTimeoutRef.current = setTimeout(() => {
      setIsHeaderHighlighted(false);
    }, 850);
  }, [category, location.hash, location.pathname, pendingDelayedSectionId]);

  useEffect(() => {
    if (!category || !location.hash) return;
    const targetId = location.hash.slice(1);
    if (!category.sections.some((section) => section.id === targetId)) return;

    const targetSection = document.getElementById(targetId);
    if (!targetSection) return;

    const frame = window.requestAnimationFrame(() => {
      targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(targetId);
      if (sectionHighlightTimeoutRef.current) {
        clearTimeout(sectionHighlightTimeoutRef.current);
      }
      setHighlightedSection(targetId);
      sectionHighlightTimeoutRef.current = setTimeout(() => {
        setHighlightedSection(null);
      }, 850);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [category, location.hash, location.pathname]);

  useEffect(() => {
    if (!category) return;
    const targetId = delayedNavigationState?.pendingSectionId;
    if (!targetId) return;
    if (!category.sections.some((section) => section.id === targetId)) return;

    window.scrollTo({ top: 0, behavior: "auto" });
    setActiveSection("");

    const delayMs = Math.max(
      120,
      delayedNavigationState.delayedScrollMs ?? 220,
    );
    const timeoutId = window.setTimeout(() => {
      const targetSection = document.getElementById(targetId);
      if (!targetSection) {
        navigate(location.pathname, { replace: true, state: null });
        return;
      }

      targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(targetId);
      if (sectionHighlightTimeoutRef.current) {
        clearTimeout(sectionHighlightTimeoutRef.current);
      }
      setHighlightedSection(targetId);
      sectionHighlightTimeoutRef.current = setTimeout(() => {
        setHighlightedSection(null);
      }, 850);

      navigate(location.pathname, { replace: true, state: null });
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [category, delayedNavigationState, location.pathname, navigate]);

  const onSectionClick = (
    event: MouseEvent<HTMLAnchorElement>,
    slug: WikiCategorySlug,
    sectionId: string,
  ) => {
    if (!category) return;

    if (category.slug !== slug) {
      event.preventDefault();
      navigate(categoryPath(slug), {
        state: {
          pendingSectionId: sectionId,
          delayedScrollMs: 220,
        } satisfies WikiDelayedNavigationState,
      });
      return;
    }

    event.preventDefault();
    const targetSection = document.getElementById(sectionId);
    if (!targetSection) return;

    const nextHash = `#${sectionId}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${nextHash}`,
      );
    }

    targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(sectionId);
    if (sectionHighlightTimeoutRef.current) {
      clearTimeout(sectionHighlightTimeoutRef.current);
    }
    setHighlightedSection(sectionId);
    sectionHighlightTimeoutRef.current = setTimeout(() => {
      setHighlightedSection(null);
    }, 850);
  };

  const onCategoryClick = (
    event: MouseEvent<HTMLAnchorElement>,
    slug: WikiCategorySlug,
  ) => {
    if (!category || category.slug !== slug) return;

    event.preventDefault();
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    setActiveSection(category.sections[0]?.id ?? "");

    if (headerHighlightTimeoutRef.current) {
      clearTimeout(headerHighlightTimeoutRef.current);
    }
    setIsHeaderHighlighted(true);
    headerHighlightTimeoutRef.current = setTimeout(() => {
      setIsHeaderHighlighted(false);
    }, 850);
  };

  if (!category) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <Card className="border-slate-200 bg-white/95">
          <CardHeader>
            <CardTitle>Categoria no encontrada</CardTitle>
            <CardDescription>
              La ruta solicitada no existe dentro de la wiki.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/wiki/technical" className="font-semibold underline">
              Volver a Vision general
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-[radial-gradient(circle_at_top_right,_#f1f5f9,_#ffffff,_#f8fafc_60%)]">
      <div className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6">
        <div className="grid gap-6 pt-2 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-8rem)]">
            <Card className="h-full border-slate-200 bg-white/95">
              <CardContent className="px-0 pb-0 pt-0">
                <ScrollArea className="h-[50vh] px-4 pb-3 pt-1 lg:h-[calc(100vh-15rem)]">
                  <nav
                    className="space-y-4"
                    aria-label="Menu de categorias de wiki"
                  >
                    {CATEGORY_ORDER.map((slug) => {
                      const menuCategory = WIKI_CATEGORIES[slug];
                      const isActiveCategory = category.slug === slug;

                      return (
                        <div key={slug} className="space-y-1">
                          <Link
                            to={categoryPath(slug)}
                            onClick={(event) => onCategoryClick(event, slug)}
                            className="block rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                          >
                            {menuCategory.title}
                          </Link>
                          <div className="space-y-1 pl-3">
                            {menuCategory.sections.map((section) => {
                              const isActiveSection =
                                isActiveCategory &&
                                activeSection === section.id;

                              return (
                                <Link
                                  key={section.id}
                                  to={sectionPath(slug, section.id)}
                                  onClick={(event) =>
                                    onSectionClick(event, slug, section.id)
                                  }
                                  className={cn(
                                    "block rounded-md px-3 py-1.5 text-sm transition-colors",
                                    isActiveSection
                                      ? "bg-accent text-accent-foreground font-medium"
                                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                  )}
                                >
                                  {section.label}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </nav>
                </ScrollArea>
              </CardContent>
            </Card>
          </aside>

          <article className="space-y-0 pt-2">
            <section
              className={cn(
                "space-y-3 rounded-md px-2 pb-5 -mx-2 mt-5 transition-all duration-700",
                isHeaderHighlighted && "bg-sky-50 ring-1 ring-sky-200",
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                OSRSTool Wiki
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                {category.title}
              </h1>
              <p className="max-w-4xl text-sm leading-relaxed text-slate-700 sm:text-base">
                {category.intro}
              </p>
            </section>
            <Separator />

            {category.sections.map((section, index) => (
              <div key={section.id}>
                <SectionCard
                  section={section}
                  isHighlighted={highlightedSection === section.id}
                />
                {index < category.sections.length - 1 ? <Separator /> : null}
              </div>
            ))}
          </article>
        </div>
      </div>
    </div>
  );
}

export function TechnicalWikiPage() {
  return <TechnicalWikiContent />;
}

export function TechnicalWikiCategoryPage() {
  const { category } = useParams<{ category: string }>();
  return <TechnicalWikiContent requestedCategory={category} />;
}
