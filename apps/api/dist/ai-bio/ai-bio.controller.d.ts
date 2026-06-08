import { AiBioService } from './ai-bio.service';
export declare class AiBioController {
    private readonly aiBioService;
    constructor(aiBioService: AiBioService);
    uploadArtistBio(concertId: string, file: Express.Multer.File): Promise<{
        success: boolean;
        data: {
            bio: string;
        };
        message: string;
    }>;
}
