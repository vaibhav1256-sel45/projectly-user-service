import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { map, Observable } from "rxjs";

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    return next.handle().pipe(
      map((response) => {
        // Handlers return { message, data }, or { message, ...fields } (the fields become data).
        const { message, data, meta, ...rest } = response ?? {};
        const payload = data ?? (Object.keys(rest).length ? rest : undefined);

        this.logger.info(
          { data: payload },
          message ?? 'Request successful',
        );

        return {
          success: true,
          message: message ?? 'Request successful',
          data: payload,
          ...(meta && { meta }),
        };
      }),
    );
  }
}
