import { DrawingCanvas } from "@/components/drawing-canvas"

export default function ExcalidrawClone() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <DrawingCanvas />
    </div>
  )
}
