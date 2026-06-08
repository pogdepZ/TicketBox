export declare class AiBioService {
    generateBioFromPdf(concertId: string, file: Express.Multer.File): Promise<{
        bio: string;
    }>;
}
