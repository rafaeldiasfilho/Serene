"use client";

import {
  BookOpen,
  FolderOpen,
  Library,
  Save,
  ShieldCheck,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";

import type { BookInsert, ManualCategoryRow } from "@/features/books/book-services";
import type { BookWithCategories } from "@/features/books/use-book-library";
import type { BookStatus, ReadingOrigin } from "@/lib/supabase/database.types";

const statusOptions: Array<{ value: BookStatus; label: string }> = [
  { value: "quero_ler", label: "Quero ler" },
  { value: "lendo", label: "Lendo" },
  { value: "pausado", label: "Pausado" },
  { value: "lido", label: "Lido" },
];

const originOptions: Array<{ value: ReadingOrigin; label: string }> = [
  { value: "serene", label: "Lido no SERENE" },
  { value: "historico", label: "Histórico de leitura" },
];

type BookFormState = {
  title: string;
  author: string;
  cover_url: string;
  description: string;
  publisher: string;
  edition: string;
  publication_year: string;
  language: string;
  isbn: string;
  subjects: string;
  total_pages: string;
  current_page: string;
  audiobook_duration_minutes: string;
  audiobook_source: string;
  audiobook_is_confirmed: boolean;
  status: BookStatus;
  reading_origin: ReadingOrigin;
  read_before_serene: boolean;
  completed_inside_serene: boolean;
  is_current: boolean;
  is_private: boolean;
  show_in_home: boolean;
  show_in_notifications: boolean;
  show_in_mente: boolean;
  include_in_quick_exports: boolean;
};

type BookFormProps = {
  book: BookWithCategories | null;
  categories: ManualCategoryRow[];
  initialDraft?: Omit<BookInsert, "user_id"> | null;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (payload: Omit<BookInsert, "user_id">, categoryIds: string[]) => Promise<void>;
};

const fieldClass =
  "rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2.5 text-sm text-[var(--serene-text)] outline-none transition duration-300 placeholder:text-[var(--serene-muted)] focus:border-[var(--serene-accent)] focus:ring-2 focus:ring-[var(--serene-accent-soft)]";

const textareaClass =
  "min-h-24 rounded-xl border border-[var(--serene-border)] bg-[var(--serene-input)] px-3 py-2.5 text-sm text-[var(--serene-text)] outline-none transition duration-300 placeholder:text-[var(--serene-muted)] focus:border-[var(--serene-accent)] focus:ring-2 focus:ring-[var(--serene-accent-soft)]";

const checkboxClass =
  "mt-0.5 size-4 shrink-0 rounded border-[var(--serene-border)] accent-[var(--serene-accent)]";

function FormSection({
  children,
  description,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <section className="serene-soft-in rounded-[1.5rem] border border-[var(--serene-border)] bg-[var(--serene-paper)] p-4 shadow-[var(--serene-shadow-soft)] sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-accent-soft)] text-[var(--serene-accent)]">
          <Icon className="size-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--serene-muted)]">
            {title}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-[var(--serene-muted)]">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function FieldHint({ children }: { children: ReactNode }) {
  return <span className="text-xs leading-relaxed text-[var(--serene-muted)]">{children}</span>;
}

function ChoiceText({ children, title }: { children: ReactNode; title: string }) {
  return (
    <span className="grid gap-0.5">
      <span className="font-semibold text-[var(--serene-text)]">{title}</span>
      <span className="text-xs leading-relaxed text-[var(--serene-muted)]">{children}</span>
    </span>
  );
}

function createInitialState(
  book: BookWithCategories | null,
  initialDraft: Omit<BookInsert, "user_id"> | null,
): BookFormState {
  const source = book ?? initialDraft;

  return {
    title: source?.title ?? "",
    author: source?.author ?? "",
    cover_url: source?.cover_url ?? "",
    description: source?.description ?? "",
    publisher: source?.publisher ?? "",
    edition: source?.edition ?? "",
    publication_year: source?.publication_year?.toString() ?? "",
    language: source?.language ?? "",
    isbn: source?.isbn ?? "",
    subjects: (source?.subjects ?? []).join(", "),
    total_pages: source?.total_pages?.toString() ?? "",
    current_page: source?.current_page?.toString() ?? "0",
    audiobook_duration_minutes: book?.audiobook_duration_minutes?.toString() ?? "",
    audiobook_source: book?.audiobook_source ?? "",
    audiobook_is_confirmed: book?.audiobook_is_confirmed ?? false,
    status: source?.status ?? "quero_ler",
    reading_origin: source?.reading_origin ?? "serene",
    read_before_serene: source?.read_before_serene ?? false,
    completed_inside_serene: source?.completed_inside_serene ?? false,
    is_current: source?.is_current ?? false,
    is_private: source?.is_private ?? false,
    show_in_home: source?.show_in_home ?? true,
    show_in_notifications: source?.show_in_notifications ?? true,
    show_in_mente: source?.show_in_mente ?? true,
    include_in_quick_exports: source?.include_in_quick_exports ?? true,
  };
}

function optionalNumber(value: string) {
  if (!value.trim()) {
    return null;
  }
  return Number(value);
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function optionalSubjects(value: string) {
  const subjects = Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

  return subjects.length > 0 ? subjects : null;
}

export function BookForm({
  book,
  categories,
  initialDraft = null,
  saving,
  onCancel,
  onSubmit,
}: BookFormProps) {
  const [form, setForm] = useState<BookFormState>(() => createInitialState(book, initialDraft));
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    () => book?.categories.map((category) => category.id) ?? [],
  );
  const [error, setError] = useState<string | null>(null);

  const isHistorical = form.reading_origin === "historico";

  const normalizedPayload = useMemo<Omit<BookInsert, "user_id">>(() => {
    const status = form.status;
    const readingOrigin = form.reading_origin;
    const totalPages = optionalNumber(form.total_pages);
    const audiobookDurationMinutes = optionalNumber(form.audiobook_duration_minutes);
    const hasAudiobookBase =
      audiobookDurationMinutes !== null &&
      audiobookDurationMinutes > 0 &&
      totalPages !== null &&
      totalPages > 0;

    return {
      title: form.title.trim(),
      author: optionalText(form.author),
      cover_url: optionalText(form.cover_url),
      description: optionalText(form.description),
      publisher: optionalText(form.publisher),
      edition: optionalText(form.edition),
      publication_year: optionalNumber(form.publication_year),
      language: optionalText(form.language),
      isbn: optionalText(form.isbn),
      subjects: optionalSubjects(form.subjects),
      total_pages: totalPages,
      current_page: optionalNumber(form.current_page) ?? 0,
      status,
      source: book?.source ?? initialDraft?.source ?? "manual",
      reading_origin: readingOrigin,
      is_current: form.is_current,
      is_private: form.is_private,
      show_in_home: form.show_in_home,
      show_in_notifications: form.show_in_notifications,
      show_in_mente: form.show_in_mente,
      include_in_quick_exports: form.include_in_quick_exports,
      audiobook_duration_minutes: audiobookDurationMinutes,
      audiobook_source: optionalText(form.audiobook_source),
      audiobook_is_confirmed: form.audiobook_is_confirmed,
      estimated_minutes_per_page: hasAudiobookBase
        ? Number((audiobookDurationMinutes / totalPages).toFixed(2))
        : (book?.estimated_minutes_per_page ?? null),
      estimation_source: hasAudiobookBase ? "audiobook_duration" : (book?.estimation_source ?? null),
      read_before_serene: readingOrigin === "historico" ? true : form.read_before_serene,
      completed_inside_serene:
        readingOrigin === "serene" && status === "lido" ? true : form.completed_inside_serene,
    };
  }, [
    book?.estimated_minutes_per_page,
    book?.estimation_source,
    book?.source,
    form,
    initialDraft?.source,
  ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!normalizedPayload.title) {
      setError("O título é obrigatório.");
      return;
    }

    const totalPages = normalizedPayload.total_pages ?? 0;
    const currentPage = normalizedPayload.current_page ?? 0;

    if (totalPages > 0 && currentPage > totalPages) {
      setError("A página atual não pode ser maior que o total de páginas.");
      return;
    }

    if (
      normalizedPayload.audiobook_duration_minutes !== null &&
      normalizedPayload.audiobook_duration_minutes !== undefined &&
      normalizedPayload.audiobook_duration_minutes <= 0
    ) {
      setError("A duracao do audiobook deve ser informada em minutos positivos.");
      return;
    }

    await onSubmit(normalizedPayload, selectedCategoryIds);
  }

  function updateField<K extends keyof BookFormState>(key: K, value: BookFormState[K]) {
    if (key === "is_private" && value === true) {
      setForm((current) => ({
        ...current,
        is_private: true,
        show_in_home: false,
        show_in_notifications: false,
        show_in_mente: false,
        include_in_quick_exports: false,
      }));
      return;
    }

    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="serene-rise grid gap-5 rounded-[2rem] border border-[var(--serene-border)] bg-[var(--serene-surface)] p-4 shadow-[var(--serene-shadow-lift)] sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-accent-soft)] text-[var(--serene-accent)]">
            <Library className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--serene-muted)]">
              {book ? "Editar biblioteca" : "Guardar na biblioteca"}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--serene-text)]">
              {book ? "Cuidar deste livro" : "Guardar um novo livro"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--serene-muted)]">
              Registre o essencial agora. Os detalhes podem amadurecer junto com a leitura.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition duration-300 hover:-translate-y-0.5 hover:border-[var(--serene-accent)] hover:text-[var(--serene-text)]"
          aria-label="Fechar formulário"
        >
          <X className="size-4" />
        </button>
      </div>

      <FormSection
        description="Os sinais principais para reconhecer este livro na sua estante."
        icon={BookOpen}
        title="Identidade do livro"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)] md:col-span-2">
            Título
            <input
              className={fieldClass}
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Ex.: A montanha mágica"
              required
            />
            <FieldHint>O nome que vai aparecer na sua Biblioteca.</FieldHint>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)]">
            Autor
            <input
              className={fieldClass}
              value={form.author}
              onChange={(event) => updateField("author", event.target.value)}
              placeholder="Quem escreveu"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)]">
            Capa (URL)
            <input
              className={fieldClass}
              value={form.cover_url}
              onChange={(event) => updateField("cover_url", event.target.value)}
              placeholder="Link da imagem, se tiver"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)] md:col-span-2">
            Descrição
            <textarea
              className={textareaClass}
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Uma frase, contexto ou memória inicial sobre este livro."
            />
            <FieldHint>Opcional. Use como uma pequena nota de entrada para a leitura.</FieldHint>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)]">
            Editora
            <input
              className={fieldClass}
              value={form.publisher}
              onChange={(event) => updateField("publisher", event.target.value)}
              placeholder="Editora"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)]">
            Edição
            <input
              className={fieldClass}
              value={form.edition}
              onChange={(event) => updateField("edition", event.target.value)}
              placeholder="Edição, volume ou versão"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)]">
            Ano
            <input
              type="number"
              min="1"
              className={fieldClass}
              value={form.publication_year}
              onChange={(event) => updateField("publication_year", event.target.value)}
              placeholder="Ano de publicação"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)]">
            Idioma
            <input
              className={fieldClass}
              value={form.language}
              onChange={(event) => updateField("language", event.target.value)}
              placeholder="Ex.: pt, por, en"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)]">
            ISBN
            <input
              className={fieldClass}
              value={form.isbn}
              onChange={(event) => updateField("isbn", event.target.value)}
              placeholder="ISBN, se houver"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)] md:col-span-2">
            Assuntos
            <input
              className={fieldClass}
              value={form.subjects}
              onChange={(event) => updateField("subjects", event.target.value)}
              placeholder="Filosofia, literatura, habitos"
            />
            <FieldHint>Opcional. Separe por virgulas; isso ajuda Biblioteca e Mente.</FieldHint>
          </label>
        </div>
      </FormSection>

      <FormSection
        description="Onde este livro está na sua jornada: desejo, leitura, pausa ou memória concluída."
        icon={Sparkles}
        title="Leitura e progresso"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)]">
            Páginas
            <input
              type="number"
              min="1"
              className={fieldClass}
              value={form.total_pages}
              onChange={(event) => updateField("total_pages", event.target.value)}
              placeholder="Total de páginas"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)]">
            Página atual
            <input
              type="number"
              min="0"
              className={fieldClass}
              value={form.current_page}
              onChange={(event) => updateField("current_page", event.target.value)}
              placeholder="Onde você está"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)]">
            Status
            <select
              className={fieldClass}
              value={form.status}
              onChange={(event) => updateField("status", event.target.value as BookStatus)}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)]">
            Origem
            <select
              className={fieldClass}
              value={form.reading_origin}
              onChange={(event) => updateField("reading_origin", event.target.value as ReadingOrigin)}
            >
              {originOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 rounded-2xl border border-dashed border-[var(--serene-border)] bg-[color-mix(in_oklab,var(--serene-surface)_78%,transparent)] p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)]">
              Audiobook completo (minutos)
              <input
                type="number"
                min="1"
                className={fieldClass}
                value={form.audiobook_duration_minutes}
                onChange={(event) =>
                  updateField("audiobook_duration_minutes", event.target.value)
                }
                placeholder="Ex.: 500"
              />
              <FieldHint>Opcional. Use apenas se voce tiver uma duracao confiavel.</FieldHint>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-[var(--serene-text)]">
              Fonte da duracao
              <input
                className={fieldClass}
                value={form.audiobook_source}
                onChange={(event) => updateField("audiobook_source", event.target.value)}
                placeholder="Ex.: Audible, livro informado, editora"
              />
            </label>
          </div>
          <label className="mt-3 flex items-start gap-3 text-sm">
            <input
              className={checkboxClass}
              type="checkbox"
              checked={form.audiobook_is_confirmed}
              onChange={(event) => updateField("audiobook_is_confirmed", event.target.checked)}
            />
            <ChoiceText title="Duracao confirmada">
              Marca que voce conferiu se a duracao corresponde ao audiobook completo.
            </ChoiceText>
          </label>
          <p className="mt-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface-soft)] px-3 py-2 text-xs leading-relaxed text-[var(--serene-muted)]">
            A busca automatica da duracao do audiobook ainda esta em preparacao. Voce pode informar
            manualmente a duracao estimada se quiser.
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="flex items-start gap-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-3 text-sm shadow-[var(--serene-shadow-soft)]">
            <input
              className={checkboxClass}
              type="checkbox"
              checked={form.is_current}
              onChange={(event) => updateField("is_current", event.target.checked)}
            />
            <ChoiceText title="Livro atual">
              Dá mais presença a este livro no fluxo de leitura.
            </ChoiceText>
          </label>
          <label
            className={`flex items-start gap-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-3 text-sm shadow-[var(--serene-shadow-soft)] ${
              isHistorical ? "opacity-75" : ""
            }`}
          >
            <input
              className={checkboxClass}
              type="checkbox"
              checked={isHistorical || form.read_before_serene}
              disabled={isHistorical}
              onChange={(event) => updateField("read_before_serene", event.target.checked)}
            />
            <ChoiceText title="Lido antes do SERENE">
              Mantém separado o que já fazia parte da sua história.
            </ChoiceText>
          </label>
          <label className="flex items-start gap-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-3 text-sm shadow-[var(--serene-shadow-soft)]">
            <input
              className={checkboxClass}
              type="checkbox"
              checked={form.completed_inside_serene}
              onChange={(event) => updateField("completed_inside_serene", event.target.checked)}
            />
            <ChoiceText title="Concluído no SERENE">
              Marca que a leitura foi finalizada dentro do app.
            </ChoiceText>
          </label>
        </div>
      </FormSection>

      <FormSection
        description="Escolha onde este livro aparece. Livros privados ficam mais reservados por padrão."
        icon={ShieldCheck}
        title="Privacidade e aparição"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-start gap-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-3 text-sm shadow-[var(--serene-shadow-soft)]">
            <input
              className={checkboxClass}
              type="checkbox"
              checked={form.is_private}
              onChange={(event) => updateField("is_private", event.target.checked)}
            />
            <ChoiceText title="Privado">
              Ao marcar, o SERENE recolhe este livro das áreas de aparição automática.
            </ChoiceText>
          </label>
          <label className="flex items-start gap-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-3 text-sm shadow-[var(--serene-shadow-soft)]">
            <input
              className={checkboxClass}
              type="checkbox"
              checked={form.show_in_home}
              onChange={(event) => updateField("show_in_home", event.target.checked)}
            />
            <ChoiceText title="Mostrar no Início">
              Permite que o livro apareça no espaço principal do app.
            </ChoiceText>
          </label>
          <label className="flex items-start gap-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-3 text-sm shadow-[var(--serene-shadow-soft)]">
            <input
              className={checkboxClass}
              type="checkbox"
              checked={form.show_in_notifications}
              onChange={(event) => updateField("show_in_notifications", event.target.checked)}
            />
            <ChoiceText title="Mostrar em notificações">
              Mantém este livro disponível para lembretes e sinais suaves.
            </ChoiceText>
          </label>
          <label className="flex items-start gap-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-3 text-sm shadow-[var(--serene-shadow-soft)]">
            <input
              className={checkboxClass}
              type="checkbox"
              checked={form.show_in_mente}
              onChange={(event) => updateField("show_in_mente", event.target.checked)}
            />
            <ChoiceText title="Mostrar na Mente">
              Inclui o livro nas leituras que formam sua mente leitora.
            </ChoiceText>
          </label>
          <label className="flex items-start gap-3 rounded-2xl border border-[var(--serene-border)] bg-[var(--serene-surface)] p-3 text-sm shadow-[var(--serene-shadow-soft)] md:col-span-2">
            <input
              className={checkboxClass}
              type="checkbox"
              checked={form.include_in_quick_exports}
              onChange={(event) => updateField("include_in_quick_exports", event.target.checked)}
            />
            <ChoiceText title="Incluir em exportações rápidas">
              Deixa este livro pronto para compor exportações organizadas.
            </ChoiceText>
          </label>
        </div>
      </FormSection>

      <FormSection
        description="Categorias são opcionais: use apenas quando elas ajudarem sua biblioteca a respirar melhor."
        icon={FolderOpen}
        title="Categorias"
      >
        {categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--serene-border)] bg-[var(--serene-surface)] p-4">
            <p className="text-sm leading-relaxed text-[var(--serene-muted)]">
              Você ainda não criou categorias. Seus livros continuam organizados normalmente na
              Biblioteca; crie categorias apenas se quiser separar leituras do seu jeito.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const selected = selectedCategoryIds.includes(category.id);

              return (
                <label
                  key={category.id}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition duration-300 ${
                    selected
                      ? "border-[var(--serene-accent)] bg-[var(--serene-accent-soft)] text-[var(--serene-text)]"
                      : "border-[var(--serene-border)] bg-[var(--serene-surface)] text-[var(--serene-muted)] hover:border-[var(--serene-accent)] hover:text-[var(--serene-text)]"
                  }`}
                >
                  <input
                    className={checkboxClass}
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleCategory(category.id)}
                  />
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: category.color ?? "var(--serene-accent)" }}
                  />
                  {category.name}
                </label>
              );
            })}
          </div>
        )}
      </FormSection>

      {error && (
        <p className="serene-soft-in rounded-2xl border border-amber-300/70 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 shadow-[var(--serene-shadow-soft)] dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--serene-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--serene-shadow-lift)] transition duration-300 hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="size-4" />
          {saving ? "Salvando..." : "Salvar livro"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-[var(--serene-border)] bg-[var(--serene-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--serene-muted)] shadow-[var(--serene-shadow-soft)] transition duration-300 hover:-translate-y-0.5 hover:border-[var(--serene-accent)] hover:text-[var(--serene-text)]"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
