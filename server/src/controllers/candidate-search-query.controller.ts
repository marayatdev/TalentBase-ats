import type {
    NextFunction,
    Request,
    Response,
} from "express";

import { CandidateSearchQueryService } from "@/services/candidate-search-query.service";
import { ResponseFormatter } from "@/utils/response";

export class CandidateSearchQueryController {
    private readonly service =
        new CandidateSearchQueryService();

    async generate(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const jobId =
                String(
                    req.params.jobId ??
                    "",
                ).trim();

            const result =
                await this.service.generate(
                    jobId,
                );

            ResponseFormatter.success(
                res,
                result,
                "สร้าง Search Queries สำหรับค้นหาผู้สมัครสำเร็จ",
                200,
            );
        } catch (error) {
            next(error);
        }
    }
}