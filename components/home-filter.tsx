"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TagMultiSelect } from "@/components/tag-multi-select";

interface HomeFilterProps {
  allTags: string[];
  initialQ: string;
  initialTags: string[];
  permissionRole: string;
}

export function HomeFilter({ allTags, initialQ, initialTags, permissionRole }: HomeFilterProps) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [selected, setSelected] = useState(initialTags);

  const submit = () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    for (const tag of selected) params.append("tags", tag);
    router.push(`/?${params.toString()}`);
  };

  return (
    <section className="rounded-2xl border-2 border-foreground bg-accent/10 p-6 shadow-[4px_4px_0_0_var(--color-foreground)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent">共編筆記</p>
          <h1 className="mt-2 text-3xl font-extrabold">已上架筆記瀏覽</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {permissionRole === "default" ? "您可瀏覽已發布的筆記。" : "可查看公開筆記與管理狀態。"}
          </p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="搜尋標題或作者"
            className="rounded-xl border-2 border-foreground bg-card px-4 py-2.5 shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 focus:-translate-y-0.5 focus:shadow-[5px_5px_0_0_var(--color-foreground)] focus:outline-none"
            onKeyDown={(event) => event.key === "Enter" && submit()}
          />
          <TagMultiSelect tags={allTags} selected={selected} onChange={setSelected} />
          <button
            onClick={submit}
            className="rounded-xl border-2 border-foreground bg-primary px-5 py-2.5 font-bold text-background shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[2px_2px_0_0_var(--color-foreground)]"
          >
            篩選
          </button>
        </div>
      </div>
    </section>
  );
}
