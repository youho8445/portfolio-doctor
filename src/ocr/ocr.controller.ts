import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { OcrService } from './ocr.service';

// Inline type since @types/multer is not installed
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const ALLOWED_MIME = ['image/jpeg', 'image/png'] as const;
type AllowedMime = (typeof ALLOWED_MIME)[number];

@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post('portfolio-screenshot')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: undefined, // use memory storage (buffer)
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (
        _req: unknown,
        file: { mimetype: string },
        cb: (err: Error | null, accept: boolean) => void,
      ) => {
        if ((ALLOWED_MIME as readonly string[]).includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException('JPEG 또는 PNG 이미지만 업로드할 수 있어요'),
            false,
          );
        }
      },
    }),
  )
  async parseScreenshot(@UploadedFile() file: MulterFile) {
    if (!file) throw new BadRequestException('파일이 없어요');
    if (!file.buffer) throw new BadRequestException('파일 읽기에 실패했어요');

    return this.ocrService.parsePortfolioScreenshot(
      file.buffer,
      file.mimetype as AllowedMime,
    );
  }
}
