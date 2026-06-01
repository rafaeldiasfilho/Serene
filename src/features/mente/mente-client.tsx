"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GitBranch,
  History,
  LibraryBig,
  MessageSquareText,
  RefreshCw,
  Sparkles,
  Star,
  Tags,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AuthPanel } from "@/components/auth/auth-panel";
import { useAppState } from "@/components/providers/app-state-provider";
import { BrainLoader } from "@/components/ui/brain-loader";
import {
  buildMenteInsight,
  type MenteAnnotationPreview,
  type MenteCategory,
  type MenteEvolutionPoint,
  type MenteInsight,
} from "@/features/mente/mente-model";
import {
  createManualCategoryFromMente,
  loadMenteSourceData,
  type MenteSourceData,
} from "@/features/mente/mente-services";

const annotationTypeLabels: Record<MenteAnnotationPreview["type"], string> = {
  quick_note: "Anotacao rapida",
  reflection: "Reflexao",
  highlight: "Marca-texto",
  post_it: "Post-it",
  flag: "Flag",
  doubt: "Duvida",
  thought: "Pensamento",
  idea: "Ideia",
  action: "Acao",
  ocr_page: "OCR",
};

function formatDuration(seconds: number) {
  if (seconds <= 0) {
    return "0min";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  const days = Math.floor(hours / 24);

  if (hours <= 0) {
    return `${minutes}min`;
  }

  if (hours >= 24) {
    const dayText = days === 1 ? "1 dia" : `${days} dias`;
    return `${hours}h (${dayText} de leitura)`;
  }

  if (minutes <= 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}min`;
}

function timePhrase(seconds: number, suffix: string) {
  return `${formatDuration(seconds)} ${suffix}`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function sourceLabel(category: MenteCategory) {
  if (category.source === "saved") {
    return "area automatica";
  }

  return "inferida por leitura";
}

function MetricCard({
  helper,
  icon: Icon,
  label,
  value,
}: {
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--serene-muted)]">{label}</p>
        <span className="grid size-8 place-items-center rounded-full bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-[var(--serene-muted)]">{helper}</p>
    </article>
  );
}

function TimeBlock({
  helper,
  icon: Icon,
  label,
  value,
}: {
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
          <Icon className="size-4" />
        </span>
        <p className="text-sm font-medium">{label}</p>
      </div>
      <p className="mt-4 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-xs text-[var(--serene-muted)]">{helper}</p>
    </article>
  );
}

function EmptyBlock({
  icon: Icon,
  text,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5">
      <Icon className="size-7 text-[var(--serene-accent)]" />
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[var(--serene-muted)]">{text}</p>
    </div>
  );
}

function AnnotationPreview({ item }: { item: MenteAnnotationPreview }) {
  return (
    <article className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3">
      <p className="text-xs text-[var(--serene-muted)]">
        {annotationTypeLabels[item.type]} {item.bookTitle ? `em ${item.bookTitle}` : "sem livro"}
      </p>
      <p className="literary mt-2 text-sm leading-6">{item.content}</p>
    </article>
  );
}

function CategoryCard({
  category,
  converting,
  onConvert,
}: {
  category: MenteCategory;
  converting: boolean;
  onConvert: (category: MenteCategory) => void;
}) {
  return (
    <article className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="mt-1 size-4 shrink-0 rounded-full border border-[var(--serene-border)]"
            style={{ backgroundColor: category.color }}
          />
          <div>
            <p className="text-xs text-[var(--serene-muted)]">{sourceLabel(category)}</p>
            <h3 className="text-lg font-semibold">{category.name}</h3>
            {category.description && (
              <p className="mt-1 text-sm text-[var(--serene-muted)]">{category.description}</p>
            )}
          </div>
        </div>
        {category.confidence !== null && category.confidence >= 0.9 && (
          <span className="rounded-full border border-[var(--serene-border)] px-2 py-1 text-xs text-[var(--serene-muted)]">
            sinal forte
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-lg font-semibold">{category.books.length}</p>
          <p className="text-xs text-[var(--serene-muted)]">livros</p>
        </div>
        <div>
          <p className="text-lg font-semibold">{category.annotationCount}</p>
          <p className="text-xs text-[var(--serene-muted)]">anotacoes</p>
        </div>
        <div>
          <p className="text-lg font-semibold">{formatDuration(category.realSeconds)}</p>
          <p className="text-xs text-[var(--serene-muted)]">tempo real</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {category.books.slice(0, 4).map((book) => (
          <span
            key={book.id}
            className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-1 text-xs"
          >
            {book.title}
          </span>
        ))}
        {category.books.length > 4 && (
          <span className="rounded-full border border-[var(--serene-border)] px-3 py-1 text-xs text-[var(--serene-muted)]">
            +{category.books.length - 4}
          </span>
        )}
      </div>

      {category.reason && (
        <p className="literary mt-4 rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3 text-sm text-[var(--serene-muted)]">
          {category.reason}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {category.manualCategoryExists && (
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] px-3 py-2 text-xs text-[var(--serene-muted)]">
            <CheckCircle2 className="size-4" />
            Ja existe na Biblioteca
          </span>
        )}
        <button
          type="button"
          onClick={() => onConvert(category)}
          disabled={converting}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] px-3 py-2 text-xs font-medium"
        >
          <Tags className="size-4" />
          {converting
            ? "Salvando..."
            : category.manualCategoryExists
              ? "Atualizar na Biblioteca"
              : "Criar na Biblioteca"}
        </button>
        {category.toReviewCount > 0 && (
          <span className="rounded-full border border-[var(--serene-border)] px-3 py-2 text-xs text-[var(--serene-muted)]">
            {category.toReviewCount} para revisar
          </span>
        )}
      </div>
    </article>
  );
}

function EvolutionBars({ points }: { points: MenteEvolutionPoint[] }) {
  const maxSeconds = Math.max(...points.map((point) => point.seconds), 1);

  return (
    <div className="space-y-3">
      {points.map((point) => (
        <div key={point.key} className="grid gap-2 sm:grid-cols-[88px_1fr_96px] sm:items-center">
          <p className="text-sm text-[var(--serene-muted)]">{point.label}</p>
          <div className="h-3 overflow-hidden rounded-full bg-[var(--serene-surface-soft)]">
            <div
              className="h-full rounded-full bg-[var(--serene-accent)]"
              style={{ width: `${Math.max((point.seconds / maxSeconds) * 100, 6)}%` }}
            />
          </div>
          <p className="text-sm font-medium">{formatDuration(point.seconds)}</p>
        </div>
      ))}
    </div>
  );
}

function MenteDashboard({
  convertingCategoryId,
  insight,
  onConvertCategory,
}: {
  convertingCategoryId: string | null;
  insight: MenteInsight;
  onConvertCategory: (category: MenteCategory) => void;
}) {
  const strongestCategories = insight.categories.slice(0, 6);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">Sua vida em leitura</h2>
          <p className="mt-1 text-sm text-[var(--serene-muted)]">
            Horas construindo sua mente leitora, com o tempo real separado das estimativas.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <TimeBlock
            icon={Clock3}
            label="Tempo registrado no SERENE"
            value={timePhrase(insight.totals.realSeconds, "registradas no SERENE")}
            helper="Somente tempo ativo de sessoes registradas."
          />
          <TimeBlock
            icon={History}
            label="Tempo estimado do seu historico"
            value={timePhrase(insight.totals.estimatedHistoricalSeconds, "estimadas do historico")}
            helper="Estimado e aproximado, vindo de livros lidos antes do SERENE."
          />
          <TimeBlock
            icon={Sparkles}
            label="Total aproximado dedicado aos livros"
            value={timePhrase(insight.totals.approximateTotalSeconds, "aproximadas")}
            helper="Soma de tempo real registrado e historico estimado."
          />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          icon={LibraryBig}
          label="Livros"
          value={formatCount(insight.totals.uniqueBooks)}
          helper="Unicos, mesmo em varias areas."
        />
        <MetricCard
          icon={Clock3}
          label="Sessoes"
          value={formatCount(insight.totals.sessions)}
          helper="Registros de leitura ativos."
        />
        <MetricCard
          icon={MessageSquareText}
          label="Anotacoes"
          value={formatCount(insight.totals.annotations)}
          helper="Privadas ficam fora desta visao."
        />
        <MetricCard
          icon={Star}
          label="Ideias favoritas"
          value={formatCount(insight.totals.favoriteIdeas)}
          helper="Favoritos com texto salvo."
        />
        <MetricCard
          icon={CheckCircle2}
          label="Para revisar"
          value={formatCount(insight.totals.itemsToReview)}
          helper="Itens aguardando retorno."
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Areas mais presentes</h2>
            <p className="mt-1 text-sm text-[var(--serene-muted)]">
              Categorias automaticas formadas por livros e anotacoes, sem depender da Biblioteca.
            </p>
          </div>
          <p className="text-xs text-[var(--serene-muted)]">
            Um livro pode aparecer em varias areas; totais usam livros unicos.
          </p>
        </div>

        {strongestCategories.length === 0 ? (
          <EmptyBlock
            icon={Brain}
            title="A Mente esta pronta"
            text="Adicione livros e anotacoes visiveis para formar as primeiras areas automaticamente."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {strongestCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                converting={convertingCategoryId === category.id}
                onConvert={onConvertCategory}
              />
            ))}
          </div>
        )}
      </section>

      <section id="evolucao" className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <article className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
              <CalendarDays className="size-4" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Evolucao de leitura</h2>
              <p className="text-sm text-[var(--serene-muted)]">
                Um registro tranquilo de presenca, sem metas ou cobranca.
              </p>
            </div>
          </div>
          <div className="mt-5">
            {insight.evolution.length === 0 ? (
              <p className="text-sm text-[var(--serene-muted)]">
                Suas sessoes recentes aparecerao aqui quando houver tempo registrado.
              </p>
            ) : (
              <EvolutionBars points={insight.evolution} />
            )}
          </div>
        </article>

        <article className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
              <GitBranch className="size-4" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Livros que conversam</h2>
              <p className="text-sm text-[var(--serene-muted)]">Encontros simples entre areas.</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {insight.conversations.length === 0 ? (
              <p className="text-sm text-[var(--serene-muted)]">
                Quando duas leituras dividirem uma area, esse encontro aparece aqui.
              </p>
            ) : (
              insight.conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] p-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-3 rounded-full border border-[var(--serene-border)]"
                      style={{ backgroundColor: conversation.color }}
                    />
                    <p className="text-sm font-medium">{conversation.categoryName}</p>
                  </div>
                  <p className="mt-2 text-sm text-[var(--serene-muted)]">{conversation.reason}</p>
                  <p className="mt-2 text-xs text-[var(--serene-muted)]">
                    {conversation.bookTitles.join(" / ")}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Ideias favoritas</h2>
              <p className="text-sm text-[var(--serene-muted)]">Trechos marcados para permanecer.</p>
            </div>
            <Star className="size-5 text-[var(--serene-accent)]" />
          </div>
          <div className="mt-4 grid gap-3">
            {insight.favoriteIdeas.length === 0 ? (
              <p className="text-sm text-[var(--serene-muted)]">
                Favoritos visiveis da Mente aparecerao aqui.
              </p>
            ) : (
              insight.favoriteIdeas.map((item) => <AnnotationPreview key={item.id} item={item} />)
            )}
          </div>
        </article>

        <article className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Para revisar</h2>
              <p className="text-sm text-[var(--serene-muted)]">Notas que pediram um retorno suave.</p>
            </div>
            <CheckCircle2 className="size-5 text-[var(--serene-accent)]" />
          </div>
          <div className="mt-4 grid gap-3">
            {insight.reviewItems.length === 0 ? (
              <p className="text-sm text-[var(--serene-muted)]">
                Nenhum item visivel marcado para revisar agora.
              </p>
            ) : (
              insight.reviewItems.map((item) => <AnnotationPreview key={item.id} item={item} />)
            )}
          </div>
        </article>
      </section>

      <section
        id="linha-do-tempo"
        className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-5"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-[var(--serene-surface-soft)] text-[var(--serene-accent)]">
              <CalendarDays className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Linha do tempo</h2>
              <p className="text-sm text-[var(--serene-muted)]">
                Memoria cronologica de livros, sessoes e anotacoes.
              </p>
            </div>
          </div>
          <Link
            href="/linha-do-tempo"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--serene-border)] px-4 py-2 text-sm"
          >
            Ver linha do tempo
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

export function MenteClient() {
  const { authLoading, envReady, profile, profileError, profileState, user } = useAppState();
  const [sourceData, setSourceData] = useState<MenteSourceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [convertingCategoryId, setConvertingCategoryId] = useState<string | null>(null);

  const loadMente = useCallback(async () => {
    if (!user) {
      setSourceData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const result = await loadMenteSourceData(user.id);
    setLoading(false);

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Nao foi possivel carregar a Mente.");
      return;
    }

    setSourceData(result.data);
  }, [user]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMente();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadMente]);

  const insight = useMemo(() => (sourceData ? buildMenteInsight(sourceData) : null), [sourceData]);

  async function handleConvertCategory(category: MenteCategory) {
    if (!user) {
      return;
    }

    setFeedback(null);
    setConvertingCategoryId(category.id);
    const result = await createManualCategoryFromMente({
      userId: user.id,
      name: category.name,
      color: category.color,
      bookIds: category.bookIds,
    });
    setConvertingCategoryId(null);

    if (result.error) {
      setFeedback(result.error.message);
      await loadMente();
      return;
    }

    setFeedback("Categoria salva na Biblioteca com os livros desta area.");
    await loadMente();
  }

  if (!envReady) {
    return (
      <section className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-amber-800">
        Configure as variaveis Supabase para carregar a Mente.
      </section>
    );
  }

  if (authLoading || (user && profileState === "loading")) {
    return (
      <section className="grid min-h-[45vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrainLoader />
          <p className="text-sm text-[var(--serene-muted)]">Preparando sua Mente...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return <AuthPanel />;
  }

  if (profileState === "error") {
    return (
      <section className="rounded-lg border border-rose-300 bg-rose-50 p-5 text-rose-800">
        <h1 className="text-xl font-semibold">Nao foi possivel carregar o perfil</h1>
        <p className="mt-2 text-sm">{profileError ?? "Tente novamente em instantes."}</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm text-[var(--serene-muted)]">Mente</p>
          <h1 className="mt-2 text-3xl font-semibold">Sua leitura ganhando forma</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--serene-muted)]">
            Uma visao calma das areas que aparecem nos livros, nas sessoes e nas anotacoes
            visiveis.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4">
          <BrainLoader className="size-16" />
          <div>
            <p className="text-sm font-medium">{profile?.name ?? user.email ?? "Leitor"}</p>
            <p className="text-xs text-[var(--serene-muted)]">Privados ficam resguardados.</p>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void loadMente()}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] px-4 py-2 text-sm"
        >
          <RefreshCw className="size-4" />
          Atualizar
        </button>
        <Link
          href="/linha-do-tempo"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] px-4 py-2 text-sm"
        >
          <CalendarDays className="size-4" />
          Ver linha do tempo
        </Link>
        <Link
          href="/biblioteca"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--serene-border)] px-4 py-2 text-sm"
        >
          <BookOpen className="size-4" />
          Biblioteca
        </Link>
      </div>

      {feedback && (
        <p className="rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)] px-3 py-2 text-sm">
          {feedback}
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      )}

      {loading || !insight ? (
        <section className="grid min-h-64 place-items-center rounded-lg border border-[var(--serene-border)] bg-[var(--serene-surface)]">
          <div className="flex flex-col items-center gap-3">
            <BrainLoader />
            <p className="text-sm text-[var(--serene-muted)]">Lendo seus sinais de leitura...</p>
          </div>
        </section>
      ) : insight.books.length === 0 ? (
        <EmptyBlock
          icon={Brain}
          title="Mente tranquila por enquanto"
          text="Nenhum livro visivel para a Mente agora. Livros privados ou ocultos continuam protegidos."
        />
      ) : (
        <MenteDashboard
          insight={insight}
          convertingCategoryId={convertingCategoryId}
          onConvertCategory={(category) => void handleConvertCategory(category)}
        />
      )}
    </section>
  );
}
