import { useState } from "react";
import { Plus, Trash2, Check, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Item {
  id: string;
  text: string;
  done: boolean;
}

const ShoppingList = () => {
  const [items, setItems] = useState<Item[]>(() => {
    try {
      const saved = localStorage.getItem("bagbuddy-list");
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");

  const save = (next: Item[]) => {
    setItems(next);
    localStorage.setItem("bagbuddy-list", JSON.stringify(next));
  };

  const addItem = () => {
    if (!input.trim()) return;
    save([...items, { id: Date.now().toString(), text: input.trim(), done: false }]);
    setInput("");
  };

  const toggleItem = (id: string) =>
    save(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));

  const deleteItem = (id: string) => save(items.filter((i) => i.id !== id));

  const clearDone = () => save(items.filter((i) => !i.done));

  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="min-h-screen pb-24 px-5 pt-12 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground mb-1">Shopping List</h1>
        <p className="text-muted-foreground text-sm mb-6">
          {items.length === 0
            ? "Add items for your next trip"
            : `${doneCount}/${items.length} items checked`}
        </p>
      </motion.div>

      {/* Add item */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-3 mb-6 border border-border">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addItem();
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="Add an item..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="text-base"
            />
            <Button type="submit" size="icon" disabled={!input.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </form>
        </Card>
      </motion.div>

      {/* Items */}
      {items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-muted-foreground"
        >
          <ShoppingCart className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">Your list is empty</p>
        </motion.div>
      ) : (
        <>
          <div className="space-y-2">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                >
                  <Card
                    className={`p-3 flex items-center gap-3 border transition-all ${
                      item.done ? "border-border bg-muted/50" : "border-border"
                    }`}
                  >
                    <button
                      onClick={() => toggleItem(item.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        item.done
                          ? "bg-primary border-primary"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {item.done && <Check className="w-3 h-3 text-primary-foreground" />}
                    </button>
                    <span
                      className={`flex-1 text-sm transition-all ${
                        item.done
                          ? "line-through text-muted-foreground"
                          : "text-card-foreground"
                      }`}
                    >
                      {item.text}
                    </span>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {doneCount > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
              <Button variant="outline" size="sm" onClick={clearDone} className="w-full">
                Clear {doneCount} completed item{doneCount > 1 ? "s" : ""}
              </Button>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default ShoppingList;
