import { createHmac, createHash } from "crypto";
// 大模型API集成
export interface GenerateImageParams {
  prompt: string; // 图片描述提示词
  width?: number; // 图片宽度
  height?: number; // 图片高度
}

// API配置
export class TencentMixunImageService {
  private readonly secretId: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly region: string = "ap-guangzhou";
  private readonly version: string = "2022-12-29";

  constructor(secretId?: string, secretKey?: string) {
    // 确保在服务器端使用环境变量
    this.secretId = secretId || process.env.TENCENTCLOUD_SECRET_ID || "";
    this.secretKey = secretKey || process.env.TENCENTCLOUD_SECRET_KEY || "";
    this.baseUrl = "https://aiart.tencentcloudapi.com";

    // 只在服务端打印警告
    if (typeof window === "undefined" && (!this.secretId || !this.secretKey)) {
      console.warn(
        "API密钥未配置，请在.env.local中设置TENCENTCLOUD_SECRET_ID和TENCENTCLOUD_SECRET_KEY"
      );
    }
  }

  // 生成TC3-HMAC-SHA256签名
  private generateSignature(
    timestamp: number,
    credentialScope: string,
    canonicalRequest: string
  ): string {
    const date = new Date(timestamp * 1000).toISOString().split("T")[0];
    const secretDate = createHmac("sha256", `TC3${this.secretKey}`)
      .update(date)
      .digest();
    const secretService = createHmac("sha256", secretDate)
      .update("aiart")
      .digest();
    const secretSigning = createHmac("sha256", secretService)
      .update("tc3_request")
      .digest();
    const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${createHash(
      "sha256"
    )
      .update(canonicalRequest)
      .digest("hex")}`;
    return createHmac("sha256", secretSigning)
      .update(stringToSign)
      .digest("hex");
  }

  // 生成图片
  public async generateImage(params: GenerateImageParams): Promise<string> {
    try {
      // 检查是否在客户端环境
      if (typeof window !== "undefined") {
        // 客户端环境下，调用内部API路由
        const response = await fetch("/api/ai-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        });

        const data = await response.json();
        if (data.success) {
          return data.imageUrl;
        } else {
          throw new Error(data.error || "图片生成失败");
        }
      }

      // 服务端环境下，直接调用腾讯云API
      if (!this.secretId || !this.secretKey) {
        throw new Error("API密钥未配置");
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const date = new Date(timestamp * 1000).toISOString().split("T")[0];
      const credentialScope = `${date}/aiart/tc3_request`;

      // 根据API文档，使用正确的请求体格式
      const requestBody = JSON.stringify({
        Prompt: params.prompt,
        Resolution: `${params.width || 1024}:${params.height || 1024}`,
      });

      // 构建规范请求
      const canonicalHeaders = `content-type:application/json\nhost:aiart.tencentcloudapi.com\n`;
      const signedHeaders = "content-type;host";
      const hashedRequestPayload = createHash("sha256")
        .update(requestBody)
        .digest("hex");
      const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;

      // 生成签名
      const signature = this.generateSignature(
        timestamp,
        credentialScope,
        canonicalRequest
      );

      // 构建Authorization头
      const authorization = `TC3-HMAC-SHA256 Credential=${this.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

      // 发送请求到腾讯云混元API
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Host: "aiart.tencentcloudapi.com",
          "X-TC-Action": "TextToImageLite",
          "X-TC-Timestamp": timestamp.toString(),
          "X-TC-Version": this.version,
          "X-TC-Region": this.region,
          "X-TC-Language": "zh-CN",
          Authorization: authorization,
        },
        body: requestBody,
      });

      const data = await response.json();
      if (data.Response && data.Response.ResultImage) {
        // 根据API文档，返回Base64格式的图片
        return `data:image/jpeg;base64,${data.Response.ResultImage}`;
      } else if (data.Response && data.Response.Error) {
        throw new Error(
          `${data.Response.Error.Code}: ${data.Response.Error.Message}`
        );
      } else {
        throw new Error("生成图片失败: 无效的响应格式");
      }
    } catch (error) {
      console.error("API调用失败:", error);
      // 返回默认图片作为后备
      return `https://placehold.co/${params.width || 512}x${
        params.height || 512
      }/cccccc/666666?text=Image+Generation+Failed`;
    }
  }
}

// 创建全局服务实例
export const aiImageService = new TencentMixunImageService();

// 生成图片的便捷函数
export async function generateImage(
  prompt: string,
  width?: number,
  height?: number
): Promise<string> {
  try {
    // 直接使用服务实例生成图片
    return await aiImageService.generateImage({ prompt, width, height });
  } catch (error) {
    console.error("图片生成失败，使用默认图片:", error);
    // 返回默认图片作为后备
    return `https://placehold.co/${width || 512}x${
      height || 512
    }/cccccc/666666?text=Image+Generation+Failed`;
  }
}
