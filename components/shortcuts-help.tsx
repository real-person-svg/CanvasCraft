"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HelpCircle } from "lucide-react";

export function ShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  const shortcuts = [
    {
      category: "工具",
      items: [
        { key: "V 或 1", action: "选择工具" },
        { key: "H 或 2", action: "拖拽工具" },
        { key: "P 或 3", action: "画笔工具" },
        { key: "L 或 4", action: "线条工具" },
        { key: "R 或 5", action: "矩形工具" },
        { key: "C 或 6", action: "圆形工具" },
        { key: "A 或 7", action: "箭头工具" },
        { key: "T 或 8", action: "文本工具" },
        { key: "I 或 9", action: "图片工具" },
      ],
    },
    {
      category: "画布操作",
      items: [
        { key: "Ctrl + Z", action: "撤销" },
        { key: "Ctrl + Y", action: "重置" },
        { key: "Ctrl + 0", action: "重置缩放" },
        { key: "Ctrl + 1", action: "适应屏幕" },
        { key: "Ctrl + s", action: "吸附选择" },
        { key: "+ 或 =", action: "放大" },
        { key: "-", action: "缩小" },
        { key: "Ctrl + Shift + Del", action: "清空画布" },
      ],
    },
    {
      category: "选择",
      items: [
        { key: "Delete", action: "删除选中元素" },
        { key: "Escape", action: "退出选中元素" },
        { key: "Shift + Click", action: "多选" },
        { key: "Ctrl + A", action: "全选" },
      ],
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="absolute bottom-4 right-4 h-8 w-8 p-0"
          title="快捷键操作"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>快捷键操作</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="font-medium text-sm mb-2">{section.category}</h3>
              <div className="space-y-1">
                {section.items.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {shortcut.action}
                    </span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
