import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useLocalState, K } from "@/lib/storage";
import type { ShoppingItem } from "@/lib/types";

export const Route = createFileRoute("/list")({
  head: () => ({
    meta: [
      { title: "Shopping List · Bag Au Pair" },
      { name: "description", content: "Your grocery shopping list." },
    ],
  }),
  component: ListPage,
});

function ListPage() {
  const [items, setItems] = useLocalState<ShoppingItem[]>(K.list, []);
  const [text, setText] = useState("");

  function add() {
    const t = text.trim();
    if (!t) return;
    setItems([{ id: crypto.randomUUID(), text: t, done: false }, ...items]);
    setText("");
  }

  function toggle(id: string) {
    setItems(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  }

  function remove(id: string) {
    setItems(items.filter((i) => i.id !== id));
  }

  function clearDone() {
    setItems(items.filter((i) => !i.done));
  }

  const doneCount = items.filter((i) => i.done).length;

  return (
    <AppShell>
      <h1 className="text-2xl font-bold tracking-tight">Shopping List</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {items.length === 0 ? "Add what you need to pick up." : `${items.length - doneCount} to get · ${doneCount} done`}
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); add(); }}
        className="mt-5 flex gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add an item…"
          className="flex-1 rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </form>

      <ul className="mt-5 space-y-2">
        {items.map((i) => (
          <li
            key={i.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-card"
          >
            <input
              type="checkbox"
              checked={i.done}
              onChange={() => toggle(i.id)}
              className="h-5 w-5 accent-[var(--primary)]"
              aria-label={`Mark ${i.text} done`}
            />
            <span
              className={
                "flex-1 text-sm " +
                (i.done ? "text-muted-foreground line-through" : "")
              }
            >
              {i.text}
            </span>
            <button
              onClick={() => remove(i.id)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
              aria-label="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      {doneCount > 0 && (
        <button
          onClick={clearDone}
          className="mt-5 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground"
        >
          Clear {doneCount} completed
        </button>
      )}
    </AppShell>
  );
}
