import { useEffect, useState } from "react";
import promptCards from "@/mock/promptCards.json";
import textPromptCards from "@/mock/textPromptCards.json";

type PromptMode = "image2" | "prompt";

type PromptPreview = {
  mode: PromptMode;
  title: string;
  description: string;
  sample: string;
};

type PromptCard = {
  id: string;
  source: string;
  prompt: string;
  image: string;
};

type TextPromptCard = {
  id: string;
  type: "prompt";
  source: string;
  title: string;
  prompt: string;
  remark: string;
  tags: Array<string>;
  originalPrompt: string;
};

const fallbackPreview: PromptPreview = {
  mode: "prompt",
  title: "Prompt 工作台",
  description: "用于整理、调试和复用提示词的入口。",
  sample: "请生成一个适合产品发布会首页的中文提示词。",
};

const cards = promptCards as Array<PromptCard>;
const textCards = textPromptCards as Array<TextPromptCard>;

export default function Index() {
  const [mode, setMode] = useState<PromptMode>("prompt");
  const [preview, setPreview] = useState<PromptPreview>(fallbackPreview);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [keyword, setKeyword] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPreview() {
      setStatus("loading");

      try {
        const response = await fetch(`/api/prompt-preview?mode=${mode}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const data = (await response.json()) as PromptPreview;
        setPreview(data);
        setStatus("idle");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setStatus("error");
      }
    }

    loadPreview();

    return () => {
      controller.abort();
    };
  }, [mode]);

  const visibleImageCards = cards.filter((card) => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return true;
    }

    return (
      card.prompt.toLowerCase().includes(normalizedKeyword) ||
      card.source.toLowerCase().includes(normalizedKeyword)
    );
  });

  const visibleTextCards = textCards.filter((card) => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return true;
    }

    return (
      card.title.toLowerCase().includes(normalizedKeyword) ||
      card.prompt.toLowerCase().includes(normalizedKeyword) ||
      card.remark.toLowerCase().includes(normalizedKeyword) ||
      card.tags.join(" ").toLowerCase().includes(normalizedKeyword)
    );
  });

  function showCopied(cardId: string) {
    setCopiedId(cardId);
    window.setTimeout(() => setCopiedId(null), 1600);
  }

  function copyWithTextarea(prompt: string) {
    const textarea = document.createElement("textarea");
    textarea.value = prompt;
    textarea.readOnly = true;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  }

  function copyPrompt(card: Pick<PromptCard | TextPromptCard, "id" | "prompt">) {
    if (copyWithTextarea(card.prompt)) {
      showCopied(card.id);
      return;
    }

    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(card.prompt)
        .then(() => {
          showCopied(card.id);
        })
        .catch(() => {
          setCopiedId(card.id);
          window.setTimeout(() => setCopiedId(null), 1600);
        });
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-[#20242c]">
      <header className="border-[#dde1e7] border-b bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-medium text-[#697386] text-sm">Prompt Site</p>
            <h1 className="mt-1 font-semibold text-2xl">提示词网站</h1>
          </div>

          <label className="flex items-center gap-3 text-[#4b5565] text-sm">
            <span>类型</span>
            <select
              className="h-10 rounded-md border border-[#cbd2dc] bg-white px-3 text-[#20242c] outline-none transition focus:border-[#2f6fed] focus:ring-2 focus:ring-[#2f6fed]/20"
              value={mode}
              onChange={(event) => setMode(event.target.value as PromptMode)}
            >
              <option value="image2">image2</option>
              <option value="prompt">prompt</option>
            </select>
          </label>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-medium text-[#2f6fed] text-sm uppercase tracking-[0.08em]">
              {preview.mode}
            </p>
            <h2 className="mt-2 font-semibold text-3xl">{preview.title}</h2>
            <p className="mt-3 max-w-2xl text-[#4b5565] leading-7">
              {preview.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              className="h-10 w-72 rounded-md border border-[#cbd2dc] bg-white px-3 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#2f6fed] focus:ring-2 focus:ring-[#2f6fed]/20"
              placeholder={mode === "image2" ? "搜索提示词或来源文件" : "搜索提示词或标签"}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <span className="rounded-full bg-[#eef4ff] px-3 py-1 font-medium text-[#2454b8] text-sm">
              API{" "}
              {status === "loading"
                ? "同步中"
                : status === "error"
                  ? "离线"
                  : "已连接"}
            </span>
          </div>
        </div>

        {status === "error" ? (
          <p className="mt-4 text-[#b42318] text-sm">
            后端 API 暂时不可用，当前页面仍会使用本地 mock 数据展示。
          </p>
        ) : null}

        {mode === "image2" ? (
          <>
            <div className="mt-6 flex items-center justify-between border-[#dde1e7] border-y py-4 text-[#4b5565] text-sm">
              <span>共 {cards.length} 条 image2 mock 数据</span>
              <span>当前显示 {visibleImageCards.length} 条</span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleImageCards.map((card) => (
                <article
                  className="overflow-hidden rounded-lg border border-[#dde1e7] bg-white shadow-sm"
                  key={card.id}
                >
                  <div className="flex min-h-56 flex-col border-[#e4e8ef] border-b p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#20242c] text-sm">
                          提示词
                        </p>
                        <p className="truncate text-[#697386] text-xs">
                          {card.source}
                        </p>
                      </div>
                      <button
                        className="h-8 shrink-0 rounded-md bg-[#20242c] px-3 font-medium text-sm text-white transition hover:bg-[#344054]"
                        type="button"
                        onClick={() => copyPrompt(card)}
                      >
                        {copiedId === card.id ? "已复制" : "复制"}
                      </button>
                    </div>

                    <p className="mt-4 max-h-40 overflow-auto text-[#20242c] text-sm leading-6">
                      {card.prompt}
                    </p>
                  </div>

                  <div className="bg-[#f0f2f5]">
                    <p className="px-4 pt-4 font-semibold text-[#20242c] text-sm">
                      效果图
                    </p>
                    <img
                      alt="提示词生成效果图"
                      className="mt-3 aspect-[3/4] w-full object-cover"
                      loading="lazy"
                      src={card.image}
                    />
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mt-6 flex items-center justify-between border-[#dde1e7] border-y py-4 text-[#4b5565] text-sm">
              <span>共 {textCards.length} 条 prompt mock 数据</span>
              <span>当前显示 {visibleTextCards.length} 条</span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleTextCards.map((card) => (
                <article
                  className="flex min-h-72 flex-col rounded-lg border border-[#dde1e7] bg-white p-5 shadow-sm"
                  key={card.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#20242c] text-lg">
                        {card.title}
                      </p>
                      <p className="mt-1 text-[#697386] text-xs">
                        {card.tags.join(" / ") || "prompt"}
                      </p>
                    </div>
                    <button
                      className="h-8 shrink-0 rounded-md bg-[#20242c] px-3 font-medium text-sm text-white transition hover:bg-[#344054]"
                      type="button"
                      onClick={() => copyPrompt(card)}
                    >
                      {copiedId === card.id ? "已复制" : "复制"}
                    </button>
                  </div>

                  <p className="mt-4 max-h-48 overflow-auto text-[#20242c] text-sm leading-6">
                    {card.prompt}
                  </p>

                  {card.remark ? (
                    <p className="mt-auto pt-4 text-[#697386] text-sm leading-6">
                      {card.remark}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
