"use client";

import { Button } from "@/components/ui/button";

interface CustomDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function CustomDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: CustomDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 shadow-xl max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              取消
            </Button>
          )}
          <Button onClick={onConfirm} variant="destructive">
            确定
          </Button>
        </div>
      </div>
    </div>
  );
}
