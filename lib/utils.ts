import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 计算点到线段的距离
export const pointToLineDistance = (
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number => {
  // 计算线段长度的平方
  const lineLengthSq = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);

  // 如果线段长度为0，返回点到线段起点的距离
  if (lineLengthSq === 0) {
    return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
  }

  // 计算投影参数t
  const t = Math.max(
    0,
    Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / lineLengthSq)
  );

  // 计算投影点
  const projectionX = x1 + t * (x2 - x1);
  const projectionY = y1 + t * (y2 - y1);

  // 计算点到投影点的距离
  return Math.sqrt(
    (px - projectionX) * (px - projectionX) +
      (py - projectionY) * (py - projectionY)
  );
};
