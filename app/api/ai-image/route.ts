import { NextResponse } from "next/server";
import { TencentMixunImageService } from "@/lib/ai-image-server";

export async function POST(request: Request) {
  try {
    const { prompt, width, height } = await request.json();

    // 在服务端安全地使用环境变量
    const imageService = new TencentMixunImageService();
    const imageUrl = await imageService.generateImage({
      prompt,
      width,
      height,
    });

    return NextResponse.json({ success: true, imageUrl });
  } catch (error) {
    console.error("图片生成错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
